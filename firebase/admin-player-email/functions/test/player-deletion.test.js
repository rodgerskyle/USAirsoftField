'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { removePlayer } = require('../player-deletion');
const uid = 'player-account-01';
const other = 'other-player-02';
const admin = 'administrator';
const name = 'North Ridge';
const request = {
  data: { playerId: uid, confirmation: uid }, auth: { uid: admin, token: { auth_time: 1700000000 } },
  rawRequest: { headers: { authorization: 'Bearer demo-local' } },
};
const completed = { deleted: true, playerId: uid };
const snap = value => ({ val: () => structuredClone(value ?? null), exists: () => value != null });

function fixture() {
  const root = {
    users: { [admin]: { roles: { ADMIN: true } }, [uid]: { name, username: 'ridge', email: 'ridge@example.org' },
      [other]: { name, username: 'ridge1' } },
    teams: { first: { leader: other, members: [[name, uid], [name, other]],
      requests: { r: [name, uid], s: [name, other] } }, second: { members: { 2: [name, uid], 8: [name, other] } } },
    digital_waivers: { old: { name, member: uid } }, rentals: { group: { players: [uid, other] } },
    checkins: { archived: [uid, other] }, emaillist: { subscriber: 'ridge@example.org' },
  };
  const authUsers = { [admin]: { uid: admin, customClaims: { admin: true } },
    [uid]: { uid, metadata: { creationTime: '2024-01-01' }, email: 'ridge@example.org' }, [other]: { uid: other } };
  const hooks = {};
  const writes = [];
  const history = structuredClone({ waivers: root.digital_waivers, checkins: root.checkins, rentals: root.rentals, list: root.emaillist });
  const images = new Set([uid, other]);
  function ref(path) {
    const keys = path.split('/');
    const get = () => keys.reduce((obj, key) => obj?.[key], root);
    return {
      child: key => ref(path + '/' + key),
      get: async () => snap(get()),
      async transaction(transform) {
        transform(null);
        await hooks.beforeTransaction?.(path);
        const next = transform(structuredClone(get() ?? null));
        if (next === undefined) return { committed: false, snapshot: snap(get()) };
        writes.push(path);
        const parent = keys.slice(0, -1).reduce((obj, key) => obj[key], root);
        if (next === null || Array.isArray(next) && !next.length) delete parent[keys.at(-1)];
        else parent[keys.at(-1)] = structuredClone(next);
        return { committed: true, snapshot: snap(next) };
      },
    };
  }
  const missing = () => Object.assign(new Error(), { code: 'auth/user-not-found' });
  const auth = {
    async getUser(id) {
      if (!authUsers[id]) throw missing();
      return structuredClone(authUsers[id]);
    },
    async deleteUser(id) {
      await hooks.beforeAuth?.();
      if (!authUsers[id]) throw missing();
      writes.push('auth/' + id);
      delete authUsers[id];
      await hooks.afterAuth?.();
    },
  };
  const prepare = async (req, id) => {
    assert.equal(req.rawRequest.headers.authorization, 'Bearer demo-local');
    await hooks.beforePrepare?.();
    writes.push('prepare/' + id);
    root.users[id].accountRemovedAt ||= '2025-01-01';
    await hooks.afterPrepare?.();
  };
  const removeAvatar = async id => {
    await hooks.beforeAvatar?.();
    writes.push('avatar/' + id);
    images.delete(id);
  };
  const services = { db: { ref }, auth, prepare, removeAvatar };
  const run = (req = request, options = {}) => removePlayer(req, { ...services, ...options });
  return { root, authUsers, images, writes, hooks, services, history, run };
}
const rejects = (promise, code) => assert.rejects(promise, error => error.code === code);

test('active and previously archived players release their exact Auth UID, username, avatar and team links; independent history is preserved', async () => {
  for (const archived of [false, true]) {
    const f = fixture();
    if (archived) f.root.users[uid].accountRemovedAt = '2020-01-01';
    assert.deepEqual(await f.run(), completed);
    assert.equal(f.root.users[uid], undefined);
    assert.equal(f.authUsers[uid], undefined);
    assert.equal(f.images.has(uid), false);
    assert.equal(f.images.has(other), true);
    assert.deepEqual(f.root.teams.first.members, [[name, other]]);
    assert.deepEqual(f.root.teams.first.requests, { s: [name, other] });
    assert.deepEqual(f.root.teams.second.members, [[name, other]]);
    assert.equal(f.root.users[other].username, 'ridge1');
    assert.deepEqual({ waivers: f.root.digital_waivers, checkins: f.root.checkins,
      rentals: f.root.rentals, list: f.root.emaillist }, f.history);
    f.authUsers['new-uid-003'] = { email: 'ridge@example.org' };
    f.root.users['new-uid-003'] = { name, username: 'ridge' };
    const before = f.writes.slice();
    assert.deepEqual(await f.run(), completed);
    assert.deepEqual(f.writes, before);
    assert.ok(f.authUsers['new-uid-003']);
    assert.equal(f.root.users['new-uid-003'].username, 'ridge');
  }
});

test('caller, identity, staff and team-owner guards run before cleanup', async () => {
  for (const [alter, req, code] of [
    [() => {}, { ...request, auth: null }, 'unauthenticated'],
    [f => delete f.authUsers[admin].customClaims, request, 'permission-denied'],
    [f => delete f.root.users[admin].roles, request, 'permission-denied'],
    [() => {}, { ...request, data: { playerId: admin, confirmation: admin } }, 'permission-denied'],
    [() => {}, { ...request, data: { ...request.data, confirmation: other } }, 'invalid-argument'],
    [() => {}, { ...request, data: { playerId: '../users/id', confirmation: '../users/id' } }, 'invalid-argument'],
    [() => {}, { ...request, data: { ...request.data, force: true } }, 'invalid-argument'],
    [f => { f.root.users[uid].roles = { WAIVER: 'waiver' }; }, request, 'permission-denied'],
    [f => { f.authUsers[uid].customClaims = { roles: { STAFF: true } }; }, request, 'permission-denied'],
    [f => { f.root.users[uid].accountRemovedAt = 1; f.root.teams.second.leader = uid; }, request, 'failed-precondition'],
    [f => { f.root.users[uid]._playerSignInEmailLease = { until: Date.now() + 20000 }; }, request, 'aborted'],
    [f => { delete f.root.users[uid]; }, request, 'not-found'],
  ]) {
    const f = fixture(); alter(f);
    await rejects(f.run(req), code);
    assert.deepEqual(f.writes, []);
  }
});

test('legacy, mismatched, failed or missing Companion confirmations can never release the sign-in or profile', async t => {
  const fetch = t.mock.method(globalThis, 'fetch');
  for (const [body, status, code] of [
    [{ removed: true, playerId: uid }, 200, 'unavailable'], [{ prepared: true, playerId: other }, 200, 'unavailable'],
    [{ prepared: true, playerId: uid }, 502, 'unavailable'], [{}, 403, 'permission-denied'],
    [{ error: 'Transfer team ownership before removing this player account.' }, 409, 'failed-precondition'],
    [{ error: 'This profile changed.' }, 409, 'aborted'],
  ]) {
    const f = fixture();
    fetch.mock.mockImplementation(async (url, init) => {
      if (url.hostname === 'metadata.google.internal') {
        assert.equal(url.pathname, '/computeMetadata/v1/instance/service-accounts/default/identity');
        assert.equal(url.searchParams.get('audience'), 'https://app.usairsoftfield.com/api/staff-player-accounts#' + admin + '/' + uid);
        assert.deepEqual(init.headers, { 'Metadata-Flavor': 'Google' });
        assert.equal(init.redirect, 'error');
        return new Response('signed.workload.token');
      }
      assert.equal(url.href, 'https://app.usairsoftfield.com/api/staff-player-accounts');
      assert.equal(init.headers['X-USAW-Deletion-Caller'], 'signed.workload.token');
      assert.equal(init.redirect, 'error');
      assert.equal(init.headers.Authorization, 'Bearer demo-local');
      assert.equal(init.headers.Origin, 'https://www.usairsoftfield.com');
      assert.deepEqual(JSON.parse(init.body), { ...request.data, action: 'preparePermanentDeletion' });
      return Response.json(body, { status });
    });
    await rejects(f.run(request, { prepare: undefined }), code);
    assert.deepEqual(f.writes, []);
    assert.ok(f.authUsers[uid]);
  }
  const f = fixture();
  let requests = 0;
  fetch.mock.mockImplementation(async url => {
    requests++;
    assert.equal(url.hostname, 'metadata.google.internal');
    return new Response('missing', { status: 403 });
  });
  await rejects(f.run(request, { prepare: undefined }), 'unavailable');
  assert.equal(requests, 1);
  await rejects(f.run(request, { prepare: async () => {} }), 'aborted');
  await rejects(f.run({ ...request, rawRequest: undefined }, { prepare: undefined }), 'unauthenticated');
  assert.deepEqual(f.writes, []);
});

test('cleanup retries recover after loss of an Auth response, profile write, avatar or a previously missing sign-in', async () => {
  for (const stage of ['beforeAvatar', 'beforeAuth', 'afterAuth', 'beforeTransaction', 'missing-auth']) {
    const f = fixture();
    if (stage === 'missing-auth') delete f.authUsers[uid];
    else {
      f.hooks[stage] = path => {
        if (stage !== 'beforeTransaction' || path === 'users/' + uid) throw new Error('interrupted');
      };
      await rejects(f.run(), 'unavailable');
      assert.ok(f.root.users[uid].accountRemovedAt);
      delete f.hooks[stage];
    }
    assert.deepEqual(await f.run(), completed);
    assert.equal(f.root.users[uid], undefined);
    assert.equal(f.authUsers[uid], undefined);
  }
});

test('concurrent team edits are preserved and a newly protected or replaced account fails closed', async () => {
  const f = fixture();
  f.hooks.beforeTransaction = path => {
    if (path === 'teams/first/members') f.root.teams.first.members.push([name, 'new-player-003']);
  };
  assert.deepEqual(await f.run(), completed);
  assert.deepEqual(f.root.teams.first.members, [[name, other], [name, 'new-player-003']]);
  for (const [update, code] of [
    [fixture => { fixture.root.teams.first.leader = uid; }, 'failed-precondition'],
    [fixture => { fixture.root.users[uid].roles = { ADMIN: true }; }, 'permission-denied'],
    [fixture => { fixture.authUsers[uid].customClaims = { super: true }; }, 'permission-denied'],
    [fixture => { fixture.authUsers[uid].metadata.creationTime = '2025-02-02'; }, 'aborted'],
    [fixture => { delete fixture.root.users[uid].accountRemovedAt; }, 'aborted'],
  ]) {
    const f = fixture(); f.hooks.afterPrepare = () => update(f);
    await rejects(f.run(), code);
    assert.ok(f.authUsers[uid]);
    assert.ok(f.root.users[uid]);
    assert.ok(f.images.has(uid));
  }
});
