import React from 'react';
import { act, render, screen } from '@testing-library/react';
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
jest.mock('../constants/usertable', () => () => null);
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

test('links each new Companion tool once and keeps website scoring, scheduling, waivers, and awards', () => {
  openAdmin(admin)();
  expect(screen.getByRole('heading', { name: 'Staff operations' })).toBeInTheDocument();

  const companionTools = [
    ['Player Check-In Companion', '#staff/tool/check-in'],
    ['Round Controls Companion', '#staff/tool/round-controls'],
    ['Verify Membership Companion', '#staff/tool/verify-membership'],
    ['Team Reports Companion', '#staff/tool/team-reports'],
    ['Barracks Game Day TV Companion', '#game-day-tv'],
  ];
  for (const [name, fragment] of companionTools) {
    expect(screen.getByRole('link', { name })).toHaveAttribute('href', `https://app.usairsoftfield.com/${fragment}`);
  }
  const websiteTools = [
    ['Field Game Days', '/schedule'],
    ['Enter Wins', '/admin/enterwins'],
    ['Enter Losses', '/admin/enterlosses'],
    ['Scan Waiver', '/admin/scanwaiver'],
  ];
  for (const [name, path] of websiteTools) {
    expect(screen.getByRole('link', { name })).toHaveAttribute('href', path);
  }
  expect(screen.getByRole('heading', { name: 'Badge awards' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Player directory' })).toBeInTheDocument();
});

test('keeps staff tools behind the website administrator guard', () => {
  openAdmin(member)();
  expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Player Check-In/ })).not.toBeInTheDocument();
  expect(onValue).not.toHaveBeenCalled();
});
