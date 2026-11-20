import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Breadcrumb, Button, Card, Container, Form } from 'react-bootstrap';
import { Helmet } from 'react-helmet-async';
import { LinkContainer } from 'react-router-bootstrap';
import { useLocation } from 'react-router-dom';
import { onValue } from 'firebase/database';

import { withFirebase } from '../Firebase';
import { AuthUserContext, withAuthorization } from '../session';
import { ADMIN, WAIVER } from '../constants/roles';
import { getAllPlayerDisplayNames } from '../constants/playerDisplayNames';
import { isLegacyCardName, readScannedMemberCard, readScannedPlayerProfile, verifyScannedMemberCard } from '../constants/scoreCards';
import { newScoreId } from '../constants/scoreHistory';
import { checkScoreOperation, isCurrentScoreOperation, loadPlayerScoreHistory, recordPlayerResult, voidPlayerResult } from '../constants/scoreRecording';
import { gameModeNames } from './Gametypes';
import { loadDesk, newScoreRound, persistDesk } from './scoreEntrySession';
import { StaffCardScanner } from './StaffCardScanner';
import { ScorePatchAwards, emptyPatchSelection } from './ScorePatchAwards';
import { FlaggedRoundReceipts, requestScoreReceipts } from './FlaggedRoundReceipts';
import '../constants/admin.css';
import './ScoreEntry.css';

const teamNames = { camo: 'Camo · Yellow', solid: 'Solid · Blue' };
const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const fieldTime = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' });
const textValue = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
const normalized = value => textValue(value).toLowerCase();
const nameOf = member => member.name || member.username || member.uid;
const dateOf = row => dateFormat.format(new Date(row.date + 'T00:00:00Z'));
const resultLabel = outcome => outcome === 'win' ? 'Win' : 'Loss';
const detailsOf = entry => [entry.mode, teamNames[entry.side]].filter(Boolean).join(' · ');

function registeredName(value, uid) {
    const name = textValue(value);
    return normalized(name) === normalized(uid) || /\S+@\S+/.test(name) ? '' : name;
}

function memberDirectory(snapshot) {
    return Object.entries(snapshot.val() ?? {}).filter(([uid, member]) =>
        /^[A-Za-z0-9_-]{1,128}$/.test(uid) && member && typeof member === 'object' && !Array.isArray(member) &&
        !member.roles?.[WAIVER] && !member.accountRemovedAt
    ).map(([uid, member]) => ({ uid, name: textValue(member.name), username: textValue(member.username) }));
}

function findMembers(members, displayNames, raw) {
    const uid = readScannedPlayerProfile(raw);
    const value = raw.replace(/^\]C[01]/, '');
    const direct = members.find(member => member.uid === (uid || value));
    if (direct || uid) return { direct, matches: [] };
    const query = normalized(value);
    const exact = [];
    const partial = [];
    for (const member of members) {
        const names = [member.name, member.username, displayNames[member.uid]].map(normalized).filter(Boolean);
        // Older Code 128 cards use both parts of the legal name without spaces.
        const parts = normalized(member.name).split(' ');
        const printedNames = [parts.join(''), parts.slice().reverse().join('')];
        if (names.includes(query) || (isLegacyCardName(value) && printedNames.includes(query))) exact.push(member);
        else if (query.length >= 2 && names.some(name => name.includes(query))) partial.push(member);
    }
    return { matches: exact.length ? exact : partial };
}

async function withinDeskTimeout(work) {
    let timer;
    try {
        return await Promise.race([work, new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('The official score service did not respond in time.')), 12000);
        })]);
    } finally { clearTimeout(timer); }
}

function ScoreEntry({ firebase, actor }) {
    const [desk, setDesk] = useState(() => loadDesk(actor));
    const state = useRef(desk);
    const input = useRef(null);
    const historyPanel = useRef(null);
    const mounted = useRef(false);
    const modeInput = useRef(null);
    const active = useRef(null);
    const [members, setMembers] = useState(null);
    const membersById = useMemo(() => new Map(members?.map(member => [member.uid, member])), [members]);
    const [directoryUnavailable, setDirectoryUnavailable] = useState(false);
    const [displayNames, setDisplayNames] = useState({});
    const [value, setValue] = useState('');
    const [matches, setMatches] = useState([]);
    const [selected, setSelected] = useState(null);
    const [patchSelection, setPatchSelection] = useState(emptyPatchSelection);
    const [history, setHistory] = useState(null);
    const [correction, setCorrection] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [recent, setRecent] = useState([]);
    const [cameraKey, setCameraKey] = useState(0);
    const [closedFlag, setClosedFlag] = useState('');
    const [flagMessage, setFlagMessage] = useState('');
    const receiptRequest = (params, body, signal) => requestScoreReceipts(firebase, actor, params, body, signal);

    const updateDesk = useCallback(fn => {
        const next = fn(state.current);
        state.current = next;
        persistDesk(actor, next);
        setDesk(next);
    }, [actor]);

    const updatePatchJob = useCallback((id, apply) => updateDesk(old => ({
        ...old, patchJobs: (old.patchJobs || []).map(job => job.id === id ? apply(job) : job).filter(job => job.badgeIds.length),
    })), [updateDesk]);

    useEffect(() => {
        mounted.current = true;
        const controller = new AbortController();
        const unsubscribe = onValue(firebase.users(), snapshot => {
            if (!controller.signal.aborted) {
                setMembers(memberDirectory(snapshot));
                setDirectoryUnavailable(false);
            }
        }, () => {
            if (!controller.signal.aborted) { setMembers(null); setDirectoryUnavailable(true); }
        });
        getAllPlayerDisplayNames({ signal: controller.signal }).then(names => {
            if (!controller.signal.aborted) setDisplayNames(names);
        }).catch(() => {});
        return () => {
            mounted.current = false;
            active.current?.abort();
            controller.abort();
            unsubscribe();
        };
    }, [firebase]);

    async function perform(work) {
        if (active.current) return;
        const staff = firebase.auth.currentUser;
        if (!staff || staff.uid !== actor) { setError('Sign in again to manage results.'); return; }
        const controller = new AbortController();
        active.current = controller;
        setBusy(true);
        setStatus('');
        setError('');
        const current = () => !controller.signal.aborted && firebase.auth.currentUser === staff;
        try {
            await work(current, controller.signal);
        } catch (failure) {
            if (current()) setError(failure?.message || 'The request could not be completed. Try again.');
        } finally {
            if (active.current === controller) active.current = null;
            if (current()) setBusy(false);
        }
    }

    function resetSearch() {
        setValue(''); setMatches([]); setSelected(null); setHistory(null); setCorrection(null);
        setPatchSelection(emptyPatchSelection);
    }

    function selectPlayer(member) {
        resetSearch();
        setError(''); setStatus('');
        setSelected(member);
        const hidden = state.current.pending.some(op => op.uid === member.uid && op.hidden);
        if (hidden) updateDesk(old => ({ ...old, pending: old.pending.map(op => op.uid === member.uid ? { ...op, hidden: false } : op) }));
    }

    function lookup(raw, cardToken) {
        const query = raw.trim();
        if (!members || (!query && !cardToken)) return;
        void perform(async (current, signal) => {
            resetSearch();
            const token = cardToken || readScannedMemberCard(query);
            if (token) {
                const uid = await withinDeskTimeout(verifyScannedMemberCard(firebase, token, { signal }));
                if (!current()) return;
                const member = membersById.get(uid);
                if (!member) throw new Error('The verified card has no matching USAW member.');
                selectPlayer(member);
                return;
            }
            const { direct, matches: found } = findMembers(members, displayNames, query);
            if (direct) selectPlayer(direct);
            else if (found.length) { setValue(query); setMatches(found); }
            else throw new Error('No matching USAW member. Check the name, player ID, or card.');
        });
    }

    function review(member, flag) {
        void perform(async current => {
            selectPlayer(member);
            const data = await withinDeskTimeout(loadPlayerScoreHistory(firebase, member.uid));
            if (!current()) return;
            setHistory(data.history);
            if (flag) {
                const row = data.history.find(entry => entry.day === flag.day);
                const event = row?.events?.find(item => item.id === flag.id && item.outcome === flag.outcome);
                if (!event) throw new Error('This round has already changed. Refresh the flagged receipts.');
                setCorrection({ ...row, ...event, targetEventId: event.id, fromFlag: true,
                    expectedCount: event.outcome === 'win' ? row.wins : row.losses });
            }
            historyPanel.current?.focus();
        });
    }

    function reviewFlag(flag, correct) {
        setFlagMessage('');
        const member = membersById.get(flag.playerId);
        if (member) review(member, correct ? flag : null);
        else setError('The player is no longer in the member directory. Refresh the flagged receipts.');
    }

    // Official scores are committed before any Companion delivery request.
    async function syncReceipt(op, saved) {
        const id = saved?.eventId || op.targetEventId;
        const day = saved?.day || op.day;
        if (!id || !day) return;
        try {
            await receiptRequest(null, { action: 'sync', playerId: op.uid, id, day });
            if (op.fromFlag) {
                await receiptRequest(null, { action: 'resolve', playerId: op.uid, id });
                if (mounted.current) {
                    setClosedFlag(op.uid + '/' + id);
                    setFlagMessage('Result removed and flag closed.');
                }
            }
        } catch {
            // Reopening receipts and the scheduled sync can recover missed deliveries.
            if (op.fromFlag && mounted.current) setFlagMessage('The score was corrected. Refresh flags to finish reviewing this receipt.');
        }
    }

    function finish(op, saved) {
        const removing = Boolean(op.day);
        updateDesk(old => {
            let scored = { ...old.round.scored };
            if (!removing && op.roundId === old.round.id) {
                scored = { ...scored, [op.uid]: { outcome: op.outcome, eventId: saved?.eventId, mode: op.mode, side: op.side } };
            } else if (removing && scored[op.uid]?.eventId && scored[op.uid].eventId === (saved?.eventId || op.targetEventId)) {
                delete scored[op.uid];
            }
            const next = { ...old, round: { ...old.round, scored }, pending: old.pending.filter(item => item.id !== op.id) };
            if (!removing && op.patches?.badgeIds.length) {
                const job = { id: op.id, playerId: op.uid, playerName: op.registeredName, mode: op.mode,
                    day: saved.day, eventId: saved.eventId, ...op.patches };
                next.patchJobs = [...(old.patchJobs || []).filter(item => item.id !== op.id), job];
            }
            return next;
        });
        setRecent(old => [op, ...old].slice(0, 20));
        void syncReceipt(op, saved);
        resetSearch();
        input.current?.focus();
    }

    function saveScore(op, checkOnly = false) {
        void perform(async (current, signal) => {
            const pending = state.current.pending.some(item => item.id === op.id);
            if (op.fromFlag && !checkOnly) {
                const { flag } = await receiptRequest({ id: op.targetEventId, playerId: op.uid }, undefined, signal);
                if (!current()) return;
                if (!flag || flag.id !== op.targetEventId || flag.playerId !== op.uid || flag.outcome !== op.outcome ||
                    flag.day !== op.day || flag.voided || flag.flagStatus !== 'open') {
                    setCorrection(null);
                    if (!pending) throw new Error('This flag changed. Refresh the flagged receipts before correcting it.');
                    // An earlier attempt may already have removed the result. If staff
                    // closed the flag meanwhile, only confirm that attempt, never write.
                    checkOnly = true;
                }
            }
            if (!pending) updateDesk(old => ({ ...old, pending: [...old.pending, op] }));
            let writeFailure;
            if (!checkOnly) {
                try {
                    const result = await withinDeskTimeout(op.day
                        ? voidPlayerResult(firebase, op.uid, { day: op.day, result: op.outcome, expectedCount: op.expectedCount,
                            operationId: op.id, operationAt: op.at, targetEventId: op.targetEventId, ...(op.legacyOnly && { legacyOnly: true }) })
                        : recordPlayerResult(firebase, op.uid, op.outcome, new Date(op.at), op.id, { mode: op.mode, side: op.side }));
                    if (current()) finish(op, result);
                    return;
                } catch (failure) {
                    if (!current()) return;
                    if (failure.retryable === false && failure.code !== 'operation_expired') {
                        updateDesk(old => ({ ...old, pending: old.pending.filter(item => item.id !== op.id) }));
                        setHistory(null); setCorrection(null);
                        throw failure;
                    }
                    writeFailure = failure;
                }
            }
            try {
                // The correction marker identifies the original event by ID. Its game mode
                // and team describe that event and are only display labels on the correction.
                const expected = op.day ? { ...op, mode: undefined, side: undefined } : op;
                const result = await withinDeskTimeout(checkScoreOperation(firebase, op.uid, expected));
                if (!current()) return;
                if (result.confirmed) { finish(op, result); return; }
                setStatus('This submission has no confirmed result. You can check again or retry the same submission.');
            } catch (failure) {
                if (current()) setStatus('Confirmation is pending. You can check its saved status or scan the next player.');
                if (!writeFailure) throw failure;
            }
            if (current() && writeFailure) setError(writeFailure.message);
        });
    }

    const round = desk.round;
    const saved = selected && Object.hasOwn(round.scored, selected.uid) && round.scored[selected.uid];
    const blocks = selected && desk.pending.some(op => op.uid === selected.uid &&
        (op.day || !op.roundId || op.roundId === round.id));
    const canRecord = selected && !saved && !blocks && round.mode && round.side && !busy;

    function record(outcome) {
        if (!canRecord || active.current) return;
        saveScore({ uid: selected.uid, registeredName: registeredName(selected.name, selected.uid),
            outcome, mode: round.mode, side: round.side, roundId: round.id, id: newScoreId(), at: Date.now(),
            ...(patchSelection.badgeIds.length > 0 && { patches: { ...patchSelection, reason: patchSelection.reason.trim() } }) });
    }

    function startRound() {
        if (active.current || !window.confirm('Start a new round? Choose the new game mode and team. Pending submissions stay available with their original details.')) return;
        updateDesk(old => ({ ...old, round: newScoreRound() }));
        resetSearch(); setError(''); setStatus('New round started. Select the game mode and team.');
        setCameraKey(old => old + 1);
        modeInput.current?.focus();
    }

    function clearEntries() {
        if (active.current || !window.confirm('Clear the search and recent entries from this desk? Official scores and player receipts are kept. Pending submissions can be shown again.')) return;
        resetSearch(); setRecent([]); setError(''); setStatus('Entries cleared. Scan the next player.');
        setCameraKey(old => old + 1);
        updateDesk(old => ({ ...old, pending: old.pending.map(op => ({ ...op, hidden: true })) }));
        input.current?.focus();
    }

    function changeRound(field, next) {
        if (field === 'mode') setPatchSelection(emptyPatchSelection);
        updateDesk(old => ({ ...old, round: { ...old.round, [field]: next } }));
        if (field === 'side' && next && !selected) input.current?.focus();
    }

    const modeLocked = Object.keys(round.scored).length > 0 || desk.pending.some(op => op.roundId === round.id);
    const visible = desk.pending.filter(op => !op.hidden);
    const hiddenCount = desk.pending.length - visible.length;
    const resultHint = new URLSearchParams(useLocation().search).get('result');
    return (
        <div className="admin-container admin-compact-page score-entry-page">
            <Helmet><title>US Airsoft Field: Wins and losses</title></Helmet>
            <Container fluid className="admin-content">
                <div className="admin-page-header">
                    <h2 className="admin-header">Wins and losses</h2>
                    <Breadcrumb className="admin-breadcrumb admin-page-breadcrumb">
                        <LinkContainer to="/admin"><Breadcrumb.Item>Admin</Breadcrumb.Item></LinkContainer>
                        <Breadcrumb.Item active>Wins and losses</Breadcrumb.Item>
                    </Breadcrumb>
                </div>
                <Card className="admin-panel-card">
                    <Card.Header>Round details</Card.Header>
                    <Card.Body>
                        <div className="score-entry-context">
                            <Form.Group controlId="score-mode"><Form.Label>Game mode</Form.Label>
                                <Form.Select ref={modeInput} value={round.mode} disabled={busy || modeLocked} onChange={e => changeRound('mode', e.target.value)}>
                                    <option value="">Choose a game mode</option>
                                    {gameModeNames.map(name => <option key={name} value={name}>{name}</option>)}
                                </Form.Select>
                            </Form.Group>
                            <Form.Group controlId="score-team"><Form.Label>Player’s team</Form.Label>
                                <Form.Select value={round.side} disabled={busy} onChange={e => changeRound('side', e.target.value)}>
                                    <option value="">Choose a team</option>
                                    {Object.entries(teamNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                </Form.Select>
                            </Form.Group>
                            <Button variant="outline-secondary" disabled={busy} onClick={startRound}>Start new round</Button>
                        </div>
                        <Form.Text>These details appear on the player’s Companion receipt. Switch teams as you scan the other side.</Form.Text>
                        <ScorePatchAwards firebase={firebase} mode={round.mode} player={selected && nameOf(selected)}
                            member={selected} roundSide={round.side}
                            disabled={Boolean(busy || saved || blocks)} selection={patchSelection} onChange={setPatchSelection}
                            jobs={desk.patchJobs || []} updateJob={updatePatchJob} />
                    </Card.Body>
                </Card>
                <Card className="admin-panel-card admin-points-card">
                    <Card.Header className="score-entry-section-heading">Find a player
                        <Button variant="outline-secondary" type="button" disabled={busy} onClick={clearEntries}>Clear entries</Button>
                    </Card.Header>
                    <Card.Body>
                        <Form className="admin-points-form" onSubmit={event => {
                            event.preventDefault(); lookup(input.current?.value ?? value);
                        }}>
                            <Form.Group controlId="score-entry-player" className="admin-points-field">
                                <Form.Label>Scan a card or find a player</Form.Label>
                                <Form.Control ref={input} value={value} onChange={e => {
                                    resetSearch(); setValue(e.target.value); setError(''); setStatus('');
                                }} onKeyDown={event => {
                                    if (event.key === 'Enter' && (event.repeat || event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault();
                                }} autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
                                    inputMode="text" name="scorePlayer" readOnly={busy} maxLength={500} aria-describedby="score-entry-help"
                                    placeholder="Name, callsign, player ID, or profile link" />
                                <Form.Text id="score-entry-help">Focus this field for a connected scanner. Confirm the player before choosing a result.</Form.Text>
                            </Form.Group>
                            <div className="score-entry-mode">
                                <Button className="button-submit-admin" type="submit" disabled={busy || !members}>Find player</Button>
                                <StaffCardScanner key={cameraKey} disabled={busy || !members} verifyLegacyCards
                                    onScan={entry => lookup(entry.playerId || entry.barcodeValue || '', entry.cardToken)} />
                            </div>
                        </Form>
                        {directoryUnavailable ? <p role="alert">Could not load the member directory. Reload to try again.</p>
                            : !members ? <p role="status">Loading members…</p> : null}
                        {busy && <p role="status">Working…</p>}
                        {error && <p role="alert">{error}</p>}
                        {status && <p role="status">{status}</p>}
                        {!!matches.length && <div className="score-entry-matches"><p>Choose the matching player.</p>
                            <ul aria-label="Matching players">{matches.slice(0, 10).map(member => (
                                <li key={member.uid}><Button variant="outline-secondary" disabled={busy} onClick={() => selectPlayer(member)}>
                                    <strong>{nameOf(member)}</strong>
                                    <small>{[member.username, displayNames[member.uid], member.uid].filter((part, index, all) =>
                                        part && part !== nameOf(member) && all.indexOf(part) === index).join(' · ') || member.uid}</small>
                                </Button></li>
                            ))}</ul>{matches.length > 10 && <p>Enter a more specific name or player ID.</p>}</div>}
                        {selected && <section aria-label="Selected player" className="score-entry-selected">
                            <h3>{nameOf(selected)}</h3>
                            <p>{[displayNames[selected.uid], selected.uid].filter(Boolean).join(' · ')}</p>
                            {saved ? <p role="status">{resultLabel(saved.outcome)} already recorded for this player in this round.</p>
                                : blocks ? <p>Review this player’s pending submission below.</p>
                                : !round.mode || !round.side ? <p>Select the game mode and team to record a result.</p> : null}
                            <div className="score-entry-mode">
                                {(resultHint === 'loss' ? ['loss', 'win'] : ['win', 'loss']).map(outcome =>
                                    <Button key={outcome} className={'score-result-' + outcome} variant={outcome === 'win' ? 'success' : 'danger'}
                                        disabled={!canRecord} onClick={() => record(outcome)}>Record {outcome}</Button>)}
                                <Button variant="outline-secondary" disabled={busy} onClick={() => review(selected)}>Review results</Button>
                            </div>
                        </section>}
                    </Card.Body>
                </Card>
                {selected && history && <Card className="admin-panel-card">
                    <Card.Header ref={historyPanel} tabIndex={-1}>Recorded results · {nameOf(selected)}</Card.Header>
                    <Card.Body>
                        {correction ? <div className="score-entry-correction" aria-live="polite">
                            <strong>Remove one {correction.outcome} on {dateOf(correction)}?</strong>
                            {detailsOf(correction) && <p>{detailsOf(correction)}</p>}
                            <p>This updates the player’s totals.{correction.targetEventId && ' The receipt for this round will show the correction.'}</p>
                            <div className="score-entry-mode">
                                <Button variant="danger" disabled={busy || blocks} onClick={() => saveScore({
                                    uid: selected.uid, registeredName: registeredName(selected.name, selected.uid),
                                    day: correction.day, outcome: correction.outcome, expectedCount: correction.expectedCount,
                                    targetEventId: correction.targetEventId, mode: correction.mode, side: correction.side, id: newScoreId(), at: Date.now(),
                                    ...(correction.legacyOnly && { legacyOnly: true }), ...(correction.fromFlag && { fromFlag: true }),
                                })}>Remove {correction.outcome}</Button>
                                <Button variant="outline-secondary" disabled={busy} onClick={() => setCorrection(null)}>Cancel</Button>
                            </div>
                        </div> : history.length ? <ul className="score-entry-history" aria-label="Dated results">
                            {history.map(row => <li key={row.day}>
                                <div><strong>{dateOf(row)}</strong><small>{row.wins} wins · {row.losses} losses</small></div>
                                <div className="score-entry-day-events">
                                    {(row.events || []).map(event => <div className="score-entry-recent" key={event.id}>
                                        <span>{resultLabel(event.outcome)} · {fieldTime.format(event.at)} Pacific
                                            <small>{detailsOf(event)}</small></span>
                                        <Button variant="outline-danger" disabled={busy || blocks} onClick={() => setCorrection({
                                            ...row, ...event, targetEventId: event.id, expectedCount: event.outcome === 'win' ? row.wins : row.losses,
                                        })}>Remove this {event.outcome}</Button>
                                    </div>)}
                                    {['win', 'loss'].map(outcome => {
                                        const count = outcome === 'win' ? row.wins : row.losses;
                                        const recorded = (row.events || []).filter(event => event.outcome === outcome).length;
                                        if (count <= recorded) return null;
                                        return <Button key={outcome} variant="outline-danger" disabled={busy || blocks}
                                            onClick={() => setCorrection({ ...row, outcome, expectedCount: count, legacyOnly: true })}>
                                            Remove one {recorded ? 'untimed ' : ''}{outcome}</Button>;
                                    })}
                                </div>
                            </li>)}
                        </ul> : <p>No dated results are available to correct.</p>}
                    </Card.Body>
                </Card>}
                {(visible.length > 0 || hiddenCount > 0) && <Card className="admin-panel-card">
                    <Card.Header>Pending confirmations</Card.Header>
                    <Card.Body>
                        {visible.map(op => {
                            const member = membersById.get(op.uid);
                            const expired = !isCurrentScoreOperation(op.id, op.at);
                            return <section className="score-entry-pending" key={op.id}>
                                <strong>{op.day ? 'Remove ' : ''}{resultLabel(op.outcome)} · {member ? nameOf(member) : op.uid}</strong>
                                <p>{[detailsOf(op), fieldTime.format(op.at) + ' Pacific'].filter(Boolean).join(' · ')}</p>
                                <small>Reference {op.id}</small>
                                <div className="score-entry-mode">
                                    <Button variant="outline-secondary" disabled={busy} onClick={() => saveScore(op, true)}>Check saved status</Button>
                                    {expired ? <Button variant="outline-secondary" disabled={busy} onClick={() => {
                                        if (window.confirm('Have you verified this expired submission against the official player record?')) {
                                            updateDesk(old => ({ ...old, pending: old.pending.filter(item => item.id !== op.id) }));
                                        }
                                    }}>Mark manually reviewed</Button> :
                                        <Button variant="outline-secondary" disabled={busy} onClick={() => saveScore(op)}>Retry same submission</Button>}
                                </div>
                            </section>;
                        })}
                        {hiddenCount > 0 && <Button variant="outline-secondary" disabled={busy} onClick={() =>
                            updateDesk(old => ({ ...old, pending: old.pending.map(op => ({ ...op, hidden: false })) }))
                        }>Show cleared pending entries ({hiddenCount})</Button>}
                    </Card.Body>
                </Card>}
                <Card className="status-card-admin admin-panel-card admin-status-card">
                    <Card.Header>Recent results</Card.Header>
                    <Card.Body className="status-card-body-admin" aria-live="polite" aria-relevant="additions text">
                        {recent.length ? recent.map((item, index) => {
                            const member = membersById.get(item.uid);
                            const name = registeredName(member?.name, item.uid) || registeredName(item.registeredName, item.uid);
                            const action = item.day ? ' removed' : ' recorded';
                            return <div key={item.id} className={(index % 2 ? 'status-card-row-admin' : 'status-card-offrow-admin') + ' score-entry-recent'}>
                                <span><strong data-outcome={item.outcome}>{resultLabel(item.outcome)}{action}{name ? ' for ' + name + '.' : ' · Player name unavailable.'}</strong>
                                    <small>{detailsOf(item)}</small></span>
                                <Button variant="outline-secondary" disabled={busy || !member} onClick={() => review(member)}>Review results</Button>
                            </div>;
                        }) : <Card.Text className="status-card-row-admin">No results recorded in this session.</Card.Text>}
                    </Card.Body>
                </Card>
                <FlaggedRoundReceipts request={receiptRequest} disabled={busy} resolved={closedFlag} updateMessage={flagMessage}
                    getPlayerName={uid => registeredName(membersById.get(uid)?.name, uid)}
                    onReview={flag => reviewFlag(flag, false)} onCorrect={flag => reviewFlag(flag, true)} />
            </Container>
        </div>
    );
}

function StaffScoreDesk({ firebase }) {
    const actor = useContext(AuthUserContext).uid;
    return <ScoreEntry key={actor} actor={actor} firebase={firebase} />;
}

const isAdmin = user => Boolean(user?.roles?.[ADMIN]);
export default withAuthorization(isAdmin, { verifyOnMount: true })(withFirebase(StaffScoreDesk));
