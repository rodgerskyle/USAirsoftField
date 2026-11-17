import React, { useEffect, useRef, useState } from 'react';
import { canEarnPrestige, confirmPrestige, maximumRankPoints, preparePrestige } from '../constants/playerPrestige';
import rankImages from '../constants/rankimgs';
import './PlayerPrestige.css';

const format = new Intl.NumberFormat('en-US');
const generalInsignia = rankImages[rankImages.length - 1];
const romanDigits = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],
  [10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
const romanWidths = { I: .42, V: .77, X: .77, L: .68, C: .77, D: .8, M: 1 };

function romanNumeral(value) {
  if (value >= 4000) return romanNumeral(Math.floor(value / 1000)).replace(/[IVXLCDM]/g, '$&\u0305') + romanNumeral(value % 1000);
  let output = '';
  for (const [weight, digit] of romanDigits) {
    while (value >= weight) {
      output += digit;
      value -= weight;
    }
  }
  return output;
}

export function PrestigeEmblem({ count }) {
  if (!Number.isSafeInteger(count) || count < 1) return null;
  const numeral = romanNumeral(count);
  const size = numeral.length === 1 ? 'single' : numeral.length === 3 ? 'triple' : numeral.length > 5 ? 'long' : numeral.length > 3 ? 'medium' : 'short';
  const width = [...numeral].reduce((sum, glyph) => sum + (romanWidths[glyph] ?? 0), 0);
  return (
    <span className="usaw-prestige-emblem" aria-hidden="true">
      <img src={generalInsignia} alt="" width="60" height="60" decoding="async" />
      <span data-numeral-size={size} style={{ '--prestige-numeral-fit': `${Math.floor(36 / width)}cqw` }}>{numeral}</span>
    </span>
  );
}

export function PrestigeRequirements({ progress, title = `Prestige ${format.format(progress.nextPrestige)} requirements` }) {
  const goals = [
    { label: 'Points since your last Prestige', ...progress.points },
    ...progress.patches.map(tier => ({ label: `Factor ${tier.factor} · ${tier.name} patches`, ...tier })),
  ];
  return (
    <div className="usaw-prestige-goals">
      <h3>{title}</h3>
      <ul>{goals.map(({ label, earned, required }) => (
        <li key={label}>
          <span>{label}</span>
          <strong>{format.format(earned)} / {format.format(required)}</strong>
          <progress aria-label={label} value={earned} max={required} />
        </li>
      ))}</ul>
      <p>Earn points and distinct qualifying patches after your latest Prestige.</p>
    </div>
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
  const eligible = canManage && canEarnPrestige(record, lifetimePoints);
  const next = preview?.nextPrestige ?? completed + 1;
  const initialGoal = record?.progress?.points;
  const remaining = initialGoal
    ? Math.max(0, initialGoal.required - initialGoal.earned)
    : Math.max(0, maximumRankPoints - lifetimePoints);

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
          setFeedback({ text: `Prestige ${format.format(updated.prestigeCount)} earned. Your five-star rank carries forward.` });
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
          {canManage && completed === 0 && (
            <p>
              Prestige is optional once you reach General of the Army.
              {remaining > 0 ? ` ${format.format(remaining)} rank points to your next Prestige.` : ' Prestige is available.'}
            </p>
          )}
          {canManage && completed > 0 && (record.progress
            ? <PrestigeRequirements progress={record.progress} />
            : <p>Next Prestige requirements are temporarily unavailable.</p>)}
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
          <p>You keep your five-star rank, lifetime points, game record, and leaderboard standing. Your next Prestige begins a new points and patch goal.</p>
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
