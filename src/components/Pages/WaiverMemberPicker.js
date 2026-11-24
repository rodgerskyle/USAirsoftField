import React, { useEffect, useRef, useState } from 'react';
import { AsyncTypeahead } from 'react-bootstrap-typeahead';
import { get } from 'firebase/database';

export default function WaiverMemberPicker({ firebase, selected, onChange, disabled }) {
  const [options, setOptions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(null);
  const selection = useRef(0);
  useEffect(() => () => { request.current?.abort(); selection.current++; }, []);

  async function search(value) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      const query = new URLSearchParams({ lookup: 'players', q: value, page: '1' });
      const response = await fetch('https://app.usairsoftfield.com/api/leaderboard?' + query, {
        headers: { Accept: 'application/json' }, credentials: 'omit', cache: 'no-store', signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.players)) throw new Error('Member search is unavailable. Try again.');
      if (!controller.signal.aborted) setOptions(data.players.filter(player => /^[A-Za-z0-9_-]{10,128}$/.test(player?.id) && (player.name || player.displayName)));
    } catch (failure) {
      if (!controller.signal.aborted) { setOptions([]); setError('Member search is unavailable. Try again.'); }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function choose(rows) {
    const revision = ++selection.current;
    const candidate = rows[0];
    setError('');
    if (!candidate) { onChange(null); return; }
    onChange({ id: candidate.id, name: candidate.name || candidate.displayName, unverified: true });
    try {
      const snapshot = await get(firebase.user(candidate.id));
      const profile = snapshot.val();
      if (!profile?.name?.trim() || profile.accountRemovedAt) throw new Error();
      if (revision === selection.current) onChange({ id: candidate.id, name: profile.name.trim(), username: profile.username });
    } catch {
      if (revision === selection.current) setError('Could not verify this member. Clear the selection and search again.');
    }
  }

  return <div className="mb-3">
    <label htmlFor="desk-waiver-member">Member profile (optional)</label>
    <AsyncTypeahead id="desk-waiver-member" inputProps={{ id: 'desk-waiver-member' }} selected={selected ? [selected] : []}
      clearButton minLength={2} isLoading={busy} onSearch={search} useCache={false} filterBy={() => true}
      disabled={disabled} onChange={choose} options={options} placeholder="Search by name, callsign or member ID"
      labelKey={player => player.name || player.displayName}
      renderMenuItemChildren={player => <>{player.name || player.displayName} · {player.id}</>} />
    {selected && !selected.unverified && <small>Signed waiver will attach to {selected.name}.</small>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
