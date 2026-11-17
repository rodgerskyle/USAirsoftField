import { webcrypto } from 'crypto';
import { TextEncoder } from 'util';
import { runTransaction } from 'firebase/database';
import { mutatePartyCalendar, newPartyBookingId } from './partyCalendarRecords';
import { partyBookingIdentity } from './partyBookingKey';

jest.mock('firebase/database', () => ({ runTransaction: jest.fn() }));
const ref = {};
const start = '2026-11-20T19:00:00.000Z';
const end = '2026-11-20T22:00:00.000Z';
const one = { title: 'Fixture party', size: '12', start, end, internal: { contact: 'fixture', audit: [2, 7] } };
const two = { ...one, title: 'Other fixture', notes: 'staff only' };

let server;
let retry;
const clone = value => JSON.parse(JSON.stringify(value));

beforeAll(() => {
  Object.defineProperty(global, 'TextEncoder', { value: TextEncoder, configurable: true });
  Object.defineProperty(global, 'crypto', { value: webcrypto, configurable: true });
});

beforeEach(() => {
  server = {};
  retry = null;
  runTransaction.mockReset();
  runTransaction.mockImplementation(async (location, update, options) => {
    expect(location).toBe(ref);
    expect(options).toEqual({ applyLocally: false });
    // RTDB compares the server revision and repeats the callback on conflict.
    let next = update(null);
    if (next === undefined) return { committed: false };
    next = update(clone(server));
    if (retry && next !== undefined) {
      server = retry(server);
      next = update(clone(server));
    }
    if (next === undefined) return { committed: false };
    server = clone(next);
    return { committed: true };
  });
});

test('concurrent creates append after sparse numeric keys, preserve other fields and replay one request safely', async () => {
  server = { 0: one, 8: two, metadata: 'retain' };
  retry = rows => ({ ...rows, 9: { ...two, title: 'Concurrent booking' } });
  const bookingId = newPartyBookingId();
  expect(bookingId).toMatch(/^[a-f0-9]{64}$/);
  const action = { action: 'create', values: { ...one, title: 'New party' }, bookingId };
  const saved = await mutatePartyCalendar(ref, action);
  expect(saved).toEqual({ key: '10', bookingId, refreshBookingIds: [] });
  expect(server['0']).toEqual(one);
  expect(server['8']).toEqual(two);
  expect(server['9'].title).toBe('Concurrent booking');
  expect(server.metadata).toBe('retain');
  expect(server['10'].bookingId).toBe(bookingId);
  expect(server['10']).not.toHaveProperty('internal');
  retry = null;
  const committed = clone(server);
  expect(await mutatePartyCalendar(ref, action)).toEqual(saved);
  expect(server).toEqual(committed);
  await expect(mutatePartyCalendar(ref, { ...action, values: two })).rejects.toThrow(/reopen/i);
  expect(server).toEqual(committed);
});

test('upgrades a unique legacy booking without losing private fields or unrelated simultaneous changes', async () => {
  server = [one, two];
  const prev = clone(server);
  const expected = await partyBookingIdentity(one);
  retry = rows => ({ ...rows, 1: { ...rows[1], notes: 'updated by another staff member' } });
  const saved = await mutatePartyCalendar(ref, { action: 'edit', index: 0, original: one, originalCalendar: prev, values: { title: 'Updated' } });
  expect(saved).toEqual({ key: '0', bookingId: expected, refreshBookingIds: [expected] });
  expect(server['0']).toEqual({ ...one, title: 'Updated', bookingId: expected });
  expect(server['1'].notes).toBe('updated by another staff member');
});

test('does not overwrite a concurrent edit, including a change to a private field', async () => {
  server = [one, two];
  const prev = clone(server);
  retry = rows => ({ ...rows, 0: { ...rows[0], internal: { ...rows[0].internal, audit: [2, 7, 9] } } });
  await expect(mutatePartyCalendar(ref, { action: 'edit', index: 0, original: one, originalCalendar: prev, values: { title: 'Mine' } })).rejects.toThrow(/reopen/i);
  expect(server['0'].title).toBe(one.title);
  expect(server['0'].internal.audit).toEqual([2, 7, 9]);
});

test('a moved durable booking is followed by ID while moved legacy rows must be reopened', async () => {
  const identified = { ...one, bookingId: newPartyBookingId() };
  const prev = [two, identified];
  server = [identified];
  const saved = await mutatePartyCalendar(ref, { action: 'remove', index: 1, original: identified, originalCalendar: prev });
  expect(saved.key).toBe('0');
  expect(server).toEqual({});
  server = [one];
  await expect(mutatePartyCalendar(ref, { action: 'remove', index: 1, original: one, originalCalendar: [two, one] })).rejects.toThrow(/reopen/i);
  expect(server[0]).toEqual(one);
});

test('distinguishes identical twins by immutable saved index, retires every ambiguous legacy ID and preserves fields', async () => {
  const last = { ...one, internal: { contact: 'other fixture', audit: [3] } };
  server = { 1: one, 3: clone(one), 5: last, 8: two };
  const oldIdentity = await partyBookingIdentity(one);
  const saved = await mutatePartyCalendar(ref, { action: 'edit', index: 3, original: clone(one), originalCalendar: clone(server), values: { title: 'Edited twin' } });
  const storedIds = ['1', '3', '5'].map(key => server[key].bookingId);
  expect(storedIds.every(id => /^[a-f0-9]{64}$/.test(id) && id !== oldIdentity)).toBe(true);
  expect(new Set(storedIds).size).toBe(3);
  expect(saved.refreshBookingIds).toEqual([oldIdentity, storedIds[1]]);
  expect(server['1']).toEqual({ ...one, bookingId: storedIds[0] });
  expect(server['3']).toEqual({ ...one, title: 'Edited twin', bookingId: storedIds[1] });
  expect(server['5']).toEqual({ ...last, bookingId: storedIds[2] });
  expect(server['8']).toEqual(two);
});

test('removing a legacy twin gives its survivor a new ID and never shifts an unrelated index', async () => {
  server = [one, clone(one), two];
  const oldIdentity = await partyBookingIdentity(one);
  const saved = await mutatePartyCalendar(ref, { action: 'remove', index: 0, original: one, originalCalendar: clone(server) });
  expect(saved.refreshBookingIds).toEqual([oldIdentity]);
  expect(server['0']).toBeUndefined();
  expect(server['1'].bookingId).toMatch(/^[a-f0-9]{64}$/);
  expect(server['1'].bookingId).not.toBe(oldIdentity);
  expect(server['2']).toEqual(two);
});

test('aborts when a concurrent legacy splice puts an indistinguishable sibling at the old index', async () => {
  server = [one, one, two];
  const prev = clone(server);
  retry = () => [one, two];
  await expect(mutatePartyCalendar(ref, { action: 'remove', index: 0, original: one, originalCalendar: prev })).rejects.toThrow(/reopen/i);
  expect(server).toEqual([one, two]);
});

test('legacy rows with invalid times remain repairable or removable', async () => {
  const damaged = { ...one, start: 'no time', end: null };
  server = { 4: damaged, 9: two };
  const repaired = await mutatePartyCalendar(ref, { action: 'edit', index: '4', original: damaged, originalCalendar: clone(server), values: { start, end } });
  expect(repaired.bookingId).toMatch(/^[a-f0-9]{64}$/);
  expect(server['4'].internal).toEqual(damaged.internal);
  expect(server['9']).toEqual(two);
  server = { 4: damaged, 9: two };
  const removed = await mutatePartyCalendar(ref, { action: 'remove', index: '4', original: damaged, originalCalendar: clone(server) });
  expect(removed).toEqual({ key: '4', bookingId: null, refreshBookingIds: [] });
  expect(server).toEqual({ 9: two });
});

test('rejects missing records and conflicting duplicate durable IDs', async () => {
  server = null;
  await expect(mutatePartyCalendar(ref, { action: 'remove', index: 0, original: one })).rejects.toThrow(/reopen/i);
  const identified = { ...one, bookingId: newPartyBookingId() };
  server = [identified, { ...two, bookingId: identified.bookingId }];
  await expect(mutatePartyCalendar(ref, { action: 'remove', index: 0, original: identified })).rejects.toThrow(/reopen/i);
  expect(server).toHaveLength(2);
});

test('a legacy shadow of a renamed identified booking cannot inherit its group when that booking is removed', async () => {
  const originalId = await partyBookingIdentity(one);
  const renamed = { ...one, title: 'New title', bookingId: originalId };
  server = { 0: renamed, 1: two };
  const before = clone(server);
  // This shadow was added after the editor opened and matches the OLD title.
  server[4] = { ...one, staffOnly: 'another family' };
  const removed = await mutatePartyCalendar(ref, { action: 'remove', index: 0, original: renamed, originalCalendar: before });
  expect(removed.refreshBookingIds).toEqual([originalId]);
  expect(server[0]).toBeUndefined();
  expect(server[1]).toEqual(two);
  expect(server[4].staffOnly).toBe('another family');
  expect(server[4].bookingId).toMatch(/^[a-f0-9]{64}$/);
  expect(server[4].bookingId).not.toBe(originalId);
});
