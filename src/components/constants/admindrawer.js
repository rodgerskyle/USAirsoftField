import React, { useContext, useMemo } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';
import { useAppearance } from '../../Appearance';
import AppearanceControl from '../../AppearanceControl';
import logo from '../../assets/usairsoft-wide-logo.png';
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
    components: {
      MuiButton: {
        styleOverrides: {
          root: { minHeight: 44, borderRadius: 8, textTransform: 'none' },
          ...(palette.mode === 'light' && {
            contained: {
              color: 'var(--admin-on-accent)',
              backgroundColor: 'var(--admin-action-bg)',
              '&:hover, &:active': { backgroundColor: 'var(--admin-action-hover)' },
            },
          }),
        },
      },
      MuiIconButton: { styleOverrides: { root: { minHeight: 44, minWidth: 44 } } },
      MuiMenuItem: {
        styleOverrides: {
          root: ({ theme: menuTheme }) => ({
            minHeight: 44,
            [menuTheme.breakpoints.up('sm')]: { minHeight: 44 },
          }),
        },
      },
      ...(palette.mode === 'light' && {
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
      }),
    },
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
  const showShortcuts = (isAdmin || roles?.[WAIVER]) && pathname.replace(/\/$/, '') !== '/admin';

  return (
    <AdminThemeRoute>
      <div className="admin-layout">
        <header className="admin-masthead">
          <nav className="admin-navbar" aria-label="Staff navigation">
            <Link className="admin-nav-brand" to={isAdmin ? '/admin' : roles?.[WAIVER] ? '/dashboard' : '/'}>
              <img src={appearance?.theme === 'light' ? lightLogo : logo} alt="US Airsoft" className="admin-nav-logo" />
              <span>{isAdmin ? 'Staff desk' : roles?.[WAIVER] ? 'Waiver desk' : 'Website'}</span>
            </Link>
            <div className="admin-nav-actions">
              <Link to="/" className="admin-site-link" aria-label="Back to website">
                <span>Website</span><FontAwesomeIcon icon={faArrowUpRightFromSquare} aria-hidden="true" />
              </Link>
              {appearance && <AppearanceControl {...appearance} />}
            </div>
          </nav>
        </header>
        {showShortcuts && <DeskNavigation admin={isAdmin} />}
        <div className="admin-main-content"><Outlet /></div>
      </div>
    </AdminThemeRoute>
  );
}
