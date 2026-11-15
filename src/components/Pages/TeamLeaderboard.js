import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { teamPagePath } from '../constants/teamDirectory';
import './leaderboard.css';
import './Teams.css';
import './TeamLeaderboard.css';

const ENDPOINT = 'https://app.usairsoftfield.com/api/team-leaderboard';
const DIVISIONS = { casual: 'Casual', competitive: 'Competitive' };
const SOURCES = { field: 'Field team', companion: 'Companion team' };
const formatScore = new Intl.NumberFormat('en-US').format;

function isCount(value) {
    return Number.isSafeInteger(value) && value >= 0;
}

function isStanding(team) {
    return team && Object.prototype.hasOwnProperty.call(SOURCES, team.source)
        && typeof team.id === 'string' && team.id.length > 0
        && typeof team.name === 'string' && team.name.trim()
        && isCount(team.rank) && team.rank > 0 && Number.isFinite(team.points)
        && (team.wins === null || isCount(team.wins)) && (team.losses === null || isCount(team.losses));
}

async function loadStandings(division, page, signal) {
    const url = new URL(ENDPOINT);
    url.search = new URLSearchParams({ division, page }).toString();
    const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'omit',
        redirect: 'error',
        signal,
    });
    if (!response.ok) throw new Error('Team standings are unavailable.');
    const standings = await response.json();
    if (standings?.division !== division || !Array.isArray(standings.teams) || !standings.teams.every(isStanding)
        || !isCount(standings.totalTeams) || !isCount(standings.page) || standings.page < 1
        || !isCount(standings.totalPages) || standings.totalPages < standings.page) {
        throw new Error('Team standings are unavailable.');
    }
    return standings;
}

function TeamStandingsTable({ teams, division }) {
    return (
        <table className="field-lb-table">
            <caption className="visually-hidden">{DIVISIONS[division]} team standings</caption>
            <thead>
                <tr>
                    <th scope="col">Place</th>
                    <th scope="col">Team</th>
                    <th scope="col" className="field-lb-wins">Wins</th>
                    <th scope="col" className="field-lb-losses">Losses</th>
                    <th scope="col">Points</th>
                </tr>
            </thead>
            <tbody>
                {teams.map(team => (
                    <tr key={`${team.source}:${team.id}`}>
                        <td className="field-lb-place">#{formatScore(team.rank)}</td>
                        <th scope="row">
                            <Link className="field-lb-player" to={teamPagePath(team)}>
                                <span className="field-lb-player-details">
                                    <span>{team.name}</span>
                                    <small className="field-lb-player-progression">{SOURCES[team.source]}</small>
                                </span>
                            </Link>
                        </th>
                        <td className="field-lb-wins">{team.wins === null ? '—' : formatScore(team.wins)}</td>
                        <td className="field-lb-losses">{team.losses === null ? '—' : formatScore(team.losses)}</td>
                        <td className="field-lb-points">{formatScore(team.points)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default function TeamLeaderboard() {
    const [params, setParams] = useSearchParams();
    const division = params.get('division') === 'competitive' ? 'competitive' : 'casual';
    const requestedPage = params.get('page');
    const page = /^[1-9]\d{0,5}$/.test(requestedPage ?? '') ? Number(requestedPage) : 1;
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState(null);
    const currentResult = result?.division === division && result.page === page && result.attempt === attempt
        ? result : null;
    const standings = currentResult?.standings;

    useEffect(() => {
        const controller = new AbortController();
        loadStandings(division, page, controller.signal).then(standings => {
            if (!controller.signal.aborted) setResult({ division, page, attempt, standings });
        }).catch(() => {
            if (!controller.signal.aborted) setResult({ division, page, attempt, error: true });
        });
        return () => controller.abort();
    }, [division, page, attempt]);

    function show(nextDivision, nextPage = 1) {
        const nextParams = new URLSearchParams();
        if (nextDivision !== 'casual') nextParams.set('division', nextDivision);
        if (nextPage > 1) nextParams.set('page', String(nextPage));
        setParams(nextParams);
    }

    return (
        <main className="field-lb team-lb" aria-labelledby="team-lb-title">
            <Helmet><title>Team Leaderboard | US Airsoft World</title></Helmet>
            <header className="team-directory__hero">
                <div className="field-lb-wrap team-directory__hero-inner">
                    <nav className="team-lb-links" aria-label="Leaderboard navigation">
                        <Link className="team-directory__hub" to="/leaderboard">Player leaderboard</Link>
                        <Link className="team-directory__hub" to="/teams">Team directory</Link>
                    </nav>
                    <h1 id="team-lb-title">Team Leaderboard</h1>
                    <p>See where your team ranks at USAW.</p>
                </div>
            </header>

            <div className="field-lb-wrap field-lb-content">
                <div className="field-lb-controls team-lb-controls">
                    <fieldset className="team-lb-division" data-division={division}>
                        <legend className="visually-hidden">Standings division</legend>
                        {Object.entries(DIVISIONS).map(([key, label]) => (
                            <label key={key}>
                                <input className="visually-hidden" type="radio" name="team-lb-division"
                                    value={key} checked={division === key} onChange={() => show(key)} />
                                <span>{label}</span>
                            </label>
                        ))}
                    </fieldset>
                    <p>{division === 'casual'
                        ? 'Field and Companion teams ranked by their existing points.'
                        : 'Official series standings for TTCS and future USAW competitions.'}</p>
                </div>

                <section aria-labelledby="team-lb-standings-title" className="field-lb-standings"
                    aria-busy={!currentResult}>
                    <header className="field-lb-standings-header">
                        <h2 id="team-lb-standings-title">{DIVISIONS[division]} standings</h2>
                        {standings && <p>{formatScore(standings.totalTeams)} {standings.totalTeams === 1 ? 'team' : 'teams'}</p>}
                    </header>
                    {!currentResult && <p className="field-lb-message" role="status">Loading team standings…</p>}
                    {currentResult?.error && (
                        <div className="field-lb-message" role="alert">
                            <p>Team standings could not be loaded.</p>
                            <button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button>
                        </div>
                    )}
                    {standings?.unavailableSources?.length > 0 && (
                        <div className="field-lb-message" role="status">
                            <p>Some team scores could not be loaded. These rankings are incomplete.</p>
                            <button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button>
                        </div>
                    )}
                    {standings?.recordedScores && (
                        <p className="team-lb-note" role="status">Some Companion teams are showing their last recorded scores.</p>
                    )}
                    {standings && (standings.teams.length ? <TeamStandingsTable teams={standings.teams} division={division} />
                        : <p className="field-lb-message" role="status">{division === 'competitive'
                            ? 'No competitive results have been published yet.'
                            : standings.unavailableSources?.length ? 'No team scores are available to display.' : 'No casual teams are listed yet.'}</p>)}
                    {standings?.totalPages > 1 && (
                        <nav className="team-directory__pagination team-lb-pagination" aria-label="Team standings pages">
                            <button className="team-directory__button" type="button" disabled={standings.page <= 1}
                                onClick={() => show(division, standings.page - 1)}>Previous</button>
                            <span>Page {formatScore(standings.page)} of {formatScore(standings.totalPages)}</span>
                            <button className="team-directory__button" type="button" disabled={standings.page >= standings.totalPages}
                                onClick={() => show(division, standings.page + 1)}>Next</button>
                        </nav>
                    )}
                </section>
            </div>
        </main>
    );
}
