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

function setup() {
  const user = { uid: 'PlayerAccountAAA', getIdToken: jest.fn().mockResolvedValue('test-owner-token') };
  let authChange;
  const firebase = { auth: { currentUser: user, onAuthStateChanged: handler => { authChange = handler; handler(user); return () => {}; } } };
  const view = render(<HelmetProvider><MemoryRouter><GroupCheckIn firebase={firebase} /></MemoryRouter></HelmetProvider>);
  return { ...view, firebase, authChange: value => { firebase.auth.currentUser = value; authChange(value); } };
}

beforeEach(() => {
  global.fetch = jest.fn();
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => '00000000-0000-4000-8000-000000000099' } });
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
  fireEvent.click(screen.getByRole('button', { name: 'Create group' }));
  expect(await screen.findByText(group.code)).toBeInTheDocument();
  const body = JSON.parse(global.fetch.mock.calls[1][1].body);
  expect(body).toEqual(expect.objectContaining({ action: 'create', name: group.name, date: group.date, requestId: expect.any(String) }));
  expect(global.fetch.mock.calls[1][1]).toEqual(expect.objectContaining({ credentials: 'include', headers: expect.objectContaining({ Authorization: 'Bearer test-owner-token' }) }));
  expect(global.fetch.mock.calls.some(([, options]) => options.body?.includes('checkIn'))).toBe(false);
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel this group' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Cancel this group' }));
  await waitFor(() => expect(screen.queryByText(group.code)).not.toBeInTheDocument());
  expect(JSON.parse(global.fetch.mock.calls[3][1].body)).toEqual({ action: 'cancel', id: group.id });
  act(() => view.authChange(null));
  expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  expect(screen.queryByText('New Friend')).not.toBeInTheDocument();
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

test('staff group lookup hands members and walk-ons to individual verification with the expected visit date', async () => {
  const request = jest.fn().mockResolvedValue({ group: { ...group, entries: [
    { id: 'member', playerId: 'OfficialMemberID', displayName: 'Member' }, { id: 'guest', displayName: 'Walk-on' },
  ] }, today: group.date });
  const onSelect = jest.fn();
  render(<StaffGroupLookup request={request} onSelect={onSelect} disabled={false} />);
  fireEvent.change(screen.getByLabelText('Group code'), { target: { value: group.code } });
  fireEvent.submit(screen.getByRole('button', { name: 'Find group' }).closest('form'));
  fireEvent.click(await screen.findByRole('button', { name: /Member Verify player/ }));
  expect(onSelect).toHaveBeenCalledWith({ playerId: 'OfficialMemberID' }, false, group.date);
  fireEvent.click(screen.getByRole('button', { name: /Walk-on Preview walk-on/ }));
  expect(onSelect).toHaveBeenCalledWith({ displayName: 'Walk-on' }, true, group.date);
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][1].method).toBeUndefined();
});
