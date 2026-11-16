import React, { useCallback, useEffect, useRef, useState } from 'react';
import './AdminFieldMembershipReports.css';

const reasons = {
  harassment: 'Harassment or abuse',
  spam: 'Spam',
  unsafe: 'Unsafe content',
  other: 'Other concern',
};
const reportTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric',
  hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});

function ReportCard({ report, busy, review }) {
  const created = Date.parse(report.createdAt);
  return (
    <article className="field-reports__report">
      <header>
        <div>
          <h3>{report.teamName || 'USAW team'}</h3>
          <p className="field-reports__reason">{reasons[report.reason] || 'Other concern'}</p>
        </div>
        {Number.isFinite(created) && <time dateTime={report.createdAt}>{reportTime.format(created)}</time>}
      </header>
      <dl className="field-reports__people">
        <div><dt>Sender</dt><dd>{report.senderName || 'USAW player'}</dd></div>
        <div><dt>Reported by</dt><dd>{report.reporterName || 'USAW player'}</dd></div>
      </dl>
      <blockquote>{report.text || 'Message text unavailable.'}</blockquote>
      {report.note && <p className="field-reports__note"><strong>Reporter note</strong> {report.note}</p>}
      {report.messageAvailable === false && <p>This message has already been removed.</p>}
      <div className="field-tool__actions">
        {report.messageAvailable !== false && (
          <button type="button" className="btn btn-outline-danger" disabled={busy}
            onClick={() => review(report, 'remove')}>Remove message</button>
        )}
        <button type="button" className="btn btn-secondary" disabled={busy}
          onClick={() => review(report, 'dismiss')}>Dismiss report</button>
      </div>
    </article>
  );
}

export default function AdminFieldReports({ request }) {
  const [reports, setReports] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const operation = useRef(null);

  const refresh = useCallback(async (review) => {
    if (operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    const isCurrent = () => operation.current === controller;
    setBusy(true);
    setFeedback(null);
    try {
      if (review) {
        const { report, decision } = review;
        try {
          const result = await request('/api/teams', {
            method: 'POST',
            body: { action: 'moderateReport', reportId: report.id, decision },
            signal: controller.signal,
          });
          if (result?.ok !== true) throw new Error('The review could not be confirmed.');
          if (isCurrent()) {
            setReports(previous => previous.filter(item =>
              item.id !== report.id && (decision !== 'remove' || item.messageId !== report.messageId)));
            setFeedback({ text: decision === 'remove' ? 'Message removed from the team chat.' : 'Report dismissed.' });
          }
        } catch (failure) {
          if (failure?.status !== 404 && failure?.status !== 409) throw failure;
          if (isCurrent()) setFeedback({ text: 'Another staff member already reviewed this report.' });
        }
      }
      const result = await request('/api/teams?action=moderation', { signal: controller.signal });
      if (!Array.isArray(result?.reports)) throw new Error('The pending report list could not be loaded.');
      if (isCurrent()) setReports(result.reports);
    } catch (failure) {
      if (isCurrent() && failure?.name !== 'AbortError') {
        if (failure?.status === 401 || failure?.status === 403) setReports(null);
        setFeedback({ error: true, text: failure?.message || 'The report queue could not be updated.' });
      }
    } finally {
      if (isCurrent()) {
        operation.current = null;
        setBusy(false);
      }
    }
  }, [request]);

  useEffect(() => {
    void refresh();
    return () => {
      operation.current?.abort();
      operation.current = null;
    };
  }, [refresh]);

  function review(report, decision) {
    if (decision === 'remove' && !window.confirm('Remove this message for everyone in the team?')) return;
    void refresh({ report, decision });
  }

  return (
    <section className="field-tool__panel field-reports" aria-labelledby="field-report-title" aria-busy={busy}>
      <header className="field-reports__heading">
        <h2 id="field-report-title">Pending team reports</h2>
        <button type="button" className="btn btn-secondary" disabled={busy}
          onClick={() => refresh()}>Refresh reports</button>
      </header>
      {feedback && <p className={feedback.error ? 'field-reports__error' : ''} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
      {reports === null && busy && <p role="status">Loading pending reports…</p>}
      {reports?.length === 0 && <p>No pending reports.</p>}
      {!!reports?.length && (
        <div className="field-reports__queue">
          {reports.map(report => <ReportCard report={report} key={report.id} busy={busy} review={review} />)}
        </div>
      )}
    </section>
  );
}
