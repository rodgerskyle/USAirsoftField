import React, { useEffect, useRef, useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { withFirebase } from '../Firebase';
import { getGroupGuestSession, guestSessionKey } from '../constants/groupGuestSession';
import { groupExperienceLabels } from '../constants/groupExperience';
import { mountGroupMemberPicker } from '../constants/group-member-picker';
import WaiverStatus from './WaiverStatus';
import GroupPartySchedule from './GroupPartySchedule';
import './GroupCheckIn.css';

const Waiver = React.lazy(() => import('./Waiver'));
const endpoint = 'https://app.usairsoftfield.com/api/check-in-groups';
const dateLabel = date => new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(date + 'T00:00:00Z'));
const fieldToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const profileHref = playerId => '/profilelookup/' + encodeURIComponent(playerId);
const memberSearchEndpoint = 'https://app.usairsoftfield.com/api/leaderboard';

function OrganizerMemberPicker({ group, busy, onAdd }) {
  const container = useRef(null);
  const picker = useRef(null);
  const latest = useRef(null);
  latest.current = { group, onAdd };

  useEffect(() => {
    picker.current = mountGroupMemberPicker(container.current, {
      endpoint: memberSearchEndpoint, profileHref,
      rosterIds: () => latest.current.group.entries.map(entry => entry.playerId).filter(Boolean),
      isFull: () => {
        const current = latest.current.group;
        return (current.memberCount ?? current.entries.length) >= current.capacity;
      },
      onAdd: playerId => latest.current.onAdd(playerId),
    });
    return () => picker.current();
  }, []);
  useEffect(() => { picker.current.refresh(); }, [group]);

  return <fieldset disabled={busy}><div ref={container} /></fieldset>;
}

function RosterName({ label, onSign }) {
  const input = useRef(null);
  return <div>
    <label>{label}<input name="displayName" required minLength={2} maxLength={80} ref={input} /></label>
    <button className="ph-button" type="button" onClick={() => onSign(input.current)}>Sign waiver and fill name</button>
  </div>;
}

function ExperienceField({ label = 'Airsoft experience', value = 'unrated' }) {
  return <label>{label}<select name="experienceBand" defaultValue={value}>
    {Object.entries(groupExperienceLabels).map(([band, text]) => <option key={band} value={band}>{text}</option>)}
  </select></label>;
}

async function groupRequest(firebase, session, query, body, signal) {
  function current() {
    if (signal.aborted) throw new DOMException('Canceled', 'AbortError');
    if (firebase.auth.currentUser !== session.user) throw new Error('Your sign-in changed. Reopen the group and try again.');
  }
  current();
  const authorization = session.user ? `Bearer ${await session.user.getIdToken()}` : `Guest ${session.guest.secret}`;
  current();
  const response = await fetch(endpoint + query, { method: body ? 'POST' : 'GET',
    headers: { Accept: 'application/json', Authorization: authorization, ...(body && { 'Content-Type': 'application/json' }) },
    ...(body && { body: JSON.stringify(body) }), credentials: session.user ? 'include' : 'omit', cache: 'no-store', redirect: 'error', signal });
  current();
  const data = await response.json().catch(() => null);
  current();
  if (!response.ok || !data) {
    const error = new Error(data?.error || 'The group service is unavailable. Try again.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function GroupCheckIn({ firebase }) {
  const [session, setSession] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [visitKind, setVisitKind] = useState('visit');
  const operation = useRef(null);
  const attempt = useRef(null);
  const [waiverInput, setWaiverInput] = useState(null);

  useEffect(() => {
    function reset(current) {
      operation.current?.abort();
      operation.current = null;
      attempt.current = null;
      setSession(current ? { user: current } : { user: null, guest: getGroupGuestSession() });
      setWaiverInput(null);
      setVisitKind('visit');
      setGroups([]);
      setSelected(null);
      setNotice('');
      setBusy(false);
    }
    function onStorage(event) {
      if (!firebase.auth.currentUser && (event.key === null || event.key === guestSessionKey)) reset(null);
    }
    const unsubscribe = firebase.auth.onAuthStateChanged(reset);
    window.addEventListener('storage', onStorage);
    return () => { unsubscribe(); window.removeEventListener('storage', onStorage); };
  }, [firebase]);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    groupRequest(firebase, session, '', undefined, controller.signal)
      .then(data => { if (!controller.signal.aborted) setGroups(data.groups); })
      .catch(error => { if (!controller.signal.aborted) setNotice(error.message); })
      .finally(() => { if (operation.current === controller) { operation.current = null; setBusy(false); } });
    return () => controller.abort();
  }, [firebase, session]);

  useEffect(() => () => operation.current?.abort(), []);

  async function run(work, propagateError = false) {
    if (!session || operation.current) {
      if (propagateError) throw new Error('Wait for the current group update to finish.');
      return;
    }
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setNotice('');
    try { await work(controller.signal); }
    catch (error) {
      if (!controller.signal.aborted) {
        if (error.status === 401 || error.status === 403 || error.status === 404) {
          setSelected(null);
          setGroups([]);
        }
        setNotice(error.message || 'Your group could not be updated.');
      }
      if (propagateError) throw error;
    }
    finally { if (operation.current === controller) { operation.current = null; setBusy(false); } }
  }

  async function change(body, signal) {
    const data = await groupRequest(firebase, session, '', body, signal);
    setSelected(data.group);
    const list = await groupRequest(firebase, session, '', undefined, signal);
    setGroups(list.groups);
    setNotice(body.action === 'create' ? 'Group created. Share the invitation code with your friends.' : 'Group updated.');
  }

  function addMember(playerId) {
    return run(async signal => {
      const id = selected.id;
      const data = await groupRequest(firebase, session, '', { action: 'addMember', id, playerId }, signal);
      const updated = data.group;
      if (!updated?.isOwner || updated.id !== id || !updated.entries.some(entry => entry.playerId === playerId)) {
        setSelected(null);
        throw new Error('Reopen the group to verify its current roster.');
      }
      setSelected(updated);
      const memberCount = updated.memberCount ?? updated.entries.length;
      setGroups(current => current.map(item => item.id === id ? { ...item, memberCount } : item));
    }, true);
  }

  function create(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const fingerprint = JSON.stringify(values);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, id: window.crypto.randomUUID() };
    void run(signal => change({ action: 'create', ...values, headcount: Number(values.headcount), requestId: attempt.current.id }, signal));
  }

  function join(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    void run(signal => change({ action: 'join', ...values, code: values.code.trim() }, signal));
  }

  function edit(action, event, fields = {}) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    void run(signal => change({ action, id: selected.id, ...values, ...fields }, signal));
  }

  return <main className="visit-groups">
    <Helmet><title>Group Check-in | US Airsoft Field</title></Helmet>
    <header className="visit-groups__heading"><div><p>Arrive together</p><h1>Group check-in</h1><p>Prepare your roster up to five days before your visit.</p></div><Link className="ph-button" to="/player-hub">Player Hub</Link></header>
    <p className="visit-groups__note">Use the group list for your visit, birthday or private event. Each player can <Link to="/waiver">sign the waiver</Link> ahead of time. Staff verify each waiver at arrival.</p>
    {!session ? <p role="status">Loading group check-in…</p> : <>
      {session.guest && <p className="visit-groups__guest-access"><strong>Continue as a guest.</strong>{' '}
        {session.guest.persistent ? 'Return to this website in the same browser to manage your group. Use your own device.' : 'This browser can only remember your guest access until this page is closed or reloaded.'}{' '}
        <Link to="/login">Sign in</Link> to use your USAW account instead.</p>}
      <div className="visit-groups__layout" aria-busy={busy} key={session.user?.uid || 'guest'}>
        <section className="visit-groups__panel"><h2>Plan a visit</h2><form onSubmit={create}><fieldset disabled={busy}>
          {session.guest && <RosterName label="Your name or callsign" onSign={setWaiverInput} />}
          <ExperienceField label="Your airsoft experience" />
          <label>Visit type<select name="kind" value={visitKind} onChange={event => setVisitKind(event.target.value)}>
            <option value="visit">Family or friends</option><option value="party">Scheduled birthday or event</option>
          </select></label>
          {visitKind === 'party' && <p className="visit-groups__help">Use the date on your existing reservation. Share your group code with staff to confirm the details in the Party Calendar.</p>}
          <label>Game-day date<input type="date" name="date" required min={fieldToday()} defaultValue={fieldToday()} /></label>
          <label>Group name<input name="name" maxLength={80} placeholder={visitKind === 'party' ? 'Your party or event' : 'Family or friends'} /></label>
          <label>Expected group size, including you<input name="headcount" type="number" min={1} max={30} defaultValue={1} required /></label>
          <p className="visit-groups__help">Your group name and size form your code, for example rebels-8. Groups expire five days after creation.</p>
          <button className="ph-button ph-button-primary">Create group</button>
        </fieldset></form><h2>Join friends</h2><form onSubmit={join}><fieldset disabled={busy}>
          {session.guest && <RosterName label="Your name or callsign" onSign={setWaiverInput} />}
          <ExperienceField label="Your airsoft experience" />
          <label>Organizer’s group code<input name="code" maxLength={64} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} required /></label><button className="ph-button">Join group</button>
        </fieldset></form><h2>Your groups</h2>{groups.length ? <ul className="visit-groups__choices">{groups.map(group => <li key={group.id}><button disabled={busy} onClick={() => void run(async signal => {
          setSelected(null);
          const data = await groupRequest(firebase, session, '?id=' + encodeURIComponent(group.id), undefined, signal);
          setSelected(data.group);
        })}><strong>{group.name}</strong><span>{group.kind === 'party' && 'Birthday or event · '}{dateLabel(group.date)} · {group.memberCount} players</span></button></li>)}</ul> : <p>No upcoming groups yet.</p>}</section>
        <section className="visit-groups__panel">{selected ? <>
          <h2>{selected.name}</h2><p>{dateLabel(selected.date)} · {selected.memberCount ?? selected.entries.length} / {selected.capacity} players</p>
          <GroupPartySchedule group={selected} />
          <div className="visit-groups__code"><span>Invitation code</span><strong>{selected.code}</strong><button className="ph-button" type="button" onClick={() => {
            if (navigator.clipboard) navigator.clipboard.writeText(selected.code).then(() => setNotice('Invitation code copied.')).catch(() => setNotice('Select the invitation code to copy it.'));
            else setNotice('Select the invitation code to copy it.');
          }}>Copy code</button></div>
          <p>Share this code so friends can join on the website or in the Companion. {selected.isOwner && 'You can also add players directly to your roster.'}</p>
          {selected.expiresAt && <p>Group expires <time dateTime={selected.expiresAt}>{new Date(selected.expiresAt).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' })} Pacific</time>.</p>}
          {selected.rosterPrivate && <p>Only the organizer and staff can see the full roster.</p>}
          <ul className="visit-groups__entries">{selected.entries.map(entry => <li key={entry.id}><div><strong>{entry.playerId && (selected.isOwner || entry.isYou)
              ? <a href={profileHref(entry.playerId)} target="_blank" rel="noopener noreferrer">{entry.displayName}</a> : entry.displayName}</strong><small>{entry.isYou ? 'You' : entry.kind === 'guest' ? 'Guest player' : 'USAW player'}</small>
            {entry.pending && <small>Added by organizer</small>}
            <small>Experience · {groupExperienceLabels[entry.experienceBand] || groupExperienceLabels.unrated}</small>
            {entry.waiverStatus && <WaiverStatus status={entry.waiverStatus} />}</div>
            {(selected.isOwner || entry.isYou) && <details className="visit-groups__experience"><summary>Edit experience<span className="visually-hidden"> for {entry.displayName}</span></summary>
              <form key={entry.experienceBand} onSubmit={event => edit('setExperience', event, { entryId: entry.id })}><fieldset disabled={busy}>
                <ExperienceField label={'Airsoft experience for ' + entry.displayName} value={entry.experienceBand} /><button className="ph-button">Save experience</button>
              </fieldset></form></details>}
            {entry.canRemove && <button className="ph-button" disabled={busy} onClick={() => void run(signal => change({ action: 'remove', id: selected.id, entryId: entry.id }, signal))}>Remove from group</button>}</li>)}</ul>
          {selected.isOwner ? <><form onSubmit={event => edit('rename', event)} key={selected.id + selected.name}><fieldset disabled={busy}><label>Group name<input name="name" required maxLength={80} defaultValue={selected.name} /></label><button className="ph-button">Save name</button></fieldset></form>
            <OrganizerMemberPicker key={selected.id} group={selected} busy={busy} onAdd={addMember} />
            <form onSubmit={event => edit('addGuest', event)}><fieldset disabled={busy}><RosterName label="Guest name or callsign" onSign={setWaiverInput} /><ExperienceField /><button className="ph-button ph-button-primary">Add guest</button></fieldset></form>
            <button className="ph-button" disabled={busy} onClick={() => { if (window.confirm('Cancel this planned group and remove its preparation list? Field check-ins and player scores are kept.')) void run(signal => change({ action: 'cancel', id: selected.id }, signal)); }}>Cancel this group</button>
          </> : <button className="ph-button" disabled={busy} onClick={() => void run(signal => change({ action: 'leave', id: selected.id }, signal))}>Leave group</button>}
        </> : <><h2>Get your group ready</h2><p>Select a group or create one to share an invitation code and prepare your party’s list.</p></>}</section>
      </div><p role="status" className="visit-groups__status">{notice}</p>
    </>}
    {waiverInput && <Modal show size="xl" onHide={() => setWaiverInput(null)} aria-labelledby="group-waiver-title">
      <Modal.Header closeButton><Modal.Title id="group-waiver-title">Player waiver</Modal.Title></Modal.Header>
      <Modal.Body><React.Suspense fallback={<p role="status">Loading waiver…</p>}>
        <Waiver onSigned={name => {
          if (waiverInput.isConnected) waiverInput.value = name;
          setWaiverInput(null);
          setNotice('Waiver submitted. Review the player name and save the roster entry.');
        }} />
      </React.Suspense></Modal.Body>
    </Modal>}
  </main>;
}

export default withFirebase(GroupCheckIn);
