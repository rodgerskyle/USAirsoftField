import React, { useEffect, useState } from 'react';

const fieldDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
const metrics = [
  ['scanToCheckIn', 'First scan to check-in', 'check-in', 'check-ins'],
  ['partyToRental', 'Party arrival to last rental handout', 'party', 'parties'],
  ['endToBriefing', 'Round end to next briefing', 'round', 'rounds'],
];

function elapsed(milliseconds) {
  if (milliseconds === null) return '—';
  const seconds = Math.round(milliseconds / 1000);
  if (seconds < 60) return seconds + ' sec';
  return Math.floor(seconds / 60) + ' min' + (seconds % 60 ? ' ' + (seconds % 60) + ' sec' : '');
}

function valid(value) {
  return value && Number.isSafeInteger(value.samples) && value.samples >= 0 &&
    Number.isSafeInteger(value.unpaired) && value.unpaired >= 0 &&
    (value.samples === 0 ? value.meanMs === null : Number.isFinite(value.meanMs) && value.meanMs >= 0);
}

export default function GameDayServiceTimes({ request }) {
  const today = fieldDay.format(new Date());
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [revision, refresh] = useState(0);
  const [state, setState] = useState(null);
  useEffect(() => {
    if (!open || !date || date > today) return;
    const controller = new AbortController();
    (async () => {
      try {
        const data = await request('/api/staff-game-timing?date=' + encodeURIComponent(date), { signal: controller.signal });
        if (data?.date !== date || !metrics.every(([key]) => valid(data.serviceTimes?.[key]))) {
          throw new Error('The service times could not be verified. Refresh to try again.');
        }
        if (!controller.signal.aborted) setState({ date, revision, totals: data.serviceTimes });
      } catch (error) {
        if (!controller.signal.aborted) setState({ date, revision, error: error.message || 'Service times are unavailable.' });
      }
    })();
    return () => controller.abort();
  }, [open, request, date, today, revision]);
  const result = state?.date === date && state.revision === revision ? state : null;
  return <details className="field-rounds-panel" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Game-day service times</summary>
    {open && <>
      <div className="field-rounds-actions">
        <label>Field date (Pacific)<input type="date" value={date} max={today} onChange={event => setDate(event.target.value)} /></label>
        <button type="button" className="btn btn-outline-secondary" onClick={() => refresh(v => v + 1)}>Refresh service times</button>
      </div>
      {!date || date > today ? <p role="status">Choose today or an earlier field date.</p> : result?.error ?
        <p role="alert" className="field-rounds-error">{result.error}</p> : !result ?
        <p role="status">Loading service times…</p> : <>
          <p>Averages use recorded starts and finishes. Party timing includes rental guests who have arrived.</p>
          <dl className="service-time-stats">{metrics.map(([key,label,one,many]) => {
            const metric = result.totals[key];
            return <div key={key}><dt>{label}</dt><dd><strong>{elapsed(metric.meanMs)}</strong><br />
              <small>{metric.samples} measured {metric.samples === 1 ? one : many} · {metric.unpaired} without a finish</small>
            </dd></div>;
          })}</dl>
        </>}
    </>}
  </details>;
}
