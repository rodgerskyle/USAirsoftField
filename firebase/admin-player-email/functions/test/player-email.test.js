'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { handle } = require('../player-email');

const oldEmail = 'prior@example.org';
const newEmail = 'next@example.org';
const thirdEmail = 'other@example.org';
const leaseField = '_playerSignInEmailLease';
const actor = { uid: 'admin', token: { auth_time: 1700000000 } };
const change = { uid: 'player', expectedEmail: oldEmail, email: newEmail };

function leaseFor(expected, desired) {
  const intent = createHash('sha256').update(JSON.stringify(['player', expected, desired])).digest('hex');
  return { owner: 'interrupted-call', intent, until: Date.now() - 1 };
}

function snapshot(value) {
  const saved = structuredClone(value ?? null);
  return { val: () => structuredClone(saved), exists: () => saved !== null };
}

function fixture() {
  const profiles = {
    admin: { roles: { ADMIN: 'admin' } },
    player: { email: oldEmail, callsign: 'Ridge', equipment: { radio: true } },
  };
  const records = {
    admin: { uid: 'admin', email: 'admin@example.org', customClaims: { admin: true } },
    player: { uid: 'player', email: oldEmail, emailVerified: true, providerData: [{ providerId: 'password' }] },
  };
  const root = { users: profiles };
  const reads = [];
  const updates = [];
  const hooks = {};
  function ref(path) {
    const segments = path.split('/');
    const read = () => segments.reduce((obj, key) => obj?.[key], root);
    return {
      child: key => ref(path + '/' + key),
      async get() {
        reads.push(path);
        return snapshot(read());
      },
      async transaction(transform) {
        reads.push(path);
        // A fresh process may see null before the transaction compares with the server.
        transform(null);
        const value = read();
        const next = transform(structuredClone(value ?? null));
        if (next === undefined) return { committed: false, snapshot: snapshot(value) };
        hooks.transaction?.(value, next);
        if (next !== null) {
          const parent = segments.slice(0, -1).reduce((obj, key) => obj[key], root);
          parent[segments.at(-1)] = structuredClone(next);
        }
        return { committed: true, snapshot: snapshot(next) };
      },
    };
  }
  const auth = {
    async getUser(uid) {
      reads.push('auth/' + uid);
      if (!records[uid]) throw Object.assign(new Error(), { code: 'auth/user-not-found' });
      return structuredClone(records[uid]);
    },
    async updateUser(uid, values) {
      updates.push({ uid, values: structuredClone(values) });
      if (Object.values(records).some(row => row.uid !== uid && row.email === values.email)) {
        throw Object.assign(new Error(), { code: 'auth/email-already-exists' });
      }
      await hooks.beforeAuthWrite?.();
      Object.assign(records[uid], values);
      await hooks.afterAuthWrite?.();
      return structuredClone(records[uid]);
    },
  };
  const run = (data = change, authContext = actor) => handle({ data, auth: authContext }, { db: { ref }, auth });
  return { profiles, records, reads, updates, hooks, run };
}

function rejected(call, code) {
  return assert.rejects(call, error => error.code === code);
}

test('capability discovery is authorized, needs no target, and makes no writes', async () => {
  const f = fixture();
  assert.deepEqual(await f.run({ action: 'capabilities' }), { operation: 'updatePlayerSignInEmail', version: 1 });
  assert.ok(f.reads.every(path => path.startsWith('users/admin/') || path === 'auth/admin'));
  assert.deepEqual(f.updates, []);
  assert.deepEqual(f.profiles.admin, { roles: { ADMIN: 'admin' } });
  await rejected(f.run({ action: 'capabilities', uid: 'player' }), 'invalid-argument');
});

test('anonymous, nonadmin, removed, disabled, and revoked callers never read a target', async t => {
  const cases = [
    ['anonymous', () => null, 'unauthenticated'],
    ['claim without official ADMIN role', f => { f.profiles.admin.roles = {}; return { ...actor, token: { ...actor.token, admin: true } }; }, 'permission-denied'],
    ['official role without admin claim', f => { f.records.admin.customClaims = {}; return actor; }, 'permission-denied'],
    ['removed', f => { f.profiles.admin.accountRemovedAt = 123; return actor; }, 'permission-denied'],
    ['disabled', f => { f.records.admin.disabled = true; return actor; }, 'unauthenticated'],
    ['revoked', f => { f.records.admin.tokensValidAfterTime = new Date((actor.token.auth_time + 10) * 1000).toUTCString(); return actor; }, 'unauthenticated'],
  ];
  for (const [label, modify, code] of cases) {
    await t.test(label, async () => {
      const f = fixture();
      const caller = modify(f);
      await rejected(f.run(change, caller), code);
      await rejected(f.run({ action: 'capabilities' }, caller), code);
      assert.ok(f.reads.every(path => !path.includes('player')));
      assert.equal(f.updates.length, 0);
    });
  }
});

test('self, removed, disabled and privileged targets cannot be changed', async t => {
  const cases = [
    ['self', () => {}, 'admin', 'permission-denied'],
    ['removed profile', f => { f.profiles.player.accountRemovedAt = 10; }, 'player', 'permission-denied'],
    ['official SUPER role', f => { f.profiles.player.roles = { SUPER: 1 }; }, 'player', 'permission-denied'],
    ['admin claim only', f => { f.records.player.customClaims = { admin: true }; }, 'player', 'permission-denied'],
    ['nested staff claim only', f => { f.records.player.customClaims = { roles: { WAIVER: true } }; }, 'player', 'permission-denied'],
    ['disabled sign-in', f => { f.records.player.disabled = true; }, 'player', 'failed-precondition'],
    ['missing sign-in', f => { delete f.records.player; }, 'player', 'not-found'],
    ['missing profile', f => { delete f.profiles.player; }, 'player', 'not-found'],
  ];
  for (const [label, modify, uid, code] of cases) {
    await t.test(label, async () => {
      const f = fixture();
      modify(f);
      const before = structuredClone(f.profiles);
      await rejected(f.run({ ...change, uid }), code);
      assert.deepEqual(f.updates, []);
      assert.deepEqual(f.profiles, before);
    });
  }
});

test('invalid or extraneous mutation inputs do not contact any target', async () => {
  const f = fixture();
  for (const input of [{ uid: 'player', email: newEmail }, { ...change, uid: 'player/roles' },
    { ...change, email: 'invalid' }, { ...change, expectedEmail: 'invalid' }, { ...change, impersonate: 'admin' }]) {
    await rejected(f.run(input), 'invalid-argument');
  }
  assert.ok(f.reads.every(path => !path.includes('player')));
  assert.deepEqual(f.updates, []);
});

test('the same UID changes in both stores, preserves other fields and confirms server readback', async () => {
  const f = fixture();
  const result = await f.run({ ...change, email: ' Next@Example.ORG ', expectedEmail: oldEmail.toUpperCase() });
  assert.deepEqual(result, { verified: true, uid: 'player', email: newEmail, authEmail: newEmail, profileEmail: newEmail });
  assert.deepEqual(f.updates, [{ uid: 'player', values: { email: newEmail, emailVerified: false } }]);
  assert.deepEqual(f.profiles.player, { email: newEmail, callsign: 'Ridge', equipment: { radio: true } });
  assert.deepEqual(f.records.player.providerData, [{ providerId: 'password' }]);
  f.records.player.emailVerified = true;
  assert.deepEqual(await f.run(), result);
  assert.equal(f.updates.length, 1);
  assert.equal(f.records.player.emailVerified, true);
});

test('legacy partial saves in either direction can be completed without repeating Auth writes', async () => {
  for (const saved of ['records', 'profiles']) {
    const f = fixture();
    f[saved].player.email = newEmail;
    assert.equal((await f.run()).verified, true);
    assert.equal(f.records.player.email, newEmail);
    assert.equal(f.profiles.player.email, newEmail);
    assert.equal(f.updates.length, saved === 'records' ? 0 : 1);
  }
});

test('a third address in either store is a conflict and must survive', async () => {
  for (const changed of ['profiles', 'records']) {
    const f = fixture();
    f[changed].player.email = thirdEmail;
    await rejected(f.run(), 'failed-precondition');
    assert.equal(f[changed].player.email, thirdEmail);
    assert.deepEqual(f.updates, []);
    assert.equal(f.profiles.player[leaseField], undefined);
  }
});

test('another account owning the address returns a duplicate error and releases the claim', async () => {
  const f = fixture();
  f.records.other = { uid: 'other', email: newEmail };
  await rejected(f.run(), 'already-exists');
  assert.equal(f.records.player.email, oldEmail);
  assert.equal(f.profiles.player.email, oldEmail);
  assert.equal(f.profiles.player[leaseField], undefined);
});

test('abandoned and completed expired claims allow a fresh change from the verified address', async () => {
  for (const current of [oldEmail, newEmail]) {
    const f = fixture();
    f.profiles.player.email = current;
    f.records.player.email = current;
    f.profiles.player[leaseField] = leaseFor(oldEmail, newEmail);
    assert.equal((await f.run({ ...change, expectedEmail: current, email: thirdEmail })).verified, true);
    assert.equal(f.records.player.email, thirdEmail);
    assert.equal(f.profiles.player.email, thirdEmail);
    assert.equal(f.profiles.player[leaseField], undefined);
  }
});

test('unrelated work cannot take over a split expired claim; its original change can resume', async () => {
  const f = fixture();
  const lease = leaseFor(oldEmail, newEmail);
  f.records.player.email = newEmail;
  f.profiles.player[leaseField] = lease;
  await assert.rejects(f.run({ ...change, email: thirdEmail }), error => ['failed-precondition', 'aborted'].includes(error.code));
  assert.equal(f.profiles.player[leaseField]?.intent, lease.intent);
  assert.equal(f.profiles.player.email, oldEmail);
  assert.equal(f.records.player.email, newEmail);
  assert.equal((await f.run()).verified, true);
  assert.deepEqual(f.updates, []);
});

test('a failed profile save after an acknowledged Auth update permits immediate same-change recovery', async () => {
  const f = fixture();
  f.hooks.transaction = (before, after) => {
    if (before?.email === oldEmail && after?.email === newEmail) throw new Error('temporary database failure');
  };
  await rejected(f.run(), 'unavailable');
  assert.equal(f.records.player.email, newEmail);
  assert.equal(f.profiles.player.email, oldEmail);
  delete f.hooks.transaction;
  await f.run();
  assert.equal(f.updates.length, 1);
  assert.equal(f.profiles.player.email, newEmail);
});

test('an ambiguous Auth acknowledgment does not clobber another write; retry repairs the profile', async () => {
  const f = fixture();
  f.hooks.afterAuthWrite = () => { throw Object.assign(new Error('response lost'), { code: 'ECONNRESET' }); };
  await rejected(f.run(), 'unavailable');
  await assert.rejects(f.run({ ...change, email: thirdEmail }), err => ['failed-precondition', 'aborted'].includes(err.code));
  assert.equal(f.records.player.email, newEmail);
  assert.equal(f.profiles.player.email, oldEmail);
  f.profiles.player[leaseField].until = Date.now() - 1;
  delete f.hooks.afterAuthWrite;
  await f.run();
  assert.equal(f.updates.length, 1);
  assert.equal(f.profiles.player.email, newEmail);
});

test('overlapping requests cannot overwrite the active change', async () => {
  const f = fixture();
  let entered;
  let resume;
  const started = new Promise(resolve => { entered = resolve; });
  const block = new Promise(resolve => { resume = resolve; });
  f.hooks.beforeAuthWrite = async () => { entered(); await block; };
  const first = f.run();
  try {
    await started;
    await rejected(f.run({ ...change, email: thirdEmail }), 'aborted');
  } finally {
    resume();
  }
  assert.equal((await first).verified, true);
  assert.equal(f.updates.length, 1);
  assert.equal(f.profiles.player.email, newEmail);
});
