import React, { useEffect, useRef, useState } from 'react';
import { confirmPrestige, maximumRankPoints, preparePrestige, prestigeCyclePoints } from '../constants/playerPrestige';
import './PlayerPrestige.css';

const format = new Intl.NumberFormat('en-US');
const artwork = `${process.env.PUBLIC_URL || ''}/prestige-emblems.png`;

export function PrestigeEmblem({ count }) {
  const tier = count < 4 ? 'bronze' : count < 7 ? 'silver' : count < 10 ? 'gold' : 'crimson';
  return (
    <span
      className={`usaw-prestige-emblem usaw-prestige-emblem--${tier}`}
      style={{ backgroundImage: `url("${artwork}")` }}
      aria-hidden="true"
    />
  );
}

export default function PlayerPrestige({ firebase, playerId, lifetimePoints, prestige, canManage }) {
  const { record, failed, replace } = prestige;
  const [review, setReview] = useState(false);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const request = useRef(null);
  const reviewHeading = useRef(null);
  const status = useRef(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (review) reviewHeading.current?.focus();
  }, [review, preview]);
  useEffect(() => {
    if (feedback && !feedback.error) status.current?.focus();
  }, [feedback]);

  const completed = record?.prestigeCount ?? 0;
  const cyclePoints = prestigeCyclePoints(lifetimePoints, record);
  const eligible = canManage && Boolean(record) && cyclePoints >= maximumRankPoints;
  const next = preview?.nextPrestige ?? completed + 1;
  const remaining = Math.max(0, maximumRankPoints - cyclePoints);

  function begin() {
    setFeedback(null);
    setReview(true);
  }

  function cancel() {
    setReview(false);
    setPreview(null);
    setFeedback(null);
  }

  async function advance() {
    if (request.current || !review || !canManage) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setFeedback(null);
    try {
      if (!preview) {
        const challenge = await preparePrestige(firebase, playerId, controller.signal);
        if (!controller.signal.aborted) setPreview(challenge);
      } else {
        const updated = await confirmPrestige(firebase, playerId, preview.challenge, controller.signal);
        if (!controller.signal.aborted) {
          replace(updated);
          setReview(false);
          setPreview(null);
          setFeedback({ text: `Prestige ${format.format(updated.prestigeCount)} earned. Your profile rank is now Private.` });
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        if (preview && [409, 410].includes(error.status)) setPreview(null);
        setFeedback({ text: error.message, error: true });
      }
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <section className="player-profile__panel usaw-prestige-panel" aria-labelledby="usaw-prestige-heading">
      <div className="usaw-prestige-panel__header">
        <div>
          <p className="player-profile__label">Rank progression</p>
          <h2 id="usaw-prestige-heading">Prestige</h2>
        </div>
        {completed > 0 && <PrestigeEmblem count={completed} />}
      </div>
      {record ? (
        <>
          <p className="usaw-prestige-panel__count">Prestiges completed <strong>{format.format(completed)}</strong></p>
          {canManage && (
            <p>
              Each time you reach General Of The Army, you can start a new profile rank cycle.
              {remaining > 0 ? ` ${format.format(remaining)} rank points to your next Prestige.` : ' Prestige is available.'}
            </p>
          )}
        </>
      ) : <p role="status">{failed ? 'Prestige information is temporarily unavailable.' : 'Loading Prestige information…'}</p>}
      {eligible && !review && <button type="button" className="usaw-prestige-button" onClick={begin}>Start Prestige</button>}
      {review && canManage && (
        <div className="usaw-prestige-review">
          <div className="usaw-prestige-panel__header">
            <div>
              <p className="player-profile__label">{preview ? 'Confirmation 2 of 2' : 'Confirmation 1 of 2'}</p>
              <h3 ref={reviewHeading} tabIndex={-1}>
                {preview ? 'Confirm' : 'Review'} Prestige {format.format(next)}
              </h3>
            </div>
            <PrestigeEmblem count={next} />
          </div>
          <p>Your profile rank starts at Private. You keep your lifetime points, game record, and leaderboard standing.</p>
          <div className="usaw-prestige-actions">
            <button type="button" className="usaw-prestige-button" disabled={busy} onClick={advance}>
              {busy ? 'Please wait…' : preview ? `Confirm Prestige ${format.format(next)}` : 'Continue to final confirmation'}
            </button>
            <button type="button" className="usaw-prestige-button usaw-prestige-button--cancel" disabled={busy} onClick={cancel}>Cancel</button>
          </div>
        </div>
      )}
      {feedback && <p ref={status} tabIndex={-1} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
    </section>
  );
}
