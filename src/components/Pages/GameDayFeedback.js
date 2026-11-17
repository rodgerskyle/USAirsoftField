import React, { useEffect, useRef, useState } from 'react';
import { getGameDayFeedback, saveGameDayFeedback } from '../constants/gameDayRecap';
import './PlayerFeedback.css';

const ratingFields = [
  ['overall', 'Overall experience'],
  ['gameVariety', 'Game variety'],
  ['breakTimes', 'Break times'],
  ['teamBalance', 'Team balance'],
];
const ratingLabels = ['Very poor', 'Poor', 'Okay', 'Good', 'Excellent'];
const blank = { overall: '', gameVariety: '', breakTimes: '', teamBalance: '', comment: '' };

function feedbackValues(feedback) {
  return feedback ? Object.fromEntries(Object.keys(blank).map(key => [key, feedback[key] ?? ''])) : { ...blank };
}

export default function GameDayFeedback({ firebase, playerId, date }) {
  const [expanded, setExpanded] = useState(false);
  const [values, setValues] = useState(blank);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const operation = useRef(null);

  useEffect(() => () => operation.current?.abort(), []);

  async function open() {
    setExpanded(true);
    if (loaded || operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setNotice(null);
    try {
      const feedback = await getGameDayFeedback(firebase, playerId, date, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setValues(feedbackValues(feedback));
      setSaved(Boolean(feedback));
      setLoaded(true);
    } catch {
      if (!controller.signal.aborted) setNotice({ error: true, text: 'Could not load your feedback. Try again.' });
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (operation.current || !loaded) return;
    const body = Object.fromEntries(ratingFields.map(([key]) => [key, values[key] === '' ? null : Number(values[key])]));
    body.comment = values.comment.trim();
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setNotice(null);
    try {
      const feedback = await saveGameDayFeedback(firebase, playerId, date, body, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setValues(feedbackValues(feedback));
      setSaved(true);
      setNotice({ text: 'Thanks. Your game-day feedback has been saved.' });
    } catch {
      if (!controller.signal.aborted) setNotice({ error: true, text: 'Could not save your feedback. Your entries are still here to retry.' });
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <section className="game-recap-feedback" aria-labelledby="game-feedback-title">
      <div className="game-recap-feedback__heading">
        <div><h3 id="game-feedback-title">How was your game day?</h3>
          <p>Optional feedback helps the field crew improve the next visit.</p></div>
        {!expanded && <button type="button" className="ph-button" onClick={open}>Share game-day feedback</button>}
      </div>
      {expanded && <>
        <p className="player-feedback__privacy">Staff see your ratings and comments without your player name.</p>
        {busy && !loaded && <p role="status">Loading your feedback…</p>}
        {loaded && <form className="player-feedback__form" onSubmit={submit} aria-busy={busy}>
          <fieldset disabled={busy}>
            <legend className="visually-hidden">Rate this game day</legend>
            <div className="player-feedback__ratings">
              {ratingFields.map(([key, label]) => <label key={key} htmlFor={`game-feedback-${key}`}>
                <span>{label}{key !== 'overall' && ' (optional)'}</span>
                <select id={`game-feedback-${key}`} value={values[key]} required={key === 'overall'}
                  onChange={event => {
                    const value = event.target.value;
                    setValues(previous => ({ ...previous, [key]: value }));
                  }}>
                  <option value="">{key === 'overall' ? 'Choose a rating' : 'Skip this rating'}</option>
                  {ratingLabels.map((text, index) => <option key={text} value={index + 1}>{index + 1} — {text}</option>)}
                </select>
              </label>)}
            </div>
            <label htmlFor="game-feedback-comment">Anything else? (optional)</label>
            <textarea id="game-feedback-comment" value={values.comment} rows={3} maxLength={1000}
              onChange={event => {
                const comment = event.target.value;
                setValues(previous => ({ ...previous, comment }));
              }} />
          </fieldset>
          <button className="ph-button ph-button-primary" type="submit" disabled={busy || values.overall === ''}>
            {busy ? 'Saving feedback…' : saved ? 'Update feedback' : 'Send feedback'}
          </button>
        </form>}
        {notice && <p className={notice.error ? 'player-feedback__error' : ''} role={notice.error ? 'alert' : 'status'}>{notice.text}</p>}
        {!loaded && !busy && <button className="ph-button" type="button" onClick={open}>Retry feedback</button>}
      </>}
    </section>
  );
}
