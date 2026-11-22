import React, { useEffect, useMemo, useState } from 'react';
import { Form, Spinner } from 'react-bootstrap/';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { onValue } from 'firebase/database';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faAward, faChevronRight, faSearch } from '@fortawesome/free-solid-svg-icons';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import * as ROLES from '../constants/roles';
import { adminToolGroups } from '../constants/deskTools';
import UserTable from '../constants/usertable';
import AdminBadgeAwards from './AdminBadgeAwards';
import '../../App.css';
import '../constants/admin.css';
import './AdminDashboard.css';

const userCount = new Intl.NumberFormat('en-US');
const normalized = value => typeof value === 'string' ? value.toLowerCase() : '';

function matchesQuery(user, query) {
  if (!query) return true;
  const name = normalized(user.name);
  const nameParts = name.split(/\s+/);
  return [name, normalized(user.username), normalized(user.email), normalized(user.uid)].some(value => value.includes(query))
    || query.split(/\s+/).every(part => nameParts.includes(part));
}

function ActionGroup({ group, featured = false }) {
  return (
    <section className={featured ? 'staff-dashboard__game-day' : 'staff-dashboard__group'}
      aria-labelledby={`staff-${group.id}`}>
      <h2 id={`staff-${group.id}`}>{group.title}</h2>
      <ul className="staff-dashboard__actions">
        {group.actions.map(({ title, path, icon }) => (
          <li key={path}>
            <Link to={path} className="staff-dashboard__action">
              <span className="staff-dashboard__action-icon"><FontAwesomeIcon icon={icon} aria-hidden="true" /></span>
              <span>{title}</span>
              <FontAwesomeIcon className="staff-dashboard__action-arrow"
                icon={featured ? faArrowRight : faChevronRight} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AdminPage({ firebase }) {
  const { hash } = useLocation();
  const [users, setUsers] = useState([]);
  const [directoryStatus, setDirectoryStatus] = useState('loading');
  const [search, setSearch] = useState('');
  const [showRemoved, setShowRemoved] = useState(false);

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

  // Direct links from another desk can arrive before the admin guard finishes.
  useEffect(() => {
    if (hash === '#staff-directory' || hash === '#admin-badges-title') {
      document.getElementById(hash.slice(1))?.scrollIntoView?.({ block: 'start' });
    }
  }, [hash]);

  const badgePlayers = useMemo(() => users
    .filter(user => !user.accountRemovedAt && !user.roles?.[ROLES.WAIVER])
    .map(({ uid, name, username }) => ({ uid, name, username })), [users]);
  const filteredUsers = useMemo(() => {
    const query = normalized(search).trim();
    return users.filter(user => (showRemoved || !user.accountRemovedAt) && matchesQuery(user, query));
  }, [search, showRemoved, users]);

  const loading = directoryStatus === 'loading';
  const directoryUnavailable = directoryStatus === 'unavailable';

  return (
    <div className="admin-container staff-dashboard">
      <Helmet><title>US Airsoft Field Staff Operations</title></Helmet>
      <main className="admin-content staff-dashboard__content">
        <header className="staff-dashboard__masthead">
          <div className="staff-dashboard__intro">
            <h1>Staff operations</h1>
            <nav className="staff-dashboard__jump" aria-label="Staff shortcuts">
              <a href="#staff-directory"><FontAwesomeIcon icon={faSearch} aria-hidden="true" />Find a player</a>
              <a href="#admin-badges-title"><FontAwesomeIcon icon={faAward} aria-hidden="true" />Award badges</a>
            </nav>
          </div>
        </header>

        <ActionGroup group={adminToolGroups[0]} featured />
        <div className="staff-dashboard__groups">
          {adminToolGroups.slice(1).map(group => <ActionGroup group={group} key={group.id} />)}
        </div>

        <section className="staff-dashboard__directory" aria-labelledby="staff-directory">
          <header className="staff-dashboard__directory-header">
            <h2 id="staff-directory">Player directory</h2>
            <span className="staff-dashboard__count">
              Active records <strong>{directoryStatus === 'ready' ? userCount.format(users.filter(user => !user.accountRemovedAt).length) : '—'}</strong>
            </span>
          </header>
          <Form className="staff-dashboard__search" onSubmit={event => event.preventDefault()}>
            <div className="staff-dashboard__query">
              <Form.Label htmlFor="staff-directory-search">Find a player</Form.Label>
              <Form.Control
                id="staff-directory-search"
                type="search"
                placeholder="Name, username, email, or player ID"
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </div>
            <Form.Check id="staff-directory-show-removed" label="Include archived accounts"
              checked={showRemoved} onChange={event => setShowRemoved(event.target.checked)} />
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

        <AdminBadgeAwards
          key={firebase.auth.currentUser?.uid}
          firebase={firebase}
          players={badgePlayers}
          loading={loading}
          directoryUnavailable={directoryUnavailable}
        />
      </main>
    </div>
  );
}

const condition = authUser => Boolean(authUser?.uid && ROLES.officialAccountRoles(authUser.roles).ADMIN);
export default withAuthorization(condition, { verifyOnMount: true })(withFirebase(AdminPage));
