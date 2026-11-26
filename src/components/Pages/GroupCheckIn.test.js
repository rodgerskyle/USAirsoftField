import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import GroupCheckIn from './GroupCheckIn';
import StaffGroupLookup from './StaffGroupLookup';

jest.mock('./Waiver', () => ({ onSigned }) => <button type="button" onClick={() => onSigned('Jordan Smith')}>Finish signed waiver</button>);
jest.mock('../Firebase', () => ({ withFirebase: Component => Component }));
const originalFetch = global.fetch;
const originalCrypto = window.crypto;
const reply = data => ({ ok: true, json: async () => data });
const group = { id: '00000000-0000-4000-8000-000000000001', name: 'Family game day', date: '2026-12-05', code: 'abcdefgh12345678', isOwner: true, capacity: 30,
  entries: [{ id: 'owner-entry', displayName: 'Owner', isYou: true, kind: 'player' }, { id: 'guest-entry', displayName: 'New Friend', kind: 'guest', canRemove: true }] };

function setup(signedIn = true, path = '/group-check-in') {
  const user = signedIn ? { uid: 'PlayerAccountAAA', getIdToken: jest.fn().mockResolvedValue('test-owner-token') } : null;
  let authChange;
  const firebase = { auth: { currentUser: user, onAuthStateChanged: handler => { authChange = handler; handler(user); return () => {}; } } };
  const view = render(<HelmetProvider><MemoryRouter initialEntries={[path]}><GroupCheckIn firebase={firebase} /></MemoryRouter></HelmetProvider>);
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

test('the organizer searches public profiles and adds a registered member to a party roster', async () => {
  const member = { id: 'OfficialPlayer555', name: 'Raven' };
  const party = { ...group, kind: 'party', memberCount: 2 };
  const added = { ...party, memberCount: 3, entries: [...party.entries,
    { id: 'added-member', playerId: member.id, displayName: member.name, kind: 'player', pending: true }] };
  global.fetch.mockResolvedValueOnce(reply({ groups: [party] })).mockResolvedValueOnce(reply({ group: party }))
    .mockResolvedValueOnce(reply({ players: [member] })).mockResolvedValueOnce(reply({ group: added }));
  setup(false);
  fireEvent.click(await screen.findByRole('button', { name: /Family game day/ }));
  const picker = await screen.findByRole('search', { name: 'Group member search' });
  fireEvent.change(within(picker).getByRole('searchbox'), { target: { value: 'Raven' } });
  fireEvent.submit(picker);
  const profile = await screen.findByRole('link', { name: 'View profile' });
  expect(profile).toHaveAttribute('href', '/profilelookup/' + member.id);
  fireEvent.click(screen.getByRole('button', { name: 'Add to group' }));
  expect(await screen.findByText('Raven is on the roster.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'On roster' })).toBeDisabled();
  expect(screen.getByRole('link', { name: 'Raven' })).toHaveAttribute('href', '/profilelookup/' + member.id);
  expect(screen.getByText('Added by organizer')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Add guest' })).toBeVisible();
  const [searchUrl, options] = global.fetch.mock.calls[2];
  expect(searchUrl).toContain('/api/leaderboard?lookup=players&q=Raven');
  expect(options.credentials).toBe('omit');
  expect(options.headers.Authorization).toBeUndefined();
  const add = global.fetch.mock.calls[3][1];
  expect(JSON.parse(add.body)).toEqual({ action: 'addMember', id: group.id, playerId: member.id });
  expect(add.headers.Authorization).toMatch(/^Guest /);
});

test('adding a guest refreshes the open member search when the group reaches capacity', async () => {
  const nearlyFull = { ...group, capacity: 3, memberCount: 2 };
  const full = { ...nearlyFull, memberCount: 3, entries: [...group.entries, {id:'last', kind:'guest', displayName:'Kai'}] };
  global.fetch.mockResolvedValueOnce(reply({groups:[nearlyFull]})).mockResolvedValueOnce(reply({group:nearlyFull}))
    .mockResolvedValueOnce(reply({players:[{id:'OfficialPlayer555', name:'Raven'}]}))
    .mockResolvedValueOnce(reply({group:full})).mockResolvedValueOnce(reply({groups:[full]}));
  setup();
  fireEvent.click(await screen.findByRole('button', {name:/Family game day/}));
  const picker = await screen.findByRole('search');
  fireEvent.change(within(picker).getByRole('searchbox'), {target:{value:'Raven'}});
  fireEvent.submit(picker);
  expect(await screen.findByRole('button', {name:'Add to group'})).toBeEnabled();
  const addGuest = screen.getByRole('button', {name:'Add guest'});
  fireEvent.change(addGuest.form.elements.displayName, {target:{value:'Kai'}});
  fireEvent.click(addGuest);
  expect(await screen.findByRole('button', {name:'Group full'})).toBeDisabled();
  expect(screen.getByText('1 match')).toBeVisible();
});

test('denied organizer access clears the private roster, search results and profile links', async () => {
  const player = { id: 'NewPlayer1234', name: 'New player' };
  const owner = { ...group, entries: [{ id: 'owner', displayName: 'Owner', isYou: true, playerId: 'OwnerAccount123' }] };
  global.fetch.mockResolvedValueOnce(reply({ groups: [owner] })).mockResolvedValueOnce(reply({ group: owner }))
    .mockResolvedValueOnce(reply({ players: [player] }))
    .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ error: 'Organizer access expired.' }) });
  setup();
  fireEvent.click(await screen.findByRole('button', { name: /Family game day/ }));
  const picker = await screen.findByRole('search');
  fireEvent.change(within(picker).getByRole('searchbox'), { target: { value: 'New' } });
  fireEvent.submit(picker);
  fireEvent.click(await screen.findByRole('button', { name: 'Add to group' }));
  expect(await screen.findByText('Organizer access expired.')).toBeVisible();
  expect(screen.queryByRole('search')).toBeNull();
  expect(screen.queryByRole('link', { name: 'Owner' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'View profile' })).toBeNull();
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

test('a private event shows only waiver statuses supplied for visible roster entries', async () => {
  const selected = { ...group, kind: 'party', entries: [
    { id: 'self', isYou: true, displayName: 'Jess', waiverStatus: 'signed' },
    { id: 'child', kind: 'guest', displayName: 'Sam', waiverStatus: 'missing' },
    { id: 'review', kind: 'guest', displayName: 'Vic', waiverStatus: 'unavailable' },
    { id: 'friend', displayName: 'Robin' },
  ] };
  global.fetch.mockResolvedValueOnce(reply({ groups: [{ ...selected, memberCount: 4 }] }))
    .mockResolvedValueOnce(reply({ group: selected }));
  setup();
  fireEvent.click(await screen.findByRole('button', { name: /Family game day/ }));
  const row = name => within(screen.getByText(name).closest('li'));
  expect(await screen.findByText('Jess')).toBeVisible();
  expect(row('Jess').getByText('Waiver verified')).toBeVisible();
  expect(row('Sam').getByText('Waiver needed')).toBeVisible();
  expect(row('Vic').getByText('Verification pending')).toBeVisible();
  expect(row('Robin').queryByText(/Waiver verified|Waiver needed|Verification pending/)).toBeNull();
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
  expect(screen.queryByRole('search', { name: 'Group member search' })).toBeNull();
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
  const entries = [{ id: 'mem', playerId: 'OfficialMemberID', displayName: 'Member', experienceBand: 'veteran', preparation: {rentalIntent:'requested',waiverStatus:'signed'} }, { id: 'guest', displayName: 'New player' }];
  const positions = side => entries.map(entry => ({ entryId: entry.id, side, waiverStatus: 'signed' }));
  const allCamo = { ...boardFor('v2', positions('camo')), checkedInCount: 2 };
  const split = boardFor('v3', [{ entryId: 'mem', side: 'camo', waiverStatus: 'signed' }, { entryId: 'guest', side: 'solid', waiverStatus: 'unavailable' }]);
  const result = { group: { ...group, entries }, today: group.date };
  const request = jest.fn().mockResolvedValueOnce({ groups: [
    { id: 'other', name: 'Family friends', date: group.date, memberCount: 8 }, { ...group, memberCount: 2 }], page: 1, totalPages: 1 })
    .mockResolvedValueOnce(result).mockResolvedValueOnce(boardFor('v1', positions(null)))
    .mockResolvedValueOnce(allCamo).mockResolvedValueOnce(split);
  const onSelect = jest.fn(), onAssigned = jest.fn();
  render(<StaffGroupLookup request={request} onSelect={onSelect} onAssigned={onAssigned} />);
  expect(screen.getByLabelText('Group name or code')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Group name or code'), { target: { value: 'Family' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find group' }));
  fireEvent.click(await screen.findByRole('button', { name: /Family game day/ }));
  fireEvent.click(await screen.findByRole('checkbox', { name: /Here now · Member/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /Here now · New player/ }));
  const all = screen.getByRole('button', { name: 'Check in 2 ready to Camo' });
  await waitFor(() => expect(all).toBeEnabled());
  expect(request.mock.calls[0][0]).toMatch(/staff-groups.*q=Family/);
  expect(request.mock.calls[1][0]).toContain('staff=1&id=' + group.id);
  expect(screen.getByRole('link', { name: 'Open rental form' })).toHaveAttribute('href', '/admin/rentalform?view=new&group=' + group.id);
  expect(screen.getByText(/Experienced · Expected · Not here yet/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Verify Member' }));
  expect(onSelect).toHaveBeenCalledWith({ playerId: 'OfficialMemberID' }, false, group.date, true);
  fireEvent.click(all);
  await waitFor(() => expect(onAssigned).toHaveBeenCalledWith(allCamo));
  expect(screen.getByRole('link',{name:'Rental pickup for checked-in guests'})).toHaveAttribute('href','/admin/rentalform?view=new&group='+group.id+'&pickup=arrived');
  expect(request.mock.calls[3][1].body).toEqual({
    action: 'arriveGroup', entryIds: ['mem', 'guest'], groupId: group.id, date: group.date, rosterVersion: 'roster-one', assignmentVersion: 'v1', side: 'camo' });
  fireEvent.click(screen.getByRole('button', { name: 'Assign New player to Solid' }));
  await waitFor(() => expect(onAssigned).toHaveBeenCalledWith(split));
  expect(request.mock.calls[4][1].body).toMatchObject({ assignmentVersion: 'v2', entryId: 'guest', side: 'solid' });
  expect(screen.getByRole('button', { name: 'Assign New player to Solid' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Assign Member to Solid' })).toBeEnabled();
  expect(within(screen.getByText('Member').closest('li')).getByText('Waiver verified')).toBeVisible();
  expect(within(screen.getByText('New player').closest('li')).getByText('Verification pending')).toBeVisible();
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
  expect(screen.queryByRole('link', { name: 'Open rental form' })).toBeNull();
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
      '/api/check-in-groups?staff=1&code=' + group.code + '&arrival=1', '/api/check-in-groups?staff=1&parties=' + group.date, '/api/game-day-check-in',
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
    expect(screen.queryByRole('link', { name: 'Open rental form' })).toBeNull();
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
  expect(JSON.parse(global.fetch.mock.calls[2][1].body)).toEqual({ action: 'setExperience', id: group.id, entryId: 'own', experienceBand: 'elite', previousExperienceBand: 'limited' });
});

test('shows a concurrent group experience change and uses that value if the player edits again', async () => {
  const ownEntry = { id: 'own', isYou: true, kind: 'guest', displayName: 'New member', experienceBand: 'limited' };
  const original = { ...group, entries: [ownEntry], isOwner: false };
  const current = { ...original, entries: [{ ...ownEntry, experienceBand: 'veteran' }] };
  const updated = { ...original, entries: [{ ...ownEntry, experienceBand: 'regular' }] };
  global.fetch.mockResolvedValueOnce(reply({ groups: [original] })).mockResolvedValueOnce(reply({ group: original }))
    .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: 'The experience changed. Review it and try again.', group: current }) })
    .mockResolvedValueOnce(reply({ group: updated })).mockResolvedValueOnce(reply({ groups: [updated] }));
  setup(false);
  fireEvent.click(await screen.findByRole('button', { name: /Family game day/ }));
  fireEvent.click(await screen.findByText('Edit experience'));
  const field = () => screen.getByLabelText('Airsoft experience for New member');
  fireEvent.change(field(), { target: { value: 'elite' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save experience' }));
  expect(await screen.findByText('The experience changed. Review it and try again.')).toBeVisible();
  expect(field()).toHaveValue('veteran');
  fireEvent.change(field(), { target: { value: 'regular' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save experience' }));
  expect(await screen.findByText('Experience · Some experience')).toBeVisible();
  expect(JSON.parse(global.fetch.mock.calls[3][1].body)).toMatchObject({ previousExperienceBand: 'veteran', experienceBand: 'regular' });
});

test('a birthday guest can fill their own roster name after signing without losing the planned visit', async () => {
  global.fetch.mockResolvedValueOnce(reply({ groups: [] }));
  setup(false);
  const create = screen.getByRole('button', { name: 'Create group' });
  await waitFor(() => expect(create).toBeEnabled());
  fireEvent.change(create.form.elements.kind, { target: { value: 'party' } });
  fireEvent.change(create.form.elements.name, { target: { value: 'Birthday group' } });
  fireEvent.click(create.form.querySelector('button[type="button"]'));
  fireEvent.click(await screen.findByRole('button', { name: 'Finish signed waiver' }));
  expect(create.form.elements.displayName).toHaveValue('Jordan Smith');
  expect(create.form.elements.kind).toHaveValue('party');
  expect(create.form.elements.name).toHaveValue('Birthday group');
  expect(screen.getByRole('button', { name: 'Join group' }).form.elements.displayName).toHaveValue('');
});

test('shows today’s groups without a search and checks in just the ready players', async () => {
  const entries = [{ id:'one', displayName:'One' },{ id:'two', displayName:'Two' },{ id:'other', displayName:'Other party' }];
  const positions = [{ entryId:'one', waiverStatus:'signed', side:null },{ entryId:'two', waiverStatus:'missing', side:null },{ entryId:'other', waiverStatus:'signed', side:null, otherGroup:true }];
  const ready = { ...group, entries };
  const request=jest.fn().mockResolvedValueOnce({groups:[ready],totalPages:1,page:1})
    .mockResolvedValueOnce({group:ready,today:group.date}).mockResolvedValueOnce(boardFor('before',positions))
    .mockResolvedValueOnce({...boardFor('after',[{...positions[0],side:'camo'},positions[1],positions[2]]),checkedInCount:1});
  render(<StaffGroupLookup request={request} />);
  fireEvent.click(screen.getByRole('button',{name:'Show today’s groups'}));
  fireEvent.click(await screen.findByRole('checkbox',{name:/Here now · One/}));
  fireEvent.click(screen.getByRole('checkbox',{name:/Here now · Two/}));
  const button=screen.getByRole('button',{name:'Check in 1 ready to Camo'});
  await waitFor(()=>expect(button).toBeEnabled());
  expect(screen.getByText(/On another group today/)).toBeInTheDocument();
  expect(screen.queryByRole('checkbox',{name:/Here now · Other party/})).toBeNull();
  expect(screen.queryByRole('button',{name:'Assign group to Camo'})).toBeNull();
  fireEvent.click(button);
  await waitFor(()=>expect(request).toHaveBeenCalledTimes(4));
  expect(request.mock.calls[0][0]).toMatch(/staff-groups\?date=/);
  expect(request.mock.calls[3][1].body).toMatchObject({action:'arriveGroup',groupId:group.id,side:'camo',entryIds:['one','two'],assignmentVersion:'before'});
});

test('opens a group sent from group management without another lookup', async () => {
  const initial = window.location.href;
  window.history.replaceState(null,'','/admin/field/check-in?group='+group.id+'#arriving-group');
  try {
    const request = jest.fn().mockResolvedValueOnce({ group, today:group.date }).mockResolvedValueOnce(emptyAssignments);
    render(<StaffGroupLookup request={request} />);
    await screen.findByRole('heading',{name:group.name});
    expect(request.mock.calls[0][0]).toEqual('/api/check-in-groups?staff=1&id='+group.id+'&arrival=1');
    expect(screen.getByRole('link',{name:'Edit group roster'})).toHaveAttribute('href','/admin/field/groups?group='+group.id);
  } finally { window.history.replaceState(null,'',initial); }
});

test('organizer checks expected headcount, missing waiver and equipment choices, and shares only the selected guest link', async () => {
  const organizerToken = 'a'.repeat(64), guestToken = 'b'.repeat(64);
  const prepared = { ...group, readiness: { ready: 1, expected: 4, unlisted: 2, rentalsRequested: 1 }, organizerToken,
    entries: [{ ...group.entries[0], preparation: { waiverStatus: 'signed', rentalIntent: 'requested', ready: true } },
      { ...group.entries[1], preparation: { waiverStatus: 'missing', rentalIntent: 'unknown', ready: false, guestToken } }] };
  global.fetch.mockResolvedValueOnce(reply({groups:[prepared]})).mockResolvedValueOnce(reply({group:prepared}));
  setup();
  fireEvent.click(await screen.findByRole('button', {name: /Family game day/}));
  expect(await screen.findByText('1 of 4 ready')).toBeVisible();
  expect(screen.getByText('2 expected players still need a roster entry.')).toBeVisible();
  const guest = screen.getByText('New Friend').closest('li');
  expect(within(guest).getByText('Rental choice needed')).toBeVisible();
  expect(within(guest).getByText(/Waiver needed/)).toBeVisible();
  fireEvent.click(within(guest).getByRole('button', {name:'Copy guest checklist for New Friend'}));
  expect(await within(guest).findByLabelText('Copy this private link')).toHaveValue('https://www.usairsoftfield.com/group-check-in#guest/' + guestToken);
  fireEvent.click(screen.getByRole('button', {name:'Copy guest invitation'}));
  expect(await screen.findByLabelText('Copy this invitation link')).toHaveValue('https://www.usairsoftfield.com/group-check-in#join/' + group.code);
  expect(screen.getByRole('link',{name:'Open organizer checklist'})).toHaveAttribute('href','https://www.usairsoftfield.com/group-check-in#organizer/' + organizerToken);
});

test('a website guest invitation prefills only its own group without joining or opening unrelated groups automatically', async () => {
  const invited = { ...group, code: 'rebels-4', isOwner: false, entries: [{ ...group.entries[1], isYou: true }] };
  global.fetch.mockResolvedValueOnce(reply({ preview: { id: group.id, name: group.name, date: group.date } }))
    .mockResolvedValueOnce(reply({ group: invited }));
  setup(false, '/group-check-in#join/rebels-4');
  const code = await screen.findByLabelText('Organizer’s group code');
  expect(code).toHaveValue('rebels-4');
  expect(code).toHaveAttribute('readonly');
  expect(screen.queryByRole('button', { name: 'Create group' })).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe('https://app.usairsoftfield.com/api/check-in-groups?code=rebels-4');
  expect(fetch.mock.calls[0][1].method).toBe('GET');
  fireEvent.change(screen.getByLabelText('Your name or callsign'), { target: { value: 'New Friend' } });
  fireEvent.click(screen.getByRole('button', { name: 'Join group' }));
  expect(await screen.findByRole('heading', { name: invited.name })).toBeVisible();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ action: 'join', code: invited.code, displayName: 'New Friend' });
  expect(screen.queryByRole('button', { name: 'Copy organizer link' })).toBeNull();
});

test('joining a birthday invitation opens the joining participant’s own website checklist', async () => {
  const guestToken = 'b'.repeat(64);
  const guest = { ...group.entries[1], isYou: true, preparation: { guestToken, waiverStatus: 'missing', rentalIntent: 'unknown' } };
  global.fetch.mockResolvedValueOnce(reply({ preview: { id: group.id, date: group.date, name: group.name } }))
    .mockResolvedValueOnce(reply({ group: { ...group, entries: [
    { ...group.entries[0], isYou: false, preparation: { guestToken: 'a'.repeat(64) } }, guest] } }))
    .mockResolvedValueOnce(reply({ role: 'guest', group: { ...group, entries: [guest] } }));
  setup(true, '/group-check-in#join/' + group.code);
  fireEvent.click(await screen.findByRole('button', { name: 'Join group' }));
  expect(await screen.findByRole('heading', { name: 'Your party checklist' })).toBeVisible();
  expect(await screen.findByRole('link', { name: 'Complete my waiver' })).toHaveAttribute('href', '/waiver#party/' + guestToken);
  expect(fetch.mock.calls[2][1].headers.Authorization).toBe('Party ' + guestToken);
  expect(fetch.mock.calls[2][0]).not.toContain(guestToken);
});

test('declines a different returned group before displaying names or following a personal link', async () => {
  global.fetch.mockResolvedValueOnce(reply({ preview: { id: group.id, name: 'Invited group' } }))
    .mockResolvedValueOnce(reply({ group: { ...group, code: 'wrong-4' } }));
  setup(true, '/group-check-in#join/our-team-5');
  fireEvent.click(await screen.findByRole('button', { name: 'Join group' }));
  expect(await screen.findByText(/could not confirm this invitation/)).toBeVisible();
  expect(screen.queryByRole('heading', { name: group.name })).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(2);
});

test.each(['#guest/broken','#organizer/' + 'a'.repeat(64) + '/extra','#join/../../admin','#unknown/abc'])('an invalid website invitation %s opens no private data', hash => {
  setup(true, '/group-check-in' + hash);
  expect(screen.getByRole('heading', { name: 'Invitation unavailable' })).toBeVisible();
  expect(fetch).not.toHaveBeenCalled();
});

test('a recognized ordinary-group organizer opens the existing roster without a second join', async () => {
  const organizerToken = 'a'.repeat(64);
  global.fetch.mockResolvedValueOnce(reply({ group: { ...group, kind: 'visit', organizerToken } }));
  setup(true, '/group-check-in#join/' + group.code);
  expect(await screen.findByRole('heading', { name: group.name })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Join group' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Open organizer checklist' })).toHaveAttribute('href',
    'https://www.usairsoftfield.com/group-check-in#organizer/' + organizerToken);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('a paused party guest has a personal website waiver QR and resumes on the same booking', async () => {
  const token = 'c'.repeat(64);
  const waitingGuest = {id:'waiting',displayName:'Jordan Fox',preparation:{guestToken:token,waiverStatus:'missing',rentalIntent:'bringing'}};
  const late = {id:'late',displayName:'Morgan Park'};
  const party = {...group,kind:'party',party:{start:'2020-01-01T18:30:00Z'},entries:[waitingGuest,late]};
  let signed = false;
  const request = jest.fn(async (path,options) => {
    if (path.includes('waiting=1')) return {waiting:[{groupId:party.id,groupName:party.name,entryId:waitingGuest.id,name:waitingGuest.displayName,ready:signed}]};
    if (path.startsWith('/api/staff-groups')) return {groups:[party],page:1,totalPages:1};
    if (path.startsWith('/api/check-in-groups')) return {group:party,today:group.date};
    const positions = [{entryId:'waiting',arrivedAt:'2026-12-05T16:00:00Z',waiverStatus:signed?'signed':'missing'},{entryId:'late',waiverStatus:'signed'}];
    return boardFor(options.body.action,positions);
  });
  render(<StaffGroupLookup request={request} />);
  fireEvent.click(screen.getByRole('button',{name:'Show today’s groups'}));
  const details = (await screen.findByText('Show waiver QR for Jordan Fox')).closest('details');
  details.open = true;
  fireEvent(details, new Event('toggle'));
  const personal = await within(details).findByRole('link',{name:'Open guest checklist'});
  expect(personal).toHaveAttribute('href','https://www.usairsoftfield.com/group-check-in#guest/'+token);
  expect(within(details).getByRole('img',{name:/waiver for Jordan Fox/}).src).toMatch(/^data:image\//);
  expect(screen.getByText(/Here · Waiting for waiver/)).toBeVisible();
  expect(screen.getByText(/Late · Not here yet/)).toBeVisible();
  signed=true;
  fireEvent.click(await screen.findByRole('button',{name:'Finish check-in'},{timeout:4000}));
  await waitFor(()=>expect(screen.getByRole('checkbox',{name:/Here now · Jordan Fox/})).toBeChecked());
  expect(screen.getByRole('checkbox',{name:/Here now · Morgan Park/})).not.toBeChecked();
  expect(screen.getByRole('button',{name:'Check in 1 ready to Camo'})).toBeEnabled();
});
