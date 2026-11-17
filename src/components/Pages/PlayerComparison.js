import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { currentFieldMonth, playerCount, playerIdPattern, requestPlayerExperience } from '../constants/playerExperience';
import { PrestigeEmblem } from './PlayerPrestige';
import './PlayerExperience.css';

const metrics = [
  ['Points', 'points'], ['Wins', 'wins'], ['Losses', 'losses'], ['All-time leaderboard spot', 'allTimePlace'],
  ['Current career rank', 'rankName'], ['Current Prestige', 'prestigeCount'], ['Patches earned', 'patchesEarned'], ['Different patches earned', 'uniquePatches'],
];
function PlayerPicker({ side, index, chosen, choose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const operation = useRef(null);
  useEffect(() => () => operation.current?.abort(), []);
  async function search(event) {
    event.preventDefault();
    operation.current?.abort();
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError('');
    setResults(null);
    try {
      const data = await requestPlayerExperience('/api/leaderboard?' + new URLSearchParams({ q: query.trim() }), controller.signal);
      if (!controller.signal.aborted) setResults(data.players?.slice(0, 8) || []);
    } catch (failure) { if (!controller.signal.aborted) setError(failure.message); }
    finally { if (!controller.signal.aborted) { setBusy(false); operation.current = null; } }
  }
  return <section className="player-comparison__picker" aria-busy={busy}>
    <h2>Player {index}</h2>
    <form className="player-experience__search" onSubmit={search}><label htmlFor={`compare-${side}`}>Name or player ID<input id={`compare-${side}`} value={query} maxLength={80} required autoComplete="off" onChange={event => setQuery(event.target.value)} /></label><button className="player-experience__button" type="submit" disabled={busy}>{busy ? 'Finding…' : 'Find player'}</button></form>
    <p className="player-comparison__chosen">{chosen?.name || (chosen?.id ? 'Player ID · ' + chosen.id : 'Choose a player')}</p>
    {results && <ul className="player-comparison__search-results">{results.length ? results.map(player => <li key={player.id}><button className="player-experience__button" type="button" onClick={() => { choose(side, player); setResults(null); }}>{player.name}</button></li>) : <li>No matching player found.</li>}</ul>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
export default function PlayerComparison() {
  const [params] = useSearchParams();
  const queryKey = params.toString();
  const [chosen, setChosen] = useState({ left: null, right: null });
  const [view, setView] = useState('all');
  const [month, setMonth] = useState(currentFieldMonth);
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const operation = useRef(null);

  const compare = useCallback(async (players, period, selectedMonth) => {
    operation.current?.abort();
    if (!playerIdPattern.test(players.left?.id || '') || !playerIdPattern.test(players.right?.id || '') || players.left.id === players.right.id) {
      setError('Choose two different USAW players.'); return;
    }
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError('');
    setRecord(null);
    try {
      const query = new URLSearchParams({ left: players.left.id, right: players.right.id, view: period });
      if (period === 'monthly') query.set('month', selectedMonth);
      const data = await requestPlayerExperience('/api/player-comparison?' + query, controller.signal);
      if (controller.signal.aborted) return;
      if (!Array.isArray(data.players) || data.players.length !== 2 || data.players[0].id !== players.left.id || data.players[1].id !== players.right.id) throw new Error('The selected player records could not be verified.');
      setRecord(data);
      setChosen({ left: data.players[0], right: data.players[1] });
    } catch (failure) { if (!controller.signal.aborted) setError(failure.message); }
    finally { if (!controller.signal.aborted) { operation.current = null; setBusy(false); } }
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(queryKey);
    const players = Object.fromEntries(['left', 'right'].map(side => [side, playerIdPattern.test(query.get(side) || '') ? { id: query.get(side) } : null]));
    const period = query.get('view') === 'monthly' ? 'monthly' : 'all';
    const selectedMonth = /^20[2-9]\d-(0[1-9]|1[0-2])$/.test(query.get('month') || '') ? query.get('month') : currentFieldMonth();
    operation.current?.abort();
    setChosen(players);
    setView(period);
    setMonth(selectedMonth);
    setRecord(null);
    if (players.left && players.right) void compare(players, period, selectedMonth);
    return () => operation.current?.abort();
  }, [queryKey, compare]);

  function invalidate() { operation.current?.abort(); operation.current = null; setBusy(false); setRecord(null); setError(''); }
  function choose(side, player) { invalidate(); setChosen(previous => ({ ...previous, [side]: { id: player.id, name: player.name } })); }
  return <main className="player-experience player-experience-page player-comparison">
    <Helmet><title>Compare Players | US Airsoft Field</title></Helmet>
    <header className="player-experience__heading"><div><p>Friendly competition</p><h1>Compare players</h1><span>See two USAW player records side by side.</span></div><Link to="/leaderboard">Leaderboard</Link></header>
    <div className="player-comparison__pickers">{['left', 'right'].map((side, index) => <PlayerPicker key={side} side={side} index={index + 1} chosen={chosen[side]} choose={choose} />)}</div>
    <form className="player-comparison__period" onSubmit={event => { event.preventDefault(); void compare(chosen, view, month); }}>
      <label>Compare results<select value={view} onChange={event => { invalidate(); setView(event.target.value); }}><option value="all">All time</option><option value="monthly">Monthly</option></select></label>
      {view === 'monthly' && <label>Month<input type="month" value={month} required onChange={event => { invalidate(); setMonth(event.target.value); }} /></label>}
      <button className="player-experience__button player-experience__button--primary" type="submit" disabled={busy}>{busy ? 'Comparing…' : 'Compare players'}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {record && <div className="player-comparison__results">
      <div className="player-comparison__table-wrap"><table><caption>{record.view === 'monthly' ? record.month + ' game results' : 'All-time game results'}</caption><thead><tr><th scope="col">Record</th>{record.players.map((player, index) => <th key={index} scope="col"><Link to={'/profilelookup/' + encodeURIComponent(player.id)}>{player.name}</Link>{player.prestigeCount > 0 && <PrestigeEmblem count={player.prestigeCount} />}</th>)}</tr></thead>
        <tbody>{metrics.map(([label, key]) => <tr key={key} className={`player-comparison__${key}`}><th scope="row">{label}</th>{record.players.map((player, index) => <td key={index}>{key === 'rankName' ? player[key] : playerCount(player[key])}</td>)}</tr>)}</tbody></table></div>
      <p className="player-experience__note">Rank, Prestige, and all-time leaderboard spots show current career records. Monthly patch counts follow the field’s Pacific calendar.</p>
    </div>}
    {!record && !busy && !error && <p>Choose two players to compare their records.</p>}
  </main>;
}
