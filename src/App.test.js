import React from 'react';
import { webcrypto } from 'crypto';
import { render, screen } from '@testing-library/react';
import { onValue } from 'firebase/database';
import { HelmetProvider } from 'react-helmet-async';
import { FirebaseContext } from './components/Firebase';
import App from './App';

jest.mock('./components/Firebase', () => {
  const context = jest.requireActual('./components/Firebase/context');
  return { FirebaseContext: context.default, withFirebase: context.withFirebase };
});
jest.mock('firebase/database', () => ({ onValue: jest.fn() }));
jest.mock('./components/constants/playerDisplayNames', () => ({ getAllPlayerDisplayNames: async () => ({}) }));

// App also imports PDF generation, the party calendar, and the on-device camera.
// They do not participate in routing or the staff authorization check.
jest.mock('@react-pdf/renderer', () => ({}));
jest.mock('jspdf', () => jest.fn());
jest.mock('./components/Pages/Birthday', () => () => null);
jest.mock('./components/Pages/StaffCardScanner', () => ({ StaffCardScanner: () => null }));

test.each([
  ['/admin/scores', ''],
  ['/admin/enterwins', '?result=win'],
  ['/admin/enterlosses', '?result=loss'],
])('opens the authorized score desk from %s', async (path, search) => {
  const originalCrypto = Object.getOwnPropertyDescriptor(window, 'crypto');
  Object.defineProperty(window, 'crypto', { configurable: true, value: webcrypto });
  const staff = { uid: 'test-staff', roles: { ADMIN: true } };
  onValue.mockImplementation(() => () => {});
  const firebase = {
    auth: { currentUser: staff },
    users: () => 'players',
    onAuthUserListener: notify => {
      notify(staff);
      return () => {};
    },
  };
  window.history.replaceState(null, '', path);
  try {
    render(<FirebaseContext.Provider value={firebase}><HelmetProvider><App /></HelmetProvider></FirebaseContext.Provider>);
    expect(await screen.findByRole('heading', { name: 'Wins and losses' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/admin/scores');
    expect(window.location.search).toBe(search);
    expect(onValue).toHaveBeenCalledWith('players', expect.any(Function), expect.any(Function));
  } finally {
    if (originalCrypto) Object.defineProperty(window, 'crypto', originalCrypto);
    else delete window.crypto;
    window.history.replaceState(null, '', '/');
    window.localStorage.removeItem('authUser');
  }
});
