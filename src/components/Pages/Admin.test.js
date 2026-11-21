import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { onValue } from 'firebase/database';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { FirebaseContext } from '../Firebase';
import { AuthUserContext } from '../session';
import Admin from './Admin';

jest.mock('../Firebase', () => {
  const context = jest.requireActual('../Firebase/context');
  return { FirebaseContext: context.default, withFirebase: context.withFirebase };
});
jest.mock('firebase/database', () => ({ onValue: jest.fn() }));
jest.mock('../constants/usertable', () => ({ users }) => users.map(user => user.uid).join(' '));
jest.mock('./AdminBadgeAwards', () => () => <h2 id="admin-badges-title">Badge awards</h2>);

const admin = { uid: 'field-admin', roles: { ADMIN: true } };
const member = { uid: 'field-member', roles: {} };

function openAdmin(user) {
  let onAuthChange;
  const firebase = {
    auth: { currentUser: user },
    users: () => 'players',
    onAuthUserListener: success => {
      onAuthChange = success;
      return () => {};
    },
  };
  render(
    <MemoryRouter initialEntries={['/admin']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <FirebaseContext.Provider value={firebase}>
        <AuthUserContext.Provider value={user}>
          <HelmetProvider>
            <Routes>
              <Route path="/admin" element={<Admin />} />
              <Route path="/login" element={<h1>Sign in</h1>} />
            </Routes>
          </HelmetProvider>
        </AuthUserContext.Provider>
      </FirebaseContext.Provider>
    </MemoryRouter>,
  );
  return () => act(() => onAuthChange(user));
}

beforeEach(() => {
  onValue.mockReset();
  onValue.mockImplementation((_ref, next) => {
    next({ val: () => ({}) });
    return () => {};
  });
});

test('links each native field tool once and keeps website scoring, scheduling, waivers, and awards', () => {
  const verify = openAdmin(admin);
  expect(screen.queryByRole('heading', { name: 'Badge awards' })).toBeNull();
  expect(onValue).not.toHaveBeenCalled();
  verify();
  expect(screen.getByRole('heading', { name: 'Staff operations' })).toBeInTheDocument();

  const fieldTools = [
    ['Player Check-In', '/admin/field/check-in'],
    ['Round Controls', '/admin/field/rounds'],
    ['Verify Membership', '/admin/field/membership'],
    ['Team Reports', '/admin/field/reports'],
    ['Barracks Game Day TV', '/barracks-tv'],
  ];
  for (const [name, path] of fieldTools) {
    expect(screen.getByRole('link', { name })).toHaveAttribute('href', path);
  }
  const websiteTools = [
    ['Party Calendar', '/admin/birthday'],
    ['Manage Groups', '/admin/field/groups'],
    ['Field Game Days', '/schedule'],
    ['Wins & Losses', '/admin/scores'],
    ['Scan Waiver', '/admin/scanwaiver'],
  ];
  for (const [name, path] of websiteTools) {
    expect(screen.getByRole('link', { name })).toHaveAttribute('href', path);
  }
  expect(screen.queryByRole('link', { name: /Enter Wins|Enter Losses/ })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Badge awards' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Player directory' })).toBeInTheDocument();
});

test('keeps staff tools behind the website administrator guard', () => {
  openAdmin(member)();
  expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Player Check-In/ })).not.toBeInTheDocument();
  expect(onValue).not.toHaveBeenCalled();
});

test('includes archived players only when selected and finds an individual account by player ID', () => {
  onValue.mockImplementation((_ref, next) => {
    next({ val: () => ({
      'live-uid': { name: 'Casey Hill', username: 'caseyhill' },
      'archived-uid': { name: 'Casey Hill', username: 'caseyhill1', accountRemovedAt: 100 },
    }) });
    return () => {};
  });
  openAdmin(admin)();
  expect(screen.queryByText(/archived-uid/)).toBeNull();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Include archived accounts' }));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'archived-uid' } });
  expect(screen.getByText('archived-uid')).toBeVisible();
  expect(screen.queryByText(/live-uid/)).toBeNull();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Include archived accounts' }));
  expect(screen.getByText('No users match your search.')).toBeVisible();
});
