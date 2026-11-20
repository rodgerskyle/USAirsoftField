import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import GroupCheckIn from './GroupCheckIn';
import StaffGroupLookup from './StaffGroupLookup';

jest.mock('../Firebase', () => ({ withFirebase: Component => Component }));
const originalFetch = global.fetch;
const originalCrypto = window.crypto;
const reply = data => ({ ok: true, json: async () => data });
const group = { id: '00000000-0000-4000-8000-000000000001', name: 'Family game day', date: '2026-12-05', code: 'abcdefgh12345678', isOwner: true, capacity: 30,
  entries: [{ id: 'owner-entry', displayName: 'Owner', isYou: true, kind: 'player' }, { id: 'guest-entry', displayName: 'New Friend', kind: 'guest', canRemove: true }] };

function setup(signedIn = true) {
  const user = signedIn ? { uid: 'PlayerAccountAAA', getIdToken: jest.fn().mockResolvedValue('test-owner-token') } : null;
  let authChange;
  const firebase = { auth: { currentUser: user, onAuthStateChanged: handler => { authChange = handler; handler(user); return () => {}; } } };
  const view = render(<HelmetProvider><MemoryRouter><GroupCheckIn firebase={firebase} /></MemoryRouter></HelmetProvider>);
  return { ...view, firebase, authChange: value => { firebase.auth.currentUser = value; authChange(value); } };
}

beforeEach(() => {
  global.fetch = jest.fn();
  window.localStorage.clear();
  Object.defineProperty(window, 'crypto', { configurable: true, value: {
    randomUUID: () => '00000000-0000-4000-8000-000000000099', getRandomValues: bytes => bytes.fill(27),
  } });
});
afterEach(() => {
  global.fetch = originalFetch;
  Object.defineProperty(window, 'crypto', { configurable: true, value: originalCrypto });
  jest.restoreAllMocks();
});

test('creates an authenticated planned group, permits owner cancellation, and clears private data on sign out', async () => {
  global.fetch.mockResolvedValueOnce(reply({ groups: [] })).mockResolvedValueOnce(reply({ ok: true, group }))
    .mockResolvedValueOnce(reply({ groups: [{ ...group, memberCount: 2 }] }))
    .mockResolvedValueOnce(reply({ ok: true, group: null })).mockResolvedValueOnce(reply({ groups: [] }));
  const view = setup();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create group' })).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Game-day date'), { target: { value: group.date } });
  fireEvent.change(screen.getByLabelText('Group name'), { target: { value: group.name } });
  const create = screen.getByRole('button', { name: 'Create group' });
  fireEvent.change(create.form.elements.headcount, { target: { value: '8' } });
  fireEvent.change(create.form.elements.experienceBand, { target: { value: 'veteran' } });
  fireEvent.click(create);
  expect(await screen.findByText(group.code)).toBeInTheDocument();
  const body = JSON.parse(global.fetch.mock.calls[1][1].body);
  expect(body).toEqual(expect.objectContaining({ action: 'create', name: group.name, date: group.date, headcount: 8, experienceBand: 'veteran', requestId: expect.any(String) }));
  expect(global.fetch.mock.calls[1][1]).toEqual(expect.objectContaining({ credentials: 'include', headers: expect.objectContaining({ Authorization: 'Bearer test-owner-token' }) }));
  expect(global.fetch.mock.calls.some(([, options]) => options.body?.includes('checkIn'))).toBe(false);
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel this group' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Cancel this group' }));
  await waitFor(() => expect(screen.queryByText(group.code)).not.toBeInTheDocument());
  expect(JSON.parse(global.fetch.mock.calls[3][1].body)).toEqual({ action: 'cancel', id: group.id });
  global.fetch.mockResolvedValueOnce(reply({ groups: [] }));
  act(() => view.authChange(null));
  expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  expect(screen.queryByText('New Friend')).not.toBeInTheDocument();
});

test('a signed-out organizer can create a party, return to it in the same browser and copy the share code', async () => {
  const guestGroup = { ...group, kind: 'party', entries: [{ id: 'guest-organizer', displayName: 'Field guest', kind: 'guest', isYou: true }] };
  const list = { groups: [{ ...guestGroup, memberCount: 1 }] };
  global.fetch.mockResolvedValueOnce(reply({ groups: [] })).mockResolvedValueOnce(reply({ group: guestGroup }))
    .mockResolvedValueOnce(reply(list)).mockResolvedValueOnce(reply(list)).mockResolvedValueOnce(reply({ group: guestGroup }));
  const view = setup(false);
  const create = screen.getByRole('button', { name: 'Create group' });
  await waitFor(() => expect(create).toBeEnabled());
  fireEvent.change(create.form.elements.displayName, { target: { value: 'Field guest' } });
  fireEvent.change(create.form.elements.kind, { target: { value: 'party' } });
  fireEvent.click(create);
  expect(await screen.findByText(group.code)).toBeVisible();
  expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toMatchObject({ action: 'create', kind: 'party', displayName: 'Field guest' });
  expect(screen.getByText('You')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Cancel this group' })).toBeVisible();
  view.unmount();
  setup(false);
  fireEvent.click(await screen.findByRole('button', { name: /Family game day/ }));
  expect(await screen.findByText(group.code)).toBeVisible();
  const secret = global.fetch.mock.calls[0][1].headers.Authorization;
  expect(secret).toMatch(/^Guest [a-f0-9]{64}$/);
  for (const [url, opts] of global.fetch.mock.calls) {
    expect(opts.credentials).toBe('omit');
    expect(opts.headers.Authorization).toBe(secret);
    expect(url + (opts.body || '')).not.toContain(secret.slice(6));
  }
  expect(document.body.innerHTML).not.toContain(secret.slice(6));
  fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
  expect(await screen.findByText('Select the invitation code to copy it.')).toBeVisible();
});

test('a guest joins with a code and a sign-in during lookup discards outstanding guest data', async () => {
  const joined = { ...group, isOwner: false, entries: [{ id: 'self', isYou: true, kind: 'guest', displayName: 'Guest 2' }] };
  let finishList;
  global.fetch.mockResolvedValueOnce(reply({ groups: [] })).mockResolvedValueOnce(reply({ group: joined }))
    .mockImplementationOnce(() => new Promise(resolve => { finishList = resolve; })).mockResolvedValueOnce(reply({ groups: [] }));
  const view = setup(false);
  const join = screen.getByRole('button', { name: 'Join group' });
  await waitFor(() => expect(join).toBeEnabled());
  fireEvent.change(join.form.elements.displayName, { target: { value: 'Guest 2' } });
  fireEvent.change(join.form.elements.experienceBand, { target: { value: 'regular' } });
  fireEvent.change(join.form.elements.code, { target: { value: group.code } });
  fireEvent.click(join);
  expect(await screen.findByText(group.code)).toBeVisible();
  expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({ action: 'join', code: group.code, displayName: 'Guest 2', experienceBand: 'regular' });
  expect(screen.queryByRole('button', { name: 'Cancel this group' })).toBeNull();
  act(() => view.authChange({ uid: 'Verified', getIdToken: async () => 'verified' }));
  await act(async () => { finishList(reply({ groups: [{ ...joined, memberCount: 2 }] })); });
  expect(screen.queryByText(group.code)).toBeNull();
  expect(screen.queryByText('Guest 2')).toBeNull();
  expect(screen.queryByText(group.name)).toBeNull();
  expect(global.fetch.mock.calls.at(-1)[1].headers.Authorization).toBe('Bearer verified');
});

test('blocked browser storage allows a guest to join with temporary access', async () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked'); });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
  global.fetch.mockResolvedValueOnce(reply({ groups: [] }));
  setup(false);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Join group' })).toBeEnabled());
  expect(screen.getByText(/until this page is closed or reloaded/)).toBeVisible();
  expect(global.fetch.mock.calls[0][1].headers.Authorization).toMatch(/^Guest [a-f0-9]{64}$/);
});

test('retries an uncertain group creation with the original request ID', async () => {
  global.fetch.mockResolvedValueOnce(reply({ groups: [] })).mockRejectedValueOnce(new Error('Connection interrupted'))
    .mockResolvedValueOnce(reply({ ok: true, group })).mockResolvedValueOnce(reply({ groups: [{ ...group, memberCount: 2 }] }));
  setup();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create group' })).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Game-day date'), { target: { value: group.date } });
  fireEvent.click(screen.getByRole('button', { name: 'Create group' }));
  await screen.findByText('Connection interrupted');
  const first = JSON.parse(global.fetch.mock.calls[1][1].body);
  fireEvent.click(screen.getByRole('button', { name: 'Create group' }));
  await screen.findByText(group.code);
  expect(JSON.parse(global.fetch.mock.calls[2][1].body).requestId).toBe(first.requestId);
});

const boardFor = (version, entries) => ({ date: group.date, rosterVersion: 'roster-one', groupAssignments: { version, entries } });
const emptyAssignments = boardFor('initial', []);

test('staff can find groups by name, confirm the right one, assign everyone and then switch one player', async () => {
  const entries = [{ id: 'mem', playerId: 'OfficialMemberID', displayName: 'Member', experienceBand: 'veteran' }, { id: 'guest', displayName: 'New player' }];
  const positions = side => entries.map(entry => ({ entryId: entry.id, side }));
  const allCamo = boardFor('v2', positions('camo'));
  const split = boardFor('v3', [{ entryId: 'mem', side: 'camo' }, { entryId: 'guest', side: 'solid' }]);
  const result = { group: { ...group, entries }, today: group.date };
  const request = jest.fn().mockResolvedValueOnce({ groups: [
    { id: 'other', name: 'Family friends', date: group.date, memberCount: 8 }, { ...group, memberCount: 2 }], page: 1, totalPages: 1 })
    .mockResolvedValueOnce(result).mockResolvedValueOnce(boardFor('v1', positions(null)))
    .mockResolvedValueOnce(allCamo).mockResolvedValueOnce(split);
  const onSelect = jest.fn(), onAssigned = jest.fn();
  render(<StaffGroupLookup request={request} onSelect={onSelect} onAssigned={onAssigned} />);
  fireEvent.click(screen.getByText('Find an arriving group'));
  fireEvent.change(screen.getByLabelText('Group name or code'), { target: { value: 'Family' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find group' }));
  fireEvent.click(await screen.findByRole('button', { name: /Family game day/ }));
  const all = await screen.findByRole('button', { name: 'Assign group to Camo' });
  await waitFor(() => expect(all).toBeEnabled());
  expect(request.mock.calls[0][0]).toMatch(/staff-groups.*q=Family/);
  expect(request.mock.calls[1][0]).toContain('staff=1&id=' + group.id);
  expect(screen.getByText(/Experienced · Awaiting check-in/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Verify Member' }));
  expect(onSelect).toHaveBeenCalledWith({ playerId: 'OfficialMemberID' }, false, group.date);
  fireEvent.click(all);
  await waitFor(() => expect(onAssigned).toHaveBeenCalledWith(allCamo));
  expect(request.mock.calls[3][1].body).toEqual({
    action: 'assignGroup', groupId: group.id, date: group.date, rosterVersion: 'roster-one', assignmentVersion: 'v1', side: 'camo' });
  fireEvent.click(screen.getByRole('button', { name: 'Assign New player to Solid' }));
  await waitFor(() => expect(onAssigned).toHaveBeenCalledWith(split));
  expect(request.mock.calls[4][1].body).toMatchObject({ assignmentVersion: 'v2', entryId: 'guest', side: 'solid' });
  expect(screen.getByRole('button', { name: 'Assign New player to Solid' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Assign Member to Solid' })).toBeEnabled();
});

const booking = { key: 'a'.repeat(64), title: 'Reserved room fixture', date: group.date,
  start: '2026-12-05T20:00:00.000Z', end: '2026-12-05T22:00:00.000Z', size: 12 };
const partyGroup = { ...group, kind: 'party', party: null, partyKey: null };

test('party organizers create a preparation list and share their group code for calendar confirmation', async () => {
  global.fetch.mockResolvedValueOnce(reply({ groups: [] }))
    .mockResolvedValueOnce(reply({ group: partyGroup }))
    .mockResolvedValueOnce(reply({ groups: [{ ...partyGroup, memberCount: 2 }] }));
  setup();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create group' })).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Visit type'), { target: { value: 'party' } });
  fireEvent.change(screen.getByLabelText('Game-day date'), { target: { value: group.date } });
  fireEvent.click(screen.getByRole('button', { name: 'Create group' }));
  expect(await screen.findByText('Awaiting staff confirmation')).toBeVisible();
  expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual(expect.objectContaining({ kind: 'party', date: group.date }));
  expect(screen.getByText(group.code)).toBeInTheDocument();
  expect(global.fetch.mock.calls.some(([url]) => url.includes('parties='))).toBe(false);
});

test('staff calendar handoff preselects a verified booking and requires explicit confirmation', async () => {
  const { pathname, search, hash } = window.location;
  window.history.replaceState(null, '', '/admin/field/check-in?partyDate=' + group.date + '&booking=' + booking.key + '#arriving-group');
  const linked = { ...partyGroup, party: { ...booking, confirmedAt: booking.start }, partyKey: booking.key };
  const request = jest.fn()
    .mockResolvedValueOnce({ group: partyGroup, today: group.date })
    .mockResolvedValueOnce({ parties: [booking, { ...booking, key: 'b'.repeat(64), title: 'Duplicate', ambiguous: true }], today: group.date })
    .mockResolvedValueOnce(emptyAssignments)
    .mockResolvedValueOnce({ group: linked, today: group.date })
    .mockResolvedValueOnce({ group: partyGroup, today: group.date });
  try {
    const { container } = render(<StaffGroupLookup request={request} onSelect={jest.fn()} disabled={false} />);
    expect(container.querySelector('#arriving-group')).toHaveAttribute('open');
    fireEvent.change(screen.getByLabelText('Group name or code'), { target: { value: group.code } });
    fireEvent.submit(screen.getByRole('button', { name: 'Find group' }).closest('form'));
    const picker = await screen.findByLabelText('Party Calendar booking', { exact: false, selector: 'select' });
    expect(picker).toHaveValue(booking.key);
    expect(picker.querySelector('option[disabled]')).not.toBeNull();
    expect(request.mock.calls.map(([path]) => path)).toEqual([
      '/api/check-in-groups?staff=1&code=' + group.code, '/api/check-in-groups?staff=1&parties=' + group.date, '/api/game-day-check-in',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm booking for group' }));
    expect(await screen.findByText('Schedule confirmed by staff')).toBeVisible();
    expect(screen.getByText('Booked party size: 12')).toBeVisible();
    expect(screen.getByText(/12:00 PM PST.*2:00 PM PST/)).toBeVisible();
    expect(request.mock.calls[3][1].body).toEqual({ action: 'linkParty', id: group.id, partyKey: booking.key, previousPartyKey: null });
    fireEvent.click(screen.getByRole('button', { name: 'Unlink booking' }));
    expect(request).toHaveBeenCalledTimes(4);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, unlink booking' }));
    await screen.findByText('Awaiting staff confirmation');
    expect(request.mock.calls[4][1].body).toEqual({ action: 'unlinkParty', id: group.id, previousPartyKey: booking.key });
  } finally { window.history.replaceState(null, '', pathname + search + hash); }
});

test('a calendar handoff for a different visit date never selects a booking', async () => {
  const { pathname, search, hash } = window.location;
  window.history.replaceState(null, '', '/admin/field/check-in?partyDate=2026-12-08&booking=' + booking.key + '#arriving-group');
  try {
    const request = jest.fn().mockResolvedValueOnce({ group: partyGroup, today: '2026-12-08' });
    render(<StaffGroupLookup request={request} onSelect={jest.fn()} disabled={false} />);
    fireEvent.change(screen.getByLabelText('Group name or code'), { target: { value: group.code } });
    fireEvent.submit(screen.getByRole('button', { name: 'Find group' }).closest('form'));
    expect(await screen.findByText(/different date from the selected Party Calendar booking/)).toBeVisible();
    expect(request).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Confirm booking for group' })).toBeNull();
  } finally { window.history.replaceState(null, '', pathname + search + hash); }
});

test('a rescheduled party hides old times and staff can unlink its previous booking', async () => {
  const result = { group: {
    ...partyGroup, partyStatus: 'review', party: null, partyKey: booking.key,
  }, today: group.date };
  const request = jest.fn().mockResolvedValueOnce(result).mockResolvedValueOnce(emptyAssignments)
    .mockResolvedValueOnce({ group: partyGroup, today: group.date });
  render(<StaffGroupLookup request={request} onSelect={jest.fn()} disabled={false} />);
  fireEvent.change(screen.getByLabelText('Group name or code'), { target: { value: group.code } });
  fireEvent.submit(screen.getByRole('button', { name: 'Find group' }).closest('form'));
  expect(await screen.findByText('Booking needs staff review')).toBeInTheDocument();
  expect(screen.queryByText('Schedule confirmed by staff')).toBeNull();
  expect(screen.queryByText(/12:00 PM/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Unlink booking' }));
  fireEvent.click(screen.getByRole('button', { name: 'Yes, unlink booking' }));
  await screen.findByText('Awaiting staff confirmation');
  expect(request.mock.calls[2][1].body).toEqual({ action: 'unlinkParty', id: group.id, previousPartyKey: booking.key });
});

test('a joined player can update their own experience and sees the full group count on a private roster', async () => {
  const ownEntry = { id: 'own', isYou: true, kind: 'guest', displayName: 'New member', experienceBand: 'limited' };
  const privateGroup = { ...group, code: 'rebels-8', entries: [ownEntry], memberCount: 8, rosterPrivate: true, isOwner: false };
  const updated = { ...privateGroup, entries: [{ ...ownEntry, experienceBand: 'elite' }] };
  global.fetch.mockResolvedValueOnce(reply({ groups: [privateGroup] })).mockResolvedValueOnce(reply({ group: privateGroup }))
    .mockResolvedValueOnce(reply({ group: updated })).mockResolvedValueOnce(reply({ groups: [updated] }));
  setup(false);
  fireEvent.click(await screen.findByRole('button', { name: /Family game day/ }));
  expect(await screen.findByText(/8 \/ 30 players/)).toBeVisible();
  expect(screen.getByText('Only the organizer and staff can see the full roster.')).toBeVisible();
  fireEvent.click(screen.getByText('Edit experience'));
  const field = screen.getByLabelText('Airsoft experience for New member');
  fireEvent.change(field, { target: { value: 'elite' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save experience' }));
  expect(await screen.findByText('Experience · Highly experienced')).toBeVisible();
  expect(JSON.parse(global.fetch.mock.calls[2][1].body)).toEqual({ action: 'setExperience', id: group.id, entryId: 'own', experienceBand: 'elite' });
});
