import React, { useEffect, useRef, useState } from 'react';
import GroupPartySchedule, { bookingTime } from './GroupPartySchedule';
import './GroupCheckIn.css';

const endpoint = '/api/check-in-groups';

function calendarHint() {
  if (window.location.hash !== '#arriving-group') return null;
  const params = new URLSearchParams(window.location.search);
  const date = params.get('partyDate') || '';
  const key = params.get('booking') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^[0-9a-f]{64}$/.test(key)) return null;
  const day = new Date(date + 'T00:00:00Z');
  return Number.isFinite(day.getTime()) && day.toISOString().startsWith(date) ? { date, key } : null;
}

export default function StaffGroupLookup({ request, onSelect, disabled }) {
  const [hint] = useState(calendarHint);
  const [data, setData] = useState(null);
  const [parties, setParties] = useState(null);
  const [chosenKey, setChosenKey] = useState('');
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const operation = useRef(null);
  useEffect(() => () => operation.current?.abort(), []);

  function clearChoices() {
    setParties(null);
    setChosenKey('');
    setConfirmUnlink(false);
  }

  async function run(work) {
    if (disabled || operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setNotice('');
    try { await work(controller.signal); }
    catch (error) {
      if (!controller.signal.aborted) {
        clearChoices();
        if (error.status === 401 || error.status === 403) setData(null);
        setNotice(error.message || 'The group could not be updated. Try again.');
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      operation.current = null;
    }
  }

  function lookup(event) {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get('code').trim();
    void run(async signal => {
      setData(null);
      clearChoices();
      const result = await request(endpoint + '?staff=1&code=' + encodeURIComponent(code), { signal });
      if (signal.aborted) return;
      setData(result);
      if (!hint) return;
      if (result.group.date !== hint.date) {
        setNotice('This group is on a different date from the selected Party Calendar booking. Check the group code before linking.');
        return;
      }
      await loadBookings(result.group, signal);
    });
  }

  const group = data?.group;
  const locked = disabled || busy;
  const current = group?.date === data?.today;
  const missingBooking = Boolean(group?.partyKey && group.partyStatus !== 'review' && parties && !parties.some(party => party.key === group.partyKey && !party.ambiguous));
  async function loadBookings(targetGroup, signal) {
    clearChoices();
    const result = await request(endpoint + '?staff=1&parties=' + encodeURIComponent(targetGroup.date), { signal });
    if (signal.aborted) return;
    setParties(result.parties);
    if (hint?.date === targetGroup.date) {
      const match = result.parties.find(party => party.key === hint.key && !party.ambiguous);
      if (match) setChosenKey(match.key);
      else setNotice('The selected Party Calendar booking has changed or is unavailable. Check the reservation and choose it again.');
    }
  }

  function updateBooking(action) {
    void run(async signal => {
      const body = { action, id: group.id, previousPartyKey: group.partyKey || null };
      if (action === 'linkParty') body.partyKey = chosenKey;
      const result = await request(endpoint, { method: 'POST', body, signal });
      if (signal.aborted) return;
      setData(result);
      clearChoices();
      setNotice(action === 'linkParty' ? 'Party Calendar schedule confirmed for this group.' : 'Group unlinked. The reservation stays in the Party Calendar.');
    });
  }

  return <details id="arriving-group" className="admin-group-lookup" open={hint ? true : undefined}><summary>Find an arriving group</summary>
    {hint && <p>Party Calendar booking for {hint.date}. Look up the organizer’s group code to confirm the match.</p>}
    <p>Enter the organizer’s group code to verify arrivals or link a scheduled birthday or event.</p>
    <form onSubmit={lookup}><label>Group code<input name="code" minLength={16} maxLength={16} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} required disabled={locked} /></label><button className="btn btn-secondary" disabled={locked}>{busy ? 'Working…' : 'Find group'}</button></form>
    {group && <><h3>{group.name}</h3><p>{group.date}</p>{!current && <p>This group is planned for a different date.</p>}
      <GroupPartySchedule group={group} staff />
      <div className="visit-party-tools">
        <button className="btn btn-secondary" type="button" disabled={locked} onClick={() => void run(signal => loadBookings(group, signal))}>{parties ? 'Refresh Party Calendar bookings' : 'Find bookings in the Party Calendar'}</button>
        {missingBooking && <p role="alert">The last confirmed booking no longer matches the Party Calendar for this date. Review the reservation and confirm the updated booking or unlink it.</p>}
        {parties?.length === 0 && <p>No birthdays or events are scheduled for this date.</p>}
        {parties?.length > 0 && <form onSubmit={event => { event.preventDefault(); if (chosenKey) updateBooking('linkParty'); }}>
          <label>Party Calendar booking<select required value={chosenKey} disabled={locked} onChange={event => setChosenKey(event.target.value)}>
            <option value="">Choose a birthday or event</option>
            {parties.map(party => <option key={party.key} value={party.key} disabled={Boolean(party.ambiguous)}>{party.title} · {bookingTime(party)}{party.size > 0 && ' · ' + party.size + ' people'}{party.ambiguous && ' · duplicate'}</option>)}
          </select></label><button className="btn btn-primary" disabled={locked || !chosenKey}>Confirm booking for group</button>
        </form>}
        {parties?.some(party => party.ambiguous) && <p>Duplicate bookings need different titles or times in the Party Calendar before you can link them.</p>}
        {group.partyKey && (confirmUnlink ? <div className="visit-party-tools__confirm"><p>Unlink this group from its Party Calendar booking?</p>
          <button type="button" className="btn btn-secondary" disabled={locked} onClick={() => updateBooking('unlinkParty')}>Yes, unlink booking</button>
          <button type="button" className="btn btn-outline-secondary" disabled={locked} onClick={() => setConfirmUnlink(false)}>Keep booking linked</button></div>
          : <button type="button" className="btn btn-outline-secondary" disabled={locked} onClick={() => setConfirmUnlink(true)}>Unlink booking</button>)}
      </div>
      <ul>{group.entries.map(entry => <li key={entry.id}><button type="button" className="btn btn-outline-primary" disabled={locked || !current} onClick={() => onSelect(entry.playerId ? { playerId: entry.playerId } : { displayName: entry.displayName }, !entry.playerId, group.date)}><strong>{entry.displayName}</strong><span>{entry.playerId ? 'Verify player' : 'Preview walk-on'}</span></button></li>)}</ul></>}
    {notice && <p role="status">{notice}</p>}
  </details>;
}
