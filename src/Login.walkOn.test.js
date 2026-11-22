import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { get } from 'firebase/database';
import { SignInForm } from './Login';
import RentalsManagement from './components/Pages/RentalsManagement';

jest.mock('./components/Firebase', () => ({ withFirebase: Component => Component }));
jest.mock('firebase/database', () => ({ get: jest.fn() }));
jest.mock('./passwordForgot', () => ({ PasswordForgetLink: () => null }));
jest.mock('./components/ThemedCaptcha', () => {
  const React = require('react');
  return React.forwardRef(({ onChange }, ref) => {
    React.useImperativeHandle(ref, () => ({ getValue: () => 'solved', reset: jest.fn() }));
    return <button onClick={() => onChange('solved')}>Complete challenge</button>;
  });
});

const walkOn = 'guest:' + 'a'.repeat(64);
const date = '2026-11-22';
const companion = new URLSearchParams({ view: 'new', walkOn, date, from: 'companion' });

function Location() {
  const { pathname, search } = useLocation();
  return <output aria-label="Current route">{pathname + search}</output>;
}

function renderRoute(initialPath, roles = {}) {
  let signOut;
  let existingUser;
  const firebase = {
    onAuthUserListener: (success, missing) => {
      signOut = missing;
      existingUser = user => success(user);
      return () => {};
    },
    user: uid => uid,
    checkRecaptcha: () => async () => ({ data: { status: 'success.' } }),
    doSignInWithEmailAndPassword: async () => ({ user: { uid: 'desk-test' } }),
  };
  get.mockResolvedValue({ val: () => ({ roles }) });
  render(<HelmetProvider>
    <MemoryRouter initialEntries={[initialPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<SignInForm firebase={firebase} />} />
        <Route path="/admin/rentalform" element={<RentalsManagement firebase={firebase} />} />
        <Route path="*" element={null} />
      </Routes>
      <Location />
    </MemoryRouter>
  </HelmetProvider>);
  return {
    signedOut: () => act(() => signOut()),
    signedIn: user => act(() => existingUser(user)),
  };
}

async function signIn() {
  fireEvent.change(screen.getByPlaceholderText('Email Address'), { target: { value: 'desk@example.test' } });
  fireEvent.change(screen.getByPlaceholderText('Enter Password'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Complete challenge' }));
  const submit = screen.getByRole('button', { name: 'Sign In' });
  await waitFor(() => expect(submit).toBeEnabled());
  fireEvent.click(submit);
}

test('a signed-out rental handoff retains only the allowlisted walk-on fields through admin login', async () => {
  const { signedOut } = renderRoute('/admin/rentalform?' + companion + '&returnTo=https://example.test&name=Secret&form=5', { ADMIN: true });
  signedOut();
  expect(screen.getByLabelText('Current route').textContent).toBe('/login?' + companion);
  await signIn();
  await waitFor(() => expect(screen.getByLabelText('Current route').textContent).toBe('/admin/rentalform?' + companion));
});

test.each([{}, { WAIVER: 'false' }])('a signed-in player without desk access cannot carry the rental handoff forward (%o)', roles => {
  const { signedIn } = renderRoute('/admin/rentalform?' + companion);
  signedIn({ uid: 'player', roles });
  expect(screen.getByLabelText('Current route').textContent).toBe('/login');
});

test.each([
  [{ WAIVER: 'WAIVER' }, '/dashboard/rentalform?' + companion],
  [{ WAIVER: 'WAIVER', ADMIN: true }, '/admin/rentalform?' + companion],
  [{ WAIVER: 'WAIVER', STATIC: 'STATIC' }, '/dashboard'],
  [{}, '/'],
])('sign-in returns eligible desks to their rental and keeps other roles on their usual route (%o)', async (roles, expected) => {
  renderRoute('/login?' + companion, roles);
  await signIn();
  await waitFor(() => expect(screen.getByLabelText('Current route').textContent).toBe(expected));
});

test('an invalid walk-on id or external return target cannot change the sign-in destination', async () => {
  renderRoute('/login?walkOn=malformed&date=' + date + '&returnTo=https://example.test', { ADMIN: true });
  await signIn();
  await waitFor(() => expect(screen.getByLabelText('Current route').textContent).toBe('/'));
});
