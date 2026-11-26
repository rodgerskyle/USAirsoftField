import React, { useEffect, useRef, useState } from 'react';
import { badgeById, staffKnifeKills } from '../constants/playerBadges';
import { newSubmissionId } from '../utils/submissionId';
import './KnifeKills.css';

const actions = { record: 'Record knife kills', opening: 'Save opening total', reconcile: 'Award earned patches' };
const format = number => number.toLocaleString('en-US');

function readPending(key) {
    try {
        const saved = JSON.parse(sessionStorage.getItem(key));
        return saved && Object.prototype.hasOwnProperty.call(actions, saved.action) && typeof saved.requestId === 'string' ? saved : null;
    } catch { return null; }
}

function writePending(key, item) {
    try {
        if (item) sessionStorage.setItem(key, JSON.stringify(item));
        else sessionStorage.removeItem(key);
    } catch { /* The active form still retains the request ID if storage is unavailable. */ }
}

function RecordForm({ firebase, token, player, onLock }) {
    const playerId = player.uid;
    const name = player.name || player.username || playerId;
    const key = 'usaw-knife-request:' + JSON.stringify([firebase.auth.currentUser?.uid, playerId]);
    const [pending, setPending] = useState(() => readPending(key));
    const [record, setRecord] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loadError, setLoadError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [count, setCount] = useState('1');
    const [opening, setOpening] = useState('');
    const [review, setReview] = useState(null);
    const [busy, setBusy] = useState(false);
    const mutation = useRef(null);
    const lock = useRef(onLock);
    lock.current = onLock;

    useEffect(() => {
        const controller = new AbortController();
        staffKnifeKills(firebase, token, playerId, { signal: controller.signal }).then(data => {
            if (!controller.signal.aborted) setRecord(data);
        }).catch(err => {
            if (controller.signal.aborted) return;
            if (err.status === 401) lock.current();
            else setLoadError(err.message || 'Could not load the player record.');
        });
        return () => controller.abort();
    }, [firebase, token, playerId, attempt]);
    useEffect(() => () => mutation.current?.abort(), []);

    function remember(item) {
        writePending(key, item);
        setPending(item);
    }

    async function submit(action, quantity) {
        if (mutation.current || !record) return;
        const item = pending || { action, requestId: newSubmissionId(), ...(action === 'reconcile' ? {} : { count: quantity }) };
        const controller = new AbortController();
        mutation.current = controller;
        remember(item);
        setBusy(true);
        setError('');
        setSuccess('');
        try {
            const data = await staffKnifeKills(firebase, token, playerId, { body: item, signal: controller.signal });
            if (controller.signal.aborted) return;
            const names = data.newlyEarned.map(id => badgeById[id]?.name || id);
            const message = item.action === 'opening' ? 'Opening total saved.' : item.action === 'reconcile'
                ? 'Patch record checked.' : 'Knife kills recorded.';
            setRecord(data);
            setSuccess(message + ' ' + name + ' now has ' + format(data.total) + '.' + (names.length ? ' Earned ' + names.join(', ') + '.' : ''));
            remember(null);
            setReview(null);
            setOpening('');
            setCount('1');
        } catch (err) {
            if (controller.signal.aborted) return;
            if (err.status === 401) { lock.current(); return; }
            if ([400, 403, 404, 409, 422].includes(err.status)) {
                remember(null);
                setReview(null);
                setRecord(null);
                setLoadError('');
                setAttempt(value => value + 1);
            }
            setError(err.message || 'Could not confirm the change.');
        } finally {
            mutation.current = null;
            if (!controller.signal.aborted) setBusy(false);
        }
    }

    const quantity = Number(count);
    const historical = Number(opening);
    const openingValid = /^\d+$/.test(opening) && Number.isSafeInteger(historical) && Number.isSafeInteger(historical + (record?.recorded || 0));
    return <div className="knife-record">
        <h4>{name}</h4>
        {!record && (loadError ? <div role="alert"><p>{loadError}</p>
            <button type="button" onClick={() => { setLoadError(''); setAttempt(value => value + 1); }}>Reload player record</button></div>
            : <p role="status">Loading player record…</p>)}
        {record && <>
            <dl className="knife-record__totals">
                <div><dt>Knife kills</dt><dd>{format(record.total)}</dd></div>
                <div><dt>Recorded here</dt><dd>{format(record.recorded)}</dd></div>
                <div><dt>Opening total</dt><dd>{record.openingTotal === null ? 'Not entered' : format(record.openingTotal)}</dd></div>
            </dl>
            <p>{record.eligibleForPatches ? 'Eligible for member patches.' : 'Kills count toward the standings. Patches can be awarded once membership is active.'}</p>
            {pending ? <div className="knife-record__pending" role="status">
                <p>{busy ? 'Saving' : 'Awaiting confirmation for'} {pending.action === 'record' ? format(pending.count) + ' new knife kills'
                    : pending.action === 'opening' ? 'an opening total of ' + format(pending.count) : 'earned patches'} for {name}.</p>
                {!busy && <button type="button" onClick={() => submit()}>Retry same entry</button>}
            </div> : <>
                <div className="knife-record__row"><label>New knife kills
                    <input type="number" min="1" step="1" inputMode="numeric" value={count} onChange={event => setCount(event.target.value)} />
                </label><button type="button" disabled={!/^\d+$/.test(count) || !Number.isSafeInteger(quantity) || quantity < 1 || !Number.isSafeInteger(record.total + quantity)}
                    onClick={() => submit('record', quantity)}>Record knife kills</button></div>
                {record.eligibleForPatches && record.pendingPatches.length > 0 && <button type="button" onClick={() => submit('reconcile')}>Award earned patches</button>}
                {record.openingTotal === null && <details>
                    <summary>Enter historical opening total</summary>
                    <p>Use kills from the field list that predate the entries recorded here. This opening total can be entered once.</p>
                    <div className="knife-record__row"><label>Historical knife kills
                        <input type="number" min="0" step="1" inputMode="numeric" value={opening}
                            onChange={event => { setOpening(event.target.value); setReview(null); }} />
                    </label><button type="button" disabled={!openingValid} onClick={() => setReview(historical)}>Review opening total</button></div>
                    {review !== null && <div><p>Save {format(review)} historical kills for {name}? With {format(record.recorded)} recorded here, their total will be {format(review + record.recorded)}.</p>
                        <button type="button" onClick={() => submit('opening', review)}>Confirm opening total</button></div>}
                </details>}
            </>}
            {record.history.length > 0 && <details><summary>Recent entries</summary>
                <ul>{record.history.map((row, index) => {
                    const date = new Date(row.recordedAt);
                    return <li key={row.recordedAt + ':' + index}>{row.type === 'opening' ? 'Opening total ' : 'Recorded +'}{format(row.count)}
                        {!Number.isNaN(date.valueOf()) && ' · ' + date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}</li>;
                })}</ul>
            </details>}
        </>}
        {error && <p role="alert">{error}</p>}
        {success && <p role="status">{success}</p>}
    </div>;
}

export default function StaffKnifeKills({ firebase, token, player, onLock, onRequestUnlock, id }) {
    const [open, setOpen] = useState(false);
    const [expired, setExpired] = useState(false);
    return <section id={id} className="knife-desk" aria-label="Knife kill recorder">
        <h3>Knife kill recorder</h3>
        {token ? <>
            <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? 'Close player record' : 'Open player record'}</button>
            {open && (player?.uid ? <RecordForm key={JSON.stringify([firebase.auth.currentUser?.uid, token, player.uid])} {...{ firebase, token, player }}
                onLock={() => { setExpired(true); onLock(); }} /> : <p>Select a registered player above to open their knife kill record.</p>)}
        </> : <>
            <p>{expired ? 'Staff access expired. Unlock staff controls again to continue.' : 'Unlock badge controls and select a player to record knife kills.'}</p>
            {onRequestUnlock && <button type="button" onClick={() => { setOpen(true); onRequestUnlock(); }}>Unlock knife kill recorder</button>}
        </>}
    </section>;
}
