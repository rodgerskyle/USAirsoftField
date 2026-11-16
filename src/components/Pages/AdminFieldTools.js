import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import { withFirebase } from '../Firebase';
import { AuthUserContext, withAuthorization } from '../session';
import { ADMIN } from '../constants/roles';
import { fieldStaffPaths, requestStaffFieldTool } from '../constants/fieldStaffApi';
import AdminFieldCheckIn from './AdminFieldCheckIn';
import AdminFieldRounds from './AdminFieldRounds';
import AdminFieldMembership from './AdminFieldMembership';
import AdminFieldReports from './AdminFieldReports';
import '../constants/admin.css';
import './AdminDashboard.css';
import './AdminFieldTools.css';

const fieldTools = [
  { id: 'check-in', title: 'Player Check-In', path: fieldStaffPaths.checkIn, Panel: AdminFieldCheckIn },
  { id: 'rounds', title: 'Round Controls', path: fieldStaffPaths.rounds, Panel: AdminFieldRounds },
  { id: 'membership', title: 'Verify Membership', path: fieldStaffPaths.membership, Panel: AdminFieldMembership },
  { id: 'reports', title: 'Team Reports', path: fieldStaffPaths.reports, Panel: AdminFieldReports },
];
const staffSessionPath = '/api/staff-session';
const refreshPeriod = 60_000;

function sessionState(data) {
  if (data.available === false || data.accountStatus === 'unavailable') return { kind: 'unavailable' };
  if (data.accountStatus && data.accountStatus !== 'staff') return { kind: 'denied' };
  const expiresAt = Date.parse(data.expiresAt ?? '');
  if (data.isStaff === true && expiresAt > Date.now()) return { kind: 'unlocked', expiresAt };
  return { kind: 'locked' };
}

function StaffUnlockForm({ busy, onSubmit }) {
  return (
    <form className="field-tools__unlock-form" onSubmit={onSubmit}>
      <div>
        <label className="form-label" htmlFor="field-staff-email">Staff unlock email</label>
        <input className="form-control" id="field-staff-email" name="email" type="email"
          autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} required />
      </div>
      <div>
        <label className="form-label" htmlFor="field-staff-password">Staff unlock password</label>
        <input className="form-control" id="field-staff-password" name="password" type="password"
          autoComplete="current-password" maxLength={512} required />
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Unlocking…' : 'Unlock field tools'}
      </button>
    </form>
  );
}

function StaffToolsWorkspace({ firebase, uid, tool }) {
  const [access, setAccess] = useState({ kind: 'checking' });
  const [pending, setPending] = useState('');
  const [notice, setNotice] = useState('');
  const sessionRequest = useRef(null);
  const mounted = useRef(false);

  const updateSession = useCallback(async (method, body, quiet = false) => {
    if (sessionRequest.current) {
      if (quiet || !sessionRequest.current.quiet) return;
      sessionRequest.current.controller.abort();
    }
    const controller = new AbortController();
    sessionRequest.current = { controller, quiet };
    const { signal } = controller;
    if (!quiet) {
      setPending(method);
      setNotice('');
    }
    if (method === 'DELETE') setAccess({ kind: 'locking' });

    try {
      const data = await requestStaffFieldTool(firebase, uid, staffSessionPath, { method, body, signal });
      if (signal.aborted) return;
      const next = method === 'DELETE' ? { kind: 'locked' } : sessionState(data);
      setAccess(next);
      if (next.kind === 'unlocked' && method === 'GET') setNotice('');
      if (method === 'POST' && next.kind === 'locked') {
        setNotice('Field staff access could not be confirmed. Check access and try again.');
      }
    } catch (error) {
      if (signal.aborted) return;
      if (method === 'DELETE') setAccess({ kind: 'lock-error' });
      if (method === 'GET' && (!quiet || error.status === 401 || error.status === 403)) {
        setAccess({ kind: error.status === 401 || error.status === 403 ? 'denied' : 'unavailable' });
      }
      if (!quiet) setNotice(error.status ? error.message : 'Could not reach the field service. Check your connection and retry.');
    } finally {
      if (sessionRequest.current?.controller === controller) {
        sessionRequest.current = null;
        if (!quiet) setPending('');
      }
    }
  }, [firebase, uid]);

  useEffect(() => {
    mounted.current = true;
    void updateSession('GET');
    return () => {
      mounted.current = false;
      sessionRequest.current?.controller.abort();
      sessionRequest.current = null;
    };
  }, [updateSession]);

  useEffect(() => {
    if (access.kind !== 'unlocked') return undefined;
    const expires = window.setTimeout(() => {
      setAccess({ kind: 'locked' });
      setNotice('Your field staff session expired. Unlock field tools again.');
    }, Math.max(0, access.expiresAt - Date.now()));
    const review = () => {
      if (!document.hidden) void updateSession('GET', undefined, true);
    };
    const interval = window.setInterval(review, refreshPeriod);
    document.addEventListener('visibilitychange', review);
    return () => {
      window.clearTimeout(expires);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', review);
    };
  }, [access.kind, access.expiresAt, updateSession]);

  const request = useCallback(async (path, options) => {
    try {
      return await requestStaffFieldTool(firebase, uid, path, options);
    } catch (error) {
      if (mounted.current && (error.status === 401 || error.status === 403)) {
        if (sessionRequest.current?.quiet) sessionRequest.current.controller.abort();
        setAccess(current => current.kind === 'unlocked' ? { kind: 'locked' } : current);
        setNotice('USAW staff access must be verified again. Check access to continue.');
      }
      throw error;
    }
  }, [firebase, uid]);

  function submitUnlock(event) {
    event.preventDefault();
    const { email, password } = event.currentTarget.elements;
    const body = { email: email.value.trim(), password: password.value };
    password.value = '';
    void updateSession('POST', body);
  }

  const { Panel, title } = tool;
  const unlocked = access.kind === 'unlocked';
  const canReview = ['locked', 'unavailable', 'denied'].includes(access.kind);
  return (
    <div className="admin-container staff-dashboard field-tools">
      <Helmet><title>{title} | US Airsoft Field</title></Helmet>
      <main className="admin-content staff-dashboard__content">
        <header className="staff-dashboard__hero field-tools__hero">
          <div>
            <Link to="/admin" className="field-tools__return">Staff Operations</Link>
            <h1>{title}</h1>
          </div>
          {unlocked && (
            <button type="button" className="btn btn-outline-secondary" onClick={() => void updateSession('DELETE')}>
              Lock field tools
            </button>
          )}
        </header>

        <nav className="field-tools__nav" aria-label="Field staff tools">
          {fieldTools.map(({ id, title: label, path }) => <NavLink key={id} to={path}>{label}</NavLink>)}
          <Link to={fieldStaffPaths.tv}>Barracks TV</Link>
        </nav>

        {notice && <p className="field-tools__notice" role="alert">{notice}</p>}
        {unlocked
          ? <Panel key={tool.id} firebase={firebase} request={request} />
          : (
            <section className="field-tool__panel" aria-label="Field staff access" aria-busy={pending !== ''}>
              {access.kind === 'checking' && <p role="status">Checking your field staff access…</p>}
              {access.kind === 'locking' && <p role="status">Locking field tools…</p>}
              {access.kind === 'locked' && (
                <>
                  <h2>Unlock field tools</h2>
                  <p>Use your USAW staff unlock credentials for check-in, live rounds, membership, and team reports.</p>
                  <StaffUnlockForm busy={pending !== ''} onSubmit={submitUnlock} />
                </>
              )}
              {access.kind === 'unavailable' && <h2>Field staff access is unavailable</h2>}
              {access.kind === 'denied' && <h2>Sign in with your authorized USAW staff account</h2>}
              {access.kind === 'denied' && <Link to="/login">Sign in to USAW</Link>}
              {canReview && (
                <button type="button" className="btn btn-outline-secondary field-tools__check" disabled={pending !== ''}
                  onClick={() => void updateSession('GET')}>
                  {pending === 'GET' ? 'Checking access…' : 'Check access'}
                </button>
              )}
              {access.kind === 'lock-error' && (
                <button type="button" className="btn btn-outline-secondary" disabled={pending !== ''}
                  onClick={() => void updateSession('DELETE')}>
                  Retry locking field tools
                </button>
              )}
            </section>
          )}
      </main>
    </div>
  );
}

function AdminFieldTools({ firebase }) {
  const { tool: id } = useParams();
  const user = useContext(AuthUserContext);
  const tool = fieldTools.find(candidate => candidate.id === id);
  return tool && user?.uid
    ? <StaffToolsWorkspace key={user.uid} firebase={firebase} uid={user.uid} tool={tool} />
    : <Navigate to="/admin" replace />;
}

export default withAuthorization(user => Boolean(user?.roles?.[ADMIN]), { verifyOnMount: true })(withFirebase(AdminFieldTools));
