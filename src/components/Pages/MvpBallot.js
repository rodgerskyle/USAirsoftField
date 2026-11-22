import React, { useEffect, useRef, useState } from 'react';
import { requestPlayerPoll } from '../constants/fieldStaffApi';
import { formatFieldTime, isOpenVote } from './FieldRoundsShared';

export default function MvpBallot({ poll, user, now, error, refresh, submitting, setSubmitting, submission }) {
  const [draft, setDraft] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const heading = useRef(null);
  const saved = receipt || poll.myVote;
  const values = draft || saved || { firstName: '', lastName: '' };
  const firstName = values.firstName.trim(), lastName = values.lastName.trim();
  const open = isOpenVote(poll, now);
  const canSubmit = open && !error && !submitting && firstName && lastName &&
    (firstName !== saved?.firstName || lastName !== saved?.lastName);

  useEffect(() => setReceipt(null), [poll]);
  useEffect(() => {
    if (window.location.hash === '#round-mvp') heading.current?.focus();
  }, []);

  function edit(event) {
    setDraft({ ...values, [event.target.name]: event.target.value });
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
      const result = await requestPlayerPoll(user, { mvpVote: { pollId: poll.id, firstName, lastName }, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (result.ok !== true || result.pollId !== poll.id || typeof result.myVote?.firstName !== 'string' ||
          typeof result.myVote.lastName !== 'string') throw new Error('The MVP vote could not be confirmed.');
      setDraft(null);
      setReceipt(result.myVote);
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
        <label>First name<input name="firstName" value={values.firstName} onChange={edit} required maxLength={60} autoComplete="off" /></label>
        <label>Last name<input name="lastName" value={values.lastName} onChange={edit} required maxLength={60} autoComplete="off" /></label>
      </fieldset>
      <p>Vote for one player. You can change your pick until {formatFieldTime(poll.closesAt)} Pacific.</p>
      <button type="submit" className="field-schedule__action field-schedule__action--primary" disabled={!canSubmit}>
        {saved ? 'Update my MVP vote' : 'Submit MVP vote'}
      </button>
    </form> : <p>MVP voting is closed for this round.</p>}
    {saved && <p>Your MVP vote · <strong>{saved.firstName} {saved.lastName}</strong></p>}
    {feedback && <p className={feedback.error ? 'live-polls__error' : undefined} role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p>}
  </section>;
}
