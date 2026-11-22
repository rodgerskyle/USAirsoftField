import { groupRentalLink } from '../constants/groupRentalLink';
import React, { useEffect, useRef, useState } from 'react';
import { isGroupCode } from '../constants/groupCode';
import { groupExperienceLabels } from '../constants/groupExperience';
import WaiverStatus from './WaiverStatus';
import StaffWaiverPicker from './StaffWaiverPicker';
import GroupPartySchedule, { bookingTime } from './GroupPartySchedule';
import './GroupCheckIn.css';

const endpoint = '/api/check-in-groups';
const assignmentPath = '/api/game-day-check-in';
const teamLabels = { camo: 'Camo', solid: 'Solid' };
const fieldToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

function incomingGroupId() {
  const id = new URLSearchParams(window.location.search).get('group');
  return /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id || '') ? id : null;
}

function calendarHint() {
  if (window.location.hash !== '#arriving-group') return null;
  const params = new URLSearchParams(window.location.search);
  const date = params.get('partyDate') || '';
  const key = params.get('booking') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^[0-9a-f]{64}$/.test(key)) return null;
  const day = new Date(date + 'T00:00:00Z');
  return Number.isFinite(day.getTime()) && day.toISOString().startsWith(date) ? { date, key } : null;
}

export default function StaffGroupLookup({ request, onSelect, onAssigned, onBoardRead, disabled, rosterVersion, checkInRevision, onWorking }) {
  const [hint] = useState(calendarHint);
  const [incoming] = useState(incomingGroupId);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState(null);
  const [assignments, setAssignments] = useState(null);
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
    onWorking?.(true);
    setNotice('');
    try { await work(controller.signal); }
    catch (error) {
      if (!controller.signal.aborted) {
        clearChoices();
        if ([401, 403, 404].includes(error.status)) { setData(null); setSearch(null); setAssignments(null); }
        setNotice(error.message || 'The group could not be updated. Try again.');
      }
    } finally {
      if (!controller.signal.aborted) { setBusy(false); onWorking?.(false); }
      operation.current = null;
    }
  }

  async function loadAssignments(target, signal) {
    const result = await request(assignmentPath, { method: 'POST', signal,
      body: { action: 'groupAssignments', groupId: target.id, date: target.date } });
    if (signal.aborted) return;
    setAssignments({ ...result.groupAssignments, rosterVersion: result.rosterVersion, revision: checkInRevision });
    onBoardRead?.(result);
  }

  async function openGroup(result, signal) {
    if (signal.aborted) return;
    setData(result); setAssignments(null); clearChoices();
    if (hint && result.group.date === hint.date) await loadBookings(result.group, signal);
    else if (hint) setNotice('This group is on a different date from the selected Party Calendar booking. Check the group before linking.');
    if (!signal.aborted && result.group.date === result.today) await loadAssignments(result.group, signal);
  }

  async function openById(id, signal) {
    const result = await request(endpoint + '?staff=1&id=' + encodeURIComponent(id) + '&arrival=1', { signal });
    await openGroup(result, signal);
  }

  useEffect(() => {
    if (incoming) void run(signal => openById(incoming, signal));
    // The URL selects the initial group once per desk visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  function find(query, page = 1, todayOnly = false) {
    void run(async signal => {
      setData(null); setAssignments(null); setSearch(null); clearChoices();
      // A shared code identifies a single group, even from another booking date.
      if (page === 1 && isGroupCode(query)) {
        let exact;
        try { exact = await request(endpoint + '?staff=1&code=' + encodeURIComponent(query) + '&arrival=1', { signal }); }
        catch (error) { if (error.status !== 404) throw error; }
        if (signal.aborted) return;
        if (exact?.group) { await openGroup(exact, signal); return; }
      }
      const params = new URLSearchParams({ [hint || todayOnly ? 'date' : 'from']: hint?.date || fieldToday(), q: query, page: String(page) });
      const result = await request('/api/staff-groups?' + params, { signal });
      if (signal.aborted) return;
      if (!result.groups.length) { setNotice('No matching groups. Check the name or code and try again.'); return; }
      if (result.totalPages > 1 || result.groups.length > 1) setSearch({ ...result, query, todayOnly });
      else await openById(result.groups[0].id, signal);
    });
  }

  function lookup(event) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('group').trim();
    if (value) find(value);
  }

  const group = data?.group;
  const locked = disabled || busy;
  const current = group && group.date === data.today;
  const positions = new Map(assignments?.entries?.map(position => [position.entryId, position]));
  const fresh = assignments?.version && assignments.revision === checkInRevision
    && (!rosterVersion || assignments.rosterVersion === rosterVersion)
    && group?.entries.length === positions.size && group.entries.every(entry => positions.has(entry.id));

  const cleared = position => position && (position.side || position.waiverStatus === 'signed');
  const groupCleared = fresh && group.entries.length > 0 && group.entries.every(entry => cleared(positions.get(entry.id)));

  function linkWaiver(entry, match) {
    if (!current || !fresh) return;
    void run(async signal => {
      try {
        const result = await request(assignmentPath, { method: 'POST', signal, body: {
          action: 'linkGroupWaiver', groupId: group.id, entryId: entry.id, date: group.date,
          assignmentVersion: assignments.version, waiverRef: match.ref,
        } });
        if (signal.aborted) return;
        setAssignments({ ...result.groupAssignments, rosterVersion: result.rosterVersion, revision: checkInRevision });
        onBoardRead?.(result);
        setNotice('Signed waiver linked to ' + entry.displayName + '.');
      } catch (error) {
        if (error.status === 409 && !signal.aborted) await openById(group.id, signal);
        throw error;
      }
    });
  }

  const readyCount = fresh ? [...positions.values()].filter(row => !row.side && row.waiverStatus === 'signed').length : 0;
  function assign(side, entry, readyOnly = false) {
    if (!current || !fresh || !(readyOnly ? readyCount : entry ? cleared(positions.get(entry.id)) : groupCleared)) return;
    void run(async signal => {
      try {
        const result = await request(assignmentPath, { method: 'POST', signal, body: {
          action: 'assignGroup', groupId: group.id, date: group.date, side,
          rosterVersion: assignments.rosterVersion, assignmentVersion: assignments.version, ...(entry && { entryId: entry.id }), ...(readyOnly && { readyOnly: true }),
        } });
        if (signal.aborted) return;
        setAssignments({ ...result.groupAssignments, rosterVersion: result.rosterVersion, revision: checkInRevision });
        onAssigned?.(result);
        setNotice((readyOnly ? result.checkedInCount + (result.checkedInCount === 1 ? ' ready player' : ' ready players') : entry ? entry.displayName : group.name) + ' assigned to ' + teamLabels[side] + '.');
      } catch (error) {
        if (signal.aborted) return;
        setAssignments(null);
        if (error.status !== 409) throw error;
        await openById(group.id, signal);
        if (!signal.aborted) setNotice(error.message || 'The roster changed. Review the refreshed assignments before trying again.');
      }
    });
  }

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

  return <details id="arriving-group" className="admin-group-lookup" open><summary>Find an arriving group</summary>
    {hint && <p>Party Calendar booking for {hint.date}. Find the group by its name or invitation code.</p>}
    <p>Search by group name or invitation code. <a href="/admin/field/groups">Manage groups</a></p>
    <form onSubmit={lookup}><label>Group name or code<input name="group" minLength={1} maxLength={80} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} required disabled={locked} /></label><button className="btn btn-secondary" disabled={locked}>{busy ? 'Working…' : 'Find group'}</button><button type="button" className="btn btn-outline-primary" disabled={locked} onClick={() => find('', 1, true)}>Show today’s groups</button></form>
    {search && <div><p>Choose a matching group.</p><ul>{search.groups.map(item => <li key={item.id}>
      <button type="button" className="btn btn-outline-primary" disabled={locked} onClick={() => void run(signal => openById(item.id, signal))}>
        <strong>{item.name}</strong><span>{item.date} · {item.memberCount} players</span>
      </button></li>)}</ul>
      {search.totalPages > 1 && <nav aria-label="Group search pages" className="admin-checkin__buttons">
        <button type="button" disabled={locked || search.page <= 1} onClick={() => find(search.query, search.page - 1, search.todayOnly)}>Previous</button>
        <span>Page {search.page} of {search.totalPages}</span>
        <button type="button" disabled={locked || search.page >= search.totalPages} onClick={() => find(search.query, search.page + 1, search.todayOnly)}>Next</button></nav>}</div>}
    {group && <><h3>{group.name}</h3><p>{group.date} · <a href={'/admin/field/groups?group=' + encodeURIComponent(group.id)}>Edit group roster</a></p>{!current && <p>This group is planned for a different date.</p>}
      <GroupPartySchedule group={group} staff />
      {group.id && !busy && group.partyStatus !== 'review' && !missingBooking && !data.partyCalendarUnavailable &&
        (!hint || (hint.date === group.date && (!hint.key || hint.key === group.partyKey))) &&
        <p><a className="btn btn-secondary" href={groupRentalLink(group.id)} target="_blank" rel="noopener noreferrer">Open rental form</a></p>}
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
      <section className="group-placement" aria-label="Group team assignments"><h4>Team assignments</h4>
        {current && <>
          <p>{fresh ? readyCount + ' of ' + group.entries.length + ' ready for check-in.' : 'Checking group waivers and team assignments…'}</p>
          {readyCount > 0 && readyCount < group.entries.length && <div className="group-placement__actions">
            {Object.entries(teamLabels).map(([side, label]) => <button type="button" key={side} className="btn btn-primary"
              disabled={locked} onClick={() => assign(side, null, true)}>Check in {readyCount} ready to {label}</button>)}
          </div>}
          <div className="group-placement__actions">{Object.entries(teamLabels).map(([side, label]) =>
            <button key={side} type="button" className="btn btn-outline-primary" data-team={side}
              disabled={locked || !groupCleared}
              onClick={() => assign(side)}>Assign group to {label}</button>)}
            <button type="button" className="btn btn-outline-secondary" disabled={locked}
              onClick={() => void run(signal => openById(group.id, signal))}>Refresh group</button></div>
          {!busy && !fresh && <p role="status">Refresh the group to see current teams.</p>}
          {fresh && [...positions.values()].some(position => position.waiverStatus === 'unavailable') &&
            <p>Refresh the group to retry pending waiver checks.</p>}
        </>}
        <ul>{group.entries.map(entry => {
          const position = fresh ? positions.get(entry.id) : undefined;
          const waiverStatus = (current ? position?.waiverStatus : entry.waiverStatus) ?? 'unavailable';
          const playerId = position?.playerId || entry.playerId;
          const playerName = position?.displayName ?? entry.displayName;
          const experience = position?.experienceBand ?? entry.experienceBand;
          return <li className="group-placement__player" key={entry.id}>
            <strong>{playerName}</strong><small>{groupExperienceLabels[experience] || groupExperienceLabels.unrated}{position && ' · ' + (teamLabels[position.side] || 'Awaiting check-in')}</small>
            <WaiverStatus status={waiverStatus} />
            {current && position && !position.side && waiverStatus !== 'signed' &&
              <StaffWaiverPicker request={request} disabled={locked} name={entry.displayName} onChoose={match => linkWaiver(entry, match)} />}
            {current && <div className="group-placement__actions">
              {Object.entries(teamLabels).map(([side, label]) => <button type="button" className="btn btn-outline-primary"
                key={side} data-team={side} aria-label={'Assign ' + playerName + ' to ' + label}
                disabled={locked || !cleared(position) || position.side === side} onClick={() => assign(side, entry)}>{label}</button>)}
              {playerId && <button type="button" className="btn btn-outline-secondary" disabled={locked}
                aria-label={'Verify ' + playerName} onClick={() => onSelect({ playerId }, false, group.date)}>Verify player</button>}
            </div>}
          </li>;
        })}</ul>
      </section></>}
    {notice && <p role="status">{notice}</p>}
  </details>;
}
