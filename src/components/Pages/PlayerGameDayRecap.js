import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { badgeById } from '../constants/playerBadges';
import {
  formatFieldClose, formatFieldDate, gameDayRecapNotifications, getGameDayRecap, recapNotificationSetupUrl, todayAtField,
} from '../constants/gameDayRecap';
import { PrestigeRequirements } from './PlayerPrestige';
import GameDayFeedback from './GameDayFeedback';
import './GameDayRecap.css';

const numbers = new Intl.NumberFormat('en-US');

function RecapDetails({ recap }) {
  const progress = recap.prestige?.progress;
  const patches = recap.patches.filter(patch => typeof patch?.id === 'string'
    && typeof patch.name === 'string' && Number.isSafeInteger(patch.count) && patch.count > 0);

  return (
    <div className="game-recap-details">
      <div className="game-recap-date">
        <time dateTime={recap.date}>{formatFieldDate(recap.date)}</time>
        {recap.checkedIn && <span>Checked in</span>}
      </div>
      <dl className="game-recap-score">
        <div><dt>Points earned</dt><dd>{numbers.format(recap.pointsEarned)}</dd></div>
        <div className="game-recap-wins"><dt>Wins</dt><dd>{numbers.format(recap.wins)}</dd></div>
        <div className="game-recap-losses"><dt>Losses</dt><dd>{numbers.format(recap.losses)}</dd></div>
      </dl>
      <div className="game-recap-highlights">
        <section className="game-recap-patches" aria-labelledby="game-recap-patches-heading">
          <h3 id="game-recap-patches-heading">Patches earned</h3>
          {patches.length ? (
            <ul>
              {patches.map(patch => (
                <li key={patch.id}>
                  {badgeById[patch.id] && <img src={badgeById[patch.id].thumbUrl} width="42" height="42" alt="" loading="lazy" />}
                  <span>{patch.name}</span>
                  <strong aria-label={`${numbers.format(patch.count)} earned`}>×{numbers.format(patch.count)}</strong>
                </li>
              ))}
            </ul>
          ) : <p>No patches were recorded for this game day.</p>}
        </section>
        {progress?.points && Array.isArray(progress.patches) && (
          <PrestigeRequirements progress={progress} title={`Current progress toward Prestige ${numbers.format(progress.nextPrestige)}`} />
        )}
      </div>
    </div>
  );
}

function NextGameDay({ gameDay }) {
  const date = formatFieldDate(gameDay?.date);
  if (!date) return null;
  return (
    <div className="game-recap-next">
      <div>
        <h3>Next game day</h3>
        <p>
          {typeof gameDay.name === 'string' && <strong>{gameDay.name} · </strong>}
          <time dateTime={gameDay.date}>{date}</time>
          {typeof gameDay.time === 'string' && gameDay.time && ` · ${gameDay.time}`}
        </p>
      </div>
      <Link className="game-recap-link" to="/schedule">Field schedule</Link>
    </div>
  );
}

export function PlayerGameDayRecap({ firebase, playerId }) {
  const [date, setDate] = useState('');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const request = useRef(null);

  useEffect(() => () => request.current?.abort(), []);

  async function loadRecap(requestedDate) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setDate(requestedDate);
    setBusy(true);
    setError(false);
    try {
      const result = await getGameDayRecap(firebase, playerId, { date: requestedDate, signal: controller.signal });
      if (!controller.signal.aborted) setData(result);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  const availableAt = formatFieldClose(data?.availableAt);
  const today = todayAtField();
  const dates = [...new Set([today, date, ...(data?.availableDates ?? [])].filter(Boolean))];

  return (
    <section className="game-recap" id="game-day-recap" aria-labelledby="game-recap-heading">
      <div className="game-recap-header">
        <div>
          <h2 id="game-recap-heading">Game-day recap</h2>
          <p>Review your recorded games and patches after the field closes.</p>
        </div>
        <div className="game-recap-controls">
          {data && (
            <label>
              Recap date
              <select value={date} onChange={event => loadRecap(event.target.value)} disabled={busy}>
                <option value="">Most recent</option>
                {dates.map(day => (
                  <option key={day} value={day}>{day === today ? 'Today' : formatFieldDate(day)}</option>
                ))}
              </select>
            </label>
          )}
          <button className="ph-button ph-button-primary" type="button" disabled={busy} onClick={() => loadRecap(date)}>
            {data ? 'Refresh recap' : 'View recap'}
          </button>
        </div>
      </div>
      {busy && <p role="status">Loading your recap…</p>}
      {error && <p className="game-recap-error" role="alert">Could not load your recap. Try again.</p>}
      {!busy && !error && data && (
        <>
          {data.recap ? <>
            <RecapDetails recap={data.recap} />
            <GameDayFeedback key={`${playerId}:${data.recap.date}`} firebase={firebase} playerId={playerId} date={data.recap.date} />
          </> : (
            <p role="status">{availableAt ? `Game-day recaps open after ${availableAt}.` : 'No game-day activity was recorded for this recap.'}</p>
          )}
          <NextGameDay gameDay={data.nextGameDay} />
        </>
      )}
    </section>
  );
}

export function GameDayRecapNotificationSettings({ firebase, playerId }) {
  const [preference, setPreference] = useState(null);
  const [busy, setBusy] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const saveRequest = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    gameDayRecapNotifications(firebase, playerId, { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setPreference(result);
    }).catch(() => {
      if (!controller.signal.aborted) setFeedback({ error: true, text: 'Could not read your notification preference.' });
    }).finally(() => {
      if (!controller.signal.aborted) setBusy(false);
    });
    return () => controller.abort();
  }, [attempt, firebase, playerId]);

  useEffect(() => () => saveRequest.current?.abort(), []);

  async function update(enabled) {
    if (busy || saveRequest.current) return;
    const controller = new AbortController();
    saveRequest.current = controller;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await gameDayRecapNotifications(firebase, playerId, { enabled, signal: controller.signal });
      if (controller.signal.aborted) return;
      setPreference(result);
      setFeedback({ text: result.enabled ? 'Recap notifications enabled for your account.' : 'Recap notifications off for your account.' });
    } catch {
      if (!controller.signal.aborted) setFeedback({ error: true, text: 'Could not save your preference. Try again.' });
    } finally {
      saveRequest.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <section className="game-recap-preference" aria-labelledby="game-recap-preference-heading">
      <h2 id="game-recap-preference-heading">Game-day recap notifications</h2>
      <p id="game-recap-preference-help">Get an alert at field close on days you play. Open your recap anytime after field close in the <Link className="game-recap-link" to="/player-hub">Player Hub</Link>.</p>
      {preference ? (
        <label className="game-recap-switch">
          <input type="checkbox" role="switch" checked={preference.enabled} disabled={busy}
            aria-describedby="game-recap-preference-help" onChange={event => update(event.target.checked)} />
          Send recap notifications
        </label>
      ) : !busy && (
        <button className="btn btn-outline-light" type="button" onClick={() => {
          setFeedback(null);
          setBusy(true);
          setAttempt(previous => previous + 1);
        }}>Try again</button>
      )}
      {busy && <p role="status">{preference ? 'Saving preference…' : 'Loading preference…'}</p>}
      {feedback && <p className={feedback.error ? 'game-recap-error' : undefined} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
      {preference && !preference.configured && <p>Device notifications are temporarily unavailable.</p>}
      <a className="game-recap-link" href={recapNotificationSetupUrl}>Set up alerts on this device in Companion</a>
    </section>
  );
}
