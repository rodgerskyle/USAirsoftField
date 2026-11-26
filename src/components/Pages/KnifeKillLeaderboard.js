import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { BADGE_CATALOG, getKnifeStandings } from '../constants/playerBadges';
import './leaderboard.css';
import './Teams.css';
import './TeamLeaderboard.css';
import './KnifeKills.css';

export default function KnifeKillLeaderboard() {
    const [params, setParams] = useSearchParams();
    const page = /^[1-9]\d{0,5}$/.test(params.get('page') || '') ? Number(params.get('page')) : 1;
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState(null);
    const current = result?.page === page && result.attempt === attempt ? result : null;

    useEffect(() => {
        const controller = new AbortController();
        getKnifeStandings(page, controller.signal).then(data => {
            if (!controller.signal.aborted) setResult({ page, attempt, data });
        }).catch(() => {
            if (!controller.signal.aborted) setResult({ page, attempt, error: true });
        });
        return () => controller.abort();
    }, [page, attempt]);

    const data = current?.data;
    return <main className="field-lb team-lb" aria-labelledby="knife-lb-title">
        <Helmet><title>Knife Kill Leaderboard | US Airsoft World</title></Helmet>
        <header className="team-directory__hero">
            <div className="field-lb-wrap team-directory__hero-inner">
                <nav className="team-lb-links" aria-label="Leaderboard navigation">
                    <Link className="team-directory__hub" to="/leaderboard">Player leaderboard</Link>
                    <Link className="team-directory__hub" to="/virtual-patches">Virtual patches</Link>
                </nav>
                <h1 id="knife-lb-title">Knife Kill Leaderboard</h1>
                <p>All-time airsoft knife kills recorded by USAW referees.</p>
            </div>
        </header>
        <div className="field-lb-wrap field-lb-content">
            <section aria-label="Member patch milestones" className="knife-milestones">
                <div><h2>Member patches</h2><p>Active members earn each patch once.</p></div>
                <ul>{BADGE_CATALOG.filter(patch => patch.knifeKills).sort((a,b) => a.knifeKills - b.knifeKills).map(patch =>
                    <li key={patch.id}>
                        <img src={patch.thumbUrl} width="68" height="68" alt="" />
                        <span><strong>{patch.name}</strong><small>{patch.knifeKills} kills</small></span>
                    </li>)}</ul>
            </section>
            <section aria-labelledby="knife-standings-title" className="field-lb-standings" aria-busy={!current}>
                <header className="field-lb-standings-header"><h2 id="knife-standings-title">Player standings</h2></header>
                {!current && <p className="field-lb-message" role="status">Loading standings…</p>}
                {current?.error && <div role="alert" className="field-lb-message">
                    <p>Knife kill standings could not be loaded.</p>
                    <button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button>
                </div>}
                {data && (data.standings.length ? <table className="field-lb-table">
                    <caption className="visually-hidden">All-time knife kill standings</caption>
                    <thead><tr><th scope="col">Place</th><th scope="col">Player</th><th scope="col">Knife kills</th></tr></thead>
                    <tbody>{data.standings.map(row => <tr key={row.playerId}>
                        <td className="field-lb-place">#{row.rank.toLocaleString('en-US')}</td>
                        <th scope="row"><Link className="field-lb-player" to={'/profilelookup/' + encodeURIComponent(row.playerId)}>{row.displayName}</Link></th>
                        <td className="field-lb-points">{row.total.toLocaleString('en-US')}</td>
                    </tr>)}</tbody>
                </table> : <p className="field-lb-message" role="status">{page === 1 ? 'No knife kills have been recorded yet.' : 'No more players on this page.'}</p>)}
                {(page > 1 || data?.hasMore) && <nav className="team-directory__pagination team-lb-pagination" aria-label="Knife kill standings pages">
                    <button className="team-directory__button" type="button" disabled={page <= 1}
                        onClick={() => setParams(page === 2 ? {} : { page: page - 1 })}>Previous</button>
                    <span>Page {page}</span>
                    <button className="team-directory__button" type="button" disabled={!data?.hasMore}
                        onClick={() => setParams({ page: page + 1 })}>Next</button>
                </nav>}
            </section>
        </div>
    </main>;
}
