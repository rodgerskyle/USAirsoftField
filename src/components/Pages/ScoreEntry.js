import React, { useContext, useEffect, useRef, useState } from 'react';
import { Breadcrumb, Button, Card, Container, Form } from 'react-bootstrap';
import { Helmet } from 'react-helmet-async';
import { LinkContainer } from 'react-router-bootstrap';
import { onValue } from 'firebase/database';

import { withFirebase } from '../Firebase';
import { AuthUserContext, withAuthorization } from '../session';
import { ADMIN, WAIVER } from '../constants/roles';
import { getAllPlayerDisplayNames } from '../constants/playerDisplayNames';
import { readScannedMemberCard, readScannedPlayerProfile, verifyScannedMemberCard } from '../constants/scoreCards';
import { newScoreId } from '../constants/scoreHistory';
import { isCurrentScoreOperation, loadPlayerScoreHistory, recordPlayerResult, voidPlayerResult } from '../constants/scoreRecording';
import '../constants/admin.css';
import './ScoreEntry.css';

const playerId = /^[A-Za-z0-9_-]{1,128}$/;
const maxMatches = 10;
const maxRecentResults = 20;
const scannerRepeatWindow = 2000;
const pendingScorePrefix = 'usaw-score-pending-v1:';
const memoryAttempts = new Map();
const scoreDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const textValue = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
const normalized = value => textValue(value).toLowerCase();
const nameOf = member => member.name || member.username || member.uid;
const dateOf = row => scoreDate.format(new Date(`${row.date}T00:00:00Z`));

function memberDirectory(snapshot) {
    return Object.entries(snapshot.val() ?? {}).filter(([uid, member]) =>
        playerId.test(uid) && member && typeof member === 'object' && !Array.isArray(member) && !member.roles?.[WAIVER] && !member.accountRemovedAt
    ).map(([uid, member]) => ({ uid, name: textValue(member.name), username: textValue(member.username) }));
}

function findMembers(members, displayNames, value) {
    const uid = readScannedPlayerProfile(value);
    // Some Code 128 readers include the AIM symbology prefix before the ID.
    const barcodeId = /^\]C[01]([A-Za-z0-9_-]{10,128})$/.exec(value)?.[1];
    const direct = members.find(member => member.uid === (uid ?? barcodeId ?? value));
    if (direct || uid || barcodeId) return { direct, matches: [] };

    const query = normalized(value);
    const exact = [];
    const partial = [];
    for (const member of members) {
        const names = [member.name, member.username, displayNames[member.uid]].map(normalized);
        if (names.includes(query)) exact.push(member);
        else if (query.length >= 2 && names.some(name => name.includes(query))) partial.push(member);
    }
    return { matches: exact.length ? exact : partial };
}

function retryableAttempt(attempt, now) {
    return isCurrentScoreOperation(attempt?.id, attempt?.at, now);
}

function readStoredAttempt(storage, key) {
    try { return JSON.parse(storage.getItem(key) || 'null'); }
    catch { return null; }
}

function getPendingScore(key, now) {
    for (const [pendingKey, attempt] of memoryAttempts) {
        if (!retryableAttempt(attempt, now)) memoryAttempts.delete(pendingKey);
    }
    let attempt = memoryAttempts.get(key);
    try {
        const storage = window.sessionStorage;
        for (let index = storage.length - 1; index >= 0; index -= 1) {
            const pendingKey = storage.key(index);
            if (!pendingKey?.startsWith(pendingScorePrefix)) continue;
            const saved = readStoredAttempt(storage, pendingKey);
            if (!retryableAttempt(saved, now)) storage.removeItem(pendingKey);
            else if (pendingKey === key) attempt = saved;
        }
    } catch { /* Continue with this page's in-memory attempts. */ }
    return attempt ?? { id: newScoreId(), at: now };
}

function savePendingScore(key, attempt) {
    memoryAttempts.set(key, attempt);
    try { window.sessionStorage.setItem(key, JSON.stringify(attempt)); }
    catch { /* Private browsing may limit storage. */ }
}

function clearPendingScore(key, attempt) {
    if (memoryAttempts.get(key)?.id === attempt.id) memoryAttempts.delete(key);
    try {
        const storage = window.sessionStorage;
        if (readStoredAttempt(storage, key)?.id === attempt.id) storage.removeItem(key);
    } catch { /* Private browsing may limit storage. */ }
}

function ScoreEntry({ firebase, outcome }) {
    const admin = useContext(AuthUserContext);
    const isWin = outcome === 'win';
    const heading = isWin ? 'Enter Wins' : 'Enter Losses';
    const resultName = isWin ? 'Win' : 'Loss';
    const input = useRef(null);
    const mounted = useRef(false);
    const pending = useRef(null);
    const lastScan = useRef(null);
    const resultSequence = useRef(0);
    const [members, setMembers] = useState(null);
    const [directoryUnavailable, setDirectoryUnavailable] = useState(false);
    const [displayNames, setDisplayNames] = useState({});
    const [value, setValue] = useState('');
    const [matches, setMatches] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [recent, setRecent] = useState([]);
    const [correcting, setCorrecting] = useState(false);
    const [playerHistory, setPlayerHistory] = useState(null);
    const [correction, setCorrection] = useState(null);
    const [retryRemoval, setRetryRemoval] = useState(false);
    const counter = isWin ? 'wins' : 'losses';

    useEffect(() => {
        mounted.current = true;
        const controller = new AbortController();
        const unsubscribe = onValue(firebase.users(), snapshot => {
            setMembers(memberDirectory(snapshot));
            setDirectoryUnavailable(false);
        }, () => {
            setMembers(null);
            setDirectoryUnavailable(true);
        });
        getAllPlayerDisplayNames({ signal: controller.signal }).then(names => {
            if (!controller.signal.aborted) setDisplayNames(names);
        }).catch(() => {});
        return () => {
            mounted.current = false;
            pending.current?.abort();
            controller.abort();
            unsubscribe();
        };
    }, [firebase]);

    async function submitResult(rawInput, selectedMember, review = correcting) {
        const query = rawInput.trim();
        if (!query || !members || pending.current || retryRemoval) return;
        const staffUser = firebase.auth.currentUser;
        if (!staffUser || staffUser.uid !== admin?.uid) {
            setError('Sign in again to manage results.');
            return;
        }
        const controller = new AbortController();
        const submittedAt = Date.now();
        const submittedClock = performance.now();
        pending.current = controller;
        setBusy(true);
        setError('');
        setStatus('');
        setPlayerHistory(null);
        setCorrection(null);
        try {
            let member = selectedMember && members.find(entry => entry.uid === selectedMember.uid);
            if (selectedMember && !member) throw new Error('This player is no longer in the member directory. Search again.');
            if (!member) {
                const token = readScannedMemberCard(query);
                if (token) {
                    const uid = await verifyScannedMemberCard(firebase, token, { signal: controller.signal });
                    if (controller.signal.aborted) return;
                    member = members.find(entry => entry.uid === uid);
                } else {
                    const result = findMembers(members, displayNames, query);
                    member = result.direct;
                    setMatches(result.matches);
                    if (result.matches.length) return;
                }
            }
            if (!member) throw new Error('No matching USAW member. Check the name, player ID, or card.');

            if (firebase.auth.currentUser !== staffUser) throw new Error('The admin session changed. Sign in again to manage results.');
            if (review) {
                const { history } = await loadPlayerScoreHistory(firebase, member.uid);
                if (!mounted.current || controller.signal.aborted || firebase.auth.currentUser !== staffUser) return;
                setPlayerHistory({ member, history });
                setValue('');
                setMatches([]);
                return;
            }
            const previous = lastScan.current;
            if (!selectedMember && previous?.uid === member.uid && previous.outcome === outcome &&
                submittedClock - previous.clock < scannerRepeatWindow) {
                setStatus(`Repeat scan ignored for ${nameOf(member)}. Scan the next card.`);
                setValue('');
                setMatches([]);
                return;
            }
            const key = `${pendingScorePrefix}${staffUser.uid}:${outcome}:${member.uid}`;
            const operation = getPendingScore(key, submittedAt);
            savePendingScore(key, operation);
            await recordPlayerResult(firebase, member.uid, outcome, new Date(operation.at), operation.id);
            clearPendingScore(key, operation);
            if (!mounted.current || controller.signal.aborted) return;
            if (!selectedMember) lastScan.current = { uid: member.uid, outcome, clock: performance.now() };
            const item = { id: ++resultSequence.current, uid: member.uid, text: `${resultName} recorded for ${nameOf(member)}.` };
            setRecent(items => [item, ...items].slice(0, maxRecentResults));
            setValue('');
            setMatches([]);
        } catch (failure) {
            if (mounted.current && !controller.signal.aborted) {
                setError(failure?.message || (review ? 'Could not load recorded results. Try again.' : 'The result could not be recorded. Try again.'));
            }
        } finally {
            if (pending.current === controller) pending.current = null;
            if (mounted.current && !controller.signal.aborted) {
                setBusy(false);
                if (!review) input.current?.focus();
            }
        }
    }

    async function removeResult() {
        if (pending.current || !playerHistory || !correction) return;
        const { member } = playerHistory;
        const staffUser = firebase.auth.currentUser;
        if (!staffUser || staffUser.uid !== admin?.uid) {
            setError('Sign in again to correct a result.');
            return;
        }

        const controller = new AbortController();
        const expectedCount = correction[counter];
        const key = `${pendingScorePrefix}${staffUser.uid}:void:${outcome}:${member.uid}:${correction.day}:${expectedCount}`;
        const operation = getPendingScore(key, Date.now());
        savePendingScore(key, operation);
        pending.current = controller;
        setBusy(true);
        setError('');
        setStatus('');
        const current = () => mounted.current && !controller.signal.aborted && firebase.auth.currentUser === staffUser;
        try {
            const removed = await voidPlayerResult(firebase, member.uid, {
                day: correction.day, result: outcome, expectedCount, operationId: operation.id, operationAt: operation.at,
            });
            clearPendingScore(key, operation);
            if (!current()) return;
            setRetryRemoval(false);
            setCorrection(null);
            setPlayerHistory({ member, history: removed.history });
            const message = `${resultName} on ${dateOf(correction)} ${removed.duplicate ? 'already ' : ''}removed for ${nameOf(member)}.`;
            setStatus(message);
            const item = { id: ++resultSequence.current, uid: member.uid, text: message };
            setRecent(items => [item, ...items].slice(0, maxRecentResults));
        } catch (failure) {
            if (failure?.retryable !== true) clearPendingScore(key, operation);
            if (!current()) return;
            if (failure?.retryable === true) {
                setRetryRemoval(true);
                setError('Could not confirm the removal. Retry this same correction to check it.');
                return;
            }
            setRetryRemoval(false);
            setCorrection(null);
            if (failure?.code === 'score_changed') {
                setPlayerHistory(null);
                try {
                    const { history } = await loadPlayerScoreHistory(firebase, member.uid);
                    if (current()) setPlayerHistory({ member, history });
                } catch { /* The staff member can search for the player again. */ }
                if (current()) setError('That day’s results changed. Review the current list before trying again.');
                return;
            }
            setError(failure?.message || 'The result could not be removed. Try again.');
        } finally {
            if (pending.current === controller) pending.current = null;
            if (mounted.current && !controller.signal.aborted) setBusy(false);
        }
    }

    function changeMode(review) {
        if (pending.current || retryRemoval) return;
        setCorrecting(review);
        setValue('');
        setMatches([]);
        setPlayerHistory(null);
        setCorrection(null);
        setError('');
        setStatus('');
        input.current?.focus();
    }

    function submit(event) {
        event.preventDefault();
        // A hardware scan can send Enter before controlled input state is painted.
        submitResult(input.current?.value ?? value);
    }

    function changeValue(event) {
        setValue(event.target.value);
        setMatches([]);
        setPlayerHistory(null);
        setCorrection(null);
        setError('');
        setStatus('');
    }

    function handleInputKey(event) {
        if (event.key === 'Enter' && (event.repeat || event.nativeEvent.isComposing || event.keyCode === 229)) {
            event.preventDefault();
        }
    }

    return (
        <div className="admin-container admin-compact-page">
            <Helmet><title>{`US Airsoft Field: ${heading}`}</title></Helmet>
            <Container fluid className="admin-content">
                <div className="admin-page-header">
                    <h2 className="admin-header">{heading}</h2>
                    <Breadcrumb className="admin-breadcrumb admin-page-breadcrumb">
                        <LinkContainer to="/admin"><Breadcrumb.Item>Admin</Breadcrumb.Item></LinkContainer>
                        <Breadcrumb.Item active>{heading}</Breadcrumb.Item>
                    </Breadcrumb>
                </div>
                <Card className="admin-panel-card admin-points-card">
                    <Card.Body>
                        <Form className="admin-points-form" onSubmit={submit}>
                            <div className="score-entry-mode" role="group" aria-label="Score entry mode">
                                <Button variant={correcting ? 'outline-secondary' : 'secondary'} type="button"
                                    aria-pressed={!correcting} disabled={busy || retryRemoval} onClick={() => changeMode(false)}>Record {counter}</Button>
                                <Button variant={correcting ? 'secondary' : 'outline-secondary'} type="button"
                                    aria-pressed={correcting} disabled={busy || retryRemoval} onClick={() => changeMode(true)}>Correct {counter}</Button>
                            </div>
                            <Form.Group controlId="score-entry-player" className="admin-points-field">
                                <Form.Label>Scan a card or find a player</Form.Label>
                                <Form.Control ref={input} value={value} onChange={changeValue} onKeyDown={handleInputKey}
                                    autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
                                    inputMode="text" name="scorePlayer" readOnly={busy || retryRemoval} aria-describedby="score-entry-help"
                                    placeholder="Name, callsign, player ID, or profile link" />
                                <Form.Text id="score-entry-help">{correcting
                                    ? `Find a player to review their dated ${counter}. You’ll confirm the removal separately.`
                                    : 'Scan a card with this field focused. For a name or callsign, select the matching player before recording.'}</Form.Text>
                            </Form.Group>
                            {directoryUnavailable ? <p role="alert">Could not load the member directory. Reload this page to try again.</p>
                                : !members ? <p role="status">Loading members…</p> : null}
                            {error && <p role="alert">{error}</p>}
                            {status && <p role="status">{status}</p>}
                            {matches.length > 0 && (
                                <div className="score-entry-matches">
                                    <p>{correcting ? `Select the player to review their ${counter}.` : 'Select the player to record this result.'}</p>
                                    <ul aria-label="Matching players">
                                        {matches.slice(0, maxMatches).map(member => (
                                            <li key={member.uid}>
                                                <Button variant="outline-secondary" type="button" disabled={busy}
                                                    onClick={() => submitResult(input.current?.value ?? value, member)}>
                                                    <strong>{nameOf(member)}</strong>
                                                    <small>{[member.username, displayNames[member.uid], member.uid]
                                                        .filter((value, index, values) => value && value !== nameOf(member) && values.indexOf(value) === index)
                                                        .join(' · ') || member.uid}</small>
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                    {matches.length > maxMatches && <p>Enter a more specific name or player ID to see additional matches.</p>}
                                </div>
                            )}
                            <div className="admin-submit-row">
                                <Button className="button-submit-admin" type="submit" disabled={busy || !members || retryRemoval}>
                                    {busy ? (correcting ? 'Working…' : 'Recording…') : correcting ? `Find ${counter}` : `Record ${outcome}`}
                                </Button>
                            </div>
                        </Form>
                    </Card.Body>
                </Card>
                {correcting && playerHistory && (
                    <Card className="admin-panel-card">
                        <Card.Header>{nameOf(playerHistory.member)} · Recorded {counter}</Card.Header>
                        <Card.Body>
                            {correction ? (
                                <div className="score-entry-correction" aria-live="polite">
                                    <p><strong>Remove one {outcome} on {dateOf(correction)}?</strong></p>
                                    <p>This updates {nameOf(playerHistory.member)}’s leaderboard totals.</p>
                                    <div className="score-entry-mode">
                                        <Button variant="danger" type="button" disabled={busy} onClick={removeResult}>
                                            {retryRemoval ? 'Retry removal' : `Remove ${outcome}`}
                                        </Button>
                                        <Button variant="outline-secondary" type="button" disabled={busy || retryRemoval}
                                            onClick={() => setCorrection(null)}>Cancel</Button>
                                    </div>
                                </div>
                            ) : playerHistory.history.some(row => row[counter] > 0) ? (
                                <ul className="score-entry-history" aria-label={`Dated ${counter}`}>
                                    {playerHistory.history.filter(row => row[counter] > 0).map(row => (
                                        <li key={row.day}>
                                            <span><strong>{dateOf(row)}</strong><small>{row[counter]} {row[counter] === 1 ? outcome : counter}</small></span>
                                            <Button variant="outline-danger" type="button" disabled={busy}
                                                onClick={() => setCorrection(row)}>Remove one {outcome}</Button>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p>No dated {counter} are available to correct.</p>}
                        </Card.Body>
                    </Card>
                )}
                <Card className="status-card-admin admin-panel-card admin-status-card">
                    <Card.Header>Recent results</Card.Header>
                    <Card.Body className="status-card-body-admin" aria-live="polite" aria-relevant="additions text">
                        {recent.length ? recent.map((item, index) => (
                            <div className={`${index % 2 ? 'status-card-row-admin' : 'status-card-offrow-admin'} score-entry-recent`} key={item.id}>
                                <span>{item.text}</span>
                                <Button variant="outline-secondary" type="button" disabled={busy || retryRemoval}
                                    onClick={() => { changeMode(true); submitResult(item.uid, null, true); }}>Review {counter}</Button>
                            </div>
                        )) : <Card.Text className="status-card-row-admin">No results recorded in this session.</Card.Text>}
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
}

const isAdmin = user => Boolean(user?.roles?.[ADMIN]);

export default withAuthorization(isAdmin, { verifyOnMount: true })(withFirebase(ScoreEntry));
