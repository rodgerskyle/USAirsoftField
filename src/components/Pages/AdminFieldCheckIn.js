import React, { useCallback, useEffect, useRef, useState } from 'react';

import { readScannedMemberCard } from '../constants/scoreCards';
import { StaffCardScanner } from './StaffCardScanner';
import StaffGroupLookup from './StaffGroupLookup';
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
const classifications = { a: 'A Tier', b: 'B Tier', c: 'C Tier', d: 'D Tier', unrated: 'Unrated' };
const assessments = {
  unrated: 'No estimate', limited: 'New to airsoft', regular: 'Some experience',
  veteran: 'Experienced', elite: 'Highly experienced',
};
const reasons = {
  headcount: 'closer headcounts',
  tierA: 'spreads A Tier players',
  topTiers: 'spreads A and B Tier players',
  strength: 'closer estimated strength',
};
const fieldDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
const countFormat = new Intl.NumberFormat('en-US');

function classificationLabel(player) {
  return classifications[player.classificationBand] || 'Classification unavailable';
}

function smallestGap(gap, contribution, reason) {
  if (!Number.isFinite(gap) || !Number.isFinite(contribution)) return null;
  const camo = Math.abs(gap + contribution);
  const solid = Math.abs(gap - contribution);
  return camo === solid ? null : { side: camo < solid ? 'camo' : 'solid', reason };
}

// Use the same order as the Companion check-in recommendation.
function recommendPlacement(board, player) {
  if (!board || !player) return null;
  const currentSide = player.side === 'camo' ? 1 : player.side === 'solid' ? -1 : 0;
  const headcount = board.counts?.camo - board.counts?.solid - currentSide;
  const camo = board.classifications?.camo;
  const solid = board.classifications?.solid;
  const tierA = camo?.a - solid?.a - (player.assignedClassificationBand === 'a' ? currentSide : 0);
  const tierB = camo?.b - solid?.b - (player.assignedClassificationBand === 'b' ? currentSide : 0);
  const strength = board.balance?.camo?.strength - board.balance?.solid?.strength
    - currentSide * (player.assignedBalanceScore ?? 100);
  const isTierA = player.classificationBand === 'a';
  const isTopTier = isTierA || player.classificationBand === 'b';

  return smallestGap(headcount, 1, 'headcount')
    || (isTierA && smallestGap(tierA, 1, 'tierA'))
    || (isTopTier && smallestGap(tierA + tierB, 1, 'topTiers'))
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
  const { date, counts, balance, classifications } = data;
  const sameDay = date === board?.date;
  const rosterVersion = data.rosterVersion ?? (sameDay ? board.rosterVersion : undefined);
  const previousPlayers = sameDay && rosterVersion === board.rosterVersion ? board.players : [];
  return { date, counts, balance, classifications, rosterVersion, players: data.players ?? previousPlayers };
}

function assignmentMessage({ outcome, player }) {
  const { displayName, side } = player;
  if (outcome === 'reassigned') return `${displayName} moved to ${sides[side]}.`;
  if (outcome === 'updated') return `Team balance estimate updated for ${displayName}.`;
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
          const tierCounts = board?.classifications?.[side];
          const unverified = tierCounts ? board.counts[side] - Object.values(tierCounts).reduce((total, count) => total + count, 0) : 0;
          return (
            <section className="admin-checkin__team" data-side={side} key={side}>
              <div className="admin-checkin__heading">
                <h3>{name}</h3>
                <span>{board?.counts?.[side] ?? '—'} players</span>
              </div>
              <span>Estimated strength share {share === null ? '—' : `${share}%`}</span>
              <progress aria-label={`${name} estimated strength share`} value={share ?? 0} max={100} />
              <dl>
                {Object.entries(classifications).map(([level, label]) => (
                  <div key={level} data-talent={level}>
                    <dt>{label}</dt><dd>{tierCounts?.[level] ?? '—'}</dd>
                  </div>
                ))}
              </dl>
              {unverified > 0 && <p className="admin-checkin__hint admin-checkin__unverified">
                {unverified} {unverified === 1 ? 'player' : 'players'} without a verified tier
              </p>}
            </section>
          );
        })}
      </div>
      <details className="admin-checkin__explanation">
        <summary>How team balance works</summary>
        <p>
          Logged wins and losses count toward a player’s classification. Unrated has 0 logged games.
          D Tier covers 1–99, C Tier 100–199, B Tier 200–299, and A Tier 300 or more.
        </p>
        <p>
          Suggestions prioritize even headcounts, then spread A Tier and B Tier players and compare
          estimated strength. Staff can enter a team balance estimate for Unrated players and choose the final side.
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
              <small>{checkedIn ? `${memberships[player.membershipStatus] || memberships.unconfirmed} · ${classificationLabel(player)}` : player.playerId}</small>
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
  const { side, membershipStatus, experienceBand, assignedExperienceBand, canSetExperience, gamesLogged } = player;
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
        <span className="admin-checkin__pill">{classificationLabel(player)}</span>
        {Number.isSafeInteger(gamesLogged) && <span className="admin-checkin__hint">
          {countFormat.format(gamesLogged)} {gamesLogged === 1 ? 'game' : 'games'} logged
        </span>}
      </div>
      {canSetExperience && (
        <label className="admin-checkin__rating" htmlFor="admin-checkin-rating">
          Team balance estimate
          <select id="admin-checkin-rating" value={experienceBand || 'unrated'} disabled={working} onChange={event => onAssessment(event.target.value)}>
            {Object.entries(assessments).map(([band, label]) => <option value={band} key={band}>{label}</option>)}
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
          <button type="button" className="btn btn-primary" disabled={working} onClick={() => onAssign(side)}>Save balance estimate</button>
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
  const [clearConfirmation, setClearConfirmation] = useState(null);
  const lifecycle = useRef(null);
  const operation = useRef(null);
  const refreshCall = useRef(null);
  const generation = useRef(0);
  const memberInput = useRef(null);
  const guestInput = useRef(null);
  const clearTrigger = useRef(null);
  const cancelClear = useRef(null);
  const restoreClearFocus = useRef(false);

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
    } else if (selected?.rosterVersion && board?.rosterVersion && selected.rosterVersion !== board.rosterVersion) {
      setSelected(null);
      setStatus('The roster was cleared. Look up the player again.');
    }
  }, [board, selected]);

  useEffect(() => {
    if (working) return;
    if (clearConfirmation) {
      cancelClear.current?.focus({ preventScroll: true });
    } else if (restoreClearFocus.current) {
      restoreClearFocus.current = false;
      (clearTrigger.current ?? memberInput.current)?.focus({ preventScroll: true });
    }
  }, [clearConfirmation, working]);

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

  function lookup(input, guest = false, expectedGroupDate) {
    if (clearConfirmation) return;
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
        if (expectedGroupDate && data.date !== expectedGroupDate) throw new Error('The field day changed. Find the group again before checking in.');
        if (data.counts && data.balance) setBoard(current => putResult(current, data));
        if (data.player) {
          setSelected({ date: data.date, rosterVersion: data.rosterVersion, player: data.player });
          setStatus(data.player.side ? 'This player is already checked in.' : 'Choose a side to check in.');
        } else if (data.matches?.length) {
          setMatches(data.matches);
          setStatus('Select the matching player.');
        } else {
          setStatus('No matching player. Try another spelling, enter a player ID, or add a walk-on.');
        }
      } catch (failure) {
        if (!signal.aborted) {
          if (failure.status === 409 && failure.data?.counts && failure.data?.players) {
            setBoard(current => putResult(current, failure.data));
          }
          setStatus('');
        }
        throw failure;
      }
    });
  }

  function applyAssignment(data, player) {
    if (data.counts && data.players) setBoard(current => putResult(current, data));
    if (data.player) {
      setSelected({
        date: data.date,
        rosterVersion: data.rosterVersion,
        player: {
          canSetExperience: player.canSetExperience, experienceOptions: player.experienceOptions, ...data.player,
          assignedBalanceScore: data.player.balanceScore, assignedExperienceBand: data.player.experienceBand,
          assignedClassificationBand: data.player.classificationBand ?? null,
        },
      });
    }
  }

  function assign(side) {
    if (!selected || clearConfirmation) return;
    const { player, date, rosterVersion } = selected;
    const newGuest = player.membershipStatus === 'guest' && !player.side;
    const action = player.side ? 'reassign' : newGuest ? 'guestCheckIn' : 'checkIn';
    void run(async signal => {
      setStatus('Saving the check-in…');
      try {
        const data = await request(path, {
          method: 'POST', signal,
          body: {
            action, date, side,
            ...(rosterVersion ? { rosterVersion } : {}),
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
          if (rosterVersion && failure.data?.rosterVersion && failure.data.rosterVersion !== rosterVersion) {
            if (failure.data.counts && failure.data.players) setBoard(current => putResult(current, failure.data));
            setSelected(null);
          } else if (failure.data?.player) {
            applyAssignment(failure.data, player);
          }
          setStatus('');
        }
        throw failure;
      }
    });
  }

  function openClearConfirmation() {
    setRosterError('');
    setClearConfirmation({ date: board.date, rosterVersion: board.rosterVersion });
  }

  function dismissClearConfirmation() {
    restoreClearFocus.current = true;
    setClearConfirmation(null);
  }

  function clearPlayers() {
    if (!clearConfirmation) return;
    void run(async signal => {
      setRosterError('');
      setStatus('');
      try {
        const data = await request(path, { method: 'POST', signal, body: { action: 'clearPlayers', ...clearConfirmation } });
        if (signal.aborted) return;
        setBoard(current => putResult(current, data));
        setSelected(null);
        setMatches([]);
        if (memberInput.current) memberInput.current.value = '';
        if (guestInput.current) guestInput.current.value = '';
        setClearConfirmation(null);
        setStatus(`Cleared ${countFormat.format(data.clearedCount)} ${data.clearedCount === 1 ? 'check-in' : 'check-ins'} for today.`);
        memberInput.current?.focus({ preventScroll: true });
      } catch (failure) {
        if (signal.aborted) return;
        if (failure.data?.counts && failure.data?.players) setBoard(current => putResult(current, failure.data));
        setRosterError(failure.message || 'The check-ins could not be cleared. Refresh the roster and try again.');
        dismissClearConfirmation();
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
  const checkInLocked = working || Boolean(clearConfirmation);
  const canClear = Boolean(board?.rosterVersion && board.counts?.total > 0);
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
              <input id="admin-checkin-player" ref={memberInput} type="text" maxLength={500} autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} required readOnly={checkInLocked} />
            </label>
            <button className="btn btn-primary" type="submit" disabled={checkInLocked}>Find player</button>
          </form>
          <StaffCardScanner disabled={checkInLocked} onScan={lookup} />
          <p className="admin-checkin__hint">Scan with the camera or a connected reader, or enter the player’s name or ID.</p>
          <details className="admin-checkin__walk-on">
            <summary>Add a walk-on</summary>
            <form className="admin-checkin__form" onSubmit={event => {
              event.preventDefault();
              lookup({ displayName: guestInput.current.value.trim() }, true);
            }}>
              <label htmlFor="admin-checkin-guest">
                Walk-on name or callsign
                <input id="admin-checkin-guest" ref={guestInput} type="text" minLength={2} maxLength={80} autoComplete="off" required readOnly={checkInLocked}
                  onChange={() => { if (selected?.player.membershipStatus === 'guest' && !selected.player.side) setSelected(null); }} />
              </label>
              <button className="btn btn-outline-primary" type="submit" disabled={checkInLocked}>Continue</button>
            </form>
          </details>
          <StaffGroupLookup request={request} onSelect={lookup} disabled={checkInLocked} />
          {status && <p className="admin-checkin__status" role="status">{status}</p>}
          {error && <p className="alert alert-danger" role="alert">{error}</p>}
          {matches.length > 0 && <PlayerRows players={matches} onSelect={lookup} disabled={checkInLocked} />}
          {selected && <SelectedPlayer player={selected.player} suggestion={recommendation} working={checkInLocked} onAssessment={updateAssessment} onAssign={assign} />}
        </section>
        <section className="admin-checkin__card" aria-labelledby="admin-checkin-roster">
          <div className="admin-checkin__heading">
            <h2 id="admin-checkin-roster">Recent check-ins</h2>
            <div className="admin-checkin__buttons">
              <button className="btn btn-outline-primary" type="button" disabled={working || refreshing} onClick={refreshRoster}>Refresh</button>
              {canClear && (
                <button className="btn btn-outline-danger admin-checkin__clear-button" type="button" ref={clearTrigger}
                  disabled={checkInLocked} onClick={openClearConfirmation}>
                  Clear players
                </button>
              )}
            </div>
          </div>
          {clearConfirmation && (
            <section className="admin-checkin__clear-confirmation" aria-labelledby="admin-checkin-clear-title" aria-describedby="admin-checkin-clear-description">
              <h3 id="admin-checkin-clear-title">Clear today’s check-ins?</h3>
              <p id="admin-checkin-clear-description">Clear every Camo and Solid check-in for today and start over with an empty roster.</p>
              <div className="admin-checkin__buttons">
                <button className="btn btn-outline-secondary" type="button" ref={cancelClear}
                  disabled={working} onClick={dismissClearConfirmation}>
                  Cancel
                </button>
                <button className="btn btn-danger" type="button" disabled={working} onClick={clearPlayers}>
                  {working ? 'Clearing…' : 'Clear check-ins'}
                </button>
              </div>
            </section>
          )}
          {rosterError && <p className="alert alert-danger" role="alert">{rosterError}</p>}
          {!board && !rosterError && <p role="status">Loading today’s roster…</p>}
          {board?.counts?.total === 0 && <p>No players have checked in today.</p>}
          {players.length < (board?.counts?.total ?? 0) && <p>Showing the latest {players.length} of {board.counts.total} check-ins.</p>}
          {players.length > 0 && <PlayerRows players={players} onSelect={lookup} checkedIn disabled={checkInLocked} />}
        </section>
      </div>
    </div>
  );
}
