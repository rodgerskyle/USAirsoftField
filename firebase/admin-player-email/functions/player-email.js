'use strict';
const { randomUUID, createHash } = require('node:crypto');
const { HttpsError } = require('firebase-functions/v2/https');

const leaseField = '_playerSignInEmailLease';
const leaseMs = 120000; // Longer than the function's wall-time limit.
const fail = (code, message) => new HttpsError(code, message);
const conflict = () => fail('failed-precondition', 'The saved account emails differ from the expected address. Reload the player and verify their current sign-in email before retrying.');
const normalize = text => typeof text === 'string' ? text.trim().toLowerCase() : '';
function validAddress(text) {
  return typeof text === 'string' && text.length <= 254 && /^[^\s@\x00-\x1f\x7f]+@[^\s@\x00-\x1f\x7f]+\.[^\s@\x00-\x1f\x7f]+$/u.test(text);
}
function enabled(value, role) {
  return value === true || value === 1 ||
    (typeof value === 'string' && [role.toLowerCase(), 'true', '1'].includes(value.trim().toLowerCase()));
}
const adminRoles = new Set(['admin', 'super']);
const staffRoles = new Set([...adminRoles, 'staff', 'static', 'waiver']);
function hasRole(roles, allowed) {
  if (typeof roles === 'string') return allowed.has(normalize(roles));
  if (Array.isArray(roles)) return roles.some(role => allowed.has(normalize(role)));
  return roles && typeof roles === 'object' && Object.entries(roles).some(([role, value]) =>
    allowed.has(normalize(role)) && enabled(value, role));
}
function hasCustomRole(user, allowed) {
  const claims = user.customClaims || {};
  return hasRole(claims, allowed) || hasRole(claims.roles, allowed) || hasRole(claims.role, allowed);
}
function protectedProfile(profile) {
  const roles = profile.roles;
  return profile.accountRemovedAt || hasRole(roles, staffRoles) ||
    (roles && typeof roles === 'object' && Object.entries(roles).some(([role, value]) => enabled(value, role)));
}
function validateSignIn(user) {
  if (user.disabled || !user.email) throw fail('failed-precondition', 'The selected player needs an active, email-based Firebase sign-in.');
  if (hasCustomRole(user, staffRoles)) {
    throw fail('permission-denied', 'Staff accounts require a separate recovery path.');
  }
}

async function authorize(request, db, auth) {
  const uid = request.auth?.uid;
  if (!uid) throw fail('unauthenticated', 'Sign in to your USAW admin account.');
  const own = db.ref('users/' + uid);
  const [role, removed, actor] = await Promise.all([
    own.child('roles/ADMIN').get(), own.child('accountRemovedAt').get(), auth.getUser(uid).catch(error => {
      if (error.code === 'auth/user-not-found') throw fail('unauthenticated', 'Sign in again to verify your USAW admin account.');
      throw error;
    }),
  ]);
  const revokedAfter = Date.parse(actor.tokensValidAfterTime);
  const authTime = Number(request.auth.token?.auth_time);
  if (actor.disabled || (Number.isFinite(revokedAfter) && !(authTime >= Math.floor(revokedAfter / 1000)))) {
    throw fail('unauthenticated', 'Sign in again to verify your USAW admin account.');
  }
  if (!enabled(role.val(), 'ADMIN') || removed.val() || !hasCustomRole(actor, adminRoles)) {
    throw fail('permission-denied', 'Your USAW account needs both an active admin role and Firebase admin privileges. Contact the project owner.');
  }
  return uid;
}

function targetProblem(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return fail('not-found', 'The official player profile was not found.');
  if (protectedProfile(profile)) return fail('permission-denied', 'This tool is for active player accounts. Staff accounts require a separate recovery path.');
  return null;
}

// RTDB may first call a transaction with null on a cold instance. A null
// proposal compares against the server without creating a missing profile.
async function changeProfile(ref, transform) {
  let reason;
  const result = await ref.transaction(current => {
    reason = null;
    if (current === null) return null;
    const next = transform(current);
    if (next instanceof HttpsError) { reason = next; return undefined; }
    return next;
  }, undefined, false);
  if (reason) throw reason;
  if (!result.committed) throw fail('aborted', 'The player profile changed. Reload it and retry.');
  if (!result.snapshot.exists()) throw fail('not-found', 'The official player profile was not found.');
  return result.snapshot.val();
}

function translate(error) {
  if (error instanceof HttpsError) return error;
  switch (error?.code) {
    case 'auth/email-already-exists':
    case 'auth/email-already-in-use': return fail('already-exists', 'That email is already used by another sign-in account.');
    case 'auth/invalid-email': return fail('invalid-argument', 'Enter a valid email address.');
    case 'auth/user-not-found': return fail('not-found', 'The Firebase sign-in account was not found.');
    case 'auth/insufficient-permission':
    case 'PERMISSION_DENIED':
    case 'permission-denied': return fail('internal', 'The account service lacks permission to update official accounts. Contact the Firebase project owner.');
    default: return fail('unavailable', 'The account service could not confirm the change. Retry the same email change.');
  }
}

async function handle(request, { auth, db }) {
  try {
    const actor = await authorize(request, db, auth);
    const data = request.data;
    if (data?.action === 'capabilities' && Object.keys(data).length === 1) {
      return { operation: 'updatePlayerSignInEmail', version: 1 };
    }
    const uid = data?.uid;
    const email = normalize(data?.email);
    const expectedEmail = normalize(data?.expectedEmail);
    if (!data || Object.keys(data).some(key => !['uid', 'email', 'expectedEmail'].includes(key)) ||
        typeof uid !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(uid) ||
        !validAddress(email) || typeof data.expectedEmail !== 'string' || (expectedEmail && !validAddress(expectedEmail))) {
      throw fail('invalid-argument', 'Choose a player and enter a valid sign-in email and expected profile email.');
    }
    if (uid === actor) throw fail('permission-denied', 'Use your own account settings for your sign-in email.');
    const ref = db.ref('users/' + uid);
    const intent = createHash('sha256').update(JSON.stringify([uid, expectedEmail, email])).digest('hex');
    const owner = randomUUID();
    const acceptable = value => normalize(value) === email || normalize(value) === expectedEmail;
    const busy = () => fail('aborted', 'An email change is pending for this player. Retry the same requested change shortly.');
    validateSignIn(await auth.getUser(uid));
    let priorLease;
    await changeProfile(ref, current => {
      const problem = targetProblem(current);
      if (problem) return problem;
      if (!acceptable(current.email)) return conflict();
      const lease = current[leaseField];
      if (lease && lease.until > Date.now()) return busy();
      priorLease = lease;
      return { ...current, [leaseField]: { owner, intent, until: Date.now() + leaseMs } };
    });

    let uncertainAuthWrite = false;
    let profileNeedsRepair = false;
    try {
      const [target, profile] = await Promise.all([auth.getUser(uid), ref.get()]);
      validateSignIn(target);
      const current = profile.val();
      const problem = targetProblem(current);
      if (problem) throw problem;
      if (current[leaseField]?.owner !== owner || current[leaseField].until <= Date.now()) throw busy();
      if (!acceptable(target.email) || !acceptable(current.email)) throw conflict();
      if (priorLease && priorLease.intent !== intent && normalize(target.email) !== normalize(current.email)) {
        // An expired operation left the two services out of sync. Only its
        // original intent may resume until the authoritative values agree.
        throw conflict();
      }
      priorLease = null;
      if (normalize(target.email) !== email) {
        // updateUser itself enforces uniqueness atomically in Firebase Auth.
        // Keep an ambiguous write attached to this exact intent across retries.
        uncertainAuthWrite = true;
        try {
          await auth.updateUser(uid, { email, emailVerified: false });
        } catch (error) {
          if (['auth/invalid-email', 'auth/email-already-exists', 'auth/email-already-in-use', 'auth/user-not-found', 'auth/insufficient-permission'].includes(error?.code)) uncertainAuthWrite = false;
          throw error;
        }
        uncertainAuthWrite = false;
      }
      profileNeedsRepair = true;
      await changeProfile(ref, current => {
        if (current[leaseField]?.owner !== owner) return busy();
        const problem = targetProblem(current);
        if (problem) return problem;
        if (!acceptable(current.email)) return conflict();
        return { ...current, email };
      });
      const [savedAuth, savedProfile] = await Promise.all([auth.getUser(uid), ref.get()]);
      const row = savedProfile.val();
      if (!row || row[leaseField]?.owner !== owner || protectedProfile(row) ||
          normalize(savedAuth.email) !== email || normalize(row.email) !== email) throw conflict();
      validateSignIn(savedAuth);
      profileNeedsRepair = false;
      return { uid, email, authEmail: savedAuth.email, profileEmail: row.email, verified: true };
    } finally {
      // Never roll back another writer's Auth change. Unknown Auth outcomes
      // keep the lease until timeout. A confirmed write with a failed profile
      // update permits immediate resumption of the same intent only.
      if (!uncertainAuthWrite) {
        await changeProfile(ref, current => {
          if (current[leaseField]?.owner !== owner) return busy();
          const next = { ...current };
          if (priorLease) next[leaseField] = priorLease;
          else if (profileNeedsRepair) next[leaseField] = { ...current[leaseField], until: 0 };
          else delete next[leaseField];
          return next;
        });
      }
    }
  } catch (error) { throw translate(error); }
}
module.exports = { handle };
