import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faSearch, faUsers } from '@fortawesome/free-solid-svg-icons';
import { onValue } from 'firebase/database';
import { withFirebase } from '../Firebase';
import { AuthUserContext } from '../session';
import { teamPagePath, useCompanionTeamDirectory, useTeamLogo } from '../constants/teamDirectory';
import './Teams.css';

const TEAMS_PER_PAGE = 6;

function TeamCard({ firebase, team, companionUser }) {
    const { name, points, rank, source, memberCount } = team;
    const companion = source === 'companion';
    const { logo, clearLogo } = useTeamLogo(firebase, { ...team, user: companion ? companionUser : null });

    return (
        <li>
            <Link className="team-directory__card" to={teamPagePath(team)}>
                <div className="team-directory__banner">
                    <FontAwesomeIcon icon={faUsers} aria-hidden="true" />
                    {logo && <img src={logo} alt="" onError={clearLogo} />}
                </div>
                <div className="team-directory__card-copy">
                    <div className="team-directory__identity">
                        <p className="team-directory__rank">
                            {companion ? `${memberCount} ${memberCount === 1 ? 'player' : 'players'}` : `Rank ${rank}`}
                        </p>
                        <h3>{name}</h3>
                    </div>
                    <div className="team-directory__points">
                        <strong>{points ?? '—'}</strong>
                        <span>{companion ? 'Earned points' : 'Points'}</span>
                    </div>
                    <FontAwesomeIcon className="team-directory__arrow" icon={faArrowRight} aria-hidden="true" />
                </div>
            </Link>
        </li>
    );
}

function Teams({ firebase }) {
    const authUser = useContext(AuthUserContext);
    const [teams, setTeams] = useState(null);
    const [fieldError, setFieldError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('name');
    const [currentPage, setCurrentPage] = useState(1);
    const companion = useCompanionTeamDirectory(firebase, { attempt });

    useEffect(() => onValue(firebase.teams(), snapshot => {
        const ranked = Object.entries(snapshot.val() ?? {})
            .map(([id, team]) => ({
                id, source: 'field', name: typeof team?.name === 'string' && team.name.trim() ? team.name : id,
                points: team?.points,
            }))
            // Preserve the existing points order, including its tie behavior.
            .sort((a, b) => a.points < b.points ? 1 : -1)
            .map((team, index) => ({ ...team, rank: index + 1 }));

        setTeams(ranked);
        setFieldError(false);
    }, () => setFieldError(true)), [firebase, attempt]);

    const companionTeams = Array.isArray(companion.record?.teams)
        ? companion.record.teams.filter(team => team.source === 'companion') : [];
    const ownTeamId = companion.record?.ownTeamId;
    const managePath = ownTeamId && !authUser?.team
        ? teamPagePath({ id: ownTeamId, source: 'companion' }) : '/manageteam';
    const query = search.trim().toLowerCase();
    const results = [...(teams ?? []), ...companionTeams].filter(team =>
        team.name.toLowerCase().includes(query) || team.id.toLowerCase().includes(query));
    if (sort === 'name') results.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
    const totalPages = Math.max(1, Math.ceil(results.length / TEAMS_PER_PAGE));
    const page = Math.min(currentPage, totalPages);
    const first = (page - 1) * TEAMS_PER_PAGE;
    const visibleTeams = results.slice(first, first + TEAMS_PER_PAGE);

    function updateSearch(value) {
        setSearch(value);
        setCurrentPage(1);
    }

    function retry() {
        setFieldError(false);
        setAttempt(value => value + 1);
    }

    return (
        <main className="team-directory">
            <Helmet>
                <title>US Airsoft Field: Teams</title>
            </Helmet>
            <section className="team-directory__hero" aria-labelledby="team-directory-title">
                <div className="team-directory__wrap team-directory__hero-inner">
                    <Link className="team-directory__hub" to="/player-hub">Player Hub</Link>
                    <h1 id="team-directory-title">USAW Teams</h1>
                    <p>Find a team, check the standings, or start a team of your own.</p>
                    <div className="team-directory__actions">
                        <Link className="team-directory__button team-directory__button--primary" to="/createteam">Create team</Link>
                        <Link className="team-directory__button" to="/jointeam">Join team</Link>
                        <Link className="team-directory__button" to={managePath}>Manage team</Link>
                    </div>
                </div>
            </section>
            <section className="team-directory__wrap team-directory__content" aria-labelledby="team-standings-title">
                <h2 id="team-standings-title">Team standings</h2>
                <div className="team-directory__filters">
                    <label className="team-directory__field" htmlFor="team-directory-search">
                        Search teams
                        <span className="team-directory__search">
                            <FontAwesomeIcon icon={faSearch} aria-hidden="true" />
                            <input id="team-directory-search" type="search" value={search} placeholder="Enter a team name"
                                onChange={event => updateSearch(event.target.value)} />
                        </span>
                    </label>
                    <label className="team-directory__field" htmlFor="team-directory-sort">
                        Sort by
                        <select id="team-directory-sort" value={sort} onChange={event => {
                            setSort(event.target.value);
                            setCurrentPage(1);
                        }}>
                            <option value="name">Team name A–Z</option>
                            <option value="rank">Field standings first</option>
                        </select>
                    </label>
                </div>
                {(companion.status === 'signed-out' || companion.status === 'membership-required') && (
                    <p className="team-directory__results">
                        {companion.status === 'signed-out'
                            ? <><Link to="/login">Sign in</Link> to see teams for active USAW members.</>
                            : 'An active USAW membership unlocks additional teams.'}
                    </p>
                )}
                {(fieldError || companion.status === 'error') && (
                    <div className="team-directory__notice" role="alert">
                        <p>Some teams could not be loaded.</p>
                        <button type="button" className="team-directory__button" onClick={retry}>Try again</button>
                    </div>
                )}
                {visibleTeams.length === 0 && ((teams === null && !fieldError) || companion.status === 'loading') ? (
                    <p className="team-directory__notice" role="status">Loading team standings…</p>
                ) : visibleTeams.length === 0 ? (
                    <div className="team-directory__notice" role="status">
                        <p>{query ? 'No teams match that search.' : 'No teams are listed yet.'}</p>
                        {query && <button type="button" className="team-directory__button" onClick={() => updateSearch('')}>Clear search</button>}
                    </div>
                ) : (
                    <>
                        <p className="team-directory__results" aria-live="polite">
                            Showing {first + 1}–{first + visibleTeams.length} of {results.length} {results.length === 1 ? 'team' : 'teams'}
                        </p>
                        <ul className="team-directory__grid">
                            {visibleTeams.map(team => <TeamCard key={`${team.source}:${team.id}`} team={team}
                                firebase={firebase} companionUser={companion.user} />)}
                        </ul>
                        {totalPages > 1 && (
                            <nav className="team-directory__pagination" aria-label="Team standings pages">
                                <button type="button" className="team-directory__button" disabled={page === 1}
                                    onClick={() => setCurrentPage(page - 1)}>Previous</button>
                                <span>Page {page} of {totalPages}</span>
                                <button type="button" className="team-directory__button" disabled={page === totalPages}
                                    onClick={() => setCurrentPage(page + 1)}>Next</button>
                            </nav>
                        )}
                    </>
                )}
            </section>
        </main>
    );
}

export default withFirebase(Teams);
