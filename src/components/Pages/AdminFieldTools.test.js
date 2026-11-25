import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { FirebaseContext } from '../Firebase';
import { AuthUserContext } from '../session';
import AdminFieldTools from './AdminFieldTools';
import AdminLayout from '../constants/admindrawer';

jest.mock('../Firebase', () => {
  const context = jest.requireActual('../Firebase/context');
  return { FirebaseContext: context.default, withFirebase: context.withFirebase };
});
jest.mock('./AdminFieldCheckIn', () => ({ request }) => (
  <button type="button" onClick={() => void request('/api/game-day-check-in').catch(() => {})}>Load test roster</button>
));
jest.mock('./AdminFieldMembership', () => ({ request }) => (
  <button type="button" onClick={() => void request('/api/member-card/verify?staff=1', {
    method: 'POST', body: { playerId: 'fixture-player' },
  }).catch(() => {})}>
    Verify test membership
  </button>
));
jest.mock('./AdminFieldReports', () => () => null);

const admin = { uid: 'field-admin', roles: { ADMIN: true } };
const sessionEndpoint = 'https://app.usairsoftfield.com/api/staff-session';
const staffBoard = 'https://app.usairsoftfield.com/api/live-games?staff=1';
const modeCatalog = 'https://app.usairsoftfield.com/api/live-games?catalog=1';
const expiry = () => new Date(Date.now() + 60 * 60_000).toISOString();
const reply = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
const boardReply = () => reply({ serverNow: new Date().toISOString(), games: [], isStaff: true, poll: null });
const catalogReply = () => reply({ minOptions: 2, maxOptions: 7, sections: [{ name: 'Field games', modes: [] }] });
const fetchBeforeTest = global.fetch;

function openCheckIn(user, { verify = true, path = '/admin/field/check-in', reauthenticate } = {}) {
  let confirmRole;
  const firebase = {
    auth: { currentUser: user && { uid: user.uid, email: user.email, getIdToken: async () => 'firebase-field-id-token' } },
    doReauthenticate: reauthenticate,
    onAuthUserListener: success => {
      confirmRole = success;
      return () => {};
    },
  };
  render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <FirebaseContext.Provider value={firebase}>
        <AuthUserContext.Provider value={user}>
          <HelmetProvider>
            <Routes>
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="field/:tool" element={<AdminFieldTools />} />
              </Route>
              <Route path="/login" element={<h1>Sign in</h1>} />
            </Routes>
          </HelmetProvider>
        </AuthUserContext.Provider>
      </FirebaseContext.Provider>
    </MemoryRouter>,
  );
  const authorize = () => act(() => confirmRole(user));
  if (verify) authorize();
  return authorize;
}

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  global.fetch = fetchBeforeTest;
});

test('keeps a direct field tool URL behind the verified website administrator guard', () => {
  openCheckIn({ uid: 'member', roles: {} });
  expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Player Check-In' })).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});

test.each(['desk-one', 'desk-two'])('unlocks an independently authorized admin %s with their own recent sign-in', async uid => {
  fetch.mockResolvedValueOnce(reply({ available: true, accountStatus: 'staff', isStaff: false }))
    .mockResolvedValueOnce(reply({ isStaff: true, expiresAt: expiry() }));
  openCheckIn({ uid, email: uid + '@example.com', roles: { ADMIN: 'ADMIN' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Use my admin account' }));
  expect(await screen.findByText('Load test roster')).toBeVisible();
  expect(fetch).toHaveBeenLastCalledWith(sessionEndpoint, expect.objectContaining({
    method: 'POST', credentials: 'include', body: JSON.stringify({ action: 'unlock-account' }),
  }));
});

test('re-verifies a stale admin sign-in with Firebase before retrying the field session exchange', async () => {
  fetch.mockResolvedValueOnce(reply({ available: true, accountStatus: 'staff', isStaff: false }))
    .mockResolvedValueOnce(reply({ code: 'recent_login_required', error: 'Verify your account.' }, 401))
    .mockResolvedValueOnce(reply({ isStaff: true, expiresAt: expiry() }));
  const reauthenticate = jest.fn().mockResolvedValue({});
  openCheckIn({ ...admin, email: 'field@example.com' }, { reauthenticate });
  fireEvent.click(await screen.findByRole('button', { name: 'Use my admin account' }));
  fireEvent.change(await screen.findByLabelText('Account password'), { target: { value: 'fixture' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify account password' }));
  expect(await screen.findByText('Load test roster')).toBeVisible();
  expect(reauthenticate).toHaveBeenCalledWith('field@example.com', 'fixture');
  expect(fetch.mock.calls.slice(1).map(([, options]) => JSON.parse(options.body))).toEqual([{ action: 'unlock-account' }, { action: 'unlock-account' }]);
});

test('unlocks once, switches between in-site tools, and revokes the shared cookie session', async () => {
  fetch
    .mockResolvedValueOnce(reply({ available: true, accountStatus: 'staff', isStaff: false }))
    .mockResolvedValueOnce(reply({ isStaff: true, expiresAt: expiry() }))
    .mockImplementation(async (url, { method }) => {
      if (url === staffBoard) return boardReply();
      if (url === modeCatalog) return catalogReply();
      if (url === sessionEndpoint && method === 'DELETE') return reply({ isStaff: false });
      throw new Error('Unexpected call ' + url);
    });
  const verify = openCheckIn(admin, { verify: false });
  expect(fetch).not.toHaveBeenCalled();
  verify();
  await screen.findByRole('heading', { name: 'Unlock field tools' });
  expect(screen.queryByText('Load test roster')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Staff unlock email'), { target: { value: 'staff@example.com' } });
  fireEvent.change(screen.getByLabelText('Staff unlock password'), { target: { value: 'test-credential' } });
  fireEvent.click(screen.getByRole('button', { name: 'Unlock field tools' }));
  await screen.findByRole('button', { name: 'Load test roster' });
  expect(fetch).toHaveBeenNthCalledWith(2, sessionEndpoint, expect.objectContaining({
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json', Authorization: 'Bearer firebase-field-id-token', 'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: 'staff@example.com', password: 'test-credential' }),
  }));

  fireEvent.click(screen.getByRole('link', { name: 'Round Controls' }));
  expect(await screen.findByRole('heading', { name: 'Current and scheduled rounds' })).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(staffBoard, expect.objectContaining({
    credentials: 'include', headers: { Accept: 'application/json', Authorization: 'Bearer firebase-field-id-token' },
  }));

  fireEvent.click(screen.getByRole('button', { name: 'Lock field tools' }));
  await screen.findByRole('heading', { name: 'Unlock field tools' });
  expect(screen.queryByRole('heading', { name: 'Current and scheduled rounds' })).not.toBeInTheDocument();
  expect(fetch).toHaveBeenLastCalledWith(sessionEndpoint, expect.objectContaining({
    method: 'DELETE', credentials: 'include',
  }));
});

test('returns to the unlock form for an expired desk session and reopens Round Controls after unlock', async () => {
  let valid = false;
  fetch.mockImplementation(async (url, { method }) => {
    if (url === sessionEndpoint) {
      if (method === 'POST') valid = true;
      return reply({ accountStatus: 'staff', isStaff: true, expiresAt: expiry() });
    }
    if (url === modeCatalog) return catalogReply();
    if (url === staffBoard) return valid ? boardReply() : reply({ error: 'Unlock staff tools.', code: 'staff_session_required' }, 401);
    throw new Error('Unexpected call ' + url);
  });
  openCheckIn({ ...admin, email: 'test@example.com' }, { path: '/admin/field/rounds' });
  await screen.findByRole('heading', { name: 'Unlock field tools' });
  fireEvent.click(screen.getByRole('button', { name: 'Use my admin account' }));
  expect(await screen.findByRole('heading', { name: 'Current and scheduled rounds' })).toBeVisible();
});

test.each([[403, 'staff_role_required'], [401, 'staff_account_required']])(
  'routes a %s account rejection to USAW sign-in instead of offering a desk unlock', async (status, code) => {
    fetch.mockImplementation(async url => {
      if (url === sessionEndpoint) return reply({ accountStatus: 'staff', isStaff: true, expiresAt: expiry() });
      if (url === modeCatalog) return catalogReply();
      if (url === staffBoard) return reply({ error: 'An authorized account is required.', code }, status);
      throw new Error('Unexpected call ' + url);
    });
    openCheckIn(admin, { path: '/admin/field/rounds' });
    await screen.findByRole('heading', { name: 'Sign in with your authorized USAW staff account' });
    expect(screen.getByRole('link', { name: 'Sign in to USAW' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('heading', { name: 'Unlock field tools' })).toBeNull();
  },
);

test('an obsolete staff board request cannot lock a newer verified board', async () => {
  let finishOld;
  fetch.mockImplementation(async url => {
    if (url === sessionEndpoint) return reply({ accountStatus: 'staff', isStaff: true, expiresAt: expiry() });
    if (url === modeCatalog) return catalogReply();
    if (url === staffBoard && !finishOld) return new Promise(resolve => { finishOld = resolve; });
    if (url === staffBoard) return boardReply();
    throw new Error('Unexpected call ' + url);
  });
  openCheckIn(admin, { path: '/admin/field/rounds' });
  await waitFor(() => expect(finishOld).toBeDefined());
  fireEvent.click(screen.getByRole('button', { name: 'Refresh board' }));
  await screen.findByRole('heading', { name: 'Current and scheduled rounds' });
  await act(async () => finishOld(reply({ error: 'Staff session expired' }, 401)));
  expect(screen.getByRole('heading', { name: 'Current and scheduled rounds' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Unlock field tools' })).toBeNull();
});

test('removes the private tool when a protected request reports lost staff access', async () => {
  fetch
    .mockResolvedValueOnce(reply({ available: true, accountStatus: 'staff', isStaff: true, expiresAt: expiry() }))
    .mockResolvedValueOnce(reply({ error: 'Staff session expired', staffRequired: true }, 403));
  openCheckIn(admin);
  fireEvent.click(await screen.findByRole('button', { name: 'Load test roster' }));
  await waitFor(() => expect(screen.queryByText('Load test roster')).not.toBeInTheDocument());
  expect(screen.getByRole('heading', { name: 'Unlock field tools' })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('USAW staff access must be verified again.');
});

test('sends the active session cookie with website membership verification', async () => {
  fetch
    .mockResolvedValueOnce(reply({ available: true, accountStatus: 'staff', isStaff: true, expiresAt: expiry() }))
    .mockResolvedValueOnce(reply({ status: 'active' }));
  openCheckIn(admin, { path: '/admin/field/membership' });
  fireEvent.click(await screen.findByRole('button', { name: 'Verify test membership' }));
  await waitFor(() => expect(fetch).toHaveBeenNthCalledWith(2,
    'https://app.usairsoftfield.com/api/member-card/verify?staff=1',
    expect.objectContaining({ method: 'POST', credentials: 'include' }),
  ));
});
