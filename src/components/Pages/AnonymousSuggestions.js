import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { suggestionCategories, suggestionRequestId, submitSuggestion } from '../constants/playerFeedback';
import './Schedule.css';
import './PlayerFeedback.css';

export default function AnonymousSuggestions() {
  const [category, setCategory] = useState('gameplay');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [sent, setSent] = useState(false);
  const operation = useRef(null);
  const attempt = useRef(null);

  useEffect(() => () => operation.current?.abort(), []);

  async function send(event) {
    event.preventDefault();
    if (operation.current) return;
    const text = message.trim();
    if (text.length < 5 || text.length > 2000) {
      setNotice({ error: true, text: 'Write a suggestion between 5 and 2,000 characters.' });
      return;
    }
    const website = event.currentTarget.elements.website.value;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setNotice(null);
    try {
      const previous = attempt.current;
      if (!previous || previous.category !== category || previous.message !== text || previous.website !== website) {
        attempt.current = { requestId: suggestionRequestId(), category, message: text, website };
      }
      await submitSuggestion(attempt.current, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setSent(true);
      setMessage('');
      attempt.current = null;
    } catch (failure) {
      if (!controller.signal.aborted) setNotice({ error: true, text: failure.message || 'Your suggestion could not be sent. Try again.' });
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <main className="field-schedule player-suggestions">
      <Helmet><title>Anonymous Suggestion Box | US Airsoft Field</title></Helmet>
      <header className="field-schedule__heading">
        <div className="field-schedule__heading-copy">
          <p>US Airsoft World <span aria-hidden="true">/</span> Player experience</p>
          <h1>Suggestion box</h1>
          <p>Help shape what comes next at USAW.</p>
        </div>
        <Link className="field-schedule__action" to="/player-hub">Player Hub</Link>
      </header>
      <section className="field-schedule__section player-suggestions__panel" aria-labelledby="suggestion-heading">
        <h2 id="suggestion-heading">Share an anonymous suggestion</h2>
        <p>No sign-in needed. Your suggestion goes privately to USAW staff. Leave out names or contact details to stay anonymous.</p>
        {sent ? <div className="player-feedback__confirmation" role="status">
          <h3>Thanks for helping improve USAW.</h3>
          <p>Your suggestion is in the staff inbox.</p>
          <button className="field-schedule__action" type="button" onClick={() => setSent(false)}>Send another suggestion</button>
        </div> : <form className="player-feedback__form" onSubmit={send} aria-busy={busy}>
          <fieldset disabled={busy}>
            <legend className="visually-hidden">Anonymous suggestion</legend>
            <label htmlFor="suggestion-category">What is your suggestion about?</label>
            <select id="suggestion-category" value={category} onChange={event => setCategory(event.target.value)}>
              {suggestionCategories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
            <label htmlFor="suggestion-message">Your suggestion</label>
            <textarea id="suggestion-message" value={message} rows={7} minLength={5} maxLength={2000} required
              aria-describedby="suggestion-length" onChange={event => setMessage(event.target.value)}
              placeholder="What would make a day at USAW even better?" />
            <span className="player-feedback__length" id="suggestion-length">{message.length.toLocaleString()} / 2,000 characters</span>
            <div className="player-feedback__trap" aria-hidden="true">
              <label htmlFor="suggestion-website">Website</label>
              <input id="suggestion-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>
          </fieldset>
          <button className="field-schedule__action field-schedule__action--primary" type="submit" disabled={busy}>
            {busy ? 'Sending suggestion…' : 'Send suggestion'}
          </button>
          {notice && <p className="player-feedback__error" role="alert">{notice.text}</p>}
        </form>}
      </section>
    </main>
  );
}
