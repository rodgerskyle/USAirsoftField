import React, { useEffect, useRef, useState } from 'react';
import { readScannedMemberCard } from '../constants/scoreCards';
import { StaffCardScanner } from './StaffCardScanner';
import './AdminFieldMembershipReports.css';

const endpoint = '/api/member-card/verify?staff=1';
const playerIdPattern = /^[A-Za-z0-9_-]{10,128}$/;
const cardTokenPattern = /^[A-Za-z0-9_-]{32}$/;
const invalidEntry = 'Scan a USAW card or enter the player’s ID.';
const statuses = {
  active: 'Active membership',
  expired: 'Expired membership',
  'waiver-only': 'Waiver only',
  unconfirmed: 'Membership unconfirmed',
  notFound: 'Record not found',
};
const checkTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric',
  hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});
const renewalDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric',
});

function parseEntry(value) {
  const raw = value.trim();
  let token;
  try { token = readScannedMemberCard(raw); } catch { throw new Error(invalidEntry); }
  if (token) return { token };
  const barcode = /^\]C[01]([A-Za-z0-9_-]{10,128})$/.exec(raw)?.[1];
  if (barcode) return { playerId: barcode };
  if (!playerIdPattern.test(raw)) throw new Error(invalidEntry);
  return { playerId: raw, fallback: cardTokenPattern.test(raw) ? raw : undefined };
}

async function readMembership(request, entry, signal) {
  const send = body => request(endpoint, { method: 'POST', body, signal });
  try {
    if (entry.token) return await send({ token: entry.token });
    try {
      return await send({ playerId: entry.playerId });
    } catch (error) {
      if (!entry.fallback || error?.status !== 404) throw error;
      return await send({ token: entry.fallback });
    }
  } catch (error) {
    if (error?.status !== 404) throw error;
    return { status: 'notFound', message: error.data?.message || error.message };
  }
}

function renewalLabel(value) {
  if (value === 'N/A') return 'No expiration date';
  if (typeof value !== 'string' || !/^\d{1,2}-\d{1,2}-\d{4}$/.test(value)) return '';
  const [month, day, year] = value.split('-').map(Number);
  return renewalDate.format(Date.UTC(year, month - 1, day));
}

function VerificationResult({ result }) {
  const checked = Date.parse(result.checkedAt);
  const renewal = renewalLabel(result.renewal);
  return (
    <section className="field-tool__panel field-membership__result" data-status={result.status} aria-label="Verification result" aria-live="polite">
      <p className="field-membership__status">{statuses[result.status]}</p>
      {result.displayName && <h2>{result.displayName}</h2>}
      {result.message && <p>{result.message}</p>}
      {result.playerId && (
        <dl className="field-membership__details">
          <div><dt>Player ID</dt><dd>{result.playerId}</dd></div>
          {renewal && <div><dt>Renewal</dt><dd>{renewal}</dd></div>}
          {Number.isFinite(checked) && <div><dt>Checked</dt><dd>{checkTime.format(checked)}</dd></div>}
        </dl>
      )}
    </section>
  );
}

export default function AdminFieldMembership({ request }) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(null);
  const input = useRef(null);

  useEffect(() => () => {
    pending.current?.abort();
    pending.current = null;
  }, [request]);

  async function verify(entry) {
    if (pending.current) return;
    const operation = new AbortController();
    pending.current = operation;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const next = await readMembership(request, entry, operation.signal);
      if (!Object.prototype.hasOwnProperty.call(statuses, next?.status)) {
        throw new Error('Membership could not be verified.');
      }
      if (pending.current === operation) {
        setValue('');
        setResult(next);
      }
    } catch (failure) {
      if (pending.current === operation && failure?.name !== 'AbortError') {
        setError(failure?.message || 'Membership could not be verified. Try again.');
      }
    } finally {
      if (pending.current === operation) {
        pending.current = null;
        setBusy(false);
        input.current?.focus();
      }
    }
  }

  function submit(event) {
    event.preventDefault();
    try {
      void verify(parseEntry(input.current?.value || ''));
    } catch (failure) {
      setResult(null);
      setError(failure.message);
    }
  }

  function scan(entry) {
    if (entry?.cardToken) void verify({ token: entry.cardToken });
    else if (entry?.playerId) void verify({ playerId: entry.playerId });
  }

  return (
    <div className="field-membership" aria-busy={busy}>
      <div className="field-tool__panel field-membership__scan">
        <form onSubmit={submit}>
          <label htmlFor="field-membership-card">Scan or enter a membership card</label>
          <div className="field-membership__entry">
            <input ref={input} className="form-control" id="field-membership-card" value={value}
              autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
              maxLength={512} required readOnly={busy} placeholder="Card link, QR token, or player ID"
              onChange={event => {
                setValue(event.target.value);
                setResult(null);
                setError('');
              }} />
            <button className="btn btn-primary" type="submit" disabled={busy}>Verify membership</button>
          </div>
        </form>
        <StaffCardScanner disabled={busy} onScan={scan} />
      </div>
      {busy && <p role="status">Checking membership…</p>}
      {error && <p className="field-membership__error" role="alert">{error}</p>}
      {result && <VerificationResult result={result} />}
    </div>
  );
}
