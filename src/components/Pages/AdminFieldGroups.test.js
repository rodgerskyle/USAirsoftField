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
  await waitFor(() => expect(detail.getByRole('button', { name: 'Add walk-on' })).toBeEnabled());
  expect(request.mock.calls.slice(0, 2).map(([path]) => path)).toEqual([
    '/api/staff-groups?id=' + id, '/api/staff-groups?date=' + date + '&page=1',
  ]);
  expect(detail.getByLabelText('Invitation code')).toHaveValue(initial.code);
  expect(screen.getByLabelText('Field date')).toHaveValue(date);
  expect(detail.queryByRole('button', { name: 'Remove Organizer' })).toBeNull();
  fireEvent.change(detail.getByLabelText('Walk-on name or callsign'), { target: { value: '  Rebel Guest  ' } });
  fireEvent.click(detail.getByRole('button', { name: 'Add walk-on' }));
  expect(await screen.findByText('Walk-on added.')).toBeVisible();
  expect(detail.getByText('Rebel Guest')).toBeVisible();
  expect(request.mock.calls[2][1].body).toEqual({ action: 'addGuest', id, version: 'version-one', displayName: 'Rebel Guest' });
  fireEvent.click(detail.getByRole('button', { name: 'Remove Rebel Guest' }));
  expect(await screen.findByText('Walk-on removed from the group.')).toBeVisible();
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
