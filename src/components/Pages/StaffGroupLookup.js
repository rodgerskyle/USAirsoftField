import React, { useEffect, useRef, useState } from 'react';
import './GroupCheckIn.css';

export default function StaffGroupLookup({ request, onSelect, disabled }) {
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const operation = useRef(null);
  useEffect(() => () => operation.current?.abort(), []);
  async function lookup(event) {
    event.preventDefault();
    if (disabled || operation.current) return;
    const code = new FormData(event.currentTarget).get('code').trim();
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setData(null);
    setNotice('');
    try {
      const result = await request('/api/check-in-groups?staff=1&code=' + encodeURIComponent(code), { signal: controller.signal });
      if (!controller.signal.aborted) setData(result);
    } catch (error) { if (!controller.signal.aborted) setNotice(error.message || 'The group could not be found.'); }
    finally { operation.current = null; if (!controller.signal.aborted) setBusy(false); }
  }
  const current = data?.group?.date === data?.today;
  return <details className="admin-group-lookup"><summary>Find an arriving group</summary>
    <p>Select each person for individual verification and team assignment.</p>
    <form onSubmit={lookup}><label>Group code<input name="code" minLength={16} maxLength={16} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} required disabled={disabled || busy} /></label><button className="btn btn-secondary" disabled={disabled || busy}>{busy ? 'Finding…' : 'Find group'}</button></form>
    {data?.group && <><h3>{data.group.name}</h3><p>{data.group.date}</p>{!current && <p>This group is planned for a different date.</p>}
      <ul>{data.group.entries.map(entry => <li key={entry.id}><button type="button" className="btn btn-outline-primary" disabled={disabled || busy || !current} onClick={() => onSelect(entry.playerId ? { playerId: entry.playerId } : { displayName: entry.displayName }, !entry.playerId, data.group.date)}><strong>{entry.displayName}</strong><span>{entry.playerId ? 'Verify player' : 'Preview walk-on'}</span></button></li>)}</ul></>}
    {notice && <p role="status">{notice}</p>}
  </details>;
}
