import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BADGE_CATALOG, badgeServiceConfigured, getStaffBadgeCounts, grantPlayerBadge, unlockBadgeStaff,
} from '../constants/playerBadges';
import './AdminBadgeAwards.css';

const MAX_RESULTS = 8;
const PLAYER_ID = /^[A-Za-z0-9_-]{10,128}$/;
const expiresFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  timeZone: 'America/Los_Angeles', timeZoneName: 'short',
});

function profileIdFromSearch(search) {
  try {
    const url = new URL(search, 'https://www.usairsoftfield.com');
    const match = /^\/profilelookup\/([^/]+)\/?$/.exec(url.pathname);
    if (!match || !['www.usairsoftfield.com', 'usairsoftfield.com'].includes(url.hostname)) return null;
    const id = decodeURIComponent(match[1]);
    return PLAYER_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

const named = value => typeof value === 'string' && value.trim();
const displayName = player => named(player.name) || named(player.username) || player.uid;
const normalizeReason = reason => reason.trim().replace(/\s+/g, ' ');

export default function AdminBadgeAwards({ firebase, players, loading, directoryUnavailable }) {
  const [search, setSearch] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [staffSession, setStaffSession] = useState(null);
  const [countLookup, setCountLookup] = useState(null);
  const [countRequest, setCountRequest] = useState(0);
  const searchInput = useRef(null);
  const badgeSelect = useRef(null);
  const pendingGrants = useRef(new Map());

  const eligiblePlayers = useMemo(() => players.filter(player =>
    PLAYER_ID.test(player.uid) && (named(player.name) || named(player.username))
  ), [players]);

  const selectedPlayer = eligiblePlayers.find(player => player.uid === playerId);
  const selectedPlayerId = selectedPlayer?.uid;
  const selectedBadge = BADGE_CATALOG.find(badge => badge.id === badgeId);
  const staffToken = staffSession?.staffToken;
  const playerCounts = countLookup?.playerId === selectedPlayerId ? countLookup : null;
  const counts = playerCounts?.counts;
  const earnedCount = counts?.[badgeId] || 0;
  const isRepeat = earnedCount > 0;
  const query = search.trim();
  const normalizedQuery = query.toLowerCase();
  const exactId = profileIdFromSearch(query) || query;
  const matches = query.length < 2 || selectedPlayer ? [] : eligiblePlayers.filter(player =>
    player.uid === exactId || [player.name, player.username].some(value =>
      typeof value === 'string' && value.toLowerCase().includes(normalizedQuery)
    )
  );
  const cleanReason = normalizeReason(reason);
  const canGrant = !!staffToken && !!selectedPlayer && !!selectedBadge && !!counts &&
    (isRepeat || (cleanReason.length >= 3 && cleanReason.length <= 160)) && !busy;

  useEffect(() => {
    if (!staffSession) return undefined;
    searchInput.current?.focus();
    const timer = setTimeout(() => {
      setStaffSession(null);
      setCountLookup(null);
      setReason('');
      setFeedback({ text: 'Badge access expired. Unlock the controls to continue.' });
    }, Math.max(0, staffSession.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [staffSession]);

  useEffect(() => {
    if (!selectedPlayerId || !staffToken) return undefined;
    const controller = new AbortController();
    getStaffBadgeCounts(firebase, selectedPlayerId, staffToken, { signal: controller.signal })
      .then(({ counts: result }) => {
        if (!result || typeof result !== 'object' || Array.isArray(result)) {
          throw new Error('The player’s badge counts could not be loaded.');
        }
        if (!controller.signal.aborted) setCountLookup({ playerId: selectedPlayerId, counts: result });
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        const message = error?.message || 'The player’s badge counts could not be loaded.';
        if (error?.status === 401) {
          setStaffSession(null);
          setFeedback({ error: true, text: message });
          return;
        }
        setCountLookup({ playerId: selectedPlayerId, error: message });
      });
    return () => controller.abort();
  }, [firebase, selectedPlayerId, staffToken, countRequest]);

  function retryCounts() {
    setCountLookup(null);
    setCountRequest(request => request + 1);
  }

  function updateCount(player, badge, count) {
    setCountLookup(lookup => {
      if (lookup?.playerId !== player || !lookup.counts) return lookup;
      return { ...lookup, counts: { ...lookup.counts, [badge]: count } };
    });
  }

  function choosePlayer(player) {
    setPlayerId(player?.uid || '');
    setCountLookup(null);
    setReason('');
    setFeedback(null);
    setSearch(player ? displayName(player) : '');
    if (player) badgeSelect.current?.focus();
    else searchInput.current?.focus();
  }

  function lock() {
    setStaffSession(null);
    setBadgeId('');
    choosePlayer(null);
    setFeedback({ text: 'Badge controls locked.' });
  }

  async function unlock(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const credentials = new FormData(form);
    const email = String(credentials.get('staffEmail') || '').trim();
    const password = String(credentials.get('staffPassword') || '');
    form.reset();
    setBusy(true);
    setFeedback(null);
    try {
      const result = await unlockBadgeStaff(firebase, { email, password });
      const expiresAt = Date.parse(result.expiresAt);
      if (!result.staffToken || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        throw new Error('Badge access could not be unlocked. Try again.');
      }
      setCountLookup(null);
      setStaffSession({ staffToken: result.staffToken, expiresAt });
    } catch (error) {
      setFeedback({ error: true, text: error?.message || 'Badge access could not be unlocked. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (!canGrant) return;
    const target = `${selectedPlayerId}:${badgeId}`;
    const grantId = pendingGrants.current.get(target) || crypto.randomUUID();
    pendingGrants.current.set(target, grantId);
    setBusy(true);
    setFeedback(null);
    try {
      const { award } = await grantPlayerBadge(firebase, {
        playerId: selectedPlayerId, badgeId, reason: isRepeat ? '' : cleanReason, grantId,
      }, staffToken);
      const count = award?.earnedCount;
      if (!Number.isSafeInteger(count) || count < 1) throw new Error('The award could not be confirmed.');
      pendingGrants.current.delete(target);
      updateCount(selectedPlayerId, badgeId, count);
      setFeedback({ text: `${selectedBadge.name} awarded to ${displayName(selectedPlayer)}. Earned ${count} ${count === 1 ? 'time' : 'times'}.` });
      setReason('');
    } catch (error) {
      if (error?.status === 401) setStaffSession(null);
      if (error?.code === 'FIRST_AWARD_REASON_REQUIRED') updateCount(selectedPlayerId, badgeId, 0);
      const uncertain = !error?.status || error.status === 408 || error.status >= 500;
      setFeedback({
        error: true,
        retry: uncertain,
        text: uncertain
          ? 'The award could not be confirmed. Retry to check the same grant.'
          : error.message || 'The award could not be saved. Try again.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-section-block admin-badge-awards" aria-labelledby="admin-badges-title">
      <header className="admin-section-heading">
        <h2 className="admin-section-title" id="admin-badges-title">Virtual badges</h2>
      </header>
      {!badgeServiceConfigured ? (
        <div className="admin-badge-awards__card admin-badge-awards__offline">
          <p>Badge granting is available in Field Companion staff controls.</p>
          <a href="https://usaw-field-companion.pink-bud-3735.chatgpt.site/#staff"
            target="_blank" rel="noopener noreferrer">Open Companion staff controls</a>
        </div>
      ) : staffSession ? (
        <form key="grant" className="admin-badge-awards__card" onSubmit={submit} aria-busy={busy}>
          <div className="admin-badge-awards__session">
            <p>Unlocked until {expiresFormat.format(staffSession.expiresAt)}</p>
            <button type="button" className="admin-badge-awards__change"
              disabled={busy} onClick={lock}>Lock badge controls</button>
          </div>
          <fieldset className="admin-badge-awards__fields" disabled={busy}>
            <div className="admin-badge-awards__player">
              <label htmlFor="admin-badges-player">Find a player</label>
              <input ref={searchInput} id="admin-badges-player" type="search" value={search}
                autoComplete="off" placeholder="Name, callsign, player ID, or profile link"
                onChange={event => {
                  setSearch(event.target.value);
                  setPlayerId('');
                  setCountLookup(null);
                  setReason('');
                  setFeedback(null);
                }} />
              {selectedPlayer ? (
                <div className="admin-badge-awards__selection">
                  <div>
                    <strong>{displayName(selectedPlayer)}</strong>
                    <Link to={`/profilelookup/${encodeURIComponent(selectedPlayer.uid)}`} target="_blank"
                      rel="noopener noreferrer">View profile</Link>
                  </div>
                  <button type="button" className="admin-badge-awards__change"
                    onClick={() => choosePlayer(null)}>Change</button>
                </div>
              ) : matches.length > 0 ? (
                <>
                  <ul className="admin-badge-awards__matches" aria-label="Matching players">
                    {matches.slice(0, MAX_RESULTS).map(player => (
                      <li key={player.uid}>
                        <button type="button" onClick={() => choosePlayer(player)}>
                          <strong>{displayName(player)}</strong>
                          <small>
                            {named(player.username) && player.username !== player.name ? `${player.username} · ` : ''}
                            {player.uid}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {matches.length > MAX_RESULTS && <p role="status">Narrow the search to see more matches.</p>}
                </>
              ) : loading ? <p role="status">Loading player directory…</p>
                : directoryUnavailable ? <p role="alert">The player directory is unavailable. Reload to try again.</p>
                : query.length >= 2 ? <p role="status">No matching players.</p> : null}
              {selectedPlayer && !counts && (playerCounts?.error ? (
                <div className="admin-badge-awards__counts-error">
                  <p role="alert">{playerCounts.error}</p>
                  <button type="button" className="admin-badge-awards__change" onClick={retryCounts}>
                    Retry badge counts
                  </button>
                </div>
              ) : <p role="status">Loading badge counts…</p>)}
            </div>

            <div className="admin-badge-awards__patch">
              <label htmlFor="admin-badges-patch">Badge</label>
              <select ref={badgeSelect} id="admin-badges-patch" value={badgeId} required onChange={event => {
                setBadgeId(event.target.value);
                setReason('');
                setFeedback(null);
              }}>
                <option value="">Choose a badge</option>
                {BADGE_CATALOG.map(badge => (
                  <option key={badge.id} value={badge.id}>
                    {badge.name}{counts?.[badge.id] > 0 ? ` · ${counts[badge.id]} earned` : ''}
                  </option>
                ))}
              </select>
              {selectedBadge && (
                <div className="admin-badge-awards__preview">
                  {selectedBadge.artUrl && <img src={selectedBadge.artUrl} alt="" width="64" height="64" />}
                  <div>
                    <strong>{selectedBadge.name}</strong>
                    <p>{selectedBadge.description}</p>
                    {counts && <p><strong>Earned {earnedCount} {earnedCount === 1 ? 'time' : 'times'}</strong></p>}
                  </div>
                </div>
              )}
              {counts && selectedBadge && (isRepeat ? (
                <p>Granting again adds one to this player’s count.</p>
              ) : (
                <>
                  <label htmlFor="admin-badges-reason">Reason for first award</label>
                  <textarea id="admin-badges-reason" value={reason} required minLength={3} maxLength={160}
                    aria-describedby="admin-badges-reason-length"
                    rows={3} onChange={event => setReason(event.target.value)} />
                  <small id="admin-badges-reason-length">3–160 characters. Visible to the player and staff.</small>
                </>
              ))}
              <div className="admin-badge-awards__actions">
                <button type="submit" disabled={!canGrant}>
                  {busy ? 'Granting badge…' : feedback?.retry ? 'Retry grant' : isRepeat ? 'Grant again' : 'Grant badge'}
                </button>
              </div>
            </div>
          </fieldset>
          {feedback && <p role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
        </form>
      ) : (
        <form key="unlock" className="admin-badge-awards__card admin-badge-awards__unlock" onSubmit={unlock}
          autoComplete="off" aria-busy={busy}>
          <p>Unlock badge granting with your USAW staff credentials.</p>
          <fieldset className="admin-badge-awards__fields" disabled={busy}>
            <div>
              <label htmlFor="admin-badges-email">Staff email</label>
              <input id="admin-badges-email" name="staffEmail" type="email" autoComplete="off"
                maxLength={254} required />
            </div>
            <div>
              <label htmlFor="admin-badges-password">Staff password</label>
              <input id="admin-badges-password" name="staffPassword" type="password"
                autoComplete="off" maxLength={1024} required />
            </div>
          </fieldset>
          <div className="admin-badge-awards__actions">
            <button type="submit" disabled={busy}>{busy ? 'Unlocking…' : 'Unlock badge controls'}</button>
          </div>
          {feedback && <p role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
        </form>
      )}
    </section>
  );
}
