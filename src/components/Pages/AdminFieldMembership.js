import React, { useEffect, useRef, useState } from 'react';
import { isLegacyCardName, readScannedMemberCard, readScannedPlayerProfile } from '../constants/scoreCards';
import { StaffCardScanner } from './StaffCardScanner';
import './AdminFieldMembershipReports.css';

const endpoint = '/api/member-card/verify?staff=1';
const lookupEndpoint = '/api/game-day-check-in';
const playerIdPattern = /^[A-Za-z0-9_-]{10,128}$/;
const cardTokenPattern = /^[A-Za-z0-9_-]{32}$/;
const invalidEntry = 'Scan a USAW card or enter a player ID or at least two characters of a name.';
const statuses = {
  active: 'Active membership',
  expired: 'Expired membership',
  'waiver-only': 'Waiver only',
  unconfirmed: 'Membership unconfirmed',
  notFound: 'Record not found',
};
const waiverBanLabels = {
  'exact-name': 'Exact name match on the waiver ban list',
  'possible-name': 'Possible waiver ban match',
  clear: 'No waiver ban match',
  unavailable: 'Waiver ban check unavailable',
};
const checkTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric',
  hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});
const renewalDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric',
});

function parseBarcode(raw) {
  const nameQuery = isLegacyCardName(raw) ? raw : undefined;
  if (playerIdPattern.test(raw)) return { playerId: raw, queryFallback: nameQuery };
  if (nameQuery) return { query: nameQuery };
  throw new Error(invalidEntry);
}

function parseEntry(value) {
  const raw = value.trim();
  try {
    const token = readScannedMemberCard(raw);
    if (token) return { token };
    const profileId = readScannedPlayerProfile(raw);
    if (profileId) {
      if (!playerIdPattern.test(profileId)) throw new Error(invalidEntry);
      return { playerId: profileId };
    }
  } catch {
    throw new Error(invalidEntry);
  }
  if (/^\]C[01]/.test(raw)) return parseBarcode(raw.slice(3));
  if (raw.length < 2 || raw.length > 128 || /^(?:https?:|[a-z][a-z0-9+.-]*:\/\/|\]C[01])/i.test(raw)) {
    throw new Error(invalidEntry);
  }
  if (!playerIdPattern.test(raw)) return { query: raw };
  return { playerId: raw, tokenFallback: cardTokenPattern.test(raw) ? raw : undefined, queryFallback: raw };
}

async function readMatches(request, query, signal) {
  const data = await request(lookupEndpoint, {
    method: 'POST', body: { action: 'lookup', query, includeWaiverBan: true }, signal,
  });
  const matches = Array.isArray(data?.matches) ? data.matches : data?.player ? [data.player] : null;
  if (!matches?.every(match => typeof match?.playerId === 'string' && playerIdPattern.test(match.playerId)
    && typeof match.displayName === 'string' && match.displayName.trim())) {
    throw new Error('Player search is unavailable. Try again.');
  }
  return { matches };
}

async function readMembership(request, entry, signal) {
  if (entry.query) return readMatches(request, entry.query, signal);
  const send = body => request(endpoint, { method: 'POST', body, signal });
  try {
    if (entry.token) return await send({ token: entry.token });
    try {
      return await send({ playerId: entry.playerId });
    } catch (error) {
      if (!entry.tokenFallback || error?.status !== 404 || signal.aborted) throw error;
      return await send({ token: entry.tokenFallback });
    }
  } catch (error) {
    if (error?.status !== 404 || signal.aborted) throw error;
    if (entry.queryFallback) return readMatches(request, entry.queryFallback, signal);
    return { status: 'notFound', message: error.data?.message || error.message };
  }
}

function renewalLabel(value) {
  if (value === 'N/A') return 'No expiration date';
  if (typeof value !== 'string' || !/^\d{1,2}-\d{1,2}-\d{4}$/.test(value)) return '';
  const [month, day, year] = value.split('-').map(Number);
  return renewalDate.format(Date.UTC(year, month - 1, day));
}

function WaiverBanStatus({ status }) {
  const key = Object.prototype.hasOwnProperty.call(waiverBanLabels, status) ? status : 'unavailable';
  return (
    <span className="field-membership__waiver-ban" data-waiver-ban-status={key}>
      {waiverBanLabels[key]}
    </span>
  );
}

function VerificationResult({ result }) {
  const checked = Date.parse(result.checkedAt);
  const renewal = renewalLabel(result.renewal);
  const waiverBanMatch = result.waiverBanStatus === 'exact-name' || result.waiverBanStatus === 'possible-name';
  return (
    <section className="field-tool__panel field-membership__result" data-status={result.status} aria-label="Verification result" aria-live="polite">
      <p className="field-membership__status">{statuses[result.status]}</p>
      {result.displayName && <h2>{result.displayName}</h2>}
      {result.message && <p>{result.message}</p>}
      {result.playerId && (
        <>
          <WaiverBanStatus status={result.waiverBanStatus} />
          {waiverBanMatch && <p className="field-membership__waiver-followup">Confirm the player’s identity in Waiver Search.</p>}
          <dl className="field-membership__details">
            <div><dt>Player ID</dt><dd>{result.playerId}</dd></div>
            {renewal && <div><dt>Renewal</dt><dd>{renewal}</dd></div>}
            {Number.isFinite(checked) && <div><dt>Checked</dt><dd>{checkTime.format(checked)}</dd></div>}
          </dl>
        </>
      )}
    </section>
  );
}

function PlayerMatches({ matches, onSelect, heading }) {
  return (
    <section className="field-tool__panel field-membership__result" aria-labelledby="field-membership-matches">
      <h2 id="field-membership-matches" ref={heading} tabIndex={-1}>Matching players</h2>
      {matches.length ? (
        <>
          <p>Select a player to check their current membership.</p>
          <ul className="field-membership__matches">
            {matches.map(({ playerId, displayName, waiverBanStatus }) => (
              <li key={playerId}>
                <button type="button" className="btn btn-outline-primary" onClick={() => onSelect({ playerId })}>
                  <strong>{displayName}</strong>
                  <span>Player ID: {playerId}</span>
                  <WaiverBanStatus status={waiverBanStatus} />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : <p role="status">No matching players. Try another name or enter a player ID.</p>}
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
  const matchesHeading = useRef(null);

  useEffect(() => () => {
    pending.current?.abort();
    pending.current = null;
  }, [request]);

  useEffect(() => {
    if (!busy && result?.matches?.length) matchesHeading.current?.focus();
  }, [busy, result]);

  async function verify(entry) {
    if (pending.current) return;
    const operation = new AbortController();
    pending.current = operation;
    setBusy(true);
    setError('');
    setResult(null);
    let hasMatches = false;
    try {
      const next = await readMembership(request, entry, operation.signal);
      if (!Array.isArray(next?.matches) && !Object.prototype.hasOwnProperty.call(statuses, next?.status)) {
        throw new Error('Membership could not be verified.');
      }
      if (pending.current === operation) {
        hasMatches = Boolean(next.matches?.length);
        if (!next.matches) setValue('');
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
        if (!hasMatches) input.current?.focus();
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
    else if (entry?.barcodeValue) void verify(parseBarcode(entry.barcodeValue));
  }

  return (
    <div className="field-membership" aria-busy={busy}>
      <div className="field-tool__panel field-membership__scan">
        <form onSubmit={submit}>
          <label htmlFor="field-membership-card">Player name, ID, or card link</label>
          <div className="field-membership__entry">
            <input ref={input} className="form-control" id="field-membership-card" value={value}
              autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
              maxLength={512} required readOnly={busy}
              onChange={event => {
                setValue(event.target.value);
                setResult(null);
                setError('');
              }} />
            <button className="btn btn-primary" type="submit" disabled={busy}>Verify membership</button>
          </div>
        </form>
        <StaffCardScanner disabled={busy} onScan={scan} verifyLegacyCards />
      </div>
      {busy && <p role="status">Looking up the player…</p>}
      {error && <p className="field-membership__error" role="alert">{error}</p>}
      {result?.matches && <PlayerMatches matches={result.matches} onSelect={verify} heading={matchesHeading} />}
      {result?.status && <VerificationResult result={result} />}
    </div>
  );
}
