'use strict';
const { HttpsError } = require('firebase-functions/v2/https');
const { authorize, hasStaffClaims } = require('./player-email');

const websiteOrigin = 'https://www.usairsoftfield.com';
const companionOrigin = 'https://app.usairsoftfield.com';
const fieldPlayerId = /^[A-Za-z0-9_-]{10,128}$/;
const retry = () => new HttpsError('unavailable', 'Deletion could not be confirmed. Retry permanent deletion for the same player.');
const protectedAccount = () => new HttpsError('permission-denied', 'Staff and protected accounts cannot be deleted here.');
const captain = () => new HttpsError('failed-precondition', 'Transfer team ownership before deleting this player.');
const changed = () => new HttpsError('aborted', 'This player account changed. Reload it before retrying deletion.');

function checkTarget(profile, user) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new HttpsError('not-found', 'The official player profile was not found.');
  }
  const roles = profile.roles;
  // Include unrecognized enabled role flags, including those on older profiles.
  if ((roles != null && (typeof roles !== 'object' || Object.values(roles).some(Boolean))) ||
      (user && hasStaffClaims(user))) throw protectedAccount();
  if (profile._playerSignInEmailLease?.until > Date.now()) {
    throw new HttpsError('aborted', 'An email update is pending. Retry deletion after it finishes.');
  }
}

async function authRecord(auth, uid) {
  try { return await auth.getUser(uid); }
  catch (error) {
    if (error?.code === 'auth/user-not-found') return null;
    throw error;
  }
}

// Only the official Companion receives the incoming administrator ID token.
// Emulator requests may only use an explicitly configured loopback mock.
function preparationUrl() {
  let origin = companionOrigin;
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    const value = process.env.COMPANION_ACCOUNT_EMULATOR_ORIGIN || '';
    if (!/^http:\/\/(?:127\.0\.0\.1|localhost):[1-9][0-9]{0,4}$/.test(value)) {
      throw new HttpsError('failed-precondition', 'Configure a local Companion preparation endpoint for emulator testing.');
    }
    origin = value;
  }
  return new URL('/api/staff-player-accounts', origin);
}

async function callerToken(actorUid, uid) {
  const tokenUrl = new URL('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity');
  tokenUrl.searchParams.set('audience', companionOrigin + '/api/staff-player-accounts#' + actorUid + '/' + uid);
  const response = await fetch(tokenUrl, {
    headers: { 'Metadata-Flavor': 'Google' }, redirect: 'error', signal: AbortSignal.timeout(4_000),
  });
  if (!response.ok) throw retry();
  const token = (await response.text()).trim();
  if (token.length > 16_384 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw retry();
  return token;
}

async function prepareCompanion(request, uid) {
  const authorization = request.rawRequest?.headers?.authorization;
  if (typeof authorization !== 'string' || !/^Bearer [^\s]+$/i.test(authorization)) {
    throw new HttpsError('unauthenticated', 'Sign in again to confirm account deletion.');
  }
  const url = preparationUrl();
  const headers = { Authorization: authorization, Origin: websiteOrigin, 'Content-Type': 'application/json' };
  if (process.env.FUNCTIONS_EMULATOR !== 'true') {
    headers['X-USAW-Deletion-Caller'] = await callerToken(request.auth.uid, uid);
  }
  const response = await fetch(url, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(35_000), headers,
    body: JSON.stringify({ action: 'preparePermanentDeletion', playerId: uid, confirmation: uid }),
  });
  if (response.status === 401) throw new HttpsError('unauthenticated', 'Sign in again to confirm account deletion.');
  if (response.status === 403) throw new HttpsError('permission-denied', 'Companion denied permission to delete this account.');
  if (response.status === 409) {
    const problem = await response.json().catch(() => ({}));
    if (/transfer team ownership/i.test(problem?.error ?? '')) throw captain();
    throw changed();
  }
  if (!response.ok) throw retry();
  const receipt = await response.json();
  if (receipt?.prepared !== true || receipt.playerId !== uid) throw retry();
}

// Some team records use numeric arrays and older ones use maps. Compare the
// UID stored in the tuple, never the name, array index or team on the profile.
function belongsTo(entry, uid) {
  return entry && typeof entry === 'object' && entry[1] === uid;
}

function rosterWithout(roster, uid) {
  if (!roster || typeof roster !== 'object' || !Object.values(roster).some(entry => belongsTo(entry, uid))) return undefined;
  const entries = Object.entries(roster);
  const kept = entries.filter(([, entry]) => entry != null && !belongsTo(entry, uid));
  // RTDB returns a sparse numeric list as an object. Legacy team management
  // expects an array it can splice, so compact numeric indices in roster order.
  if (Array.isArray(roster) || entries.every(([key]) => /^(0|[1-9][0-9]{0,8})$/.test(key))) {
    return kept.map(([, entry]) => entry);
  }
  return Object.fromEntries(kept);
}

async function fieldTeams(db, uid) {
  const teams = (await db.ref('teams').get()).val() || {};
  const rosters = [];
  for (const [id, team] of Object.entries(teams)) {
    if (team?.leader === uid) throw captain();
    for (const list of ['members', 'requests']) {
      if (Object.values(team?.[list] || {}).some(entry => belongsTo(entry, uid))) {
        rosters.push(db.ref('teams').child(id).child(list));
      }
    }
  }
  return rosters;
}

async function clearFieldRosters(db, uid) {
  for (const roster of await fieldTeams(db, uid)) {
    // A cold SDK callback can first receive null. Return null to compare it
    // with the server; abort a non-empty roster when another writer cleaned it.
    await roster.transaction(entries => entries === null ? null : rosterWithout(entries, uid), undefined, false);
  }
}

async function removePlayer(request, { auth, db, removeAvatar, prepare = prepareCompanion }) {
  try {
    const actor = await authorize(request, db, auth);
    const data = request.data;
    const uid = data?.playerId;
    if (typeof uid !== 'string' || !fieldPlayerId.test(uid) || data.confirmation !== uid ||
        Object.keys(data).some(key => !['playerId', 'confirmation'].includes(key))) {
      throw new HttpsError('invalid-argument', 'Confirm the exact player ID to permanently delete the account.');
    }
    if (uid === actor) throw protectedAccount();
    const ref = db.ref('users/' + uid);
    const [snapshot, target] = await Promise.all([ref.get(), authRecord(auth, uid)]);
    const done = { deleted: true, playerId: uid };
    // This also covers a lost success response. An orphaned Auth sign-in has
    // no reviewed player profile, so it is never selected for destruction.
    if (!snapshot.exists() && !target) return done;
    checkTarget(snapshot.val(), target);
    await fieldTeams(db, uid);
    await prepare(request, uid);
    const [archived, signIn] = await Promise.all([ref.get(), authRecord(auth, uid)]);
    if (!archived.exists() && !signIn) return done;
    const profile = archived.val();
    checkTarget(profile, signIn);
    const marker = profile.accountRemovedAt;
    if (!marker) throw changed();
    if (signIn && (!target || target.metadata.creationTime !== signIn.metadata.creationTime)) throw changed();

    // Leave the archived profile discoverable for retry until all other
    // deletion steps succeed. Every mutation addresses this exact UID.
    await clearFieldRosters(db, uid);
    await removeAvatar(uid);
    const [latest, current, remainingRosters] = await Promise.all([authRecord(auth, uid), ref.get(), fieldTeams(db, uid)]);
    if (remainingRosters.length) throw changed();
    if (!current.exists() && !latest) return done;
    checkTarget(current.val(), latest);
    if (current.val().accountRemovedAt !== marker ||
        (latest && (!signIn || signIn.metadata.creationTime !== latest.metadata.creationTime))) throw changed();
    if (latest) {
      try { await auth.deleteUser(uid); }
      catch (error) { if (error?.code !== 'auth/user-not-found') throw error; }
    }
    // Re-evaluate any writes that raced the final transaction. A missing
    // profile is a valid end state for two identical simultaneous requests.
    let reason;
    const result = await ref.transaction(row => {
      reason = null;
      if (row === null) return null;
      try { checkTarget(row, null); } catch (error) { reason = error; return undefined; }
      if (row.accountRemovedAt !== marker) { reason = changed(); return undefined; }
      return null;
    }, undefined, false);
    if (reason) throw reason;
    if (!result.committed || result.snapshot.exists() || await authRecord(auth, uid)) throw retry();
    return done;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (['auth/insufficient-permission', 'PERMISSION_DENIED', 'permission-denied', 403].includes(error?.code)) {
      throw new HttpsError('internal', 'The account service lacks permission to finish deletion. Contact the Firebase project owner.');
    }
    throw retry();
  }
}

module.exports = { removePlayer };
