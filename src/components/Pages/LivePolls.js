import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { withFirebase } from '../Firebase';
import { requestPlayerPoll } from '../constants/fieldStaffApi';
import { formatRoundCountdown, isOpenVote, useLiveFieldBoard } from './FieldRoundsShared';
import './Schedule.css';
import './LivePolls.css';

function PollBallot({ user }) {
  const readPoll = useCallback((_, options) => requestPlayerPoll(user, options), [user]);
  const { board, error, now, refresh } = useLiveFieldBoard(readPoll);
  const [choice, setChoice] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submission = useRef(null);

  useEffect(() => () => submission.current?.abort(), []);

  const poll = board?.poll;
  const open = isOpenVote(poll, now);
  const canVote = open && board.canVote && !error;
  const Option = open ? 'label' : 'div';
  const selected = choice?.pollId === poll?.id ? choice?.modeId : poll?.myVote;
  const status = feedback?.pollId === poll?.id ? feedback : null;

  async function vote(event) {
    event.preventDefault();
    if (!canVote || submission.current || !poll.options.some(option => option.modeId === selected)
      || selected === poll.myVote) return;

    const controller = new AbortController();
    submission.current = controller;
    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await requestPlayerPoll(user, { vote: { pollId: poll.id, modeId: selected }, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (result.ok !== true || result.pollId !== poll.id || result.myVote !== selected) throw new Error('Invalid vote receipt');
      setChoice(null);
      setFeedback({ pollId: poll.id, message: 'Your vote was recorded.' });
      await refresh();
    } catch (failure) {
      if (!controller.signal.aborted) {
        setFeedback({ pollId: poll.id, error: true, message: failure.status === 409
          ? 'The poll closed or its options changed. Check the latest poll.' : 'Could not record your vote. Try again.' });
        await refresh();
      }
    } finally {
      submission.current = null;
      if (!controller.signal.aborted) setSubmitting(false);
    }
  }

  return (
    <section className="field-schedule__section live-polls__ballot" aria-labelledby="live-poll-heading">
      <header className="field-schedule__section-header live-polls__poll-header">
        <h2 id="live-poll-heading">{poll?.title || 'Game mode voting'}</h2>
        {open && !error && <div className="live-polls__timer">Closes in <strong role="timer" aria-label="Voting time remaining">
          {formatRoundCountdown(Date.parse(poll.closesAt) - now)}
        </strong></div>}
        {poll && !open && <span className="live-polls__timer">Voting closed</span>}
      </header>
      {error && <div className="field-schedule__notice live-polls__notice" role="alert">
        <span>Could not refresh the live poll.</span>
        <button className="field-schedule__action" type="button" onClick={refresh}>Retry</button>
      </div>}
      {!board && !error && <p className="field-schedule__empty" role="status">Loading the live poll…</p>}
      {board && !poll && <p className="field-schedule__empty" role="status">There’s no live poll right now. Check back when staff open voting.</p>}
      {poll && <form className="live-polls__form" onSubmit={vote} aria-busy={submitting}>
        <fieldset disabled={!canVote || submitting}>
          <legend>{open ? 'Choose a game mode' : 'Poll results'}</legend>
          <ul className="live-polls__options">
            {poll.options.map(option => (
              <li key={option.modeId}>
                <Option className="live-polls__option" data-selected={selected === option.modeId}>
                  {open && <input type="radio" name="game-mode" value={option.modeId} checked={selected === option.modeId}
                    onChange={() => setChoice({ pollId: poll.id, modeId: option.modeId })} />}
                  <span>{option.label}</span>
                  {!open && poll.winnerModeIds?.includes(option.modeId) && <span className="live-polls__winner">Top vote</span>}
                  <strong>{option.votes} {option.votes === 1 ? 'vote' : 'votes'}</strong>
                </Option>
              </li>
            ))}
          </ul>
        </fieldset>
        {open && <button className="field-schedule__action field-schedule__action--primary" type="submit"
          disabled={!canVote || submitting || !selected || selected === poll.myVote}>
          {submitting ? 'Saving vote…' : poll.myVote ? 'Update my vote' : 'Cast my vote'}
        </button>}
        {poll.myVote && <p>Your vote · <strong>{poll.options.find(option => option.modeId === poll.myVote)?.label}</strong></p>}
        {poll.publishedGameId && <p>Staff added the winning game to the round schedule.</p>}
        {status && <p className={status.error ? 'live-polls__error' : undefined} role={status.error ? 'alert' : 'status'}>{status.message}</p>}
      </form>}
    </section>
  );
}

function LivePolls({ firebase }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => firebase.auth.onAuthStateChanged(setUser), [firebase]);

  return (
    <main className="field-schedule live-polls">
      <Helmet><title>US Airsoft Field | Live Polls</title></Helmet>
      <header className="field-schedule__heading">
        <div className="field-schedule__heading-copy">
          <p>US Airsoft World <span aria-hidden="true">/</span> Anderson, CA</p>
          <h1>Live Polls</h1>
          <p>Vote for what we play next. Open to everyone.</p>
        </div>
        <Link to="/schedule" className="field-schedule__action">Field schedule</Link>
      </header>
      {user === undefined ? <p className="field-schedule__empty" role="status">Loading the live poll…</p>
        : <PollBallot key={user?.uid ?? 'guest'} user={user} />}
    </main>
  );
}

export default withFirebase(LivePolls);
