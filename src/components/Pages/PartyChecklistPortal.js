import React, { useCallback, useEffect, useRef, useState } from 'react';
import { validPartyToken, websiteInvitationLink } from '../constants/groupInvitationLinks';
import { CopyPartyLink, PartyEntryReadiness, PartyReadinessSummary } from './PartyReadiness';
import DirectionsOutlined from '@mui/icons-material/DirectionsOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import Refresh from '@mui/icons-material/Refresh';
import ArrowForward from '@mui/icons-material/ArrowForward';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import './PartyChecklistPortal.css';

const endpoint = 'https://app.usairsoftfield.com/api/party-readiness';
const visitDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });
const expiredStatuses = [401, 403, 404, 410];
const accessError = 'This private link does not open this checklist. Ask the organizer for a current invitation.';

function checklistGroup(data, role, token) {
  const group = data?.group;
  if (data?.role !== role || !Array.isArray(group?.entries) || typeof group.name !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(group.date) || !Number.isFinite(Date.parse(group.date + 'T00:00:00Z'))) return null;
  if (group.entries.some(entry => !entry || typeof entry.id !== 'string' || typeof entry.displayName !== 'string' || !entry.preparation)) return null;
  if (role === 'guest') {
    if (group.entries.length !== 1) return null;
    const bound = group.entries[0].preparation.guestToken;
    return bound && bound !== token ? null : group;
  }
  return group.readiness && (!group.organizerToken || group.organizerToken === token) ? group : null;
}

const directions = {
  'check-in': 'Check in with staff when you arrive.',
  rentals: 'Go to rental pickup for your gear.',
  briefing: 'Head to the barracks for briefing.',
  'ask-staff': 'Tell the desk whether you need rental gear.',
};

function GuestChecklist({ entry, token, busy, load }) {
  const { preparation } = entry;
  const [gearChoice, setGearChoice] = useState(preparation.rentalIntent);
  useEffect(() => setGearChoice(preparation.rentalIntent), [preparation.rentalIntent]);
  const admitted = entry.nextStop && entry.nextStop !== 'check-in';
  const signed = preparation.waiverStatus === 'signed';
  const pending = ['pending', 'review', 'confirmed'].includes(preparation.waiverSubmissionStatus);
  return <section className="party-checklist__card party-checklist__guest">
    <h2>{entry.displayName}</h2>
    <PartyEntryReadiness preparation={preparation} />
    {entry.nextStop && <div className="party-checklist__route"><DirectionsOutlined aria-hidden="true" />
      <div><strong>Your next stop</strong><p>{directions[entry.nextStop]}</p></div></div>}
    <div className="party-checklist__tasks">
      <section className="party-checklist__task"><h3><AssignmentOutlined aria-hidden="true" /> Field waiver</h3>
      {signed ? <p>Your signed waiver is verified for this visit.</p> :
        pending ? <p>Your waiver was submitted. Refresh to check its status, or ask staff when you arrive.</p> :
        <><p>A parent or guardian must also sign for players under 18.</p>
          <a className="btn btn-primary" href={'/waiver#party/' + token} rel="noreferrer">Complete my waiver <ArrowForward fontSize="small" aria-hidden="true" /></a></>}
      </section>
      {admitted ? <section className="party-checklist__task"><h3><Inventory2Outlined aria-hidden="true" /> Rental gear</h3>
        <p>{preparation.requestedGear || (preparation.rentalIntent === 'requested' ? 'Rental gear requested for this visit.' : preparation.rentalIntent === 'bringing' ? 'You’re bringing your own gear.' : 'Check with the desk about your gear.')}</p>
      </section> : <form className="party-checklist__task" onSubmit={event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const rentalIntent = data.get('rental');
        const requestedGear = String(data.get('requestedGear') || '').trim();
        if (['requested', 'bringing'].includes(rentalIntent)) load({ action: 'setRental', rentalIntent,
          ...(rentalIntent === 'requested' && (requestedGear || preparation.requestedGear) && { requestedGear }) }, 'Rental choice saved.');
      }}>
        <fieldset disabled={busy || admitted} key={preparation.rentalIntent}>
          <legend><Inventory2Outlined aria-hidden="true" /> Will you need rental gear?</legend>
          <label className="party-checklist__choice"><input type="radio" name="rental" value="requested" required onChange={event => setGearChoice(event.target.value)} defaultChecked={preparation.rentalIntent === 'requested'} /> I need rental gear</label>
          <label className="party-checklist__choice"><input type="radio" name="rental" value="bringing" required onChange={event => setGearChoice(event.target.value)} defaultChecked={preparation.rentalIntent === 'bringing'} /> I’m bringing my own gear</label>
          {gearChoice === 'requested' && <label>Requested equipment (optional)
            <input name="requestedGear" maxLength={120} defaultValue={preparation.requestedGear || ''} placeholder="e.g. mask and vest" /></label>}
          <button className={signed || pending ? 'btn btn-primary' : 'btn btn-outline-primary'}>Save rental choice</button>
        </fieldset>
      </form>}
    </div>
  </section>;
}

function OrganizerChecklist({ group, busy, load }) {
  const pendingGuest = useRef(null);
  async function add(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const displayName = String(new FormData(form).get('displayName') || '').trim();
    if (displayName.length < 2) return;
    if (pendingGuest.current?.displayName !== displayName) {
      pendingGuest.current = { action: 'addGuest', displayName, requestId: window.crypto.randomUUID() };
    }
    if (await load(pendingGuest.current, 'Guest added. Copy their personal checklist to share it.')) {
      pendingGuest.current = null;
      form.reset();
    }
  }
  function setExpected(event) {
    event.preventDefault();
    const expected = Number(new FormData(event.currentTarget).get('expected'));
    if (Number.isInteger(expected) && expected >= 1 && expected <= 30) {
      load({ action: 'setExpected', expected }, 'Expected guest count saved.');
    }
  }
  const arrived = group.entries.filter(entry => entry.nextStop && entry.nextStop !== 'check-in');
  const destinations = [['rentals','rental pickup'], ['briefing','the barracks for briefing'], ['ask-staff','the desk to confirm gear']];
  return <div className="party-checklist__layout">
    <section className="party-checklist__card" aria-label={group.kind === 'visit' ? 'Group overview' : 'Party overview'}>
      {group.readiness.expected ? <PartyReadinessSummary readiness={group.readiness} kind={group.kind} /> : <h2>How many guests are coming?</h2>}
      {arrived.length > 0 && <section className="party-checklist__destinations" aria-label="Next stops"><h3><DirectionsOutlined aria-hidden="true" /> Next stops for checked-in guests</h3>
        {destinations.map(([key, label]) => {
          const count = arrived.filter(entry => entry.nextStop === key).length;
          return count > 0 && <p key={key} className="party-checklist__destination"><strong>{count}</strong> {count === 1 ? 'guest' : 'guests'} to {label}</p>;
        })}</section>}
      {group.canSetExpected && <form onSubmit={setExpected}><fieldset disabled={busy}>
        <label>Expected guests<input type="number" name="expected" inputMode="numeric" min="1" max="30" key={group.readiness.expected} defaultValue={group.readiness.expected || ''} required /></label>
        <button className="btn btn-outline-primary">Save expected count</button>
      </fieldset></form>}
      {group.code && <CopyPartyLink url={websiteInvitationLink('join', group.code)} label="Copy invitation for new guests" privateLink={false} />}
    </section>
    <section className="party-checklist__card" aria-label="Guest checklist">
      <h2>Guest checklist <span className="party-checklist__count" aria-label={group.entries.length + ' guests'}>{group.entries.length}</span></h2>
      {group.entries.length ? <ul>{group.entries.map(entry => <li key={entry.id}>
        <h3>{entry.displayName}</h3><PartyEntryReadiness preparation={entry.preparation} />
        {entry.nextStop && <p className="party-checklist__guest-stop"><DirectionsOutlined fontSize="small" aria-hidden="true" /> {directions[entry.nextStop]}</p>}
        <CopyPartyLink url={websiteInvitationLink('guest', entry.preparation.guestToken)} label="Copy guest checklist" context={entry.displayName} />
      </li>)}</ul> : <p>Add a guest to share their personal checklist.</p>}
      <form onSubmit={add}><fieldset disabled={busy}>
        <label>Guest’s full name as it appears on their waiver<input name="displayName" minLength="2" maxLength="80" autoComplete="off" required /></label>
        <button className="btn btn-primary">Add guest</button>
      </fieldset></form>
    </section>
  </div>;
}

function Checklist({ role, token }) {
  const [group, setGroup] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const operation = useRef(null);
  const backgroundRead = useRef(false);
  const load = useCallback(async (action, message, background = false) => {
    if (operation.current) {
      if (background || !backgroundRead.current) return false;
      operation.current.abort();
    }
    backgroundRead.current = background;
    const controller = new AbortController();
    operation.current = controller;
    if (!background) { setBusy(true); setError(''); setNotice(''); }
    try {
      const headers = { Accept: 'application/json', Authorization: 'Party ' + token };
      if (action) headers['Content-Type'] = 'application/json';
      const response = await fetch(endpoint, {
        method: action ? 'POST' : 'GET', headers, body: action ? JSON.stringify(action) : undefined,
        signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: 'no-store',
      });
      const data = await response.json().catch(() => null);
      if (controller.signal.aborted) return false;
      if (!response.ok) {
        if (expiredStatuses.includes(response.status)) setGroup(null);
        throw new Error(data?.error || 'The checklist could not confirm the request. Refresh and try again.');
      }
      const next = checklistGroup(data, role, token);
      if (!next) { setGroup(null); throw new Error(accessError); }
      setGroup(next);
      setError('');
      if (!background) setNotice(message || '');
      return true;
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message || 'Could not reach your checklist. Refresh and try again.');
      return false;
    } finally {
      if (operation.current === controller) { operation.current = null; setBusy(false); }
    }
  }, [role, token]);

  useEffect(() => {
    load();
    // Returning from the waiver can restore this page without mounting it again.
    const onShow = event => { if (event.persisted) load(); };
    window.addEventListener('pageshow', onShow);
    return () => {
      window.removeEventListener('pageshow', onShow);
      operation.current?.abort();
      operation.current = null;
    };
  }, [load]);

  const hasDayOfDirections = group?.entries.some(entry => entry.nextStop);
  useEffect(() => {
    if (!hasDayOfDirections) return;
    const refresh = () => {
      if (!document.hidden && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) load(null, '', true);
    };
    const timer = setInterval(refresh, 20000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [hasDayOfDirections, load]);

  // Older readiness responses were issued only for booked or self-organized parties.
  const isParty = group && group.kind !== 'visit';
  return <main className={'party-checklist party-checklist--' + role}>
    <header className="party-checklist__header"><h1>{role === 'guest' ? (isParty ? 'Your party checklist' : 'Your group checklist') :
      (isParty ? 'Party readiness' : 'Group readiness')}</h1>
      {group && <p><strong>{group.name}</strong><time dateTime={group.date}><EventOutlined fontSize="small" aria-hidden="true" /> {visitDate.format(new Date(group.date + 'T00:00:00Z'))}</time></p>}
    </header>
    {error && <p className="alert alert-warning" role="alert"><WarningAmberOutlined aria-hidden="true" /> {error}</p>}
    {group && (role === 'guest'
      ? <GuestChecklist entry={group.entries[0]} token={token} busy={busy} load={load} />
      : <OrganizerChecklist group={group} busy={busy} load={load} />)}
    <footer>
      <button className="btn btn-outline-primary" type="button" disabled={busy} onClick={() => load()}><Refresh fontSize="small" aria-hidden="true" /> Refresh checklist</button>
      <p role="status">{busy ? (group ? 'Updating checklist…' : 'Opening checklist…') : notice}</p>
    </footer>
  </main>;
}

export default function PartyChecklistPortal({ role, token }) {
  if (!['guest', 'organizer'].includes(role) || !validPartyToken(token)) {
    return <main className="party-checklist"><h1>Invitation unavailable</h1><p role="alert">{accessError}</p></main>;
  }
  return <Checklist key={role + token} role={role} token={token} />;
}
