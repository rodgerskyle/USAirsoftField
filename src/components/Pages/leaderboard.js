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
import { getAllPlayerDisplayNames } from '../constants/playerDisplayNames';
import { getLeaderboardPrestige, prestigeCyclePoints, profileRank } from '../constants/playerPrestige';
import { withFirebase } from '../Firebase';
import { AuthUserContext, withAuthorization } from '../session';
import LeaderboardTvDisplay from './LeaderboardTvDisplay';
import { PrestigeEmblem } from './PlayerPrestige';
import './leaderboard.css';

const FIRST_YEAR = 2021;
const PAGE_SIZE = 50;
const TV_PAGE_SIZE = 8;
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
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

function LeaderboardPlayer({ player, featuredBadge, prestige, readOnly }) {
    const rank = profileRank(prestigeCyclePoints(player.careerPoints, prestige));
    const details = (
        <>
            <span className="field-lb-player-marks">
                <span className="field-lb-insignia">
                    <img src={rankImages[rank]} alt="" width="46" height="46" loading="lazy" />
                </span>
                {featuredBadge && (
                    <img className="field-lb-featured-badge" loading="lazy" width="48" height="48"
                        src={featuredBadge.thumbUrl} alt={`Featured badge: ${featuredBadge.name}`}
                        title={featuredBadge.name} />
                )}
            </span>
            <span className="field-lb-player-details">
                <span>{player.name}</span>
                <span className="field-lb-player-progression">
                    <span>{ranks[rank]}</span>
                    {prestige && (
                        <span className="field-lb-prestige">
                            {prestige.prestigeCount > 0 && <PrestigeEmblem count={prestige.prestigeCount} />}
                            <span>Prestige {formatScore(prestige.prestigeCount)}</span>
                        </span>
                    )}
                </span>
            </span>
        </>
    );
    return readOnly
        ? <div className="field-lb-player">{details}</div>
        : <Link className="field-lb-player" to={profilePath(player)}>{details}</Link>;
}

function LeaderboardTable({ players, personalUid, period, featured, prestigeByPlayer, readOnly = false }) {
    return (
        <table className="field-lb-table">
            <caption className="visually-hidden">{period} player standings</caption>
            <thead>
                <tr>
                    <th scope="col">Place</th>
                    <th scope="col">Player</th>
                    <th scope="col" className="field-lb-wins">Wins</th>
                    <th scope="col" className="field-lb-losses">Losses</th>
                    <th scope="col">Points</th>
                </tr>
            </thead>
            <tbody>
                {players.map(player => (
                    <tr key={player.uid} className={player.uid === personalUid ? 'field-lb-own-row' : undefined}>
                        <td><span className="field-lb-place">#{player.position}</span></td>
                        <th scope="row">
                            <LeaderboardPlayer player={player} featuredBadge={badgeById[featured[player.uid]]}
                                prestige={prestigeByPlayer.get(player.uid)} readOnly={readOnly} />
                        </th>
                        <td className="field-lb-wins">{formatScore(player.wins)}</td>
                        <td className="field-lb-losses">{formatScore(player.losses)}</td>
                        <td className="field-lb-points">{formatScore(player.points)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function Leaderboard({ firebase, presentation = false }) {
    const authUser = useContext(AuthUserContext);
    const { view: legacyView } = useParams();
    const [params, setParams] = useSearchParams();
    const tv = legacyView === 'query=monthly';
    const monthly = !presentation && (params.get('view') ?? (tv ? 'monthly' : 'all')) === 'monthly';
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
    const [displayNames, setDisplayNames] = useState({});
    const [prestigeByPlayer, setPrestigeByPlayer] = useState(() => new Map());

    useEffect(() => {
        const controller = new AbortController();
        getAllPlayerDisplayNames({ signal: controller.signal })
            .then((names) => { if (!controller.signal.aborted) setDisplayNames(names); })
            .catch(() => {});
        return () => controller.abort();
    }, []);

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
            name: typeof displayNames[player.uid] === 'string' ? displayNames[player.uid] : player.name,
            ...(monthly ? monthlyStats(player.games, currentMonth, currentYear) : { points: player.careerPoints }),
        }));
        // Match the original ordering for tied scores on the initial board.
        return scoredPlayers.reverse().sort((a, b) => b.points - a.points)
            .map((player, index) => ({ ...player, position: index + 1 }));
    }, [players, displayNames, monthly, currentMonth, currentYear]);
    const personalPlayer = standings.find(player => player.uid === authUser?.uid && player.personalEligible);
    const leaders = standings.slice(0, 3).filter(player => !monthly || player.points > 0);
    const query = search.trim().toLowerCase();
    const results = useMemo(() => query
        ? standings.filter(player => player.name.toLowerCase().includes(query))
        : standings, [query, standings]);
    const pageSize = presentation ? TV_PAGE_SIZE : PAGE_SIZE;
    const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const offset = (currentPage - 1) * pageSize;
    const visiblePlayers = useMemo(() => results.slice(offset, offset + pageSize), [results, offset, pageSize]);
    const visiblePlayerIdsKey = JSON.stringify(visiblePlayers.map(player => player.uid).sort());

    useEffect(() => {
        const ids = JSON.parse(visiblePlayerIdsKey);
        if (!ids.length) return undefined;
        let request;
        function refreshPrestige() {
            request?.abort();
            const controller = new AbortController();
            request = controller;
            getLeaderboardPrestige(ids, { signal: controller.signal })
                .then(records => { if (!controller.signal.aborted) setPrestigeByPlayer(records); })
                .catch(() => {});
        }
        refreshPrestige();
        window.addEventListener('focus', refreshPrestige);
        return () => {
            request?.abort();
            window.removeEventListener('focus', refreshPrestige);
        };
    }, [visiblePlayerIdsKey]);

    useEffect(() => {
        if (!visiblePlayers.length) return undefined;
        let request;
        function refreshFeatured() {
            request?.abort();
            const controller = new AbortController();
            request = controller;
            getFeaturedBadges(visiblePlayers.map(player => player.uid), { signal: controller.signal })
                .then((badges) => { if (!controller.signal.aborted) setFeatured(badges); })
                .catch(() => {});
        }
        refreshFeatured();
        window.addEventListener('focus', refreshFeatured);
        return () => {
            request?.abort();
            window.removeEventListener('focus', refreshFeatured);
        };
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

    if (presentation) {
        return (
            <LeaderboardTvDisplay status={status} playerCount={standings.length}
                page={currentPage} pageCount={pageCount} onPageChange={setPage}>
                <LeaderboardTable players={visiblePlayers} period={period} featured={featured}
                    prestigeByPlayer={prestigeByPlayer} readOnly />
            </LeaderboardTvDisplay>
        );
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
                                featured={featured} prestigeByPlayer={prestigeByPlayer} />
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

export const LEADERBOARD_TV_PATH = '/admin/leaderboard-tv';
export const AdminLeaderboardTv = withAuthorization(user => Boolean(user?.roles?.[ROLES.ADMIN]), { verifyOnMount: true })(
    function AuthorizedLeaderboardTv(props) {
        return <Leaderboard {...props} presentation />;
    },
);

export default withFirebase(Leaderboard);
