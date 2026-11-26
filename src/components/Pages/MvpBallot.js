import React, { useEffect, useRef, useState } from 'react';
import { requestPlayerPoll } from '../constants/fieldStaffApi';
import { formatFieldTime, isOpenVote, mvpNominationText } from './FieldRoundsShared';

export default function MvpBallot({ poll, user, now, error, refresh, submitting, setSubmitting, submission }) {
  const [draft, setDraft] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const heading = useRef(null);
  const saved = receipt || poll.myVote;
  const savedText = mvpNominationText(saved);
  const value = draft ?? savedText;
  const nomination = value.trim();
  const open = isOpenVote(poll, now);
  const canSubmit = open && !error && !submitting && nomination && nomination !== savedText;

  useEffect(() => setReceipt(null), [poll]);
  useEffect(() => {
    if (window.location.hash === '#round-mvp') heading.current?.focus();
  }, []);

  function edit(event) {
    setDraft(event.target.value);
    setFeedback(null);
  }

  async function vote(event) {
    event.preventDefault();
    if (!canSubmit || submission.current) return;
    const controller = new AbortController();
    submission.current = controller;
    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await requestPlayerPoll(user, { mvpVote: { pollId: poll.id, nomination }, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (result.ok !== true || result.pollId !== poll.id || typeof result.myVote?.nomination !== 'string' || !result.myVote.nomination.trim()) throw new Error('The MVP vote could not be confirmed.');
      setDraft(null);
      setReceipt(result.myVote);
      window.dispatchEvent(new CustomEvent('usaw:mvp-voted', { detail: { pollId: poll.id } }));
      setFeedback({ message: 'Your MVP vote was recorded.' });
      await refresh();
    } catch (failure) {
      if (!controller.signal.aborted) {
        setFeedback({ error: true, message: failure.status === 409 ? 'MVP voting has closed for this round.' :
          failure.message || 'Could not record your MVP vote. Try again.' });
        await refresh();
      }
    } finally {
      if (submission.current === controller) submission.current = null;
      if (!controller.signal.aborted) setSubmitting(false);
    }
  }

  return <section id="round-mvp" className="field-schedule__section live-polls__ballot" aria-labelledby="round-mvp-heading">
    <header className="field-schedule__section-header">
      <h2 id="round-mvp-heading" ref={heading} tabIndex={-1}>Round MVP</h2>
    </header>
    <p><strong>{poll.roundTitle}</strong> · {formatFieldTime(poll.startsAt)} Pacific</p>
    {open ? <form className="live-polls__form" onSubmit={vote} aria-busy={submitting}>
      <fieldset disabled={submitting || Boolean(error)} className="live-polls__names">
        <legend>Who was the MVP of this round?</legend>
        <label>Player name or description<input name="nomination" value={value} onChange={edit} required maxLength={160}
          autoComplete="off" placeholder="e.g. Blue team, green helmet, carried the flag" /></label>
      </fieldset>
      <p>Refs choose the MVP. You can change your nomination until {formatFieldTime(poll.closesAt)} Pacific.</p>
      <button type="submit" className="field-schedule__action field-schedule__action--primary" disabled={!canSubmit}>
        {saved ? 'Update my MVP vote' : 'Submit MVP vote'}
      </button>
    </form> : <p>MVP voting is closed for this round.</p>}
    {saved && <p>Your MVP vote · <strong>{savedText}</strong></p>}
    {feedback && <p className={feedback.error ? 'live-polls__error' : undefined} role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p>}
  </section>;
}
