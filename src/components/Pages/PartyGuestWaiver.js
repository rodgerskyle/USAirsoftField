import React, { useCallback, useEffect, useRef, useState } from 'react';
import { partyChecklistLink, validPartyToken } from './PartyReadiness';

const endpoint = 'https://app.usairsoftfield.com/api/party-readiness';

export function partyWaiverRoute(hash) {
  if (!/^#party(?:\/|$)/.test(hash)) return null;
  const token = hash.slice('#party/'.length);
  return { token: validPartyToken(token) ? token : '' };
}

async function guestRequest(token, signal, waiverData, memberToken) {
  const options = {
    method: waiverData ? 'POST' : 'GET',
    headers: { Accept: 'application/json', Authorization: 'Party ' + token },
    signal, credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer',
  };
  if (waiverData) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify({ action: 'signWaiver', waiverData, ...(memberToken && { memberToken }) });
  }
  const response = await fetch(endpoint, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.error || 'The waiver service could not confirm the request.');
    error.status = response.status;
    throw error;
  }
  const entry = data?.group?.entries?.[0];
  if (data?.role !== 'guest' || data.group?.entries?.length !== 1 || !entry?.preparation ||
      (entry.preparation.guestToken && entry.preparation.guestToken !== token)) {
    throw new Error('Open the personal checklist sent for this player.');
  }
  return { groupName: data.group.name, kind: data.group.kind, entry };
}

export default function PartyGuestWaiver({ token, children }) {
  const [view, setView] = useState(null);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [busy, setBusy] = useState(false);
  const operation = useRef(null);
  const returnUrl = partyChecklistLink('guest', token);

  const refresh = useCallback(async () => {
    if (!validPartyToken(token) || operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    try {
      const result = await guestRequest(token, controller.signal);
      if (!controller.signal.aborted) { setView(result); setError(''); setUncertain(false); }
    } catch (failure) {
      if (!controller.signal.aborted) { setError(failure.message); setView(null); }
    } finally {
      if (operation.current === controller) { operation.current = null; setBusy(false); }
    }
  }, [token]);

  useEffect(() => {
    refresh();
    return () => { operation.current?.abort(); operation.current = null; };
  }, [refresh]);

  async function sign(waiverData, memberToken) {
    if (operation.current) throw new Error('Please wait for the current request.');
    const controller = new AbortController();
    operation.current = controller;
    try {
      const result = await guestRequest(token, controller.signal, waiverData, memberToken);
      if (!controller.signal.aborted) {
        setView(result);
        if (result.entry.preparation.waiverStatus !== 'signed') setUncertain(true);
      }
    } catch (failure) {
      if (controller.signal.aborted) return;
      // Invalid fields can be corrected. Other failures may have occurred after Firebase accepted the waiver.
      if (failure.status === 400 || failure.status === 422) throw failure;
      setError(failure.message);
      setUncertain(true);
    } finally {
      if (operation.current === controller) operation.current = null;
    }
  }

  if (!returnUrl) return <section className="party-waiver-intro"><h1>Personal waiver link unavailable</h1><p>Ask the organizer to send your guest checklist again.</p></section>;
  const preparation = view?.entry.preparation;
  const signed = preparation?.waiverStatus === 'signed';
  const pending = ['pending', 'review', 'confirmed'].includes(preparation?.waiverSubmissionStatus);
  const canSign = view && !signed && !pending && !uncertain;
  const label = view && view.kind !== 'visit' ? 'party' : 'group';
  return <>
    <section className="party-waiver-intro" aria-label="Field waiver for your visit">
      <h2>{view ? `Field waiver for ${view.entry.displayName}` : 'Your field waiver'}</h2>
      {view && <p>{view.groupName}</p>}
      {signed ? <p role="status">Waiver verified. Return to your checklist to check your rental choice.</p> :
        pending || uncertain ? <p role="status">Waiver verification is pending. Check the status before submitting another form. Staff can help at check-in.</p> :
        view ? <p>Use the player’s first and last name on the agreement. A parent or guardian must also sign for a minor.</p> : busy && <p role="status">Checking your personal link…</p>}
      {error && <p role="alert">{error}</p>}
      <a className="btn btn-outline-primary me-2" href={returnUrl} rel="noreferrer">Return to my {label} checklist</a>
      {!signed && !canSign && <button className="btn btn-outline-primary" type="button" disabled={busy} onClick={refresh}>Check waiver status</button>}
    </section>
    {canSign && children(sign)}
  </>;
}
