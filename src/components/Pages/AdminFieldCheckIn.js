import React, { useCallback, useEffect, useRef, useState } from 'react';

import { readScannedMemberCard } from '../constants/scoreCards';
import { StaffCardScanner } from './StaffCardScanner';
import './AdminFieldCheckIn.css';

const path = '/api/game-day-check-in';
const sides = { camo: 'Camo', solid: 'Solid' };
const memberships = {
  active: 'Membership active',
  expired: 'Membership expired',
  'waiver-only': 'Waiver only',
  unconfirmed: 'Membership unconfirmed',
  guest: 'Walk-on',
};
const talent = { elite: 'Elite', veteran: 'Veteran', regular: 'Regular', limited: 'Limited', unrated: 'Unrated' };
const assessmentOrder = ['unrated', 'limited', 'regular', 'veteran', 'elite'];
const reasons = {
  headcount: 'closer headcounts',
  elite: 'spreads Elite players',
  talent: 'spreads top talent',
  strength: 'closer estimated strength',
};
const fieldDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });

function smallestGap(gap, contribution, reason) {
  const camo = Math.abs(gap + contribution);
  const solid = Math.abs(gap - contribution);
  return camo === solid ? null : { side: camo < solid ? 'camo' : 'solid', reason };
}

// Use the same order as the Companion check-in recommendation.
function recommendPlacement(board, player) {
  if (!board?.balance || !player) return null;
  const { camo, solid } = board.balance;
  if (![camo?.strength, solid?.strength, board.counts?.camo, board.counts?.solid].every(Number.isFinite)) return null;
  const currentSide = player.side === 'camo' ? 1 : player.side === 'solid' ? -1 : 0;
  const headcount = board.counts.camo - board.counts.solid - currentSide;
  const elite = camo.elite - solid.elite - (player.assignedExperienceBand === 'elite' ? currentSide : 0);
  const veteran = camo.veteran - solid.veteran - (player.assignedExperienceBand === 'veteran' ? currentSide : 0);
  const strength = camo.strength - solid.strength - currentSide * (player.assignedBalanceScore ?? 100);
  const isElite = player.experienceBand === 'elite';
  const isTopTalent = isElite || player.experienceBand === 'veteran';

  return smallestGap(headcount, 1, 'headcount')
    || (isElite && smallestGap(elite, 1, 'elite'))
    || (isTopTalent && smallestGap(elite + veteran, 1, 'talent'))
    || smallestGap(strength, player.balanceScore ?? 100, 'strength');
}

function lookupInput(raw) {
  const value = raw.trim();
  const token = readScannedMemberCard(value);
  if (token) return { cardToken: token };
  const barcodeId = /^\]C[01]([A-Za-z0-9_-]{10,128})$/.exec(value)?.[1];
  if (barcodeId) return { playerId: barcodeId };
  if (/^https?:/i.test(value)) throw new Error('Enter a USAW membership card link or search by player name or ID.');
  if (value.length < 2 || value.length > 128) throw new Error('Enter 2–128 characters from a player name or ID.');
  return { query: value };
}

function putResult(board, data) {
  if (board?.date && data.date < board.date) return board;
  const { date, counts, balance } = data;
  return { date, counts, balance, players: data.players ?? (date === board?.date ? board.players : []) };
}

function assignmentMessage({ outcome, player }) {
  const { displayName, side } = player;
  if (outcome === 'reassigned') return `${displayName} moved to ${sides[side]}.`;
  if (outcome === 'updated') return `Talent assessment updated for ${displayName}.`;
  if (outcome === 'already-checked-in') return `${displayName} is already checked in as ${sides[side]}.`;
  return `${displayName} checked in as ${sides[side]}.`;
}

function TeamTalent({ board }) {
  const totalStrength = board ? (board.balance?.camo?.strength ?? 0) + (board.balance?.solid?.strength ?? 0) : 0;
  const camoShare = totalStrength > 0 ? Math.round(board.balance.camo.strength / totalStrength * 100) : null;
  return (
    <section aria-labelledby="admin-checkin-talent">
      <div className="admin-checkin__heading">
        <h2 id="admin-checkin-talent">Team talent</h2>
        <span>{board?.counts?.total ?? '—'} checked in</span>
      </div>
      <div className="admin-checkin__teams">
        {Object.entries(sides).map(([side, name]) => {
          const share = camoShare === null ? null : side === 'camo' ? camoShare : 100 - camoShare;
          return (
            <section className="admin-checkin__team" data-side={side} key={side}>
              <div className="admin-checkin__heading">
                <h3>{name}</h3>
                <span>{board?.counts?.[side] ?? '—'} players</span>
              </div>
              <span>Estimated strength share {share === null ? '—' : `${share}%`}</span>
              <progress aria-label={`${name} estimated strength share`} value={share ?? 0} max={100} />
              <dl>
                {Object.entries(talent).map(([level, label]) => (
                  <div key={level} data-talent={level}>
                    <dt>{label}</dt><dd>{board?.balance?.[side]?.[level] ?? '—'}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>
      <details className="admin-checkin__explanation">
        <summary>How team balance works</summary>
        <p>
          Suggestions prioritize even headcounts, then spread Elite and Veteran players and compare
          estimated strength. Regular starts at 15 recorded games, Veteran at 60, and Elite requires
          120 games with a 60% adjusted win rate. Staff can assess walk-ons and players who have no
          recorded games. Unrated players receive a neutral estimate. Staff choose the final side.
        </p>
      </details>
    </section>
  );
}

function PlayerRows({ players, onSelect, checkedIn, disabled }) {
  return (
    <ul className="admin-checkin__players" aria-label={checkedIn ? 'Recent players' : 'Matching players'}>
      {players.map(player => (
        <li key={player.playerId}>
          <button type="button" disabled={disabled} onClick={() => onSelect({ playerId: player.playerId })}>
            <span>
              <strong>{player.displayName}</strong>
              <small>{checkedIn ? `${memberships[player.membershipStatus] || memberships.unconfirmed} · ${talent[player.experienceBand] || 'Unrated'}` : player.playerId}</small>
            </span>
            <span className={checkedIn ? 'admin-checkin__pill' : undefined} data-side={checkedIn ? player.side : undefined} aria-hidden={checkedIn ? undefined : true}>
              {checkedIn ? sides[player.side] : '›'}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function SelectedPlayer({ player, suggestion, working, onAssessment, onAssign }) {
  const { side, membershipStatus, experienceBand, assignedExperienceBand, canSetExperience } = player;
  const oppositeSide = side === 'camo' ? 'solid' : 'camo';
  const choices = side ? [oppositeSide] : Object.keys(sides);
  const membership = memberships[membershipStatus] || memberships.unconfirmed;
  const ratingChanged = experienceBand !== (assignedExperienceBand || 'unrated');
  return (
    <section className="admin-checkin__selection" aria-labelledby="admin-checkin-selection">
      <h3 id="admin-checkin-selection">{player.displayName}</h3>
      {membershipStatus !== 'guest' && <p className="admin-checkin__id">{player.playerId}</p>}
      <div className="admin-checkin__badges">
        <span className="admin-checkin__pill" data-membership={membershipStatus}>{membership}</span>
        <span className="admin-checkin__pill" data-side={side || undefined}>
          {side ? `Checked in · ${sides[side]}` : 'Awaiting check-in'}
        </span>
        {!canSetExperience && <span className="admin-checkin__pill">{talent[experienceBand] || 'Unrated'}</span>}
      </div>
      {canSetExperience && (
        <label className="admin-checkin__rating" htmlFor="admin-checkin-rating">
          Talent assessment
          <select id="admin-checkin-rating" value={experienceBand || 'unrated'} disabled={working} onChange={event => onAssessment(event.target.value)}>
            {assessmentOrder.map(band => <option value={band} key={band}>{talent[band]}</option>)}
          </select>
        </label>
      )}
      <p className="admin-checkin__suggestion" aria-live="polite">
        {suggestion ? `${suggestion.side === side ? 'Current side fits' : 'Suggested side'} · ${sides[suggestion.side]} · ${reasons[suggestion.reason]}` : 'Either side fits the current balance.'}
      </p>
      {membershipStatus !== 'active' && <p className="admin-checkin__hint">Confirm admission at the desk. Check-in records attendance and team assignment only.</p>}
      <div className="admin-checkin__buttons">
        {choices.map(choice => (
          <button className={`btn btn-${side ? 'outline-primary' : 'primary'}`} type="button" key={choice} disabled={working} onClick={() => onAssign(choice)}>
            {side ? 'Move to ' : 'Check in as '}{sides[choice]}
          </button>
        ))}
        {side && canSetExperience && ratingChanged && (
          <button type="button" className="btn btn-primary" disabled={working} onClick={() => onAssign(side)}>Save talent assessment</button>
        )}
      </div>
    </section>
  );
}

export default function AdminFieldCheckIn({ request }) {
  const [board, setBoard] = useState(null);
  const [selected, setSelected] = useState(null);
  const [matches, setMatches] = useState([]);
  const [working, setWorking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rosterError, setRosterError] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const lifecycle = useRef(null);
  const operation = useRef(null);
  const refreshCall = useRef(null);
  const generation = useRef(0);
  const memberInput = useRef(null);
  const guestInput = useRef(null);

  const refreshRoster = useCallback(async () => {
    const signal = lifecycle.current?.signal;
    if (!signal || signal.aborted || refreshCall.current || operation.current) return;
    const call = {};
    refreshCall.current = call;
    const sequence = ++generation.current;
    setRefreshing(true);
    setRosterError('');
    try {
      const data = await request(path, { signal });
      if (!signal.aborted && sequence === generation.current) setBoard(current => putResult(current, data));
    } catch (failure) {
      if (!signal.aborted && sequence === generation.current) setRosterError(failure.message || 'Roster could not be loaded.');
    } finally {
      if (refreshCall.current === call) {
        refreshCall.current = null;
        if (!signal.aborted) setRefreshing(false);
      }
    }
  }, [request]);

  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    void refreshRoster();
    const poll = window.setInterval(() => { if (!document.hidden) void refreshRoster(); }, 15000);
    return () => {
      controller.abort();
      window.clearInterval(poll);
      refreshCall.current = null;
      operation.current = null;
    };
  }, [refreshRoster]);

  useEffect(() => {
    if (selected && board?.date && selected.date < board.date) {
      setSelected(null);
      setStatus('A new field day has started. Look up the player again.');
    }
  }, [board, selected]);

  async function run(work) {
    const signal = lifecycle.current?.signal;
    if (!signal || signal.aborted || operation.current) return;
    const current = {};
    operation.current = current;
    ++generation.current;
    setWorking(true);
    setError('');
    try {
      await work(signal);
    } catch (failure) {
      if (!signal.aborted) setError(failure.message || 'The check-in could not be saved. Try again.');
    } finally {
      if (operation.current === current) {
        operation.current = null;
        if (!signal.aborted) setWorking(false);
      }
    }
  }

  function lookup(input, guest = false) {
    void run(async signal => {
      setSelected(null);
      setMatches([]);
      setStatus(guest ? 'Checking today’s walk-on roster…' : 'Looking up the player…');
      try {
        const data = await request(path, {
          method: 'POST', signal,
          body: guest ? { action: 'guestPreview', ...input } : { action: 'lookup', includeBalance: true, ...input },
        });
        if (signal.aborted) return;
        if (data.counts && data.balance) setBoard(current => putResult(current, data));
        if (data.player) {
          setSelected({ date: data.date, player: data.player });
          setStatus(data.player.side ? 'This player is already checked in.' : 'Choose a side to check in.');
        } else if (data.matches?.length) {
          setMatches(data.matches);
          setStatus('Select the matching player.');
        } else {
          setStatus('No matching player. Try another spelling, enter a player ID, or add a walk-on.');
        }
      } catch (failure) {
        if (!signal.aborted) setStatus('');
        throw failure;
      }
    });
  }

  function applyAssignment(data, player) {
    if (data.counts && data.players) setBoard(current => putResult(current, data));
    if (data.player) {
      setSelected({
        date: data.date,
        player: {
          canSetExperience: player.canSetExperience, experienceOptions: player.experienceOptions, ...data.player,
          assignedBalanceScore: data.player.balanceScore, assignedExperienceBand: data.player.experienceBand,
        },
      });
    }
  }

  function assign(side) {
    if (!selected) return;
    const { player, date } = selected;
    const newGuest = player.membershipStatus === 'guest' && !player.side;
    const action = player.side ? 'reassign' : newGuest ? 'guestCheckIn' : 'checkIn';
    void run(async signal => {
      setStatus('Saving the check-in…');
      try {
        const data = await request(path, {
          method: 'POST', signal,
          body: {
            action, date, side,
            ...(newGuest ? { displayName: player.displayName } : { playerId: player.playerId, revision: player.revision }),
            ...(player.canSetExperience ? { experienceBand: player.experienceBand } : {}),
          },
        });
        if (signal.aborted) return;
        applyAssignment(data, player);
        setStatus(assignmentMessage(data));
        const input = newGuest ? guestInput.current : memberInput.current;
        if (input) {
          input.value = '';
          if (window.matchMedia?.('(pointer:fine)').matches) input.focus({ preventScroll: true });
        }
      } catch (failure) {
        if (!signal.aborted) {
          if (failure.data?.player) applyAssignment(failure.data, player);
          setStatus('');
        }
        throw failure;
      }
    });
  }

  function submitLookup(event) {
    event.preventDefault();
    try {
      lookup(lookupInput(memberInput.current.value));
    } catch (failure) {
      setStatus('');
      setError(failure.message);
    }
  }

  function updateAssessment(experienceBand) {
    setSelected(current => {
      const balanceScore = current?.player.experienceOptions?.[experienceBand];
      if (!Number.isFinite(balanceScore)) return current;
      return { ...current, player: { ...current.player, experienceBand, balanceScore } };
    });
  }

  const players = board?.players ?? [];
  const dateLabel = board?.date ? `${fieldDate.format(new Date(board.date + 'T00:00:00Z'))} · Pacific time` : 'Today at the field · Pacific time';
  const recommendation = selected?.date === board?.date ? recommendPlacement(board, selected?.player) : null;

  return (
    <div className="admin-checkin">
      <p className="admin-checkin__date">{dateLabel}</p>
      <TeamTalent board={board} />
      <div className="admin-checkin__columns">
        <section className="admin-checkin__card" aria-labelledby="admin-checkin-find">
          <h2 id="admin-checkin-find">Find a player</h2>
          <form className="admin-checkin__form" onSubmit={submitLookup}>
            <label htmlFor="admin-checkin-player">
              Player name, ID or card link
              <input id="admin-checkin-player" ref={memberInput} type="text" maxLength={500} autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} required readOnly={working} />
            </label>
            <button className="btn btn-primary" type="submit" disabled={working}>Find player</button>
          </form>
          <StaffCardScanner disabled={working} onScan={lookup} />
          <p className="admin-checkin__hint">Scan with the camera or a connected reader, or enter the player’s name or ID.</p>
          <details className="admin-checkin__walk-on">
            <summary>Add a walk-on</summary>
            <form className="admin-checkin__form" onSubmit={event => {
              event.preventDefault();
              lookup({ displayName: guestInput.current.value.trim() }, true);
            }}>
              <label htmlFor="admin-checkin-guest">
                Walk-on name or callsign
                <input id="admin-checkin-guest" ref={guestInput} type="text" minLength={2} maxLength={80} autoComplete="off" required readOnly={working}
                  onChange={() => { if (selected?.player.membershipStatus === 'guest' && !selected.player.side) setSelected(null); }} />
              </label>
              <button className="btn btn-outline-primary" type="submit" disabled={working}>Continue</button>
            </form>
          </details>
          {status && <p className="admin-checkin__status" role="status">{status}</p>}
          {error && <p className="alert alert-danger" role="alert">{error}</p>}
          {matches.length > 0 && <PlayerRows players={matches} onSelect={lookup} disabled={working} />}
          {selected && <SelectedPlayer player={selected.player} suggestion={recommendation} working={working} onAssessment={updateAssessment} onAssign={assign} />}
        </section>
        <section className="admin-checkin__card" aria-labelledby="admin-checkin-roster">
          <div className="admin-checkin__heading">
            <h2 id="admin-checkin-roster">Recent check-ins</h2>
            <button className="btn btn-outline-primary" type="button" disabled={working || refreshing} onClick={refreshRoster}>Refresh</button>
          </div>
          {rosterError && <p className="alert alert-danger" role="alert">{rosterError}</p>}
          {!board && !rosterError && <p role="status">Loading today’s roster…</p>}
          {board && players.length === 0 && <p>No players have checked in today.</p>}
          {players.length < (board?.counts?.total ?? 0) && <p>Showing the latest {players.length} of {board.counts.total} check-ins.</p>}
          {players.length > 0 && <PlayerRows players={players} onSelect={lookup} checkedIn disabled={working} />}
        </section>
      </div>
    </div>
  );
}
