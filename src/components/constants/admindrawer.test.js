import React from 'react';
import { createPortal } from 'react-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Alert, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppearanceProvider } from '../../Appearance';
import AuthUserContext from '../session/context';
import AdminLayout, { DashboardDeskLayout } from './admindrawer';

const preferenceKey = 'usaw-field-theme';

function DialogTheme() {
  const { palette } = useTheme();
  return <>
    <output aria-label="Dialog theme">{palette.mode}</output>
    <Button variant="contained">Confirm desk action</Button>
    <Alert severity="success" variant="filled">Desk update saved</Alert>
  </>;
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
              <Route path="rentalform" element={<Page name="Rental form" />} />
              <Route path="field/:tool" element={<Page name="Round controls" />} />
            </Route>
            <Route path="/dashboard" element={<DashboardDeskLayout />}>
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
  expect(screen.getByRole('link', { name: 'Player Check-In' })).toHaveAttribute('href', '/admin/field/check-in');
  expect(screen.getByRole('link', { name: 'Rentals' })).toHaveAttribute('href', '/admin/rentalform');
  const switcher = screen.getByRole('button', { name: 'Dark mode' });
  expect(switcher).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByLabelText('Dialog theme')).toHaveTextContent('light');
  const action = screen.getByRole('button', { name: 'Confirm desk action' });
  const notice = screen.getByRole('alert');
  const portalRules = Array.from(document.styleSheets).flatMap(sheet => Array.from(sheet.cssRules))
    .filter(rule => rule.style?.getPropertyValue('color') === 'var(--admin-on-accent)');
  expect(portalRules.some(rule => action.matches(rule.selectorText))).toBe(true);
  expect(portalRules.some(rule => notice.matches(rule.selectorText))).toBe(true);

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
  expect(screen.getByRole('link', { name: 'Rentals' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Find a waiver' })).toHaveAttribute('href', '/dashboard/waiverlookup');
  expect(screen.queryByRole('link', { name: 'Wins & Losses' })).not.toBeInTheDocument();
});

test('keeps the theme switch available for a legacy page without exposing Staff Operations', () => {
  openPage('/admin/renewal/player', { roles: { WAIVER: true } });
  expect(screen.getByRole('button', { name: 'Dark mode' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Staff' })).not.toBeInTheDocument();
});

test('opens the grouped switcher, marks the current tool, and returns focus on Escape', () => {
  openPage('/admin/renewal/player', { roles: { ADMIN: true } });
  const toggle = screen.getByRole('button', { name: 'All tools' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(toggle);
  const menu = document.getElementById(toggle.getAttribute('aria-controls'));
  const current = within(menu).getByRole('link', { name: 'Renew member' });
  expect(current).toHaveAttribute('aria-current', 'page');
  expect(within(menu).getByRole('link', { name: 'Award badges' })).toHaveAttribute('href', '/admin#admin-badges-title');
  expect(within(menu).getByRole('link', { name: 'Find a player' })).toHaveAttribute('href', '/admin#staff-directory');
  current.focus();
  fireEvent.keyDown(current, { key: 'Escape' });
  expect(toggle).toHaveFocus();
  expect(menu).not.toBeVisible();

  fireEvent.click(toggle);
  fireEvent.pointerDown(screen.getByRole('heading', { name: 'Renew member' }));
  expect(toggle).toHaveAttribute('aria-expanded', 'false');

  fireEvent.click(toggle);
  fireEvent.click(within(menu).getByRole('link', { name: 'Round Controls' }));
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByRole('link', { name: 'Round Controls' })).toHaveAttribute('aria-current', 'page');
});

test('keeps every waiver desk link under the dashboard alias and hides admin-only destinations', () => {
  openPage('/dashboard/rentalform', { roles: { WAIVER: true } });
  const toggle = screen.getByRole('button', { name: 'All tools' });
  fireEvent.click(toggle);
  const menu = within(document.getElementById(toggle.getAttribute('aria-controls')));
  const routes = menu.getAllByRole('link').map(link => link.getAttribute('href'));
  expect(routes.slice().sort()).toEqual([
    '/dashboard', '/dashboard/birthday', '/dashboard/freegames', '/dashboard/renewal',
    '/dashboard/rentalform', '/dashboard/rentalform?view=pickup', '/dashboard/scanwaiver', '/dashboard/signup', '/dashboard/waiverform', '/dashboard/waiverlookup',
  ]);
  expect(menu.queryByRole('link', { name: /Award badges|Wins & Losses/ })).toBeNull();
});

test('shows no tool switcher to an account without a staff role', () => {
  openPage('/admin/field/rounds', { roles: {} });
  expect(screen.queryByRole('navigation', { name: 'Desk shortcuts' })).toBeNull();
  expect(screen.queryByRole('link', { name: /Staff desk/ })).toBeNull();
});

test('identifies rental pickup separately from the rental form in the staff shortcuts', () => {
  openPage('/admin/rentalform?view=pickup', { roles: { ADMIN: true } });
  const shortcuts = screen.getByRole('navigation', { name: 'Desk shortcuts' });
  expect(within(shortcuts).getByRole('link', { name: 'Rental Pickup' })).toHaveAttribute('aria-current', 'page');
  expect(within(shortcuts).getByRole('link', { name: 'Rentals' })).not.toHaveAttribute('aria-current');
});
