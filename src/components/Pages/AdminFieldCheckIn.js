import React, { useCallback, useEffect, useRef, useState } from 'react';

import { isLegacyCardName, readScannedMemberCard, readScannedPlayerProfile } from '../constants/scoreCards';
import { StaffCardScanner } from './StaffCardScanner';
import { groupExperienceLabels } from '../constants/groupExperience';
import WaiverStatus from './WaiverStatus';
import StaffWaiverPicker from './StaffWaiverPicker';
import StaffGroupLookup from './StaffGroupLookup';
import FieldSectionLinks from './FieldSectionLinks';
import { walkOnRentalLink } from '../constants/groupRentalLink';
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
  const profileId = readScannedPlayerProfile(value);
  if (profileId && /^[A-Za-z0-9_-]{10,128}$/.test(profileId)) return { playerId: profileId };
  const barcodeId = /^\]C[01](.*)$/.exec(value)?.[1];
  if (barcodeId !== undefined) {
    if (isLegacyCardName(barcodeId)) return { barcodeValue: barcodeId };
    if (/^[A-Za-z0-9_-]{10,128}$/.test(barcodeId)) return { playerId: barcodeId };
    throw new Error('Scan the member card again or enter a player name or ID.');
  }
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

const checkInSections = [
  ['admin-checkin-find', 'Members'],
  ['admin-checkin-walk-on', 'Walk-ons'],
  ['admin-checkin-arrivals', 'Arriving groups'],
  ['admin-checkin-roster', 'Roster'],
  ['admin-checkin-talent', 'Team balance'],
];

function TeamTalent({ board }) {
  const totalStrength = board ? (board.balance?.camo?.strength ?? 0) + (board.balance?.solid?.strength ?? 0) : 0;
  const camoShare = totalStrength > 0 ? Math.round(board.balance.camo.strength / totalStrength * 100) : null;
  return (
    <section aria-labelledby="admin-checkin-talent">
      <div className="admin-checkin__heading">
        <h2 id="admin-checkin-talent" tabIndex={-1}>Team talent</h2>
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
              <small>{checkedIn ? `${memberships[player.membershipStatus] || memberships.unconfirmed} · ${classificationLabel(player)}` : player.membershipStatus === 'guest' ? 'Walk-on · ' + sides[player.side] : player.playerId}</small>
              <WaiverStatus status={player.waiverStatus ?? 'unavailable'} />
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

function savedRentalLink(player, date) {
  return player?.membershipStatus === 'guest' && sides[player.side] && player.waiverStatus === 'signed'
    ? walkOnRentalLink(player.playerId, date) : null;
}

function SelectedPlayer({ player, date, suggestion, working, rentalRequested, onRentalChange, onAssessment, onAssign, request, onWaiver, onRetry, onRename, onNext }) {
  const { side, membershipStatus, experienceBand, assignedExperienceBand, canSetExperience, gamesLogged } = player;
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, [player.playerId]);
  const oppositeSide = side === 'camo' ? 'solid' : 'camo';
  const choices = side ? [oppositeSide] : Object.keys(sides);
  const rentalLink = savedRentalLink(player, date);
  const membership = memberships[membershipStatus] || memberships.unconfirmed;
  const ratingChanged = experienceBand !== (assignedExperienceBand || 'unrated');
  return (
    <section className="admin-checkin__selection" aria-labelledby="admin-checkin-selection">
      <h3 id="admin-checkin-selection" tabIndex={-1} ref={heading}>{player.displayName}</h3>
      {membershipStatus === 'guest' && <details className="admin-checkin__edit-name" key={player.playerId + player.displayName}><summary>Edit walk-on name</summary>
        <form className="admin-checkin__form" onSubmit={event => { event.preventDefault(); onRename(event.currentTarget.elements.displayName.value.trim()); }}>
          <label>Walk-on name or callsign<input name="displayName" defaultValue={player.displayName} minLength={2} maxLength={80} required readOnly={working} /></label>
          <button type="submit" className="btn btn-secondary" disabled={working}>Save walk-on name</button>
        </form></details>}
      {membershipStatus !== 'guest' && <p className="admin-checkin__id">{player.playerId}</p>}
      <div className="admin-checkin__badges">
        <span className="admin-checkin__pill" data-membership={membershipStatus}>{membership}</span>
        <span className="admin-checkin__pill" data-side={side || undefined}>
          {side ? `Checked in · ${sides[side]}` : 'Awaiting check-in'}
        </span>
        <WaiverStatus status={player.waiverStatus ?? 'unavailable'} />
        <span className="admin-checkin__pill">{classificationLabel(player)}</span>
        {Number.isSafeInteger(gamesLogged) && <span className="admin-checkin__hint">
          {countFormat.format(gamesLogged)} {gamesLogged === 1 ? 'game' : 'games'} logged
        </span>}
      </div>
      {player.waiverStatus !== 'signed' && <div id="admin-checkin-selected-waiver">
        <button type="button" className="btn btn-outline-secondary" onClick={onRetry} disabled={working}>Retry waiver check</button>
        <StaffWaiverPicker request={request} name={membershipStatus === 'guest' ? player.displayName : player.legalName || ''} disabled={working} onChoose={onWaiver} />
      </div>}
      {canSetExperience && (
        <label className="admin-checkin__rating" htmlFor="admin-checkin-rating">
          Team balance estimate
          <select id="admin-checkin-rating" value={experienceBand || 'unrated'} disabled={working} onChange={event => onAssessment(event.target.value)}>
            {Object.entries(groupExperienceLabels).map(([band, label]) => <option value={band} key={band}>{label}</option>)}
          </select>
        </label>
      )}
      <p className="admin-checkin__suggestion" aria-live="polite">
        {suggestion ? `${suggestion.side === side ? 'Current side fits' : 'Suggested side'} · ${sides[suggestion.side]} · ${reasons[suggestion.reason]}` : 'Either side fits the current balance.'}
      </p>
      {membershipStatus !== 'active' && <p className="admin-checkin__hint">Confirm admission at the desk. Check-in records attendance and team assignment only.</p>}
      {membershipStatus === 'guest' && !side && <label className="admin-checkin__rental-option">
        <input type="checkbox" checked={rentalRequested} disabled={working} onChange={event => onRentalChange(event.target.checked)} />
        Open rental form after check-in
      </label>}
      <div className="admin-checkin__buttons">
        {choices.map(choice => (
          <button className={`btn btn-${side ? 'outline-primary' : 'primary'}`} type="button" key={choice} disabled={working || (!side && player.waiverStatus !== 'signed')} onClick={() => onAssign(choice)}>
            {side ? 'Move to ' : 'Check in as '}{sides[choice]}{!side && rentalRequested && membershipStatus === 'guest' ? ' & open rental' : ''}
          </button>
        ))}
        {rentalLink && !working && <a className="btn btn-outline-primary" href={rentalLink}>Open rental form</a>}
        {side && <button type="button" className="btn btn-primary" disabled={working} onClick={onNext}>Check in next player</button>}
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
  const [rentalRequested, setRentalRequested] = useState(false);
  const [matches, setMatches] = useState([]);
  const [walkOnWaiverQuery, setWalkOnWaiverQuery] = useState(null);
  const [working, setWorking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [groupWorking, setGroupWorking] = useState(false);
  const [checkInRevision, setCheckInRevision] = useState(0);
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

  function resetLookup() {
    setRentalRequested(false);
    setSelected(null);
    setMatches([]);
    setWalkOnWaiverQuery(null);
    setStatus('');
    setError('');
  }

  async function loadLookup(signal, input, guest, expectedGroupDate) {
    setWalkOnWaiverQuery(null);
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
        setStatus(data.player.side ? 'This player is already checked in.' : data.player.waiverStatus === 'signed' ? 'Choose a side to check in.' : 'Verify the player’s signed waiver below.');
      } else if (data.matches?.length) {
        setMatches(data.matches);
        setStatus(data.directoryUnavailable ? 'Showing today’s walk-ons. Account search is temporarily unavailable.' : 'Select the matching player.');
      } else {
        if (input.query) setWalkOnWaiverQuery(input.query);
        setStatus(input.query ? 'No matching player account. Choose a signed waiver below for a walk-on.' : 'No matching player. Check the name or use Find a waiver for a walk-on.');
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
  }

  function lookup(input, guest = false, expectedGroupDate, withRental = false) {
    if (clearConfirmation || operation.current) return;
    setRentalRequested(withRental);
    void run(signal => loadLookup(signal, input, guest, expectedGroupDate));
  }

  function verifySelected(waiverRef) {
    if (!selected || clearConfirmation) return;
    const { player, date, rosterVersion } = selected;
    if (player.side && waiverRef) {
      void run(async signal => {
        setStatus('Verifying the waiver for ' + player.displayName + '…');
        try {
          const result = await request(path, { method: 'POST', signal, body: {
            action: 'linkPlayerWaiver', playerId: player.playerId, date, rosterVersion, revision: player.revision, waiverRef,
          } });
          if (signal.aborted) return;
          applyAssignment(result, player);
          setCheckInRevision(value => value + 1);
          setStatus('Waiver linked to ' + player.displayName + '.');
        } catch (failure) {
          if (!signal.aborted) {
            setStatus('');
            if (failure.status === 409) await loadLookup(signal, { playerId: player.playerId }, false);
          }
          throw failure;
        }
      });
      return;
    }
    const proof = waiverRef || player.waiverRef;
    const isNewGuest = !player.side && player.membershipStatus === 'guest';
    lookup({
      ...(isNewGuest ? { displayName: player.displayName } : { playerId: player.playerId }),
      ...(!player.side && proof ? { waiverRef: proof } : {}),
    }, isNewGuest, undefined, isNewGuest && rentalRequested);
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

  function renameWalkOn(displayName) {
    if (!selected || selected.player.membershipStatus !== 'guest' || clearConfirmation) return;
    const { player, date, rosterVersion } = selected;
    if (!player.side) {
      setSelected({ ...selected, player: { ...player, displayName } });
      setStatus('Walk-on name updated for this check-in.');
      return;
    }
    void run(async signal => {
      try {
        const data = await request(path, { method: 'POST', signal, body: { action: 'renameWalkOn', playerId: player.playerId,
          displayName, date, rosterVersion, revision: player.revision } });
        if (signal.aborted) return;
        applyAssignment(data, player);
        setCheckInRevision(value => value + 1);
        setStatus('Walk-on name saved.');
      } catch (failure) {
        if (!signal.aborted && failure.status === 409) await loadLookup(signal, { playerId: player.playerId }, false);
        throw failure;
      }
    });
  }

  function nextPlayer() {
    resetLookup();
    memberInput.current.value = '';
    if (guestInput.current) guestInput.current.value = '';
    memberInput.current.focus();
  }

  function assign(side) {
    if (!selected || clearConfirmation) return;
    const { player, date, rosterVersion } = selected;
    if (!player.side && player.waiverStatus !== 'signed') return;
    const newGuest = player.membershipStatus === 'guest' && !player.side;
    const action = player.side ? 'reassign' : newGuest ? 'guestCheckIn' : 'checkIn';
    void run(async signal => {
      setStatus('Saving the check-in…');
      try {
        const data = await request(path, {
          method: 'POST', signal,
          body: {
            action, date, side,
            ...(!player.side && player.waiverRef ? { waiverRef: player.waiverRef } : {}),
            ...(rosterVersion ? { rosterVersion } : {}),
            ...(newGuest ? { displayName: player.displayName } : { playerId: player.playerId, revision: player.revision }),
            ...(player.canSetExperience ? { experienceBand: player.experienceBand } : {}),
          },
        });
        if (signal.aborted) return;
        applyAssignment(data, player);
        setCheckInRevision(value => value + 1);
        setStatus(assignmentMessage(data));
        if (newGuest && rentalRequested) {
          const destination = savedRentalLink(data.player, data.date);
          if (destination) {
            window.location.assign(destination);
            return;
          }
          setStatus(assignmentMessage(data) + ' Reopen the saved walk-on to verify their waiver and start the rental.');
        }
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

  function acceptGroupBoard(result) {
    ++generation.current;
    setBoard(current => putResult(current, result));
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
        setWalkOnWaiverQuery(null);
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
      resetLookup();
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
  const checkInLocked = working || groupWorking || Boolean(clearConfirmation);
  const canClear = Boolean(board?.rosterVersion && board.counts?.total > 0);
  const dateLabel = board?.date ? `${fieldDate.format(new Date(board.date + 'T00:00:00Z'))} · Pacific time` : 'Today at the field · Pacific time';
  const recommendation = selected?.date === board?.date ? recommendPlacement(board, selected?.player) : null;

  return (
    <div className="admin-checkin">
      <FieldSectionLinks label="Check-in sections" items={checkInSections} />
      <p className="admin-checkin__date">{dateLabel}</p>
      <div className="admin-checkin__columns">
        <section className="admin-checkin__card" aria-labelledby="admin-checkin-find">
          <h2 id="admin-checkin-find" tabIndex={-1}>Member search</h2>
          <form className="admin-checkin__form" role="search" aria-labelledby="admin-checkin-find" onSubmit={submitLookup}>
            <label htmlFor="admin-checkin-player">
              Member name, ID or card link
              <input id="admin-checkin-player" ref={memberInput} type="search" enterKeyHint="search" maxLength={500} autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} required readOnly={checkInLocked} onChange={resetLookup} />
            </label>
            <button className="btn btn-primary" type="submit" disabled={checkInLocked}>Search members</button>
            {!selected && <button type="button" className="btn btn-outline-primary" disabled={checkInLocked}
              aria-expanded={walkOnWaiverQuery !== null} aria-controls="admin-checkin-waiver-search"
              onClick={() => {
                const open = walkOnWaiverQuery === null;
                resetLookup();
                if (open) setWalkOnWaiverQuery(memberInput.current.value.trim());
              }}>Find a waiver</button>}
          </form>
          <StaffCardScanner verifyLegacyCards disabled={checkInLocked} onScan={lookup} />
          <p className="admin-checkin__hint">Point the camera at the QR code or barcode on the member’s USAW card. You can also type their name or scan into the search field.</p>
          {status && <p className="admin-checkin__status" role="status">{status}</p>}
          {error && <p className="alert alert-danger" role="alert">{error}</p>}
          {matches.length > 0 && <PlayerRows players={matches} onSelect={lookup} disabled={checkInLocked} />}
          {selected && <SelectedPlayer player={selected.player} date={selected.date} rentalRequested={rentalRequested} onRentalChange={setRentalRequested} suggestion={recommendation} working={checkInLocked} request={request}
            onWaiver={match => verifySelected(match.ref)} onRetry={() => verifySelected()} onAssessment={updateAssessment} onAssign={assign} onRename={renameWalkOn} onNext={nextPlayer} />}
          {walkOnWaiverQuery !== null && !selected && <section id="admin-checkin-waiver-search" aria-labelledby="admin-checkin-waiver-title">
            <h3 id="admin-checkin-waiver-title">Check in a walk-on by waiver</h3>
            <p>Choose the participant’s signed waiver to review their walk-on check-in.</p>
            <StaffWaiverPicker request={request} name={walkOnWaiverQuery} autoSearch focus disabled={checkInLocked}
              onChoose={match => lookup({ displayName: match.name, waiverRef: match.ref }, true)} />
          </section>}
          <details className="admin-checkin__walk-on">
            <summary id="admin-checkin-walk-on">Add a walk-on</summary>
            <form className="admin-checkin__form" onSubmit={event => {
              event.preventDefault();
              lookup({ displayName: guestInput.current.value.trim() }, true);
            }}>
              <label htmlFor="admin-checkin-guest">
                Player name or callsign
                <input id="admin-checkin-guest" ref={guestInput} type="text" minLength={2} maxLength={80} autoComplete="off" required readOnly={checkInLocked}
                  onChange={resetLookup} />
              </label>
              <button className="btn btn-outline-primary" type="submit" disabled={checkInLocked}>Continue</button>
              <button className="btn btn-outline-primary" type="button" disabled={checkInLocked}
                onClick={event => {
                  if (event.currentTarget.form.reportValidity()) lookup({ displayName: guestInput.current.value.trim() }, true, undefined, true);
                }}>Continue with rental</button>
            </form>
          </details>
          <StaffGroupLookup request={request} onSelect={lookup} disabled={working || Boolean(clearConfirmation)}
            rosterVersion={board?.rosterVersion} checkInRevision={checkInRevision} onWorking={setGroupWorking}
            onBoardRead={acceptGroupBoard} onAssigned={result => {
              acceptGroupBoard(result);
              setSelected(null); setMatches([]); setWalkOnWaiverQuery(null); setStatus(''); setError('');
            }} />

        </section>
        <section className="admin-checkin__card" aria-labelledby="admin-checkin-roster">
          <div className="admin-checkin__heading">
            <h2 id="admin-checkin-roster" tabIndex={-1}>Recent check-ins</h2>
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
      <TeamTalent board={board} />
    </div>
  );
}
