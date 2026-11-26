import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BADGE_CATALOG, RETIRED_BADGES, badgeServiceConfigured, getStaffBadgeCounts, getStaffBadgeGrantHistory,
  grantPlayerBadge, revokePlayerBadgeGrant, unlockBadgeAdminAccount, unlockBadgeStaff,
} from '../constants/playerBadges';
import { gameModeIds } from './Gametypes';
import StaffBattleBadges from './StaffBattleBadges';
import StaffKnifeKills from './StaffKnifeKills';
import AdminAccountUnlock from './AdminAccountUnlock';
import './AdminBadgeAwards.css';

const MAX_RESULTS = 8;
const PLAYER_ID = /^[A-Za-z0-9_-]{10,128}$/;
const badgeNames = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const awardablePatches = BADGE_CATALOG.filter(badge => !badge.knifeKills);
const awardGroups = [
  { label: 'Game modes', patches: awardablePatches.filter(badge => gameModeIds.has(badge.id))
    .sort((a, b) => badgeNames.compare(a.name, b.name)) },
  { label: 'Other patches', patches: awardablePatches.filter(badge => !gameModeIds.has(badge.id)) },
];
const expiresFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  timeZone: 'America/Los_Angeles', timeZoneName: 'short',
});
const grantDateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  second: '2-digit', timeZone: 'America/Los_Angeles', timeZoneName: 'short',
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
const grantDate = awardedAt => Number.isFinite(Date.parse(awardedAt))
  ? grantDateFormat.format(new Date(awardedAt)) : 'Award date unavailable';

export default function AdminBadgeAwards({ firebase, players, loading, directoryUnavailable }) {
  const [search, setSearch] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [busy, setBusy] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [staffSession, setStaffSession] = useState(null);
  const [countLookup, setCountLookup] = useState(null);
  const [countRequest, setCountRequest] = useState(0);
  const [grantHistory, setGrantHistory] = useState(null);
  const searchInput = useRef(null);
  const badgeSelect = useRef(null);
  const pendingGrants = useRef(new Map());
  const historyRequest = useRef(null);

  const eligiblePlayers = useMemo(() => players.filter(player =>
    PLAYER_ID.test(player.uid) && (named(player.name) || named(player.username))
  ), [players]);

  const selectedPlayer = eligiblePlayers.find(player => player.uid === playerId);
  const selectedPlayerId = selectedPlayer?.uid;
  const staffToken = staffSession?.staffToken;
  const playerCounts = countLookup?.playerId === selectedPlayerId ? countLookup : null;
  const counts = playerCounts?.counts;
  const retiredAwards = RETIRED_BADGES.filter(badge => counts?.[badge.id] > 0);
  const retiredBadge = retiredAwards.find(badge => badge.id === badgeId);
  const selectedBadge = retiredBadge || awardablePatches.find(badge => badge.id === badgeId);
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
  const canGrant = !!staffToken && !!selectedPlayer && !!selectedBadge && !retiredBadge && !!counts &&
    !busy && !grantHistory?.loading;

  useEffect(() => () => historyRequest.current?.abort(), []);

  useEffect(() => {
    if (!staffSession) return undefined;
    searchInput.current?.focus();
    const timer = setTimeout(() => {
      setStaffSession(null);
      setCountLookup(null);
      historyRequest.current?.abort();
      setGrantHistory(null);
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

  function closeHistory() {
    historyRequest.current?.abort();
    setGrantHistory(null);
  }

  async function loadGrantHistory(before) {
    if (!staffToken || !selectedPlayerId || !selectedBadge || !earnedCount || busy || grantHistory?.loading) return;
    historyRequest.current?.abort();
    const controller = new AbortController();
    historyRequest.current = controller;
    const grants = before ? grantHistory.grants : [];
    setGrantHistory({ grants, loading: true });
    try {
      const result = await getStaffBadgeGrantHistory(firebase, {
        playerId: selectedPlayerId, badgeId, before,
      }, staffToken, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!Array.isArray(result.grants)
        || !result.grants.every(grant => typeof grant?.id === 'string' && grant.id)) {
        throw new Error('The award history could not be loaded.');
      }
      const nextCursor = typeof result.nextCursor === 'string' ? result.nextCursor : null;
      setGrantHistory({ grants: [...grants, ...result.grants], nextCursor });
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error?.status === 401) {
        lock();
        setFeedback({ error: true, text: error.message });
        return;
      }
      setGrantHistory({ grants, nextCursor: before, error: error?.message || 'The award history could not be loaded.' });
    }
  }

  async function removeGrant(grant) {
    if (!staffToken || !selectedPlayerId || !selectedBadge || busy || grantHistory?.loading) return;
    const name = selectedBadge.name;
    const playerName = displayName(selectedPlayer);
    if (!window.confirm(`Remove one ${name} award recorded for ${playerName} on ${grantDate(grant.awardedAt)}?`)) return;
    setBusy('remove');
    setFeedback(null);
    try {
      const result = await revokePlayerBadgeGrant(firebase, {
        playerId: selectedPlayerId, badgeId, grantId: grant.id,
      }, staffToken);
      const count = result.award === null ? 0 : result.award?.earnedCount;
      if (result.revoked !== true || !Number.isSafeInteger(count) || count < 0) {
        throw new Error('Removal could not be confirmed. Choose the same award to retry.');
      }
      updateCount(selectedPlayerId, badgeId, count);
      if (retiredBadge && !count) setBadgeId('');
      setGrantHistory(history => count && history
        ? { ...history, grants: history.grants.filter(item => item.id !== grant.id) }
        : null);
      setFeedback({ text: `One ${name} award removed from ${playerName}. ${count} remaining.` });
    } catch (error) {
      if (error?.status === 401) lock();
      const uncertain = !error?.status || error.status === 408 || error.status >= 500;
      setFeedback({
        error: true,
        text: uncertain ? 'Removal could not be confirmed. Choose the same award to retry.' : error.message,
      });
    } finally {
      setBusy(null);
    }
  }

  function selectBadge(id) {
    setBadgeId(id);
    setFeedback(null);
    closeHistory();
  }

  function choosePlayer(player) {
    if (retiredBadge) setBadgeId('');
    setPlayerId(player?.uid || '');
    setCountLookup(null);
    setFeedback(null);
    closeHistory();
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

  function acceptUnlock(result) {
    const expiresAt = Date.parse(result.expiresAt);
    if (!result.staffToken || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      throw new Error('Badge access could not be unlocked. Try again.');
    }
    setCountLookup(null);
    setFeedback(null);
    setStaffSession({ staffToken: result.staffToken, expiresAt });
  }

  async function unlock(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const credentials = new FormData(form);
    const email = String(credentials.get('staffEmail') || '').trim();
    const password = String(credentials.get('staffPassword') || '');
    form.reset();
    setBusy('unlock');
    setFeedback(null);
    try {
      const result = await unlockBadgeStaff(firebase, { email, password });
      acceptUnlock(result);
    } catch (error) {
      setFeedback({ error: true, text: error?.message || 'Badge access could not be unlocked. Try again.' });
    } finally {
      setBusy(null);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (!canGrant) return;
    const target = `${selectedPlayerId}:${badgeId}`;
    const grantId = pendingGrants.current.get(target) || crypto.randomUUID();
    pendingGrants.current.set(target, grantId);
    setBusy('grant');
    setFeedback(null);
    try {
      const { award } = await grantPlayerBadge(firebase, {
        playerId: selectedPlayerId, badgeId, grantId,
      }, staffToken);
      const count = award?.earnedCount;
      if (!Number.isSafeInteger(count) || count < 1) throw new Error('The award could not be confirmed.');
      pendingGrants.current.delete(target);
      closeHistory();
      updateCount(selectedPlayerId, badgeId, count);
      setFeedback({ text: `${selectedBadge.name} awarded to ${displayName(selectedPlayer)}. Earned ${count} ${count === 1 ? 'time' : 'times'}.` });
    } catch (error) {
      if (error?.status === 401) setStaffSession(null);
      if (error?.code === 'GRANT_REVOKED') {
        pendingGrants.current.delete(target);
        closeHistory();
        retryCounts();
      }
      const uncertain = !error?.status || error.status === 408 || error.status >= 500;
      setFeedback({
        error: true,
        retry: uncertain,
        text: uncertain
          ? 'The award could not be confirmed. Retry to check the same grant.'
          : error.message || 'The award could not be saved. Try again.',
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="admin-section-block admin-badge-awards" aria-labelledby="admin-badges-title">
      <header className="admin-section-heading">
        <h2 className="admin-section-title" id="admin-badges-title">Virtual badges</h2>
      </header>
      {!badgeServiceConfigured ? (
        <div className="admin-badge-awards__card admin-badge-awards__offline">
          <p>Badge management is available in Field Companion staff controls.</p>
          <a href="https://usaw-field-companion.pink-bud-3735.chatgpt.site/#staff"
            target="_blank" rel="noopener noreferrer">Open Companion staff controls</a>
        </div>
      ) : staffSession ? (
        <form key="grant" className="admin-badge-awards__card" onSubmit={submit} aria-busy={!!busy}>
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
                  setFeedback(null);
                  closeHistory();
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
              <select ref={badgeSelect} id="admin-badges-patch" value={retiredBadge ? '' : badgeId}
                required={!retiredBadge} onChange={event => selectBadge(event.target.value)}>
                <option value="">Choose a badge</option>
                {awardGroups.map(({ label, patches }) => (
                  <optgroup key={label} label={label}>
                    {patches.map(badge => (
                      <option key={badge.id} value={badge.id}>
                        {badge.name}{counts?.[badge.id] > 0 ? ` · ${counts[badge.id]} earned` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {retiredAwards.length > 0 && (
                <>
                  <label htmlFor="admin-badges-retired">Previously awarded retired badge</label>
                  <select id="admin-badges-retired" value={retiredBadge?.id || ''}
                    onChange={event => selectBadge(event.target.value)}>
                    <option value="">Choose an award to review</option>
                    {retiredAwards.map(badge => (
                      <option key={badge.id} value={badge.id}>
                        {badge.name} · {counts[badge.id]} earned
                      </option>
                    ))}
                  </select>
                </>
              )}
              {selectedBadge && (
                <div className="admin-badge-awards__preview">
                  {selectedBadge.artUrl && <img src={selectedBadge.artUrl} alt="" width="64" height="64" />}
                  <div>
                    <strong>{selectedBadge.name}</strong>
                    {selectedBadge.description && <p>{selectedBadge.description}</p>}
                    {counts && <p><strong>Earned {earnedCount} {earnedCount === 1 ? 'time' : 'times'}</strong></p>}
                  </div>
                </div>
              )}
              {isRepeat && !retiredBadge && (
                <p>Granting again adds one to this player’s count.</p>
              )}
              <div className="admin-badge-awards__actions">
                {!retiredBadge && (
                  <button type="submit" disabled={!canGrant}>
                    {busy === 'grant' ? 'Granting badge…' : feedback?.retry ? 'Retry grant' : isRepeat ? 'Grant again' : 'Grant badge'}
                  </button>
                )}
                {isRepeat && (
                  <button className="admin-badge-awards__history-toggle" type="button"
                    aria-expanded={!!grantHistory} aria-controls="admin-badges-grant-history"
                    onClick={() => grantHistory ? closeHistory() : loadGrantHistory()}>
                    {grantHistory ? 'Hide award history' : 'Review awards to remove'}
                  </button>
                )}
              </div>
              {grantHistory && (
                <section id="admin-badges-grant-history" className="admin-badge-awards__history"
                  aria-labelledby="admin-badges-grant-history-title" aria-busy={grantHistory.loading || busy === 'remove'}>
                  <h3 id="admin-badges-grant-history-title">Award history</h3>
                  {grantHistory.grants.length > 0 && (
                    <ul>
                      {grantHistory.grants.map(grant => (
                        <li key={grant.id}>
                          <span>{grantDate(grant.awardedAt)}</span>
                          <button type="button" className="admin-badge-awards__remove"
                            disabled={grantHistory.loading} onClick={() => removeGrant(grant)}>Remove award</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {grantHistory.loading ? <p role="status">Loading awards…</p> : grantHistory.error ? (
                    <>
                      <p role="alert">{grantHistory.error}</p>
                      <button type="button" className="admin-badge-awards__change"
                        onClick={() => loadGrantHistory(grantHistory.nextCursor)}>Retry award history</button>
                    </>
                  ) : grantHistory.grants.length === 0 && !grantHistory.nextCursor ? (
                    <p role="status">No awards available to remove.</p>
                  ) : null}
                  {grantHistory.nextCursor && !grantHistory.loading && !grantHistory.error && (
                    <button type="button" className="admin-badge-awards__change"
                      onClick={() => loadGrantHistory(grantHistory.nextCursor)}>Load older awards</button>
                  )}
                </section>
              )}
            </div>
          </fieldset>
          {feedback && <p className="admin-badge-awards__feedback" role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
        </form>
      ) : (
        <form key="unlock" className="admin-badge-awards__card admin-badge-awards__unlock" onSubmit={unlock}
          autoComplete="off" aria-busy={!!busy}>
          <AdminAccountUnlock firebase={firebase} disabled={!!busy} setWorking={value => setBusy(value ? 'account' : null)}
            unlock={() => unlockBadgeAdminAccount(firebase)} onUnlocked={acceptUnlock} />
          <p>Or enter your staff email and password.</p>
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
          {feedback && <p className="admin-badge-awards__feedback" role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
        </form>
      )}
      {badgeServiceConfigured && <StaffKnifeKills id="admin-knife-kills" playerSearchId="admin-badges-player" firebase={firebase} token={staffToken} player={selectedPlayer} onLock={lock}
        onRequestUnlock={() => document.getElementById('admin-badges-email')?.focus()} />}
      {badgeServiceConfigured && <StaffBattleBadges allowOverride firebase={firebase} token={staffToken}
        player={selectedPlayer} onLock={lock} />}
    </section>
  );
}
