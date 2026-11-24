import React, { useEffect, useState } from 'react';

const endpoint = '/api/waivers/member-sync';
const phases = {
  accounts: 'Checking active member accounts',
  waivers: 'Checking signed waivers',
  matching: 'Attaching matching waivers',
};

export default function MemberWaiverSync({ request }) {
  const [sync, setSync] = useState(null);
  const [run, setRun] = useState({ restart: null });
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let timer;

    async function advance(action) {
      try {
        const options = { signal };
        if (action) {
          options.method = 'POST';
          options.body = action === 'restart' ? { action, startedAt: run.restart } : { action };
        }
        const result = await request(endpoint, options);
        if (signal.aborted) return;
        if (!result?.sync) throw new Error('The waiver service returned no progress.');
        setSync(result.sync);
        if (result.sync.status !== 'complete') {
          const delay = Math.min(30000, Math.max(0, Number(result.retryAfterMs) || 0));
          timer = setTimeout(() => advance('step'), delay);
        }
      } catch (err) {
        if (!signal.aborted) setError(err?.message || 'Could not reach the waiver service.');
      }
    }
    setError('');
    advance(run.restart != null ? 'restart' : null);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [request, run]);

  const complete = sync?.status === 'complete';
  const title = error ? 'Waiver matching paused' : complete ? 'Waiver matching complete' :
    phases[sync?.phase] || 'Checking waiver matching progress';
  return (
    <details className="admin-checkin__card">
      <summary>Active member waiver matching</summary>
      <p>Check-in automatically attaches current signed waivers when the member’s legal name and date of birth match. Staff can review unresolved members during check-in.</p>
      <p role="status">{title}</p>
      {sync?.phase === 'accounts' && <p>{sync.scanned || 0} accounts checked · {sync.active || 0} active members found</p>}
      {sync?.phase === 'waivers' && <p>{sync.waiversScanned || 0} waiver records checked</p>}
      {sync && (complete || sync.phase === 'matching') && <p>
        {sync.processed || 0} of {sync.active || 0} active members checked · {sync.linked || 0} newly linked · {sync.verified || 0} already verified · {sync.review || 0} need review · {sync.missing || 0} without a match
      </p>}
      {error && <p role="alert">{error}</p>}
      {(error || complete) && <button type="button" className="btn btn-outline-primary"
        onClick={() => { setError(''); setSync(null); setRun({ restart: complete && !error ? sync.startedAt : null }); }}>
        {error ? 'Resume matching' : 'Check again'}
      </button>}
    </details>
  );
}
