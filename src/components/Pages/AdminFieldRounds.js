import React, { useEffect, useRef, useState } from 'react';
import {
    barracksClockTitles, fieldTimeInput, fieldTimeISO, formatFieldTime, formatRoundCountdown, isOpenVote, liveRounds, mvpNominationText,
    LIVE_ROUNDS_PATH, ROUND_CATALOG_PATH, STAFF_ROUNDS_PATH, RoundRespawns, runningBarracksClock, useLiveFieldBoard,
} from './FieldRoundsShared';
import { FieldPinPicker, readMapPins, roundPinLocation } from './FieldRoundMap';
import { RoundBriefingEditor } from './RoundBriefing';
import { fieldStaffPaths } from '../constants/fieldStaffApi';
import FieldSectionLinks from './FieldSectionLinks';
import { mountRoundConsole, roundConsoleNotice } from './round-console';
import './FieldRounds.css';

const roundSections = [
    ['field-break-title', 'TV countdown'],
    ['field-rounds-current', 'Rounds'],
    ['field-rounds-schedule', 'Schedule'],
    ['field-rounds-vote', 'Game mode vote'],
];
const defaultVoteModes = ['countdown', 'three-flag', 'downed-pilot'];
const actions = {
    startRound: 'Round started. The countdown is live.',
    delayRound: 'Round delayed by five minutes.',
    endRound: 'Round ended.',
    cancelGame: 'Round removed from the schedule.',
    updateSpawns: 'Round locations updated.',
    createGame: 'Round added to the field schedule.',
    createPoll: 'Player voting is open.',
    closePoll: 'Voting closed.',
    clearPoll: 'Vote cleared from Barracks TV and player voting.',
    publishWinner: 'Winning round added to the field schedule.',
    createMvpPoll: 'Round MVP voting is open.',
    closeMvpPoll: 'Round MVP voting closed.',
    clearMvpPoll: 'Round MVP vote cleared.',
    setBarracksClock: 'Countdown sent to Barracks TV.',
    clearBarracksClock: 'TV countdown stopped.',
};

function RoundConsole({ board, now, disabled, save }) {
    const root = useRef(null);
    const panel = useRef(null);
    const saver = useRef(save);
    saver.current = save;
    useEffect(() => {
        panel.current = mountRoundConsole(root.current, {
            save: body => saver.current(body),
            timingUrl: 'https://app.usairsoftfield.com/#staff/tool/game-timing',
        });
        return () => panel.current.destroy();
    }, []);
    useEffect(() => panel.current.update(board, now, disabled), [board, now, disabled]);
    return <div ref={root} />;
}

function BarracksClockControls({ clock, now, disabled, onSave }) {
    const form = useRef(null);
    const active = runningBarracksClock(clock, now);
    const safetyBrief = clock?.kind === 'safetyBrief';
    const name = barracksClockTitles[clock?.kind];
    const revision = clock?.revision ?? 0;
    function start(kind, durationMinutes) {
        void onSave({ action: 'setBarracksClock', kind, durationMinutes, revision });
    }
    function startPreset(kind, minutes) {
        form.current.elements.kind.value = kind;
        form.current.elements.minutes.value = minutes;
        start(kind, minutes);
    }
    function setCustom(event) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        start(data.get('kind'), Number(data.get('minutes')));
    }
    return (
        <section className="field-rounds-panel field-break-controls" aria-labelledby="field-break-title">
            <h2 id="field-break-title" tabIndex={-1}>Barracks TV countdown</h2>
            {active ? <p>{name} {safetyBrief ? 'starts at' : 'ends at'} {formatFieldTime(clock.endsAt)} · <strong role="timer" aria-label={safetyBrief ? 'Time until safety brief' : 'Break time remaining'}>
                {formatRoundCountdown(Date.parse(clock.endsAt) - now)}
            </strong></p> : <p>{clock?.endsAt && name ? name + ' countdown finished.' : 'No countdown running.'}</p>}
            <div className="field-rounds-actions">
                <button type="button" className="btn btn-primary" disabled={disabled} onClick={() => startPreset('break', 5)}>5-minute break</button>
                <button type="button" className="btn btn-primary" disabled={disabled} onClick={() => startPreset('lunch', 30)}>30-minute lunch</button>
                <button type="button" className="btn btn-primary" disabled={disabled} onClick={() => startPreset('safetyBrief', 60)}>60 min to safety brief</button>
                {clock?.kind && <button type="button" className="btn btn-outline-danger" disabled={disabled}
                    onClick={() => void onSave({ action: 'clearBarracksClock', revision, ...(!active && { observedEndsAt: clock.endsAt }) })}>
                    {active ? 'Stop timer' : 'Mark countdown finished'}</button>}
            </div>
            <form ref={form} className="field-rounds-form" onSubmit={setCustom}>
                <fieldset className="field-break-custom" disabled={disabled}>
                    <label>Timer type<select name="kind" defaultValue={active ? clock.kind : 'break'}>
                        <option value="break">Break between games</option><option value="lunch">Lunch</option><option value="safetyBrief">Safety brief</option>
                    </select></label>
                    <label>Minutes<input name="minutes" type="number" min="1" max="180" defaultValue="10" required /></label>
                    <button className="btn btn-outline-primary" type="submit">{active ? 'Replace timer' : 'Start custom timer'}</button>
                </fieldset>
            </form>
        </section>
    );
}

function formText(data, name) {
    return String(data.get(name) ?? '').trim();
}

function roundFormData(form) {
    const data = new FormData(form);
    return {
        modeId: formText(data, 'modeId'),
        startsAt: fieldTimeISO(formText(data, 'startsAt')),
        durationMinutes: Number(data.get('durationMinutes')),
        location: formText(data, 'location'),
        briefingLocation: formText(data, 'briefingLocation'),
        notes: formText(data, 'notes'),
        camoSpawn: formText(data, 'camoSpawn'),
        solidSpawn: formText(data, 'solidSpawn'),
        staffControlled: data.has('staffControlled'),
    };
}

function SpawnInputs({ round }) {
    return (
        <div className="field-rounds-fields">
            <label>Camo respawn<input name="camoSpawn" defaultValue={round?.camoSpawn} maxLength={100} placeholder="e.g. Alpha HQ" /></label>
            <label>Solid respawn<input name="solidSpawn" defaultValue={round?.solidSpawn} maxLength={100} placeholder="e.g. Foxtrot HQ" /></label>
        </div>
    );
}

function RoundForm({ catalog, poll, now, disabled, onSave }) {
    const winners = poll?.options.filter(option => poll.winnerModeIds.includes(option.modeId));
    const defaultMode = winners ? winners[0]?.modeId : catalog.sections.flatMap(section => section.modes)
        .find(mode => mode.id === 'countdown')?.id;
    const [error, setError] = useState('');
    const [mapPins, setMapPins] = useState({});
    async function submit(event) {
        event.preventDefault();
        const form = event.currentTarget;
        try {
            const values = roundFormData(form);
            if (Object.keys(mapPins).length) values.mapPins = mapPins;
            setError('');
            const saved = await onSave(poll
                ? { ...values, action: 'publishWinner', pollId: poll.id }
                : { ...values, action: 'createGame' });
            if (saved && !poll) {
                form.reset();
                setMapPins({});
                form.elements.startsAt.value = fieldTimeInput(now + 15 * 60000);
            }
        } catch (failure) {
            setError(failure.message);
        }
    }

    return (
        <form className="field-rounds-form" onSubmit={submit}>
            <fieldset disabled={disabled}>
                <label>
                    {winners ? 'Winning mode' : 'Game mode'}
                    <select name="modeId" defaultValue={defaultMode} required>
                        {winners ? winners.map(option => <option key={option.modeId} value={option.modeId}>{option.label}</option>)
                            : catalog.sections.map(section => <optgroup key={section.name} label={section.name}>
                                {section.modes.map(mode => <option key={mode.id} value={mode.id}>{mode.name}</option>)}
                            </optgroup>)}
                    </select>
                </label>
                <div className="field-rounds-fields">
                    <label>Start time · California<input name="startsAt" type="datetime-local" defaultValue={fieldTimeInput(now + 15 * 60000)} required /></label>
                    <label>Duration (minutes)<input name="durationMinutes" type="number" min={5} max={90} defaultValue={25} required /></label>
                    <label>Field location<input name="location" maxLength={80} defaultValue="Main field" /></label>
                    <label>Briefing location<input name="briefingLocation" maxLength={80} placeholder="e.g. Barracks" /></label>
                </div>
                <SpawnInputs />
                <details>
                    <summary>Place map pins</summary>
                    <FieldPinPicker pins={mapPins} onChange={setMapPins} />
                </details>
                <label>Briefing notes<textarea name="notes" rows={2} maxLength={300} placeholder="Objective details or gear reminders" /></label>
                <label className="field-rounds-option"><input type="checkbox" name="staffControlled" defaultChecked /> Wait for staff to start the round</label>
                <button className="btn btn-primary" type="submit">{poll ? 'Publish winning round' : 'Add to field schedule'}</button>
            </fieldset>
            {error && <p className="field-rounds-error" role="alert">{error}</p>}
        </form>
    );
}

function PollForm({ catalog, now, disabled, onSave }) {
    const [query, setQuery] = useState('');
    const available = catalog.sections.flatMap(section => section.modes.map(mode => mode.id));
    const initial = defaultVoteModes.filter(id => available.includes(id));
    const [selected, setSelected] = useState(initial);
    const [error, setError] = useState('');
    const search = query.trim().toLowerCase();
    const sections = catalog.sections.map(section => ({
        ...section, modes: section.modes.filter(mode => mode.name.toLowerCase().includes(search)),
    })).filter(section => section.modes.length);

    function toggle(id) {
        setSelected(current => current.includes(id) ? current.filter(mode => mode !== id) : [...current, id]);
        setError('');
    }

    async function submit(event) {
        event.preventDefault();
        const form = event.currentTarget;
        try {
            if (selected.length < catalog.minOptions || selected.length > catalog.maxOptions) {
                throw new Error(`Choose ${catalog.minOptions}–${catalog.maxOptions} different modes.`);
            }
            const data = new FormData(form);
            setError('');
            await onSave({
                action: 'createPoll', title: formText(data, 'title'), options: selected,
                closesAt: fieldTimeISO(formText(data, 'closesAt')),
            });
        } catch (failure) {
            setError(failure.message);
        }
    }

    return (
        <form className="field-rounds-form" onSubmit={submit}>
            <fieldset disabled={disabled}>
                <label>Poll question<input name="title" maxLength={100} defaultValue="What should we play next?" required /></label>
                <label>Voting closes · California<input name="closesAt" type="datetime-local" defaultValue={fieldTimeInput(now + 10 * 60000)} required /></label>
                <label>Find game modes<input type="search" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }} /></label>
                <p>{selected.length} selected. Choose {catalog.minOptions}–{catalog.maxOptions} modes.</p>
                <div className="field-rounds-mode-list" role="group" aria-label="Game modes for voting">
                    {sections.map(section => (
                        <div key={section.name}>
                            <strong>{section.name}</strong>
                            {section.modes.map(mode => (
                                <label className="field-rounds-option" key={mode.id}>
                                    <input type="checkbox" checked={selected.includes(mode.id)}
                                        disabled={selected.length >= catalog.maxOptions && !selected.includes(mode.id)}
                                        onChange={() => toggle(mode.id)} />
                                    {mode.name}
                                </label>
                            ))}
                        </div>
                    ))}
                    {!sections.length && <p>No matching game modes.</p>}
                </div>
                <button className="btn btn-primary" type="submit" disabled={selected.length < catalog.minOptions}>Open voting</button>
            </fieldset>
            {error && <p className="field-rounds-error" role="alert">{error}</p>}
        </form>
    );
}

function RoundMvpControls({ poll, rounds, pastResults = [], now, disabled, onSave }) {
    const [error, setError] = useState('');
    const open = isOpenVote(poll, now);
    const nominees = poll?.nominees || [];
    function startVote(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
            const closesAt = fieldTimeISO(formText(form, 'closesAt'));
            setError('');
            void onSave({ action: 'createMvpPoll', gameId: formText(form, 'gameId'), closesAt });
        } catch (failure) {
            setError(failure.message);
        }
    }
    function finishVote(action) {
        const prompt = action === 'clearMvpPoll' ? 'Clear the MVP ballot and results from the board for' : 'Close MVP voting for';
        if (window.confirm(`${prompt} “${poll.roundTitle}”?`)) void onSave({ action, pollId: poll.id });
    }
    return (
        <section className="field-rounds-panel" aria-labelledby="field-round-mvp">
            <h2 id="field-round-mvp" tabIndex={-1}>Round MVP voting</h2>
            <p>Player nominations are optional. Refs make the final MVP decision.</p>
            {poll && <div className="field-rounds-vote-results">
                <h3>{poll.roundTitle}</h3>
                <p>{formatFieldTime(poll.startsAt)} · {open ? 'Voting closes ' + formatFieldTime(poll.closesAt) : 'Voting closed'}
                    {' · '}{poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}</p>
                {nominees.length ? <ul aria-label="MVP write-in results">{nominees.map(entry =>
                    <li key={mvpNominationText(entry)}>
                        <span>{mvpNominationText(entry)}</span>
                        <strong>{entry.votes} {entry.votes === 1 ? 'vote' : 'votes'}</strong>
                    </li>)}</ul> : <p>No nominations yet.</p>}
                <div className="field-rounds-actions">
                    {open && <button type="button" className="btn btn-outline-secondary" disabled={disabled} onClick={() => finishVote('closeMvpPoll')}>Close MVP voting</button>}
                    <button type="button" className="btn btn-outline-danger" disabled={disabled} onClick={() => finishVote('clearMvpPoll')}>Clear MVP vote</button>
                </div>
                {!open && nominees.length > 0 && <p>Award the Battle Badge in <a href="/admin/scores">Wins &amp; Losses</a>.</p>}
            </div>}
            {!open && (rounds.length ? <form className="field-rounds-form" onSubmit={startVote} key={poll?.id || 'new'}>
                <fieldset disabled={disabled}>
                    <label>Round for MVP voting<select name="gameId" defaultValue="" required>
                        <option value="">Choose a round</option>
                        {rounds.map(round => <option key={round.id} value={round.id}>{round.title} · {formatFieldTime(round.startsAt)}</option>)}
                    </select></label>
                    <label>MVP voting closes · California<input name="closesAt" type="datetime-local" defaultValue={fieldTimeInput(now + 10 * 60000)} required /></label>
                    <button className="btn btn-primary" type="submit">Open MVP voting</button>
                </fieldset>{error && <p className="field-rounds-error" role="alert">{error}</p>}
            </form> : poll ? null : <p>End a round in Round Controls to open nominations, or use <strong>Save played game</strong> under Battle Badges in <a href="/admin/scores">Wins &amp; Losses</a>.</p>)}
            {pastResults.length > 0 && <details>
                <summary>Earlier round results</summary>
                <ul>{pastResults.map(result => <li key={result.id}>
                    <strong>{result.roundTitle} · {formatFieldTime(result.startsAt)}</strong>
                    {(result.nominees ?? result.leaders ?? []).length ? <ul>
                        {(result.nominees ?? result.leaders).map(entry => <li key={mvpNominationText(entry)}>
                            {mvpNominationText(entry)} · {entry.votes} {entry.votes === 1 ? 'vote' : 'votes'}
                        </li>)}
                    </ul> : <span>No votes</span>}
                </li>)}</ul>
            </details>}
        </section>
    );
}

function EditRoundLocations({ round, disabled, onSave }) {
    const [pins, setPins] = useState(() => readMapPins(round.mapPins));
    const [edited, setEdited] = useState(false);
    function submit(event) {
        event.preventDefault();
        if (disabled) return;
        const data = new FormData(event.currentTarget);
        void onSave({
            action: 'updateSpawns', gameId: round.id, revision: round.revision,
            briefingLocation: formText(data, 'briefingLocation'),
            camoSpawn: formText(data, 'camoSpawn'), solidSpawn: formText(data, 'solidSpawn'),
            ...(edited && { mapPins: pins }),
        });
    }

    return (
        <details>
            <summary>Edit round locations</summary>
            <form className="field-rounds-form" onSubmit={submit}>
                <fieldset disabled={disabled}>
                    <label>Briefing location<input name="briefingLocation" defaultValue={round.briefingLocation} maxLength={80} /></label>
                    <SpawnInputs round={round} />
                    <details>
                        <summary>Place map pins</summary>
                        <FieldPinPicker pins={pins} onChange={next => { setPins(next); setEdited(true); }} />
                    </details>
                    <button className="btn btn-outline-secondary" type="submit">Save round locations</button>
                </fieldset>
            </form>
        </details>
    );
}

function RoundCard({ round, live, hasCurrentRound, now, disabled, onSave, request, board, onDisplayChange }) {
    function change(action) {
        const prompt = { endRound: 'End this round now?', cancelGame: 'Remove this round from the schedule?' }[action];
        if (prompt && !window.confirm(prompt)) return;
        void onSave({ action, gameId: round.id, revision: round.revision });
    }
    const kind = live ? 'In play' : round.status === 'delayed' ? 'Delayed'
        : round.status === 'scheduled' ? 'Automatic start' : 'Staff start';
    const roundMinutes = Math.round((Date.parse(round.endsAt) - Date.parse(round.startsAt)) / 60000);

    return (
        <article className="field-rounds-card" data-live={live}>
            <div className="field-rounds-card-header">
                <div>
                    <h3>{round.title || 'Field round'}</h3>
                    <p>{kind} · {formatFieldTime(round.startsAt)} · {roundMinutes} min</p>
                    <p>{round.location || 'Main field'} · Briefing · {roundPinLocation(round, 'briefing')}</p>
                    {round.notes && <p>{round.notes}</p>}
                </div>
                {live && <span className="field-rounds-countdown" role="timer" aria-label="Round time remaining">
                    {disabled ? '—' : formatRoundCountdown(Date.parse(round.endsAt) - now)}
                </span>}
            </div>
            <RoundBriefingEditor game={round} request={request} displayGameId={board.briefingGameId}
                displayRevision={board.briefingDisplayRevision} onDisplayChange={onDisplayChange} disabled={disabled} />
            <RoundRespawns round={round} />
            <div className="field-rounds-actions">
                {live ? <button className="btn btn-outline-danger" type="button" disabled={disabled} onClick={() => change('endRound')}>End round</button>
                    : <>
                        <button className="btn btn-primary" type="button" disabled={disabled || hasCurrentRound} onClick={() => change('startRound')}>Start now</button>
                        <button className="btn btn-outline-secondary" type="button" disabled={disabled} onClick={() => change('delayRound')}>Delay 5 min</button>
                        <button className="btn btn-outline-danger" type="button" disabled={disabled} onClick={() => change('cancelGame')}>Cancel round</button>
                    </>}
            </div>
            <EditRoundLocations key={round.revision} round={round} disabled={disabled} onSave={onSave} />
        </article>
    );
}

export default function AdminFieldRounds({ request }) {
    const { board, error, now, refresh } = useLiveFieldBoard(request, STAFF_ROUNDS_PATH);
    const [catalog, setCatalog] = useState(null);
    const [catalogError, setCatalogError] = useState('');
    const [catalogAttempt, setCatalogAttempt] = useState(0);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState(null);
    const mutation = useRef(null);

    useEffect(() => {
        const controller = new AbortController();
        request(ROUND_CATALOG_PATH, { signal: controller.signal }).then(result => {
            if (controller.signal.aborted) return;
            if (!Array.isArray(result?.sections) || !result.sections.length ||
                !Number.isInteger(result.minOptions) || !Number.isInteger(result.maxOptions) ||
                result.minOptions < 2 || result.maxOptions < result.minOptions ||
                result.sections.some(section => typeof section?.name !== 'string' || !Array.isArray(section.modes) ||
                    section.modes.some(mode => typeof mode?.id !== 'string' || typeof mode.name !== 'string'))) {
                throw new Error('The game mode list could not be verified.');
            }
            setCatalog(result);
            setCatalogError('');
        }).catch(failure => {
            if (!controller.signal.aborted) setCatalogError(failure.message || 'The game mode list is unavailable.');
        });
        return () => controller.abort();
    }, [catalogAttempt, request]);

    useEffect(() => () => {
        const controller = mutation.current;
        mutation.current = null;
        controller?.abort();
    }, []);

    async function save(body) {
        if (mutation.current || error || board?.isStaff !== true) return false;
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 15000);
        mutation.current = controller;
        setBusy(true);
        setNotice(null);
        let saved = false;
        try {
            const result = await request(LIVE_ROUNDS_PATH, { method: 'POST', body, signal: controller.signal });
            if (controller.signal.aborted) throw new Error('The update was not confirmed. Check the board before trying again.');
            if (result?.ok !== true || (body.action === 'runRoundConsole' && result.commandId !== body.commandId)) throw new Error('The field board did not confirm the action.');
            saved = true;
            setNotice({ text: body.action === 'runRoundConsole' ? roundConsoleNotice(body) : actions[body.action] });
        } catch (failure) {
            if (mutation.current === controller) setNotice({
                error: true,
                text: controller.signal.aborted ? 'The update was not confirmed. Check the board before trying again.' :
                    failure.message || 'The update could not be verified. Check the board before trying again.',
            });
        } finally {
            window.clearTimeout(timeout);
            if (mutation.current === controller) await refresh();
            if (mutation.current === controller) {
                mutation.current = null;
                setBusy(false);
            }
        }
        return saved;
    }

    const rounds = liveRounds(board?.games, error && board ? Date.parse(board.serverNow) : now);
    const poll = board?.poll;
    const open = isOpenVote(poll, now);
    const disabled = busy || Boolean(error);
    const canPublish = poll && !open && !poll.publishedGameId && poll.winnerModeIds?.length > 0;
    function closePoll() {
        if (window.confirm('Close this vote? Players will no longer be able to vote.')) {
            void save({ action: 'closePoll', pollId: poll.id });
        }
    }
    function clearPoll() {
        const question = `Clear “${poll.title}” from Barracks TV and player voting?`;
        if (window.confirm(open ? question + ' Voting will end immediately.' : question)) {
            void save({ action: 'clearPoll', pollId: poll.id });
        }
    }

    const showMvp = !error && board?.isStaff && Array.isArray(board.mvpRounds);
    return (
        <div className="field-rounds field-rounds--staff" aria-busy={busy}>
            {board && <FieldSectionLinks label="Round control sections" items={[
                ...roundSections, ...(showMvp ? [['field-round-mvp', 'MVP vote']] : []),
                ...(canPublish ? [['field-rounds-publish', 'Publish winner']] : []),
            ]} />}
            <div className="field-rounds-status">
                <p role="status">{busy ? 'Saving update…' : board ? `Updated ${formatFieldTime(board.serverNow)}` : 'Loading live field board…'}</p>
                <button className="btn btn-outline-secondary" type="button" onClick={() => void refresh()} disabled={busy}>Refresh board</button>
            </div>
            {error && <p className="field-rounds-error" role="alert">{error} {board && 'Round controls will resume when the board reconnects.'}</p>}
            {notice && <p role={notice.error ? 'alert' : 'status'} className={notice.error ? 'field-rounds-error' : 'field-rounds-success'}>{notice.text}</p>}
            {board && <>
                <RoundConsole board={board} now={now} disabled={disabled} save={save} />
                <BarracksClockControls clock={board.barracksClock} now={now} disabled={disabled} onSave={save} />
                <section className="field-rounds-panel" aria-labelledby="field-rounds-current">
                    <div className="field-rounds-card-header">
                        <h2 id="field-rounds-current" tabIndex={-1}>Current and scheduled rounds</h2>
                        <a className="btn btn-outline-secondary" href={fieldStaffPaths.tv} target="_blank" rel="noreferrer">Open Barracks TV</a>
                    </div>
                    {(rounds.active.length > 0 || rounds.upcoming.length > 0) &&
                        <p>Leave Barracks TV open on the display. Choose a round’s briefing map below to present from this device.</p>}
                    {!rounds.active.length && !rounds.upcoming.length && <p>No rounds are scheduled in the next 48 hours.</p>}
                    {[...rounds.active, ...rounds.upcoming].map(round => <RoundCard key={round.id}
                        round={round} live={rounds.active.includes(round)} hasCurrentRound={Boolean(rounds.current)}
                        now={now} disabled={disabled} onSave={save} request={request} board={board} onDisplayChange={refresh} />)}
                </section>
                {canPublish && <section className="field-rounds-panel" aria-labelledby="field-rounds-publish">
                    <h2 id="field-rounds-publish" tabIndex={-1}>Publish the vote winner</h2>
                    {poll.winnerModeIds.length > 1 && <p>The vote is tied. Choose one of the winning modes.</p>}
                    <RoundForm key={poll.id} poll={poll} now={now} disabled={disabled} onSave={save} />
                </section>}
                {catalogError && <div className="field-rounds-error" role="alert">
                    <p>{catalogError}</p>
                    <button className="btn btn-outline-secondary" type="button" onClick={() => setCatalogAttempt(value => value + 1)}>Reload game modes</button>
                </div>}
                <div className="field-rounds-workbench">
                    <section className="field-rounds-panel" aria-labelledby="field-rounds-schedule">
                        <h2 id="field-rounds-schedule" tabIndex={-1}>Schedule a round</h2>
                        {catalog ? <RoundForm catalog={catalog} now={now} disabled={disabled} onSave={save} /> :
                            !catalogError && <p role="status">Loading game modes…</p>}
                    </section>
                    <section className="field-rounds-panel" aria-labelledby="field-rounds-vote">
                        <h2 id="field-rounds-vote" tabIndex={-1}>Player voting</h2>
                        {poll ? <div className="field-rounds-vote-results">
                            <h3>{poll.title}</h3>
                            <p>{open ? `Closes ${formatFieldTime(poll.closesAt)}` : 'Voting closed'} · {poll.totalVotes} votes</p>
                            <ul>{poll.options.map(option => <li key={option.modeId}><span>{option.label}</span><strong>{option.votes}</strong></li>)}</ul>
                            {poll.publishedGameId && <p>Winning round published.</p>}
                            <div className="field-rounds-actions">
                                {open && <button className="btn btn-outline-secondary" type="button" disabled={disabled} onClick={closePoll}>Close this vote</button>}
                                <button className="btn btn-outline-danger" type="button" disabled={disabled} onClick={clearPoll}>Clear vote</button>
                            </div>
                        </div> : <p>No vote is on Barracks TV.</p>}
                        {!open && (catalog ? <PollForm key={poll?.id ?? 'new'} catalog={catalog} now={now} disabled={disabled} onSave={save} /> :
                            !catalogError && <p role="status">Loading game modes…</p>)}
                    </section>
                </div>
                {showMvp && <RoundMvpControls
                    poll={board.mvpPoll} rounds={board.mvpRounds} pastResults={board.mvpPastResults} now={now} disabled={disabled} onSave={save} />}
            </>}
        </div>
    );
}
