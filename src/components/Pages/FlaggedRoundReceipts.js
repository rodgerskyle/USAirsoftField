import React, { useEffect, useRef, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';

const endpoint = '/api/staff-round-result-receipts';
const when = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short',
});
const sideLabels = { camo: 'Camo · Yellow', solid: 'Solid · Blue' };
const flagKey = flag => flag.playerId + '/' + flag.id;

export async function requestScoreReceipts(firebase, actor, params, body, signal) {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (signal?.aborted) throw new DOMException('Request canceled', 'AbortError');
    // Also bound the wait for a Firebase access token, which fetch's signal cannot cancel.
    const canceled = new Promise((_, reject) => controller.signal.addEventListener('abort',
        () => reject(new DOMException('Request canceled', 'AbortError')), { once: true }));
    signal?.addEventListener('abort', cancel, { once: true });
    const timeout = setTimeout(cancel, 12000);
    const query = new URLSearchParams(params || {}).toString();
    try {
        return await Promise.race([canceled, requestStaffFieldTool(firebase, actor, endpoint + (query ? '?' + query : ''), {
            method: body ? 'POST' : 'GET', body, signal: controller.signal,
        })]);
    } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', cancel);
    }
}

export function FlaggedRoundReceipts({ request, getPlayerName, disabled, onReview, onCorrect, resolved, updateMessage }) {
    const [flags, setFlags] = useState(null);
    const [cursor, setCursor] = useState(null);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [busy, setBusy] = useState(false);
    const active = useRef(null);
    useEffect(() => () => active.current?.abort(), []);
    useEffect(() => {
        if (resolved) setFlags(old => old && old.filter(flag => flagKey(flag) !== resolved));
    }, [resolved]);

    async function run(work) {
        if (active.current || disabled) return;
        const operation = new AbortController();
        active.current = operation;
        setBusy(true); setError(''); setStatus('');
        try {
            await work(operation.signal);
        } catch (failure) {
            if (!operation.signal.aborted) setError(failure.name === 'AbortError'
                ? 'The request timed out. Refresh the flagged receipts and try again.'
                : failure.message || 'Could not load flagged receipts.');
        } finally {
            if (!operation.signal.aborted) setBusy(false);
            active.current = null;
        }
    }

    function load(append = false) {
        return run(async signal => {
            const data = await request(append && cursor ? { cursor } : null, undefined, signal);
            if (signal.aborted) return;
            if (!Array.isArray(data?.flags)) throw new Error('Could not load flagged receipts.');
            setFlags(old => [...new Map([...(append ? old || [] : []), ...data.flags].map(flag => [flagKey(flag), flag])).values()]);
            setCursor(data.nextCursor || null);
        });
    }

    function close(flag, action, playerName) {
        const label = playerName || 'this player';
        if (!window.confirm(action === 'dismiss' ? 'Keep the ' + flag.outcome + ' for ' + label + ' and close this flag?'
            : 'Close the corrected receipt for ' + label + '?')) return;
        return run(async signal => {
            await request(null, { action, playerId: flag.playerId, id: flag.id }, signal);
            if (!signal.aborted) {
                setFlags(old => old.filter(item => flagKey(item) !== flagKey(flag)));
                setStatus('Flag closed.');
            }
        });
    }

    return <Card className="admin-panel-card">
        <Card.Header className="score-entry-section-heading"><h2 id="score-desk-flags" tabIndex={-1}>Flagged round receipts</h2>
            <Button variant="outline-secondary" disabled={disabled || busy} onClick={() => load()}>
                {flags ? 'Refresh flags' : 'View flagged receipts'}
            </Button>
        </Card.Header>
        <Card.Body>
            {!flags ? <p>Review reports players sent from their Companion receipts.</p>
                : !flags.length ? <p>No open receipt flags.</p> : flags.map(flag => {
                    const playerName = getPlayerName(flag.playerId);
                    const details = [flag.mode, sideLabels[flag.side], when.format(flag.at) + ' Pacific'].filter(Boolean).join(' · ');
                    return <details key={flagKey(flag)} className="score-receipt-flag">
                        <summary><strong>{flag.outcome === 'win' ? 'Win' : 'Loss'} · {playerName || 'Player name unavailable'}</strong><small>{details}</small></summary>
                        <p className="score-flag-reason">{flag.reason}</p>
                        <small>Receipt · {flag.id}</small>
                        <div className="score-entry-mode">
                            <Button variant="outline-secondary" disabled={busy || disabled} onClick={() => onReview(flag)}>Open player record</Button>
                            {flag.voided ? <Button variant="outline-secondary" disabled={busy || disabled}
                                onClick={() => close(flag, 'resolve', playerName)}>Close corrected flag</Button> : <>
                                <Button variant="outline-danger" disabled={busy || disabled} onClick={() => onCorrect(flag)}>Review correction</Button>
                                <Button variant="outline-secondary" disabled={busy || disabled}
                                    onClick={() => close(flag, 'dismiss', playerName)}>Keep result and close flag</Button>
                            </>}
                        </div>
                    </details>;
                })}
            {cursor && <Button variant="outline-secondary" disabled={disabled || busy} onClick={() => load(true)}>Load more flags</Button>}
            {busy && <p role="status">Loading…</p>}
            {error && <p role="alert">{error}</p>}
            {status && <p role="status">{status}</p>}
            {updateMessage && <p role="status">{updateMessage}</p>}
        </Card.Body>
    </Card>;
}
