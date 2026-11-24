import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminFieldGroups from './AdminFieldGroups';

const id = '12345678-1234-4123-9123-123456789abc';
const date = '2026-12-12';
const initial = {
  id, date, name: 'Birthday group', code: 'WalkOnCode123456', version: 'version-one',
  kind: 'party', partyStatus: 'confirmed', party: { size: 9, start: '2026-12-12T20:00:00Z' },
  entries: [{ id: 'owner', displayName: 'Organizer', kind: 'player', isOrganizer: true, canRemove: false }],
};
const list = group => ({
  groups: group ? [{ ...group, memberCount: group.entries.length, codeSuffix: group.code.slice(-4) }] : [],
  page: 1, totalPages: 1,
});
function open(request, search = '?group=' + id) {
  return render(<MemoryRouter initialEntries={['/admin/field/groups' + search]}>
    <AdminFieldGroups request={request} />
  </MemoryRouter>);
}

test('a Party Calendar deep link opens its group and edits walk-ons using the latest roster version', async () => {
  const entry = { id: 'walk-on', displayName: 'Rebel Guest', kind: 'guest', canRemove: true };
  const added = { ...initial, version: 'version-two', entries: [...initial.entries, entry] };
  const removed = { ...initial, version: 'version-three' };
  const request = jest.fn().mockResolvedValueOnce({ group: initial }).mockResolvedValueOnce(list(initial))
    .mockResolvedValueOnce({ group: added }).mockResolvedValueOnce(list(added))
    .mockResolvedValueOnce({ group: removed }).mockResolvedValueOnce(list(removed));
  open(request);
  const detail = within(screen.getByRole('region', { name: 'Selected group' }));
  expect(await detail.findByRole('heading', { name: 'Birthday group' })).toBeVisible();
  await waitFor(() => expect(detail.getByRole('button', { name: 'Add player' })).toBeEnabled());
  expect(request.mock.calls.slice(0, 2).map(([path]) => path)).toEqual([
    '/api/staff-groups?id=' + id, '/api/staff-groups?date=' + date + '&page=1',
  ]);
  expect(detail.getByLabelText('Invitation code')).toHaveValue(initial.code);
  expect(detail.getByRole('link', { name: 'Open rental form' })).toHaveAttribute('href', '/admin/rentalform?view=new&group=' + id);
  expect(screen.getByLabelText('Field date')).toHaveValue(date);
  expect(detail.queryByRole('button', { name: 'Remove Organizer' })).toBeNull();
  fireEvent.change(detail.getByLabelText('Player name or callsign'), { target: { value: '  Rebel Guest  ' } });
  fireEvent.change(detail.getByLabelText('Airsoft experience'), { target: { value: 'limited' } });
  fireEvent.click(detail.getByRole('button', { name: 'Add player' }));
  expect(await screen.findByText('Player added.')).toBeVisible();
  expect(detail.getByText('Rebel Guest')).toBeVisible();
  expect(request.mock.calls[2][1].body).toEqual({ action: 'addGuest', id, version: 'version-one', displayName: 'Rebel Guest', experienceBand: 'limited' });
  fireEvent.click(detail.getByRole('button', { name: 'Remove Rebel Guest' }));
  expect(await screen.findByText('Player removed from the group.')).toBeVisible();
  expect(request.mock.calls[4][1].body).toEqual({ action: 'removeGuest', id, version: 'version-two', entryId: entry.id });
  expect(detail.queryByText('Rebel Guest')).toBeNull();
  expect(detail.getByText('Organizer')).toBeVisible();
});

test('keeping a group cancels removal and only explicit confirmation submits the delete', async () => {
  const request = jest.fn().mockResolvedValueOnce({ group: initial }).mockResolvedValueOnce(list(initial))
    .mockResolvedValueOnce({ group: null }).mockResolvedValueOnce(list(null));
  open(request);
  const detail = within(screen.getByRole('region', { name: 'Selected group' }));
  await waitFor(() => expect(detail.getByRole('button', { name: 'Remove group' })).toBeEnabled());
  fireEvent.click(detail.getByRole('button', { name: 'Remove group' }));
  expect(detail.getByRole('button', { name: 'Keep group' })).toHaveFocus();
  expect(detail.getByText(/reservation and completed player check-ins stay on file/)).toBeVisible();
  fireEvent.click(detail.getByRole('button', { name: 'Keep group' }));
  expect(detail.queryByRole('button', { name: 'Yes, remove group' })).toBeNull();
  expect(request).toHaveBeenCalledTimes(2);
  fireEvent.click(detail.getByRole('button', { name: 'Remove group' }));
  fireEvent.click(detail.getByRole('button', { name: 'Yes, remove group' }));
  expect(await screen.findByText('Group removed.')).toBeVisible();
  expect(request.mock.calls[2][1]).toEqual(expect.objectContaining({ method: 'POST', body: { action: 'delete', id, version: initial.version } }));
  expect(detail.queryByDisplayValue(initial.code)).toBeNull();
  expect(screen.getByText('No groups found for these dates.')).toBeVisible();
});

test('staff can update the organizer’s experience using the selected roster version', async () => {
  const updated = { ...initial, version: 'updated', entries: [{ ...initial.entries[0], experienceBand: 'veteran' }] };
  const request = jest.fn().mockResolvedValueOnce({ group: initial }).mockResolvedValueOnce(list(initial))
    .mockResolvedValueOnce({ group: updated }).mockResolvedValueOnce(list(updated));
  open(request);
  const summary = await screen.findByText('Edit experience');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Remove group' })).toBeEnabled());
  fireEvent.click(summary);
  fireEvent.change(screen.getByLabelText('Experience for Organizer'), { target: { value: 'veteran' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save experience' }));
  expect(await screen.findByText('Experience saved.')).toBeVisible();
  expect(request.mock.calls[2][1].body).toEqual({ action: 'setExperience', id, entryId: 'owner', version: 'version-one', experienceBand: 'veteran' });
  expect(screen.getByText('USAW player · Organizer · Experienced')).toBeVisible();
});

test('choosing a signed waiver verifies just the added player and the check survives reopening the group', async () => {
  const group = { ...initial, entries: [{ ...initial.entries[0], waiverStatus: 'missing' }] };
  const entry = { id: 'guest', displayName: 'Field Callsign', kind: 'guest', waiverStatus: 'signed' };
  const updated = { ...group, version: 'two', entries: [...group.entries, entry] };
  const match = { name: 'Rebel Guest', ref: 'signed-guest-reference', signedAt: '2026-11-19T20:00:00Z' };
  const request = jest.fn().mockResolvedValueOnce({ group }).mockResolvedValueOnce(list(group))
    .mockResolvedValueOnce({ matches: [match] }).mockResolvedValueOnce({ group: updated }).mockResolvedValueOnce(list(updated))
    .mockResolvedValueOnce({ group: updated });
  open(request);
  const add = await screen.findByRole('button', { name: 'Add player' });
  await waitFor(() => expect(add).toBeEnabled());
  const form = within(add.closest('form'));
  fireEvent.change(form.getByLabelText('Participant name or waiver reference'), { target: { value: 'Rebel' } });
  fireEvent.click(form.getByRole('button', { name: 'Find a signed waiver' }));
  fireEvent.click(await form.findByRole('button', { name: /Rebel Guest/ }));
  expect(form.getByLabelText('Player name or callsign')).toHaveValue('Rebel Guest');
  fireEvent.change(form.getByLabelText('Player name or callsign'), { target: { value: entry.displayName } });
  expect(screen.queryByText('Waiver verified')).toBeNull();
  fireEvent.click(add);
  expect(await screen.findByText('Player added.')).toBeVisible();
  expect(request.mock.calls[3][1].body).toEqual({
    action: 'addGuest', id, version: group.version, displayName: entry.displayName, experienceBand: 'unrated', waiverRef: match.ref,
  });
  expect(within(screen.getByText('Organizer').closest('li')).getByText('Waiver needed')).toBeVisible();
  expect(within(screen.getByText(entry.displayName).closest('li')).getByText('Waiver verified')).toBeVisible();
  expect(screen.getByText('1 of 2 waivers verified')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Birthday group/ }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(6));
  expect(screen.getByText('Waiver verified')).toBeVisible();
});

test('staff can recover a pending verification and link a signed waiver to an existing roster entry', async () => {
  const entry = { ...initial.entries[0], waiverStatus: 'unavailable' };
  const pending = { ...initial, entries: [entry] };
  const missing = { ...initial, version: 'after-refresh', entries: [{ ...entry, waiverStatus: 'missing' }] };
  const signed = { ...missing, version: 'linked', entries: [{ ...entry, waiverStatus: 'signed' }] };
  const match = { name: 'Actual Account Name', ref: 'confirmed-reference', signedAt: '2026-11-19T20:00:00Z' };
  const request = jest.fn().mockResolvedValueOnce({ group: pending }).mockResolvedValueOnce(list(pending))
    .mockResolvedValueOnce({ group: missing }).mockResolvedValueOnce({ matches: [match] })
    .mockResolvedValueOnce({ group: signed }).mockResolvedValueOnce(list(signed));
  open(request);
  const retry = await screen.findByRole('button', { name: 'Retry waiver verification' });
  await waitFor(() => expect(retry).toBeEnabled());
  expect(screen.getByText('Verification pending')).toBeVisible();
  fireEvent.click(retry);
  expect(await screen.findByText('Waiver needed')).toBeVisible();
  const row = within(screen.getByText('Organizer').closest('li'));
  fireEvent.click(row.getByText('Link signed waiver'));
  fireEvent.click(row.getByRole('button', { name: 'Find a signed waiver' }));
  fireEvent.click(await row.findByRole('button', { name: /Actual Account Name/ }));
  expect(await screen.findByText('Waiver linked. Roster updated.')).toBeVisible();
  expect(request.mock.calls[4][1].body).toEqual({
    action: 'linkWaiver', id, version: missing.version, entryId: entry.id, waiverRef: match.ref,
  });
  expect(screen.getByText('1 of 1 waivers verified')).toBeVisible();
  expect(screen.getByText('Waiver verified')).toBeVisible();
});

test('saves a roster spelling correction against the selected entry and reviewed version', async () => {
  const group={...initial,entries:[{...initial.entries[0],waiverStatus:'signed'}]};
  const saved={...group,version:'corrected',entries:[{...group.entries[0],displayName:'Jordan Ray'}]};
  const request=jest.fn().mockResolvedValueOnce({group}).mockResolvedValueOnce(list(group))
    .mockResolvedValueOnce({group:saved}).mockResolvedValueOnce(list(saved));
  open(request);
  const entry=within((await screen.findByText('Organizer',{selector:'strong'})).closest('li'));
  fireEvent.click(entry.getByText('Edit player name'));
  const name=entry.getByLabelText('Roster name or callsign');
  await waitFor(()=>expect(name).toBeEnabled());
  fireEvent.change(name,{target:{value:'Jordan Ray'}});
  fireEvent.click(entry.getByRole('button',{name:'Save player name'}));
  await screen.findByText('Player name saved.');
  expect(request.mock.calls[2][1].body).toEqual({action:'renameEntry',id,version:group.version,entryId:group.entries[0].id,displayName:'Jordan Ray'});
  expect(within(screen.getByText('Jordan Ray',{selector:'strong'}).closest('li')).getByText('Waiver verified')).toBeVisible();
});

test('staff can create a party in the directory, safely retry, and start with an empty roster', async () => {
  const previous = window.crypto;
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => id } });
  try {
    const group = { ...initial, name: 'November birthday', code: 'november-birthday-7', entries: [], partyStatus: null, party: null };
    const request = jest.fn().mockResolvedValueOnce(list(null)).mockRejectedValueOnce(new Error('Connection interrupted'))
      .mockResolvedValueOnce({ group }).mockResolvedValueOnce(list(group));
    open(request, '');
    const toggle = screen.getByRole('button', { name: 'New group' });
    await waitFor(() => expect(toggle).toBeEnabled());
    fireEvent.click(toggle);
    const form = within(screen.getByRole('form', { name: 'New group' }));
    fireEvent.change(form.getByLabelText('New group name'), { target: { value: group.name } });
    fireEvent.change(form.getByLabelText('Visit date'), { target: { value: date } });
    fireEvent.change(form.getByLabelText('Visit type'), { target: { value: 'party' } });
    fireEvent.change(form.getByLabelText('Expected players'), { target: { value: '7' } });
    fireEvent.submit(screen.getByRole('form', { name: 'New group' }));
    expect(await screen.findByText('Connection interrupted')).toBeVisible();
    expect(form.getByLabelText('New group name')).toHaveValue(group.name);
    fireEvent.submit(screen.getByRole('form', { name: 'New group' }));
    const detail = within(screen.getByRole('region', { name: 'Selected group' }));
    expect(await detail.findByRole('heading', { name: group.name })).toBeVisible();
    expect(detail.getByLabelText('Invitation code')).toHaveValue(group.code);
    expect(detail.getByText('No players on the list yet.')).toBeVisible();
    expect(detail.getByRole('link', { name: 'Open rental form' })).toHaveAttribute('href', '/admin/rentalform?view=new&group=' + id);
    expect(request.mock.calls[1][1].body).toEqual({ action: 'create', requestId: id, name: group.name, kind: 'party', date, headcount: 7 });
    expect(request.mock.calls[2][1].body).toEqual(request.mock.calls[1][1].body);
    expect(request.mock.calls[3][0]).toBe('/api/staff-groups?date=' + date + '&page=1');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  } finally {
    Object.defineProperty(window, 'crypto', { configurable: true, value: previous });
  }
});

test('staff can find a registered profile and add its account to an existing group', async () => {
  const member = { id: 'profile-member-42', name: 'River' };
  const previous = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ players: [member], page: 1, totalPages: 1 }) });
  try {
    const added = { ...initial, version: 'version-two', entries: [...initial.entries, {
      id: 'new-entry', playerId: member.id, displayName: member.name, kind: 'player', canRemove: true,
    }] };
    const request = jest.fn().mockResolvedValueOnce({ group: initial }).mockResolvedValueOnce(list(initial))
      .mockResolvedValueOnce({ group: added }).mockResolvedValueOnce(list(added))
      .mockResolvedValueOnce({ group: initial }).mockResolvedValueOnce(list(initial));
    open(request);
    const detail = within(screen.getByRole('region', { name: 'Selected group' }));
    const search = await detail.findByRole('search', { name: 'Group member search' });
    fireEvent.change(within(search).getByRole('searchbox'), { target: { value: 'River' } });
    fireEvent.submit(search);
    const add = await detail.findByRole('button', { name: 'Add to group' });
    expect(detail.getByRole('link', { name: 'View profile' })).toHaveAttribute('href', '/profilelookup/' + member.id);
    fireEvent.click(add);
    expect(await screen.findByText('Member added to the group.')).toBeVisible();
    expect(request.mock.calls[2][1].body).toEqual({ action: 'addMember', id, version: initial.version, playerId: member.id });
    expect(detail.getByRole('link', { name: 'View profile for River' })).toHaveAttribute('href', '/profilelookup/' + member.id);
    const nextSearch = detail.getByRole('search');
    fireEvent.change(within(nextSearch).getByRole('searchbox'), { target: { value: 'River' } });
    fireEvent.submit(nextSearch);
    expect(await detail.findByRole('button', { name: 'On roster' })).toBeDisabled();
    fireEvent.click(detail.getByRole('button', { name: 'Remove River' }));
    expect(await screen.findByText('Player removed from the group.')).toBeVisible();
    expect(request.mock.calls[4][1].body).toEqual({ action: 'removeMember', id, version: added.version, entryId: 'new-entry' });
  } finally { global.fetch = previous; }
});

test('staff see expected guests, rental needs, waiver gaps and a private organizer link before arrival', async () => {
  const group = { ...initial, organizerToken: 'a'.repeat(64),
    readiness:{ready:1,expected:4,unlisted:2,rentalsRequested:1},
    entries:[{...initial.entries[0],waiverStatus:'signed',preparation:{ready:true,rentalIntent:'requested'}},
      {id:'second',kind:'guest',displayName:'Second Guest',waiverStatus:'missing',preparation:{ready:false,rentalIntent:'unknown'}}] };
  open(jest.fn().mockResolvedValueOnce({group}).mockResolvedValueOnce(list(group)));
  const summary = await screen.findByRole('region',{name:'Party readiness'});
  expect(summary).toHaveTextContent('1 of 4 ready');
  expect(summary).toHaveTextContent('2 expected guests');
  expect(within(summary).getByRole('link',{name:'Open organizer readiness link'})).toHaveAttribute('href',
    'https://www.usairsoftfield.com/group-check-in#organizer/'+'a'.repeat(64));
  expect(screen.getByText('Second Guest').closest('li')).toHaveTextContent('Rental choice needed');
  expect(screen.getByText('Organizer').closest('li')).toHaveTextContent('Rental gear requested');
});
