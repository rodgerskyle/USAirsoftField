import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { FirebaseContext } from '../Firebase';
import { AuthUserContext } from '../session';
import AdminFieldTools from './AdminFieldTools';

jest.mock('../Firebase', () => {
  const context = jest.requireActual('../Firebase/context');
  return { FirebaseContext: context.default, withFirebase: context.withFirebase };
});
jest.mock('./AdminFieldCheckIn', () => ({ request }) => (
  <button type="button" onClick={() => void request('/api/game-day-check-in').catch(() => {})}>Load test roster</button>
), { virtual: true });
jest.mock('./AdminFieldRounds', () => () => <p>Test round controls</p>, { virtual: true });
jest.mock('./AdminFieldMembership', () => ({ request }) => (
  <button type="button" onClick={() => void request('/api/member-card/verify?staff=1', {
    method: 'POST', body: { playerId: 'fixture-player' },
  }).catch(() => {})}>
    Verify test membership
  </button>
), { virtual: true });
jest.mock('./AdminFieldReports', () => () => null, { virtual: true });

const admin = { uid: 'field-admin', roles: { ADMIN: true } };
const sessionEndpoint = 'https://app.usairsoftfield.com/api/staff-session';
const expiry = () => new Date(Date.now() + 60 * 60_000).toISOString();
const reply = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
const fetchBeforeTest = global.fetch;

function openCheckIn(user, { verify = true, path = '/admin/field/check-in' } = {}) {
  let confirmRole;
  const firebase = {
    auth: { currentUser: user && { uid: user.uid, getIdToken: async () => 'firebase-field-id-token' } },
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
              <Route path="/admin/field/:tool" element={<AdminFieldTools />} />
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

test('unlocks once, switches between in-site tools, and revokes the shared cookie session', async () => {
  fetch
    .mockResolvedValueOnce(reply({ available: true, accountStatus: 'staff', isStaff: false }))
    .mockResolvedValueOnce(reply({ isStaff: true, expiresAt: expiry() }))
    .mockResolvedValueOnce(reply({ isStaff: false }));
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
  expect(await screen.findByText('Test round controls')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(2);

  fireEvent.click(screen.getByRole('button', { name: 'Lock field tools' }));
  await screen.findByRole('heading', { name: 'Unlock field tools' });
  expect(screen.queryByText('Test round controls')).not.toBeInTheDocument();
  expect(fetch).toHaveBeenNthCalledWith(3, sessionEndpoint, expect.objectContaining({
    method: 'DELETE', credentials: 'include',
  }));
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
