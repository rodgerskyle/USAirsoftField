import React, { useContext, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight, faPeopleGroup, faUser } from '@fortawesome/free-solid-svg-icons';
import { child, onValue } from 'firebase/database';
import { withFirebase } from '../Firebase';
import { AuthUserContext } from '../session';
import SharePageLink from '../constants/SharePageLink';
import { companionTeamWorkspace, useCompanionTeamDirectory, useTeamLogo } from '../constants/teamDirectory';
import './team-detail.css';

const pointFormat = new Intl.NumberFormat('en-US');

function TeamDetail({ firebase, teamId, source }) {
    const authUser = useContext(AuthUserContext);
    const [fieldTeam, setFieldTeam] = useState(null);
    const [fieldStatus, setFieldStatus] = useState('loading');
    const [fieldCaptain, setFieldCaptain] = useState('');
    const companion = source === 'companion';
    const shared = useCompanionTeamDirectory(firebase, { enabled: companion, id: teamId });
    const team = companion ? shared.record?.team : fieldTeam;
    const status = companion ? shared.status : fieldStatus;
    const { logo, clearLogo } = useTeamLogo(firebase, {
        id: status === 'ready' ? teamId : null, source, hasLogo: team?.hasLogo, user: shared.user,
    });

    useEffect(() => {
        if (companion) return undefined;
        if (!teamId || /[.#$[\]/]/.test(teamId)) {
            setFieldStatus('missing');
            return undefined;
        }
        return onValue(firebase.team(teamId), (snapshot) => {
            const record = snapshot.val();
            setFieldTeam(record);
            setFieldStatus(record ? 'ready' : 'missing');
        }, () => setFieldStatus('error'));
    }, [companion, firebase, teamId]);

    const captainId = companion ? team?.captainId : team?.leader;
    useEffect(() => {
        setFieldCaptain('');
        if (companion || !captainId) return undefined;
        return onValue(child(firebase.user(captainId), 'name'), (snapshot) => {
            setFieldCaptain(snapshot.val() || '');
        }, () => setFieldCaptain(''));
    }, [companion, firebase, captainId]);

    const members = companion ? team?.members ?? []
        : Object.values(team?.members || {}).filter(member =>
            Array.isArray(member) && typeof member[0] === 'string' && typeof member[1] === 'string' && member[1]
        ).map(([name, id]) => ({ name, id }));
    const captain = fieldCaptain || members.find(member => member.id === captainId)?.name;
    const points = Number(team?.points);
    const title = team?.name || teamId;
    const joining = new URLSearchParams({ team: teamId }).toString();
    const signedInTeam = typeof authUser?.team === 'string' && authUser.team.toLowerCase();
    const joinLink = authUser ? `/jointeam?${joining}` : `/login?${joining}`;

    return (
        <main className="team-detail">
            <Helmet><title>{`US Airsoft Field | ${status === 'ready' ? title : 'Team'}`}</title></Helmet>
            <header className="team-detail__hero">
                <div className="team-detail__wrap">
                    <Link className="team-detail__back" to="/teams">
                        <FontAwesomeIcon icon={faArrowLeft} /> Team directory
                    </Link>
                    {status === 'ready' ? (
                        <div className="team-detail__intro">
                            <div className="team-detail__logo">
                                {logo ? <img src={logo} alt="" onError={clearLogo} />
                                    : <FontAwesomeIcon icon={faPeopleGroup} />}
                            </div>
                            <div className="team-detail__identity">
                                <h1>{title}</h1>
                                {team.description && <p>{team.description}</p>}
                                <div className="team-detail__actions">
                                    {companion ? (
                                        <a className="team-detail__button team-detail__button--primary" href={companionTeamWorkspace(teamId)}>
                                            {shared.user?.uid === captainId ? 'Manage in Companion'
                                                : shared.record?.ownTeamId === teamId ? 'Open team workspace' : 'Open in Companion'}
                                        </a>
                                    ) : authUser?.uid && authUser.uid === captainId ? (
                                        <Link className="team-detail__button team-detail__button--primary" to="/manageteam">
                                            Manage team
                                        </Link>
                                    ) : !signedInTeam && (
                                        <Link className="team-detail__button team-detail__button--primary" to={joinLink}>
                                            {authUser ? 'Request to join' : 'Sign in to request to join'}
                                        </Link>
                                    )}
                                    <SharePageLink title={`${title} | USAW Teams`} label="Share team"
                                        className="team-detail__button" />
                                </div>
                            </div>
                        </div>
                    ) : <h1>Team profile</h1>}
                </div>
            </header>

            <div className="team-detail__wrap team-detail__content">
                {status !== 'ready' ? (
                    <p className="team-detail__notice" role={status === 'error' ? 'alert' : 'status'}>
                        {status === 'loading' && 'Loading team…'}
                        {status === 'missing' && 'This team could not be found.'}
                        {status === 'error' && 'Team details are temporarily unavailable. Try refreshing this page.'}
                        {status === 'signed-out' && <><Link to="/login">Sign in</Link> with an active USAW membership to see this team.</>}
                        {status === 'membership-required' && 'An active USAW membership is required to see this team.'}
                    </p>
                ) : (
                    <>
                        <dl className={`team-detail__stats${companion ? ' team-detail__stats--companion' : ''}`}>
                            <div><dt>{companion ? 'Earned points' : 'Team points'}</dt><dd>{Number.isFinite(points) ? pointFormat.format(points) : '—'}</dd></div>
                            {companion && <div className="team-detail__wins"><dt>Wins</dt><dd>{pointFormat.format(team.wins)}</dd></div>}
                            {companion && <div className="team-detail__losses"><dt>Losses</dt><dd>{pointFormat.format(team.losses)}</dd></div>}
                            <div><dt>Roster</dt><dd>{members.length}</dd></div>
                            <div>
                                <dt>Team captain</dt>
                                <dd>{captain && captainId
                                    ? <Link to={`/profilelookup/${encodeURIComponent(captainId)}`}>{captain}</Link>
                                    : '—'}</dd>
                            </div>
                        </dl>
                        {companion && <p className="team-detail__score-note">Scores count games recorded after each player joined this team.</p>}
                        <section aria-labelledby="team-roster">
                            <h2 id="team-roster">Team roster</h2>
                            {members.length ? (
                                <ul className="team-detail__roster">
                                    {members.map(({ name, id: uid }) => (
                                        <li key={uid}>
                                            <Link to={`/profilelookup/${encodeURIComponent(uid)}`}>
                                                <span className="team-detail__member-icon"><FontAwesomeIcon icon={faUser} /></span>
                                                <span>
                                                    <strong>{name}</strong>
                                                    <small>{uid === captainId ? 'Captain' : 'Member'}</small>
                                                </span>
                                                <FontAwesomeIcon icon={faArrowRight} />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="team-detail__notice">The roster is empty.</p>}
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}

function Teampage({ firebase }) {
    const { team = '' } = useParams();
    const [search] = useSearchParams();
    const source = search.get('source') === 'companion' ? 'companion' : 'field';
    const teamId = team.toLowerCase();
    return <TeamDetail key={`${source}:${teamId}`} firebase={firebase} teamId={teamId} source={source} />;
}

export default withFirebase(Teampage);
