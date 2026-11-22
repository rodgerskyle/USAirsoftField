import React, { useContext, useMemo } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';
import { useAppearance } from '../../Appearance';
import AppearanceControl from '../../AppearanceControl';
import logo from '../../assets/usairsoft-small-logo.png';
import lightLogo from '../../assets/usairsoft-wide-logo-light.png';
import { AuthUserContext } from '../session';
import { officialAccountRoles, WAIVER } from './roles';
import DeskNavigation from './DeskNavigation';
import './admin-theme.css';

const adminPalettes = {
  light: {
    mode: 'light',
    primary: { main: '#174a87' },
    background: { default: '#f2f5f8', paper: '#fff' },
    text: { primary: '#0d2338', secondary: '#496078' },
    divider: '#d3dfe9',
  },
  dark: {
    mode: 'dark',
    primary: { main: '#b4d3f7' },
    background: { default: '#0b1622', paper: '#142638' },
    text: { primary: '#f1f6fd', secondary: '#b7c9dc' },
    divider: '#38516a',
  },
};

export function AdminThemeRoute({ children }) {
  const palette = adminPalettes[useAppearance()?.theme ?? 'light'];
  const { typography } = useTheme();
  const theme = useMemo(() => createTheme({
    typography,
    palette,
    ...(palette.mode === 'light' && {
      components: {
        MuiButton: {
          styleOverrides: {
            contained: {
              color: 'var(--admin-on-accent)',
              backgroundColor: 'var(--admin-action-bg)',
              '&:hover, &:active': { backgroundColor: 'var(--admin-action-hover)' },
            },
          },
        },
        MuiAlert: {
          styleOverrides: {
            filled: ({ ownerState }) => {
              const severity = ownerState.color || ownerState.severity;
              const surface = { error: 'danger', success: 'success', warning: 'warning' }[severity];
              return {
                color: 'var(--admin-on-accent)',
                backgroundColor: surface ? `var(--admin-${surface}-bg)` : 'var(--admin-action-bg)',
              };
            },
          },
        },
      },
    }),
  }), [typography, palette]);

  return (
    <ThemeProvider theme={theme}>{children ?? <Outlet />}</ThemeProvider>
  );
}

export function DashboardDeskLayout() {
  const { pathname } = useLocation();
  const roles = useContext(AuthUserContext)?.roles;
  return <AdminThemeRoute>
    {pathname.replace(/\/$/, '') !== '/dashboard' && (officialAccountRoles(roles).ADMIN || roles?.[WAIVER]) &&
      <DeskNavigation base="/dashboard" />}
    <Outlet />
  </AdminThemeRoute>;
}

export default function AdminLayout() {
  const appearance = useAppearance();
  const { pathname } = useLocation();
  const roles = useContext(AuthUserContext)?.roles;
  const isAdmin = Boolean(officialAccountRoles(roles).ADMIN);
  const showShortcuts = (isAdmin || roles?.[WAIVER]) && pathname.replace(/\/$/, '') !== '/admin'
    && !pathname.startsWith('/admin/field/');

  return (
    <AdminThemeRoute>
      <div className="admin-layout">
        <Navbar className="admin-navbar" aria-label="Staff navigation">
          <Container fluid>
            <Navbar.Brand as={Link} to={isAdmin ? '/admin' : '/'}>
              <img src={appearance?.theme === 'light' ? lightLogo : logo} alt="" className="admin-nav-logo" />
              <span>{isAdmin ? 'Staff' : 'US Airsoft'}</span>
            </Navbar.Brand>
            <Nav className="admin-nav-actions">
              <Link to="/" className="admin-site-link" aria-label="Back to website">Website</Link>
              {appearance && <AppearanceControl {...appearance} />}
            </Nav>
          </Container>
        </Navbar>
        {showShortcuts && <DeskNavigation admin={isAdmin} />}
        <div className="admin-main-content"><Outlet /></div>
      </div>
    </AdminThemeRoute>
  );
}
