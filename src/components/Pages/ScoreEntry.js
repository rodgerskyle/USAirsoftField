import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Breadcrumb, Button, Card, Container, Form } from 'react-bootstrap';
import { Helmet } from 'react-helmet-async';
import { LinkContainer } from 'react-router-bootstrap';
import { useLocation } from 'react-router-dom';
import { onValue } from 'firebase/database';

import { withFirebase } from '../Firebase';
import { AuthUserContext, withAuthorization } from '../session';
import { officialAccountRoles, WAIVER } from '../constants/roles';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';
import ScoreOverride, { extraResultsLabel } from './ScoreOverride';
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
import FieldSectionLinks from './FieldSectionLinks';
import './ScoreEntry.css';

const teamNames = { camo: 'Camo · Yellow', solid: 'Solid · Blue' };
const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const fieldTime = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' });
const textValue = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
const normalized = value => textValue(value).toLowerCase();
const nameOf = member => member.name || member.username || member.uid;
const dateOf = row => dateFormat.format(new Date(row.date + 'T00:00:00Z'));
const dateOfFieldDay = day => {
    const [year, month, date] = day.split('-').map(Number);
    return dateFormat.format(new Date(Date.UTC(year, month, date)));
};
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
            const previous = Object.hasOwn(scored, op.uid) ? scored[op.uid] : null;
            if (op.sourceEventId) {
                if (previous?.eventId === op.sourceEventId) {
                    scored[op.uid] = { ...previous, extraIds: [...new Set([...(previous.extraIds || []), ...saved.eventIds])] };
                }
            } else if (!removing && op.roundId === old.round.id) {
                scored[op.uid] = { outcome: op.outcome, eventId: saved?.eventId, day: saved?.day, at: op.at, mode: op.mode, side: op.side };
            } else if (removing && previous) {
                const removedId = saved?.eventId || op.targetEventId;
                if (removedId && (previous.eventId === removedId || previous.extraIds?.includes(removedId))) {
                    const originalVoided = previous.originalVoided || previous.eventId === removedId;
                    const checkedEvents = saved?.history?.find(row => row.day === op.day)?.events;
                    const extraIds = checkedEvents
                        ? checkedEvents.filter(event => event.sourceEventId === previous.eventId).map(event => event.id)
                        : [...new Set([...(previous.extraIds || []), ...(op.knownExtraIds || [])])].filter(id => id !== removedId);
                    if (originalVoided && !extraIds.length) delete scored[op.uid];
                    else scored[op.uid] = { ...previous, originalVoided, extraIds };
                }
            }
            const next = { ...old, round: { ...old.round, scored }, pending: old.pending.filter(item => item.id !== op.id) };
            if (!removing && !op.sourceEventId && op.patches?.badgeIds.length) {
                const job = { id: op.id, playerId: op.uid, playerName: op.registeredName, mode: op.mode,
                    day: saved.day, eventId: saved.eventId, badgeIds: op.patches.badgeIds };
                next.patchJobs = [...(old.patchJobs || []).filter(item => item.id !== op.id), job];
            }
            return next;
        });
        setRecent(old => [{ ...op, confirmedEventId: saved?.eventId, confirmedDay: saved?.day }, ...old].slice(0, 20));
        if (op.sourceEventId) {
            const totals = Number.isFinite(saved.wins) && Number.isFinite(saved.losses)
                ? ` Career totals: ${saved.wins} wins and ${saved.losses} losses.` : '';
            setStatus(`Added ${extraResultsLabel(op.quantity, op.outcome)} for ${op.registeredName || 'the player'}.${totals}`);
        } else void syncReceipt(op, saved);
        resetSearch();
        input.current?.focus();
    }

    async function saveOverride(op, checkOnly, current, signal) {
        const request = action => withinDeskTimeout(requestStaffFieldTool(firebase, actor, '/api/staff-score-overrides', {
            method: 'POST', signal, body: { action, playerId: op.uid, result: op.outcome, quantity: op.quantity,
                sourceDay: op.sourceDay, sourceEventId: op.sourceEventId, operationId: op.id, operationAt: op.at },
        }));
        try {
            let result;
            if (!checkOnly) {
                try {
                    result = await request('override');
                } catch (error) {
                    if (!current() || (error?.data?.retryable === false && error.data.code !== 'operation_expired')) throw error;
                }
            }
            if (!current()) return;
            if (!result?.confirmed) result = await request('status');
            if (!current()) return;
            if (result.confirmed && Array.isArray(result.eventIds) && result.eventIds.length === op.quantity) {
                finish(op, result);
            } else if (result.confirmed === false && result.retryable === false) {
                updateDesk(old => ({ ...old, pending: old.pending.filter(entry => entry.id !== op.id) }));
                setError('This override was not recorded and its retry window has closed. Review the player’s results.');
            } else {
                setStatus('Extra results are pending. Check saved status or retry the same submission.');
            }
        } catch (error) {
            if (!current()) return;
            if (error?.data?.retryable === false) {
                updateDesk(old => ({ ...old, pending: old.pending.filter(entry => entry.id !== op.id) }));
                setError(error.message || 'The override could not be applied.');
            } else {
                setError('Could not confirm the extra results. Check saved status or retry the same submission.');
            }
        }
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
            if (op.sourceEventId) {
                await saveOverride(op, checkOnly, current, signal);
                return;
            }
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

    function extraScoreControl(source, day, member) {
        if (!member || !source?.id || !day || source.sourceEventId || source.originalVoided) return null;
        const blocked = busy || desk.pending.some(op => op.uid === member.uid &&
            (op.day || op.sourceEventId === source.id || (!op.sourceEventId && (!op.roundId || op.roundId === round.id))));
        return <ScoreOverride key={member.uid + '/' + source.id} player={nameOf(member)}
            roundLabel={[Number.isSafeInteger(source.at) ? fieldTime.format(source.at) + ' Pacific' : dateOfFieldDay(day), detailsOf(source)].filter(Boolean).join(' · ')}
            disabled={blocked} onConfirm={(outcome, quantity) => {
                if (blocked || active.current || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return;
                saveScore({ uid: member.uid, registeredName: registeredName(member.name, member.uid), outcome, quantity,
                    sourceDay: day, sourceEventId: source.id, sourceAt: source.at, mode: source.mode, side: source.side,
                    ...(Object.hasOwn(round.scored, member.uid) && round.scored[member.uid].eventId === source.id && { roundId: round.id }), id: newScoreId(), at: Date.now() });
            }} />;
    }

    function record(outcome) {
        if (!canRecord || active.current) return;
        saveScore({ uid: selected.uid, registeredName: registeredName(selected.name, selected.uid),
            outcome, mode: round.mode, side: round.side, roundId: round.id, id: newScoreId(), at: Date.now(),
            ...(patchSelection.badgeIds.length > 0 && { patches: patchSelection }) });
    }

    function startRound() {
        if (active.current || !window.confirm('Start a new scoring round with the current mode and team?')) return;
        updateDesk(old => ({ ...old, round: { ...newScoreRound(), mode: old.round.mode, side: old.round.side } }));
        resetSearch(); setError(''); setStatus('New round started.');
        setCameraKey(old => old + 1);
        if (state.current.round.mode && state.current.round.side) input.current?.focus();
        else modeInput.current?.focus();
    }

    function clearEntries() {
        if (active.current || !window.confirm('Clear the search and recent entries from this desk? Official scores and player receipts are kept. Pending submissions can be shown again.')) return;
        resetSearch(); setRecent([]); setError(''); setStatus('Entries cleared. Scan the next player.');
        setCameraKey(old => old + 1);
        updateDesk(old => ({ ...old, pending: old.pending.map(op => ({ ...op, hidden: true })) }));
        input.current?.focus();
    }

    function changeRound(field, next) {
        const current = state.current;
        if (field === 'mode' && next !== current.round.mode) {
            setPatchSelection(emptyPatchSelection);
            const hasEntries = Object.keys(current.round.scored).length > 0 ||
                current.pending.some(op => op.roundId === current.round.id);
            if (hasEntries) {
                updateDesk(old => ({ ...old, round: { ...newScoreRound(), mode: next, side: old.round.side } }));
                setError('');
                setStatus(`Scoring a new round of ${next}.`);
                return;
            }
        }
        updateDesk(old => ({ ...old, round: { ...old.round, [field]: next } }));
        if (field === 'side' && next && !selected) input.current?.focus();
    }

    const visible = desk.pending.filter(op => !op.hidden);
    const hiddenCount = desk.pending.length - visible.length;
    const resultHint = new URLSearchParams(useLocation().search).get('result');
    return (
        <div className="admin-container admin-compact-page score-entry-page">
            <Helmet><title>US Airsoft Field: Wins and losses</title></Helmet>
            <Container fluid className="admin-content">
                <div className="admin-page-header">
                    <h1 className="admin-header">Wins and losses</h1>
                    <Breadcrumb className="admin-breadcrumb admin-page-breadcrumb">
                        <LinkContainer to="/admin"><Breadcrumb.Item>Admin</Breadcrumb.Item></LinkContainer>
                        <Breadcrumb.Item active>Wins and losses</Breadcrumb.Item>
                    </Breadcrumb>
                </div>
                <FieldSectionLinks label="Score desk sections" items={[
                    ['score-desk-round', 'Game setup'], ['score-desk-player', 'Player scoring'],
                    ['score-desk-awards', 'Awards'], ['score-desk-recent', 'Results'], ['score-desk-flags', 'Receipt flags'],
                ]} />
                <Card className="admin-panel-card">
                    <Card.Header as="h2" id="score-desk-round" tabIndex={-1}>Round details</Card.Header>
                    <Card.Body>
                        <div className="score-entry-context">
                            <Form.Group controlId="score-mode"><Form.Label>Game mode</Form.Label>
                                <Form.Select ref={modeInput} value={round.mode} disabled={busy} aria-describedby="score-mode-help" onChange={e => changeRound('mode', e.target.value)}>
                                    <option value="" disabled>Choose a game mode</option>
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
                        <Form.Text id="score-mode-help">Choose another mode to score the next game. Use Start new round to play the same mode again.</Form.Text>
                    </Card.Body>
                </Card>
                <Card className="admin-panel-card admin-points-card">
                    <Card.Header className="score-entry-section-heading"><h2 id="score-desk-player" tabIndex={-1}>Find a player</h2>
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
                            {saved ? <p role="status">{saved.originalVoided ? 'Extra results remain on this game.' : resultLabel(saved.outcome) + ' already recorded for this player in this round.'}</p>
                                : blocks ? <p>Review this player’s pending submission below.</p>
                                : !round.mode || !round.side ? <p>Select the game mode and team to record a result.</p> : null}
                            {round.mode && !saved && !blocks && <p className="score-entry-award-link">
                                <a href="#score-desk-awards">{patchSelection.badgeIds.length
                                    ? 'Change selected patches (' + patchSelection.badgeIds.length + ')' : 'Choose patches for this result'}</a>
                            </p>}
                            <div className="score-entry-mode">
                                {(resultHint === 'loss' ? ['loss', 'win'] : ['win', 'loss']).map(outcome =>
                                    <Button key={outcome} className={'score-result-' + outcome} variant={outcome === 'win' ? 'success' : 'danger'}
                                        disabled={!canRecord} onClick={() => record(outcome)}>Record {outcome}</Button>)}
                                <Button variant="outline-secondary" disabled={busy} onClick={() => review(selected)}>Review results</Button>
                                {saved && !history && extraScoreControl({ ...saved, id: saved.eventId }, saved.day, selected)}
                            </div>
                        </section>}
                    </Card.Body>
                </Card>
                <Card className="admin-panel-card">
                    <Card.Header as="h2" id="score-desk-awards" tabIndex={-1}>Patches &amp; Battle Badges</Card.Header>
                    <Card.Body>
                        <ScorePatchAwards firebase={firebase} mode={round.mode} player={selected && nameOf(selected)}
                            member={selected} roundSide={round.side}
                            disabled={Boolean(busy || saved || blocks)} selection={patchSelection} onChange={setPatchSelection}
                            jobs={desk.patchJobs || []} updateJob={updatePatchJob} />
                        {selected && !saved && <a className="score-entry-return" href="#score-desk-player">Return to player scoring</a>}
                    </Card.Body>
                </Card>
                {selected && history && <Card className="admin-panel-card">
                    <Card.Header as="h2" ref={historyPanel} tabIndex={-1}>Recorded results · {nameOf(selected)}</Card.Header>
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
                                    ...(correction.targetEventId && { knownExtraIds: (correction.events || []).filter(event =>
                                        event.sourceEventId === correction.targetEventId).map(event => event.id) }),
                                    ...(correction.legacyOnly && { legacyOnly: true }), ...(correction.fromFlag && { fromFlag: true }),
                                })}>Remove {correction.outcome}</Button>
                                <Button variant="outline-secondary" disabled={busy} onClick={() => setCorrection(null)}>Cancel</Button>
                            </div>
                        </div> : history.length ? <ul className="score-entry-history" aria-label="Dated results">
                            {history.map(row => <li key={row.day}>
                                <div><strong>{dateOf(row)}</strong><small>{row.wins} wins · {row.losses} losses</small></div>
                                <div className="score-entry-day-events">
                                    {(row.events || []).map(event => <div className="score-entry-recent" key={event.id}>
                                        <span>{event.sourceEventId ? 'Extra ' + event.outcome : resultLabel(event.outcome)} · {fieldTime.format(event.at)} Pacific
                                            <small>{detailsOf(event)}</small></span>
                                        <Button variant="outline-danger" disabled={busy || blocks} onClick={() => setCorrection({
                                            ...row, ...event, targetEventId: event.id, expectedCount: event.outcome === 'win' ? row.wins : row.losses,
                                        })}>Remove this {event.outcome}</Button>
                                        {extraScoreControl(event, row.day, selected)}
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
                    <Card.Header as="h2">Pending confirmations</Card.Header>
                    <Card.Body>
                        {visible.map(op => {
                            const member = membersById.get(op.uid);
                            const expired = !isCurrentScoreOperation(op.id, op.at);
                            return <section className="score-entry-pending" key={op.id}>
                                <strong>{op.sourceEventId ? extraResultsLabel(op.quantity, op.outcome) : (op.day ? 'Remove ' : '') + resultLabel(op.outcome)} · {member ? nameOf(member) : op.uid}</strong>
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
                    <Card.Header as="h2" id="score-desk-recent" tabIndex={-1}>Recent results</Card.Header>
                    <Card.Body className="status-card-body-admin" aria-live="polite" aria-relevant="additions text">
                        {recent.length ? recent.map((item, index) => {
                            const member = membersById.get(item.uid);
                            const name = registeredName(member?.name, item.uid) || registeredName(item.registeredName, item.uid);
                            const sourceId = item.sourceEventId || item.confirmedEventId;
                            const newerEntry = recent.slice(0, index).some(entry => entry.uid === item.uid &&
                                (entry.sourceEventId === sourceId || entry.targetEventId === sourceId));
                            const action = item.day ? ' removed' : ' recorded';
                            const result = item.sourceEventId ? extraResultsLabel(item.quantity, item.outcome) : resultLabel(item.outcome);
                            return <div key={item.id} className={(index % 2 ? 'status-card-row-admin' : 'status-card-offrow-admin') + ' score-entry-recent'}>
                                <span><strong data-outcome={item.outcome}>{result}{action}{name ? ' for ' + name + '.' : ' · Player name unavailable.'}</strong>
                                    <small>{detailsOf(item)}</small></span>
                                <Button variant="outline-secondary" disabled={busy || !member} onClick={() => review(member)}>Review results</Button>
                                {!selected && !item.day && !newerEntry &&
                                    extraScoreControl({ id: sourceId, at: item.sourceEventId ? item.sourceAt : item.at,
                                        mode: item.mode, side: item.side }, item.sourceDay || item.confirmedDay, member)}
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

const isAdmin = user => Boolean(officialAccountRoles(user?.roles).ADMIN);
export default withAuthorization(isAdmin, { verifyOnMount: true })(withFirebase(StaffScoreDesk));
