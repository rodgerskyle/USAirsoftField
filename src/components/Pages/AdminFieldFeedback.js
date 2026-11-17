import React, { useCallback, useEffect, useRef, useState } from 'react';
import { formatFieldDate } from '../constants/gameDayRecap';
import './AdminFieldFeedback.css';

const endpoint = '/api/player-feedback';
const categories = {
  gameplay: 'Gameplay',
  field: 'Field & facilities',
  store: 'Tactical store',
  'app-website': 'App & website',
  other: 'Other',
};
const submittedTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric',
  hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});
const ratingLabels = [
  ['overall', 'Overall experience'], ['gameVariety', 'Game variety'],
  ['breakTimes', 'Break times'], ['teamBalance', 'Team balance'],
];

function FeedbackCard({ item, busy, review }) {
  const recap = item.kind === 'recap';
  const submitted = Date.parse(item.createdAt);
  const text = recap ? item.comment : item.message;
  const ratings = ratingLabels.filter(([key]) => Number.isInteger(item[key]) && item[key] >= 1 && item[key] <= 5);
  return (
    <article className="field-feedback__item">
      <header>
        <div>
          <h3>{recap ? 'Game-day feedback' : 'Anonymous suggestion'}</h3>
          <p className="field-feedback__context">{recap ? formatFieldDate(item.date) : categories[item.category] || 'Other'}</p>
        </div>
        <span className="field-feedback__status" data-status={item.status}>{item.status === 'reviewed' ? 'Reviewed' : 'New'}</span>
      </header>
      {ratings.length > 0 && <dl className="field-feedback__ratings">
        {ratings.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{item[key]} / 5</dd></div>)}
      </dl>}
      {text && <p className="field-feedback__message">{text}</p>}
      <footer>
        {Number.isFinite(submitted) && <time dateTime={item.createdAt}>{submittedTime.format(submitted)}</time>}
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => review(item)}>
          {item.status === 'reviewed' ? 'Reopen' : 'Mark reviewed'}
        </button>
      </footer>
    </article>
  );
}

export default function AdminFieldFeedback({ request }) {
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState('new');
  const [items, setItems] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const operation = useRef(null);

  const load = useCallback(async (cursor, confirmation = null) => {
    operation.current?.abort();
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setNotice(confirmation);
    if (!cursor) {
      setItems(null);
      setNextCursor(null);
      setSummary(null);
    }
    try {
      const query = new URLSearchParams({ kind, status });
      if (cursor) query.set('cursor', cursor);
      const data = await request(`${endpoint}?${query}`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!Array.isArray(data?.items)) throw new Error('The feedback list could not be read.');
      setItems(previous => {
        const received = cursor ? [...(previous ?? []), ...data.items] : data.items;
        return [...new Map(received.map(item => [`${item.kind}:${item.id}`, item])).values()];
      });
      setNextCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
      setSummary(data.summary && typeof data.summary === 'object' ? data.summary : null);
    } catch (failure) {
      if (!controller.signal.aborted) {
        if (failure.status === 401 || failure.status === 403) {
          setItems(null);
          setSummary(null);
        }
        setNotice({ error: true, text: failure.message || 'Could not load player feedback. Try again.' });
      }
    } finally {
      if (operation.current === controller) {
        operation.current = null;
        setBusy(false);
      }
    }
  }, [kind, status, request]);

  useEffect(() => {
    void load();
    return () => {
      operation.current?.abort();
      operation.current = null;
    };
  }, [load]);

  async function review(item) {
    if (operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    const nextStatus = item.status === 'reviewed' ? 'new' : 'reviewed';
    setBusy(true);
    setNotice(null);
    try {
      const result = await request(endpoint, {
        method: 'POST', body: { kind: item.kind, id: item.id, status: nextStatus, updatedAt: item.updatedAt }, signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (result?.ok !== true) throw new Error('The review could not be confirmed.');
      operation.current = null;
      await load(undefined, { text: nextStatus === 'reviewed' ? 'Marked reviewed.' : 'Feedback reopened.' });
    } catch (failure) {
      if (!controller.signal.aborted) {
        if (failure.status === 401 || failure.status === 403) {
          setItems(null);
          setSummary(null);
        }
        setNotice({ error: true, text: failure.status === 409
          ? 'This feedback changed. Refresh the list before reviewing it.'
          : failure.message || 'Could not save this review. Try again.' });
      }
    } finally {
      if (operation.current === controller) {
        operation.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <section className="field-tool__panel field-feedback" aria-labelledby="field-feedback-heading" aria-busy={busy}>
      <header className="field-feedback__heading">
        <div><h2 id="field-feedback-heading">Player feedback</h2><p>Review game-day ratings and anonymous suggestions.</p></div>
        <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => load()}>Refresh feedback</button>
      </header>
      <div className="field-tool__controls">
        <label>Submission type
          <select className="form-select" value={kind} onChange={event => setKind(event.target.value)}>
            <option value="all">All submissions</option><option value="recap">Game-day feedback</option><option value="suggestion">Anonymous suggestions</option>
          </select>
        </label>
        <label>Review status
          <select className="form-select" value={status} onChange={event => setStatus(event.target.value)}>
            <option value="new">New</option><option value="reviewed">Reviewed</option><option value="all">All statuses</option>
          </select>
        </label>
      </div>
      {summary && <section className="field-feedback__summary" aria-labelledby="field-feedback-summary-title">
        <h3 id="field-feedback-summary-title">Filtered feedback overview</h3>
        <p>{Number.isSafeInteger(summary.recaps) ? summary.recaps.toLocaleString() : 0} game-day responses
          {' · '}{Number.isSafeInteger(summary.suggestions) ? summary.suggestions.toLocaleString() : 0} suggestions</p>
        <dl className="field-feedback__ratings">
          {ratingLabels.map(([key, label]) => {
            const average = summary.averages?.[key];
            return <div key={key}><dt>{label}</dt><dd>{typeof average === 'number' && Number.isFinite(average)
              ? `${average.toFixed(1)} / 5` : 'No ratings'}</dd></div>;
          })}
        </dl>
      </section>}
      {notice && <p className={notice.error ? 'field-feedback__error' : ''} role={notice.error ? 'alert' : 'status'}>{notice.text}</p>}
      {items === null && busy && <p role="status">Loading player feedback…</p>}
      {items?.length === 0 && <p>No feedback matches these filters.</p>}
      {!!items?.length && <div className="field-feedback__queue">
        {items.map(item => <FeedbackCard key={`${item.kind}:${item.id}`} item={item} busy={busy} review={review} />)}
      </div>}
      {nextCursor && <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => load(nextCursor)}>
        {busy ? 'Loading…' : 'Load more feedback'}
      </button>}
    </section>
  );
}
