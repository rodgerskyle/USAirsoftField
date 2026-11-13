import React, { useEffect, useMemo, useState } from 'react';
import { Form, Spinner } from 'react-bootstrap/';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { onValue } from 'firebase/database';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendar, faCalendarDays, faChevronRight, faClipboardList, faGift, faQrcode,
  faSearch, faTimesCircle, faTrophy, faTv, faUserGear, faUserPen, faUserPlus,
} from '@fortawesome/free-solid-svg-icons';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import * as ROLES from '../constants/roles';
import AdminDrawer from '../constants/admindrawer';
import UserTable from '../constants/usertable';
import AdminBadgeAwards from './AdminBadgeAwards';
import { LEADERBOARD_TV_PATH } from './leaderboard';
import '../../App.css';
import '../constants/admin.css';
import './AdminDashboard.css';

const ACTION_GROUPS = [
  {
    id: 'game-day',
    title: 'Game day',
    actions: [
      { title: 'Field Game Days', path: '/schedule', icon: faCalendarDays, primary: true },
      { title: 'Leaderboard TV Display', path: LEADERBOARD_TV_PATH, icon: faTv },
      { title: 'Enter Wins', path: '/admin/enterwins', icon: faTrophy },
      { title: 'Enter Losses', path: '/admin/enterlosses', icon: faTimesCircle },
      { title: 'Check Free Games', path: '/admin/freegames', icon: faGift },
    ],
  },
  {
    id: 'members',
    title: 'Membership and waivers',
    actions: [
      { title: 'New Member', path: '/admin/signup', icon: faUserPlus },
      { title: 'Renew Member', path: '/admin/renewal', icon: faUserGear },
      { title: 'Sign Waiver', path: '/admin/waiverform', icon: faUserPen },
      { title: 'Scan Waiver', path: '/admin/scanwaiver', icon: faQrcode },
      { title: 'Search Waiver', path: '/admin/waiverlookup', icon: faSearch },
    ],
  },
  {
    id: 'field-operations',
    title: 'Field operations',
    actions: [
      { title: 'Rental Form', path: '/admin/rentalform', icon: faClipboardList },
      { title: 'Calendar', path: '/admin/birthday', icon: faCalendar },
    ],
  },
];

const userCount = new Intl.NumberFormat('en-US');
const normalized = value => typeof value === 'string' ? value.toLowerCase() : '';

function matchesQuery(user, query) {
  if (!query) return true;
  const name = normalized(user.name);
  const nameParts = name.split(/\s+/);
  return [name, normalized(user.username), normalized(user.email)].some(value => value.includes(query))
    || query.split(/\s+/).every(part => nameParts.includes(part));
}

function ActionGroup({ group }) {
  return (
    <section className="staff-dashboard__group" aria-labelledby={`staff-${group.id}`}>
      <h2 id={`staff-${group.id}`}>{group.title}</h2>
      <ul className="staff-dashboard__actions">
        {group.actions.map(({ title, path, icon, primary }) => (
          <li key={path}>
            <Link to={path} className={primary ? 'staff-dashboard__action staff-dashboard__action--primary' : 'staff-dashboard__action'}>
              <span className="staff-dashboard__action-icon"><FontAwesomeIcon icon={icon} aria-hidden="true" /></span>
              <span>{title}</span>
              <FontAwesomeIcon className="staff-dashboard__action-chevron" icon={faChevronRight} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AdminPage({ firebase }) {
  const [users, setUsers] = useState([]);
  const [directoryStatus, setDirectoryStatus] = useState('loading');
  const [search, setSearch] = useState('');

  useEffect(() => {
    return onValue(firebase.users(), snapshot => {
      const records = Object.entries(snapshot.val() || {})
        .filter(([, user]) => user && typeof user === 'object' && !Array.isArray(user))
        .map(([uid, user]) => ({ ...user, uid }));
      setUsers(records);
      setDirectoryStatus('ready');
    }, () => {
      setUsers([]);
      setDirectoryStatus('unavailable');
    });
  }, [firebase]);

  const badgePlayers = useMemo(() => users
    .filter(user => !user.roles?.[ROLES.WAIVER])
    .map(({ uid, name, username }) => ({ uid, name, username })), [users]);
  const filteredUsers = useMemo(() => {
    const query = normalized(search).trim();
    return users.filter(user => matchesQuery(user, query));
  }, [search, users]);

  const loading = directoryStatus === 'loading';
  const directoryUnavailable = directoryStatus === 'unavailable';

  return (
    <div className="admin-container staff-dashboard">
      <Helmet><title>US Airsoft Field Staff Operations</title></Helmet>
      <AdminDrawer component={
        <main className="admin-content staff-dashboard__content">
          <header className="staff-dashboard__hero">
            <div>
              <h1>Staff operations</h1>
              <nav className="staff-dashboard__jump" aria-label="Staff shortcuts">
                <a href="#staff-directory">Find a player</a>
                <a href="#admin-badges-title">Award badges</a>
              </nav>
            </div>
            <div className="staff-dashboard__count">
              <strong>{directoryStatus === 'ready' ? userCount.format(users.length) : '—'}</strong>
              <span>Directory records</span>
            </div>
          </header>

          <div className="staff-dashboard__groups">
            {ACTION_GROUPS.map(group => <ActionGroup group={group} key={group.id} />)}
          </div>

          <AdminBadgeAwards
            key={firebase.auth.currentUser?.uid}
            firebase={firebase}
            players={badgePlayers}
            loading={loading}
            directoryUnavailable={directoryUnavailable}
          />

          <section className="staff-dashboard__directory" aria-labelledby="staff-directory">
            <h2 id="staff-directory">Player directory</h2>
            <Form className="staff-dashboard__search" onSubmit={event => event.preventDefault()}>
              <Form.Label htmlFor="staff-directory-search">Search users</Form.Label>
              <Form.Control
                id="staff-directory-search"
                type="search"
                placeholder="Name, username, or email"
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </Form>
            {loading ? (
              <p className="staff-dashboard__directory-status" role="status">
                <Spinner as="span" animation="border" size="sm" aria-hidden="true" /> Loading the player directory
              </p>
            ) : directoryUnavailable ? (
              <p className="staff-dashboard__directory-status" role="alert">The player directory is unavailable. Reload the page to try again.</p>
            ) : filteredUsers.length ? (
              <UserTable users={filteredUsers} length={filteredUsers.length} search={search} />
            ) : (
              <p className="staff-dashboard__directory-status" role="status">
                {search.trim() ? 'No users match your search.' : 'No users are listed.'}
              </p>
            )}
          </section>
        </main>
      } />
    </div>
  );
}

const condition = authUser => !!authUser?.roles?.[ROLES.ADMIN];
export default withAuthorization(condition)(withFirebase(AdminPage));
