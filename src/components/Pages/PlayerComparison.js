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
async function findPlayers(term, page, signal) {
  const params = new URLSearchParams({ lookup: 'players', q: term, page: String(page) });
  const data = await requestPlayerExperience('/api/leaderboard?' + params, signal);
  if (!Array.isArray(data.players)) throw new Error('Player search could not load. Try again.');
  return data;
}

function PlayerIdentity({ player }) {
  const details = [
    player.rankName,
    player.prestigeCount > 0 && `Prestige ${playerCount(player.prestigeCount)}`,
    Number.isFinite(player.careerPoints) && `${playerCount(player.careerPoints)} career points`,
    player.rank > 0 && `#${playerCount(player.rank)} all time`,
  ].filter(Boolean);
  return <span className="player-identity">
    {player.name && <strong>{player.name}</strong>}
    {details.length > 0 && <span>{details.join(' · ')}</span>}
    <span className="player-identity__id">Player ID <code>{player.id}</code></span>
  </span>;
}

function PlayerPicker({ side, index, chosen, choose }) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const operation = useRef(null);
  useEffect(() => () => operation.current?.abort(), []);

  function editQuery(value) {
    if (value && chosen) choose(side, null);
    operation.current?.abort();
    setQuery(value);
    setMatches(null);
    setError('');
    setBusy(false);
  }
  async function search(page) {
    operation.current?.abort();
    const term = query.trim();
    if (!term) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError('');
    try {
      const data = await findPlayers(term, page, controller.signal);
      if (!controller.signal.aborted) setMatches(data);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message);
    } finally {
      if (!controller.signal.aborted) { setBusy(false); operation.current = null; }
    }
  }
  function select(player) {
    editQuery('');
    choose(side, player);
  }
  return <section className="player-comparison__picker" aria-labelledby={`picker-${side}`} aria-busy={busy}>
    <h2 id={`picker-${side}`}>Player {index}</h2>
    <form className="player-experience__search" onSubmit={event => { event.preventDefault(); void search(1); }}>
      <label htmlFor={`compare-${side}`}>Find a player<input id={`compare-${side}`} type="search" value={query} maxLength={250} required autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="search" placeholder="Name, username, ID or profile link" onChange={event => editQuery(event.target.value)} /></label>
      <button className="player-experience__button" type="submit" disabled={busy || !query.trim()}>{busy ? 'Finding…' : 'Find player'}</button>
    </form>
    {matches && <>
      <p className="player-lookup-status" role="status">{matches.players.length ? `${playerCount(matches.totalPlayers)} ${matches.totalPlayers === 1 ? 'match' : 'matches'}` : 'No matches. Try a different name, exact player ID, or profile link.'}</p>
      {matches.players.length > 0 && <ul className="player-comparison__search-results">{matches.players.map(player => <li key={player.id}>
        <button className="player-experience__button" type="button" onClick={() => select(player)}><PlayerIdentity player={player} /><span className="player-identity__action">Select</span></button>
      </li>)}</ul>}
      {matches.totalPages > 1 && <nav className="player-picker-pages" aria-label={`Player ${index} search pages`}>
        <button type="button" disabled={busy || matches.page <= 1} onClick={() => search(matches.page - 1)}>Previous</button>
        <span>Page {matches.page} of {matches.totalPages}</span>
        <button type="button" disabled={busy || matches.page >= matches.totalPages} onClick={() => search(matches.page + 1)}>Next</button>
      </nav>}
    </>}
    {error && <p role="alert">{error}</p>}
    {chosen && <div className="player-comparison__selected" aria-live="polite"><small>Selected player</small><PlayerIdentity player={chosen} />
      <Link to={'/player-milestones/' + encodeURIComponent(chosen.id)} target="_blank" rel="noopener noreferrer">View player record</Link>
    </div>}
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
      setChosen({
        left: { ...data.players[0], rank: data.players[0].allTimePlace },
        right: { ...data.players[1], rank: data.players[1].allTimePlace },
      });
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
    setError('');
    setBusy(false);
    const initialLookup = new AbortController();
    if (players.left && players.right) {
      void compare(players, period, selectedMonth);
    } else if (players.left || players.right) {
      const side = players.left ? 'left' : 'right';
      const id = players[side].id;
      findPlayers(id, 1, initialLookup.signal).then(data => {
        const player = data.players.find(candidate => candidate.id === id);
        if (player && !initialLookup.signal.aborted) setChosen(previous =>
          previous[side]?.id === id ? { ...previous, [side]: player } : previous);
      }).catch(() => { /* The profile link and exact ID remain available. */ });
    }
    return () => { initialLookup.abort(); operation.current?.abort(); };
  }, [queryKey, compare]);

  function invalidate() { operation.current?.abort(); operation.current = null; setBusy(false); setRecord(null); setError(''); }
  function choose(side, player) { invalidate(); setChosen(previous => ({ ...previous, [side]: player })); }
  return <main className="player-experience player-experience-page player-comparison">
    <Helmet><title>Compare Players | US Airsoft Field</title></Helmet>
    <header className="player-experience__heading"><div><p>Friendly competition</p><h1>Compare players</h1><span>Search by registered name, display name, username, player ID, or USAW profile link.</span></div><Link to="/leaderboard">Leaderboard</Link></header>
    <div className="player-comparison__pickers">{['left', 'right'].map((side, index) => <PlayerPicker key={side + queryKey} side={side} index={index + 1} chosen={chosen[side]} choose={choose} />)}</div>
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
