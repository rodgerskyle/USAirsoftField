import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { onValue } from 'firebase/database';
import { Helmet } from 'react-helmet-async';
import { Pagination } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faTrophy } from '@fortawesome/free-solid-svg-icons';

import ranks from '../constants/ranks';
import rankImages from '../constants/rankimgs';
import * as ROLES from '../constants/roles';
import SharePageLink from '../constants/SharePageLink';
import { badgeById, getFeaturedBadges } from '../constants/playerBadges';
import { withFirebase } from '../Firebase';
import { AuthUserContext } from '../session';
import './leaderboard.css';

const FIRST_YEAR = 2021;
const PAGE_SIZE = 50;
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const RANK_THRESHOLDS = [
    125, 225, 335, 450, 570, 690, 820, 960, 1110, 1270, 1440,
    1640, 1840, 2090, 2340, 2615, 2890, 3190, 3490, 3790, 4115, 4500,
];
const formatScore = new Intl.NumberFormat('en-US').format;

function scoreValue(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function monthlyStats(games, month, year) {
    let wins = 0;
    let losses = 0;
    for (const [date, game] of Object.entries(games ?? {})) {
        // Match history uses zero-based months, as written by the win/loss tools.
        const [gameYear, gameMonth] = date.split('-').map(Number);
        if (gameYear === year && gameMonth === month) {
            wins += scoreValue(game?.wins);
            losses += scoreValue(game?.losses);
        }
    }
    return { wins, losses, points: wins * 10 + losses * 3 };
}

function profilePath(player) {
    return `/profilelookup/${encodeURIComponent(player.uid)}`;
}

function RankInsignia({ points }) {
    const thresholdIndex = RANK_THRESHOLDS.findIndex(threshold => points < threshold);
    const rank = thresholdIndex === -1 ? RANK_THRESHOLDS.length : thresholdIndex;
    return (
        <span className="field-lb-insignia" title={ranks[rank]}>
            <img src={rankImages[rank]} alt={ranks[rank]} width="32" height="32" loading="lazy" />
        </span>
    );
}

function LeaderboardTable({ players, personalUid, period, featured }) {
    return (
        <table className="field-lb-table">
            <caption className="visually-hidden">{period} player standings</caption>
            <thead>
                <tr>
                    <th scope="col">Place</th>
                    <th scope="col">Player</th>
                    <th scope="col">Wins</th>
                    <th scope="col">Losses</th>
                    <th scope="col">Points</th>
                </tr>
            </thead>
            <tbody>
                {players.map(player => (
                    <tr key={player.uid} className={player.uid === personalUid ? 'field-lb-own-row' : undefined}>
                        <td><span className="field-lb-place">#{player.position}</span></td>
                        <th scope="row">
                            <Link className="field-lb-player" to={profilePath(player)}>
                                <span className="field-lb-player-marks">
                                    <RankInsignia points={player.careerPoints} />
                                    {badgeById[featured[player.uid]] && (
                                        <img className="field-lb-featured-badge" loading="lazy" width="30" height="30"
                                            src={badgeById[featured[player.uid]].thumbUrl}
                                            alt={`Featured badge: ${badgeById[featured[player.uid]].name}`}
                                            title={badgeById[featured[player.uid]].name} />
                                    )}
                                </span>
                                <span>{player.name}</span>
                            </Link>
                        </th>
                        <td>{formatScore(player.wins)}</td>
                        <td>{formatScore(player.losses)}</td>
                        <td className="field-lb-points">{formatScore(player.points)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function Leaderboard({ firebase }) {
    const authUser = useContext(AuthUserContext);
    const { view: legacyView } = useParams();
    const [params, setParams] = useSearchParams();
    const tv = legacyView === 'query=monthly';
    const monthly = (params.get('view') ?? (tv ? 'monthly' : 'all')) === 'monthly';
    const now = new Date();
    const [monthYear, monthNumber] = (params.get('month') ?? '').split('-').map(Number);
    const currentYear = monthYear >= FIRST_YEAR && monthYear <= now.getFullYear() && Number.isInteger(monthYear)
        ? monthYear : now.getFullYear();
    const currentMonth = monthNumber >= 1 && monthNumber <= MONTHS.length && Number.isInteger(monthNumber)
        ? monthNumber - 1 : now.getMonth();
    const period = monthly ? `${MONTHS[currentMonth]} ${currentYear}` : 'All time';
    const [players, setPlayers] = useState([]);
    const [status, setStatus] = useState('loading');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [featured, setFeatured] = useState({});

    useEffect(() => onValue(firebase.users(), snapshot => {
        const publicPlayers = Object.entries(snapshot.val() ?? {})
            .filter(([, player]) => player && !player.roles?.[ROLES.WAIVER])
            .map(([uid, player]) => ({
                uid,
                name: typeof player.name === 'string' && player.name.trim() ? player.name : 'Unnamed player',
                careerPoints: scoreValue(player.points),
                wins: scoreValue(player.wins),
                losses: scoreValue(player.losses),
                games: player.games,
                personalEligible: !player.roles,
            }));
        setPlayers(publicPlayers);
        setStatus('ready');
    }, () => {
        setPlayers([]);
        setStatus('error');
    }), [firebase]);

    const standings = useMemo(() => {
        const scoredPlayers = players.map(player => ({
            ...player,
            ...(monthly ? monthlyStats(player.games, currentMonth, currentYear) : { points: player.careerPoints }),
        }));
        // Match the original ordering for tied scores on the initial board.
        return scoredPlayers.reverse().sort((a, b) => b.points - a.points)
            .map((player, index) => ({ ...player, position: index + 1 }));
    }, [players, monthly, currentMonth, currentYear]);
    const personalPlayer = standings.find(player => player.uid === authUser?.uid && player.personalEligible);
    const leaders = standings.slice(0, 3).filter(player => !monthly || player.points > 0);
    const query = search.trim().toLowerCase();
    const results = useMemo(() => query
        ? standings.filter(player => player.name.toLowerCase().includes(query))
        : standings, [query, standings]);
    const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const offset = (currentPage - 1) * PAGE_SIZE;
    const visiblePlayers = useMemo(() => results.slice(offset, offset + PAGE_SIZE), [results, offset]);

    useEffect(() => {
        if (!visiblePlayers.length) return undefined;
        const controller = new AbortController();
        getFeaturedBadges(visiblePlayers.map(player => player.uid), { signal: controller.signal })
            .then((badges) => { if (!controller.signal.aborted) setFeatured(badges); })
            .catch(() => { if (!controller.signal.aborted) setFeatured({}); });
        return () => controller.abort();
    }, [visiblePlayers]);

    function changePeriod(view, month = currentMonth, year = currentYear) {
        const next = new URLSearchParams(params);
        next.set('view', view);
        if (view === 'monthly') next.set('month', `${year}-${String(month + 1).padStart(2, '0')}`);
        else next.delete('month');
        setParams(next);
        setPage(1);
    }

    function changeSearch(value) {
        setSearch(value);
        setPage(1);
    }

    return (
        <main className={`field-lb${tv ? ' field-lb-tv' : ''}`}>
            <Helmet><title>US Airsoft Field: Leaderboards</title></Helmet>
            <header className="field-lb-hero">
                <div className="field-lb-wrap field-lb-hero-inner">
                    <div>
                        <Link className="field-lb-back" to="/player-hub">Player Hub</Link>
                        <h1>Leaderboards</h1>
                        <p>See who leads the field and track your progress over time.</p>
                    </div>
                    {status === 'ready' && (
                        <dl className="field-lb-hero-stats">
                            <div><dt>Ranked players</dt><dd>{formatScore(standings.length)}</dd></div>
                            {personalPlayer && (
                                <div>
                                    <dt>Your position</dt>
                                    <dd><Link to={profilePath(personalPlayer)}>#{personalPlayer.position}</Link></dd>
                                </div>
                            )}
                        </dl>
                    )}
                </div>
            </header>

            <div className="field-lb-wrap field-lb-content">
                <div className="field-lb-controls" role="group" aria-label="Standings filters">
                    <div className="field-lb-period" role="group" aria-label="Ranking period">
                        <button type="button" aria-pressed={!monthly} onClick={() => changePeriod('all')}>All time</button>
                        <button type="button" aria-pressed={monthly} onClick={() => changePeriod('monthly')}>Monthly</button>
                    </div>
                    {monthly && !tv && (
                        <div className="field-lb-date-controls">
                            <label>
                                <span>Month</span>
                                <select value={currentMonth} onChange={event => changePeriod('monthly', Number(event.target.value))}>
                                    {MONTHS.map((month, index) => <option key={month} value={index}>{month}</option>)}
                                </select>
                            </label>
                            <label>
                                <span>Year</span>
                                <select value={currentYear} onChange={event => changePeriod('monthly', currentMonth, Number(event.target.value))}>
                                    {Array.from({ length: now.getFullYear() - FIRST_YEAR + 1 }, (_, index) => now.getFullYear() - index)
                                        .map(year => <option key={year} value={year}>{year}</option>)}
                                </select>
                            </label>
                        </div>
                    )}
                    {!tv && (
                        <label className="field-lb-search">
                            <span className="visually-hidden">Search player names</span>
                            <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
                            <input type="search" value={search} onChange={event => changeSearch(event.target.value)} placeholder="Search players" />
                        </label>
                    )}
                </div>

                {!tv && !query && leaders.length > 0 && (
                    <section className="field-lb-leaders" aria-labelledby="field-lb-leaders-title">
                        <h2 id="field-lb-leaders-title"><FontAwesomeIcon icon={faTrophy} aria-hidden="true" /> Field leaders</h2>
                        <ol>
                            {leaders.map(player => (
                                <li key={player.uid} className={`field-lb-leader-${player.position}`}>
                                    <Link to={profilePath(player)}>
                                        <span className="field-lb-leader-place">#{player.position}</span>
                                        <span className="field-lb-leader-name">{player.name}</span>
                                        <span className="field-lb-leader-score"><strong>{formatScore(player.points)}</strong> pts</span>
                                    </Link>
                                </li>
                            ))}
                        </ol>
                    </section>
                )}

                <section className="field-lb-standings" aria-labelledby="field-lb-standings-title">
                    <div className="field-lb-standings-header">
                        <div>
                            <h2 id="field-lb-standings-title">{period} standings</h2>
                            {status === 'ready' && (
                                <p aria-live="polite">{formatScore(results.length)} {results.length === 1 ? 'player' : 'players'}{query && ' found'}</p>
                            )}
                        </div>
                        {!tv && <SharePageLink title={`USAW ${period} standings`} label="Share standings" className="field-lb-share" />}
                    </div>
                    {status === 'loading' && <p className="field-lb-message" role="status">Loading standings…</p>}
                    {status === 'error' && <p className="field-lb-message" role="alert">Standings are temporarily unavailable. Please try again later.</p>}
                    {status === 'ready' && (results.length === 0 ? (
                        <div className="field-lb-message">
                            <p>{query ? 'No players match that name.' : 'No standings are available yet.'}</p>
                            {query && <button type="button" onClick={() => changeSearch('')}>Clear search</button>}
                        </div>
                    ) : (
                        <>
                            <LeaderboardTable players={visiblePlayers} personalUid={personalPlayer?.uid} period={period}
                                featured={featured} />
                            {pageCount > 1 && (
                                <div className="field-lb-pagination">
                                    <Pagination count={pageCount} page={currentPage} onChange={(_, value) => setPage(value)}
                                        showFirstButton showLastButton siblingCount={0} variant="outlined" shape="rounded" size="small"
                                        aria-label="Standings pages" />
                                </div>
                            )}
                        </>
                    ))}
                </section>
            </div>
        </main>
    );
}

export default withFirebase(Leaderboard);
