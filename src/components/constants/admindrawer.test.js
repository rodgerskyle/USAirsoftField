import React from 'react';
import { createPortal } from 'react-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { useTheme } from '@mui/material/styles';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppearanceProvider } from '../../Appearance';
import AuthUserContext from '../session/context';
import AdminLayout, { AdminThemeRoute } from './admindrawer';

const preferenceKey = 'usaw-field-theme';

function DialogTheme() {
  const { palette } = useTheme();
  return <output aria-label="Dialog theme">{palette.mode}</output>;
}

function Page({ name }) {
  return (
    <>
      <h1>{name}</h1>
      <Link to="/admin/field/rounds">Open rounds</Link>
      {createPortal(<DialogTheme />, document.body)}
    </>
  );
}

function openPage(path, user) {
  return render(
    <AppearanceProvider>
      <AuthUserContext.Provider value={user}>
        <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="renewal/:id" element={<Page name="Renew member" />} />
              <Route path="field/:tool" element={<Page name="Round controls" />} />
            </Route>
            <Route path="/dashboard" element={<AdminThemeRoute />}>
              <Route path="rentalform" element={<Page name="Rental form" />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthUserContext.Provider>
    </AppearanceProvider>,
  );
}

afterEach(() => {
  localStorage.removeItem(preferenceKey);
  document.documentElement.removeAttribute('data-bs-theme');
});

test('uses one theme switch across staff routes and updates portaled controls', () => {
  localStorage.setItem(preferenceKey, 'light');
  const staff = { roles: { ADMIN: true } };
  const { unmount } = openPage('/admin/renewal/player', staff);
  expect(screen.getByRole('heading', { name: 'Renew member' })).toBeInTheDocument();
  const switcher = screen.getByRole('button', { name: 'Dark mode' });
  expect(switcher).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByLabelText('Dialog theme')).toHaveTextContent('light');

  fireEvent.click(switcher);
  expect(document.documentElement).toHaveAttribute('data-bs-theme', 'dark');
  expect(screen.getByLabelText('Dialog theme')).toHaveTextContent('dark');
  expect(localStorage.getItem(preferenceKey)).toBe('dark');

  fireEvent.click(screen.getByRole('link', { name: 'Open rounds' }));
  expect(screen.getByRole('heading', { name: 'Round controls' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Dark mode' })).toBe(switcher);
  unmount();

  openPage('/admin/field/rounds', staff);
  const restored = screen.getByRole('button', { name: 'Dark mode' });
  expect(restored).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(restored);
  expect(screen.getByLabelText('Dialog theme')).toHaveTextContent('light');
});

test('applies the saved theme to a dashboard alias while keeping its navigation separate', () => {
  localStorage.setItem(preferenceKey, 'dark');
  openPage('/dashboard/rentalform', { roles: { WAIVER: true } });
  expect(screen.getByRole('heading', { name: 'Rental form' })).toBeInTheDocument();
  expect(screen.getByLabelText('Dialog theme')).toHaveTextContent('dark');
  expect(screen.queryByRole('navigation', { name: 'Staff navigation' })).not.toBeInTheDocument();
});

test('keeps the theme switch available for a legacy page without exposing Staff Operations', () => {
  openPage('/admin/renewal/player', { roles: { WAIVER: true } });
  expect(screen.getByRole('button', { name: 'Dark mode' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Staff' })).not.toBeInTheDocument();
});
