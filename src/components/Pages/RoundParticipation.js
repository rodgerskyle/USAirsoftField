import React, { useCallback, useEffect, useRef, useState } from 'react';
import { requestMyRound } from '../constants/fieldStaffApi';

const endpoint = '/api/round-roster';
const teams = { camo: 'Camo', solid: 'Solid' };

function useRoundRoster(request, staff, onSaved) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const lifetime = useRef(null);
  const writing = useRef(false);
  const sequence = useRef(0);

  const refresh = useCallback(async () => {
    const signal = lifetime.current?.signal;
    if (!signal || signal.aborted || writing.current) return;
    const id = ++sequence.current;
    try {
      const fresh = await request(endpoint + (staff ? '?staff=1' : ''), { signal });
      if (!signal.aborted && id === sequence.current) { setData(fresh); setError(''); }
    } catch (failure) {
      if (!signal.aborted && id === sequence.current) {
        setData(null);
        setError(failure.message || 'Could not load the round roster. Try again.');
      }
    }
  }, [request, staff]);

  useEffect(() => {
    const life = new AbortController();
    lifetime.current = life;
    setData(null); setError(''); setNotice(''); setBusy(false); writing.current = false;
    void refresh();
    const visibleRefresh = () => { if (!document.hidden) void refresh(); };
    const timer = window.setInterval(visibleRefresh, 15000);
    document.addEventListener('visibilitychange', visibleRefresh);
    return () => { life.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', visibleRefresh); };
  }, [refresh]);

  async function save(body, message) {
    const signal = lifetime.current?.signal;
    if (!signal || signal.aborted || writing.current) return;
    ++sequence.current;
    writing.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const fresh = await request(endpoint, { method: 'POST', body, signal });
      if (!signal.aborted) { setData(fresh); setNotice(message); onSaved?.(fresh); }
    } catch (failure) {
      if (!signal.aborted) {
        writing.current = false;
        await refresh();
        if (!signal.aborted) setError(failure.message || 'The update could not be confirmed.');
      }
    } finally {
      if (!signal.aborted) { writing.current = false; setBusy(false); }
    }
  }
  return { data, busy, save, refresh, error, notice };
}

function PairControls({ data, player, save, busy }) {
  const [buddyId, setBuddyId] = useState('');
  const [filter, setFilter] = useState('');
  const candidates = data.players.filter(row => row.playerId !== player.playerId && !row.buddyId);
  const search = filter.trim().toLowerCase();
  const options = candidates.filter(row => row.displayName.toLowerCase().includes(search) || row.playerId.toLowerCase().includes(search));
  const buddy = options.find(row => row.playerId === buddyId);
  if (player.buddyId) return <>
    <p>Battle Buddy <strong>{player.buddyName}</strong> · Both on {teams[player.side]}.</p>
    <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={() => save({
      action: 'unpair', date: data.date, playerId: player.playerId, buddyId: player.buddyId, revision: player.revision,
    }, 'Battle Buddy pair removed.')}>Unpair Battle Buddies</button>
  </>;
  return <details className="admin-checkin__explanation"><summary>Keep my Battle Buddy with me</summary>
    <p>Choose another checked-in player after both request to stay together. The pair stays on the buddy’s side today.</p>
    {candidates.length === 0 ? <p>No unpaired teammates are checked in yet.</p> : <div className="admin-checkin__form">
      {candidates.length > 8 && <label>Filter buddies<input value={filter} disabled={busy} onChange={event => { setFilter(event.target.value); setBuddyId(''); }} /></label>}
      <label>Battle Buddy<select value={buddy?.playerId || ''} disabled={busy} onChange={event => setBuddyId(event.target.value)}>
        <option value="">Select a player</option>
        {options.map(row => <option key={row.playerId} value={row.playerId}>{row.displayName} · {teams[row.side]} · {row.playerId.slice(-6)}</option>)}
      </select></label>
      <button type="button" className="btn btn-primary" disabled={busy || !buddy} onClick={() => save({
        action: 'pair', date: data.date, playerId: player.playerId, buddyId: buddy.playerId, revision: player.revision, buddyRevision: buddy.revision,
      }, 'Battle Buddies paired on ' + teams[buddy?.side] + '.')}>{buddy ? 'Pair both on ' + teams[buddy.side] : 'Pair players'}</button>
    </div>}
  </details>;
}

export function RoundParticipation({ request, playerId, onSaved }) {
  const staff = Boolean(playerId);
  const { data, busy, save, refresh, error, notice } = useRoundRoster(request, staff, onSaved);
  const player = staff ? data?.players?.find(row => row.playerId === playerId) : data?.player;
  const round = data?.round;
  return <div className="round-participation">
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p role="status">Loading round status…</p>}
    {data && (!player ? <p>{staff ? 'This player is no longer on today’s roster.' : 'Check in at the field to join today’s round roster.'}</p> : <>
      <p><strong>{round?.title || 'No round selected'}</strong> · {teams[player.side]}{round && (player.sittingOut ? ' · Sitting out this round' : ' · Playing this round')}</p>
      {round && <button type="button" className={staff ? 'btn btn-outline-primary' : 'ph-button ph-button-primary'}
        disabled={busy} onClick={() => save({
          action: 'availability', date: data.date, gameId: round.id, sittingOut: !player.sittingOut, revision: player.revision, ...(staff && { playerId }),
        }, player.sittingOut ? 'Back in this round.' : 'Sitting out this round. Check-in is saved for the day.')}>
        {player.sittingOut ? 'Back in this round' : 'Sit out this round'}
      </button>}
      {staff ? <PairControls key={playerId + ':' + data.date} data={data} player={player} save={save} busy={busy} />
        : <p>{player.buddyName ? 'Your Battle Buddy today is ' + player.buddyName + '.' : 'Ask a ref at check-in to pair you with a Battle Buddy.'}</p>}
    </>)}
    {notice && <p role="status">{notice}</p>}
    {error && <button type="button" className={staff ? 'btn btn-secondary' : 'ph-button ph-button-secondary'} disabled={busy} onClick={refresh}>Refresh round status</button>}
  </div>;
}

export function PlayerRoundCard({ firebase, uid }) {
  const [open, setOpen] = useState(false);
  const request = useCallback((path, options) => requestMyRound(firebase, uid, options), [firebase, uid]);
  return <section className="ph-card" aria-labelledby="my-round-heading">
    <h2 id="my-round-heading">My round</h2>
    <button type="button" className="ph-button ph-button-secondary" aria-expanded={open}
      onClick={() => setOpen(value => !value)}>{open ? 'Close round status' : 'View round status & Battle Buddy'}</button>
    {open && <RoundParticipation request={request} />}
  </section>;
}
