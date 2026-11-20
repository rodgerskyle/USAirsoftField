import { groupRentalLink } from '../constants/groupRentalLink';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import AuthUserContext from '../session/context';
import { ADMIN, WAIVER } from '../constants/roles';
import { fieldStaffPaths, requestStaffFieldTool } from '../constants/fieldStaffApi';
import { isGroupCode } from '../constants/groupCode';
import { normalizePartyBooking, partyBookingKey } from '../constants/partyBookingKey';
import './PartyBookingCheckInLink.css';

const endpoint = '/api/party-check-in';

function CheckInLink({ date, partyKey }) {
  const params = new URLSearchParams({ partyDate: date });
  if (partyKey) params.set('booking', partyKey);
  return <a className="btn btn-outline-primary" href={`${fieldStaffPaths.checkIn}?${params}#arriving-group`} target="_blank" rel="noopener noreferrer">
    Open group check-in <span className="visually-hidden">(opens in a new tab)</span>
  </a>;
}

function CodeControls({ firebase, uid, date, partyKey, isAdmin }) {
  const [group, setGroup] = useState(undefined);
  const [needsReview, setNeedsReview] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const operation = useRef(null);
  const codeInput = useRef(null);

  const request = useCallback(async (action, value) => {
    if (operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setMessage('');
    setError('');
    const options = { signal: controller.signal };
    let path = endpoint;
    if (action === 'load') {
      path += '?' + new URLSearchParams({ date, partyKey });
    } else {
      options.method = 'POST';
      options.body = { action, date, partyKey, ...(action === 'link' && { code: value }), ...(action === 'create' && value && { name: value }) };
    }
    try {
      const result = await requestStaffFieldTool(firebase, uid, path, options);
      if (controller.signal.aborted) return;
      setNeedsReview(result.needsReview === true);
      if (result.group === null && action === 'load') {
        setGroup(null);
      } else if (isGroupCode(result.group?.code) && (result.group.date === date || result.needsReview === true)) {
        setGroup(result.group);
        setCode('');
        if (action !== 'load') setMessage('The group code is ready to use at check-in.');
      } else {
        throw new Error('The party group status could not be verified. Refresh to check again.');
      }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message || 'The party group could not be loaded. Try again.');
    } finally {
      if (operation.current === controller) {
        operation.current = null;
        setBusy(false);
      }
    }
  }, [firebase, uid, date, partyKey]);

  useEffect(() => {
    request('load');
    return () => { operation.current?.abort(); operation.current = null; };
  }, [request]);

  async function copyCode() {
    const input = codeInput.current;
    try {
      await navigator.clipboard.writeText(input.value);
      if (input.isConnected) setMessage('Group code copied.');
    } catch {
      if (!input.isConnected) return;
      input.focus();
      input.select();
      setMessage('Code selected. Use your device’s Copy command.');
    }
  }

  return <div className="party-code-controls" aria-busy={busy}>
    {group && <>
      {needsReview && <p role="status">The reservation changed. Staff should review this link in group check-in before checking players in.</p>}
      <p>Linked group <strong>{group.name}</strong></p>
      <div className="party-code-row"><label>Group code<input ref={codeInput} className="form-control" readOnly value={group.code} onFocus={event => event.target.select()} /></label>
        <button type="button" className="btn btn-primary" onClick={copyCode}>Copy code</button></div>
      <small>Find this group in Player Check-In by name or code.</small>
      {group.id && group.date === date && !needsReview && !error && !busy &&
        <a href={groupRentalLink(group.id, isAdmin)} target="_blank" rel="noopener noreferrer">Open rental form</a>}
      {isAdmin && group.id && <a href={`/admin/field/groups?group=${encodeURIComponent(group.id)}`} target="_blank" rel="noopener noreferrer">Manage this group <span className="visually-hidden">(opens in a new tab)</span></a>}
    </>}
    {group === null && <>
      <form className="party-code-row" onSubmit={event => { event.preventDefault(); request('link', code.trim()); }}>
        <label>Organizer’s group code<input className="form-control" value={code} onChange={event => setCode(event.target.value)} required maxLength={64} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></label>
        <button className="btn btn-primary" disabled={busy || !isGroupCode(code.trim())}>Link existing group</button>
      </form>
      <form className="party-code-row" onSubmit={event => {
        event.preventDefault(); request('create', event.currentTarget.elements.groupName.value.trim());
      }}><label>Public group name (optional)<input name="groupName" className="form-control" maxLength={80} placeholder="Scheduled party" /></label>
        <button type="submit" className="btn btn-outline-primary" disabled={busy}>Create group code</button></form>
      <small>Create the group within five days of the party. Its code uses the public group name and booked party size.</small>
    </>}
    {busy && <p role="status">{group === undefined ? 'Looking up the party’s group…' : 'Updating the party’s group…'}</p>}
    {message && <p role="status">{message}</p>}
    {error && <div role="alert"><p>{error}</p><button type="button" className="btn btn-outline-primary" disabled={busy} onClick={() => request('load')}>Refresh group status</button></div>}
  </div>;
}

export default function PartyBookingCheckInLink({ firebase, booking, afterSave = false }) {
  const account = useContext(AuthUserContext);
  const isAdmin = Boolean(account?.roles?.[ADMIN]);
  const canEdit = isAdmin || Boolean(account?.roles?.[WAIVER]);
  const uid = account?.uid;
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    if (!uid || !canEdit || !booking) return undefined;
    let active = true;
    const saved = normalizePartyBooking(booking);
    if (saved) partyBookingKey(booking).then(key => {
      if (active) setSelection({ uid, booking, date: saved.date, key });
    }).catch(() => { if (active) setSelection({ uid, booking, date: saved.date, key: null }); });
    return () => { active = false; };
  }, [booking, canEdit, uid]);

  if (!uid || !canEdit || !booking) return null;
  const selected = selection?.uid === uid && selection.booking === booking ? selection : null;
  return <section className="party-booking-code" aria-label="Party group check-in">
    <h3>{afterSave ? 'Party saved' : 'Group check-in'}</h3>
    {afterSave && <p>{booking.title}</p>}
    {selected?.key ? <CodeControls key={uid + selected.key} firebase={firebase} uid={uid} isAdmin={isAdmin} date={selected.date} partyKey={selected.key} /> : <p role="status">{selected || !normalizePartyBooking(booking) ? 'A valid saved booking is needed to manage its group code. Reopen the Party Calendar entry to check its details.' : 'Opening group details…'}</p>}
    {isAdmin && selected && <CheckInLink date={selected.date} partyKey={selected.key} />}
  </section>;
}
