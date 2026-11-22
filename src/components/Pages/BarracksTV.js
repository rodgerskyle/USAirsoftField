import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useAppearance } from '../../Appearance';
import wordmark from '../../assets/usairsoft-wide-logo-light.png';
import shield from '../../assets/usairsoft-small-logo.png';
import { requestPublicFieldTool } from '../constants/fieldStaffApi';
import {
    barracksClockTitles, formatFieldTime, formatRoundCountdown, isOpenVote, liveRounds, RoundRespawns, runningBarracksClock, useLiveFieldBoard,
} from './FieldRoundsShared';
import { RoundMapViewer, roundPinLocation } from './FieldRoundMap';
import BarracksPatchCelebrations from './BarracksPatchCelebrations';
import './FieldRounds.css';

function VotingDisplay({ poll, now }) {
    if (!poll) return null;
    const open = isOpenVote(poll, now);
    const winners = poll.winnerModeIds || [];
    return (
        <section className="field-barracks-support" aria-labelledby="barracks-voting">
            <div className="field-barracks-kicker">{open ? 'Voting open' : 'Voting closed'}</div>
            <h2 id="barracks-voting">{poll.title}</h2>
            {open && <p>Closes in <strong role="timer" aria-label="Voting time remaining">
                {formatRoundCountdown(Date.parse(poll.closesAt) - now)}
            </strong></p>}
            <ul className="field-barracks-votes">
                {poll.options.map(option => <li data-winner={!open && winners.includes(option.modeId)} key={option.modeId}>
                    <span>{option.label}</span><strong>{option.votes} {option.votes === 1 ? 'vote' : 'votes'}</strong>
                </li>)}
            </ul>
            {poll.publishedGameId && <p>Winning round is on the schedule.</p>}
        </section>
    );
}

export default function BarracksTV({ request = requestPublicFieldTool }) {
    const logo = useAppearance()?.theme === 'dark' ? shield : wordmark;
    const { board, error, now, refresh } = useLiveFieldBoard(request);
    const display = useRef(null);
    const [fullscreen, setFullscreen] = useState(false);
    const [fullscreenError, setFullscreenError] = useState('');
    const displayTime = error && board ? Date.parse(board.serverNow) : now;
    const { current, upcoming } = liveRounds(board?.games, displayTime);
    const round = current || upcoming[0];
    const next = current ? upcoming[0] : upcoming[1];
    const timeRemaining = round ? Date.parse(current ? round.endsAt : round.startsAt) - now : 0;
    const showTimer = Boolean(current || (round && Date.parse(round.startsAt) > displayTime));
    const poll = error ? null : board?.poll;
    const clock = board?.barracksClock;
    const showClock = runningBarracksClock(clock, displayTime);
    const safetyBrief = clock?.kind === 'safetyBrief';

    useEffect(() => {
        function updateFullscreen() {
            setFullscreen(document.fullscreenElement === display.current);
            setFullscreenError('');
        }
        document.addEventListener('fullscreenchange', updateFullscreen);
        return () => document.removeEventListener('fullscreenchange', updateFullscreen);
    }, []);

    async function toggleFullscreen() {
        setFullscreenError('');
        try {
            if (document.fullscreenElement === display.current) await document.exitFullscreen();
            else if (display.current?.requestFullscreen) await display.current.requestFullscreen();
            else setFullscreenError('Use your browser’s full screen option on this device.');
        } catch {
            setFullscreenError('Full screen could not be changed. Use your browser’s full screen option.');
        }
    }

    return (
        <main className="field-barracks" ref={display}>
            <Helmet>
                <title>USAW Barracks TV</title>
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>
            <header className="field-barracks-header">
                <Link className="field-barracks-brand" to="/" aria-label="US Airsoft home"><img src={logo} alt="" /></Link>
                <h1>Barracks TV</h1>
                <div className="field-barracks-controls">
                    <Link to="/leaderboard">Leaderboard</Link>
                    <button type="button" onClick={toggleFullscreen}>{fullscreen ? 'Exit full screen' : 'Full screen'}</button>
                </div>
            </header>
            {fullscreenError && <p className="field-barracks-notice" role="status">{fullscreenError}</p>}
            {error && <div className="field-barracks-notice" role="alert">
                <span>{board ? 'Live updates interrupted. Showing the last field update.' : 'The field board is temporarily unavailable.'}</span>
                <button type="button" onClick={() => void refresh()}>Retry</button>
            </div>}
            {!board && !error && <p className="field-barracks-notice" role="status">Loading the field schedule…</p>}
            {showClock && <section className="field-barracks-break" aria-labelledby="barracks-break">
                <div><h2 id="barracks-break">{barracksClockTitles[clock.kind]}</h2>
                    <p>{safetyBrief ? 'Safety brief starts at' : 'Return at'} {formatFieldTime(clock.endsAt)} Pacific</p></div>
                <strong role="timer" aria-label={safetyBrief ? 'Time until safety brief' : 'Time until break ends'}>{error ? '—' : formatRoundCountdown(Date.parse(clock.endsAt) - now)}</strong>
            </section>}
            {Number.isSafeInteger(board?.celebrationCursor) && board.celebrationCursor >= 0 &&
                <BarracksPatchCelebrations initialCursor={board.celebrationCursor} request={request} />}
            {board && <div className="field-barracks-grid" data-side={Boolean(next || poll)}>
                <section className="field-barracks-main" data-live={Boolean(current)} aria-labelledby="barracks-round">
                    <div className="field-barracks-kicker">{current ? 'Now playing' : round ? 'Up next' : 'Field schedule'}</div>
                    <h2 id="barracks-round">{round?.title || 'No round on the board'}</h2>
                    {round ? <>
                        <div className="field-barracks-count">
                            <span>
                                {current ? 'Time remaining' : !showTimer ? 'Awaiting staff start' :
                                    round.status === 'delayed' ? 'Delayed · estimated start in' :
                                        round.status === 'queued' ? 'Planned start in' : 'Starts in'}
                            </span>
                            {showTimer ? <strong role="timer" aria-label={current ? 'Round time remaining' : 'Time until next round'}>
                                {error ? '—' : formatRoundCountdown(timeRemaining)}
                            </strong> : <strong>{formatFieldTime(round.startsAt)}</strong>}
                        </div>
                        <dl className="field-barracks-locations">
                            <div><dt>Field location</dt><dd>{round.location || 'Main field'}</dd></div>
                            <div><dt>Briefing</dt><dd>{roundPinLocation(round, 'briefing')}</dd></div>
                        </dl>
                        <RoundRespawns round={round} />
                        <RoundMapViewer key={round.id} round={round} />
                        {round.notes && <p className="field-barracks-round-note">{round.notes}</p>}
                    </> : <p>Check here for the next round and its briefing location.</p>}
                </section>
                {(next || poll) && <aside className="field-barracks-side" aria-label="Upcoming rounds and voting">
                    {next && <section className="field-barracks-support" aria-labelledby="barracks-next-round">
                        <div className="field-barracks-kicker">{current ? 'Next round' : 'Then on the field'}</div>
                        <h2 id="barracks-next-round">{next.title}</h2>
                        <p>{formatFieldTime(next.startsAt)} · {roundPinLocation(next, 'briefing')}</p>
                        <p>{Date.parse(next.startsAt) <= displayTime ? 'Awaiting staff start' : <>
                            {next.status === 'delayed' ? 'Delayed · estimated start in' : next.status === 'queued' ? 'Planned start in' : 'Starts in'}{' '}
                            <strong role="timer" aria-label="Time until following round">
                                {error ? '—' : formatRoundCountdown(Date.parse(next.startsAt) - now)}
                            </strong>
                        </>}</p>
                        <RoundMapViewer key={next.id} round={next} />
                    </section>}
                    <VotingDisplay poll={poll} now={displayTime} />
                </aside>}
            </div>}
            {board && <p className="field-barracks-update">Last field update · {formatFieldTime(board.serverNow)} Pacific</p>}
        </main>
    );
}
