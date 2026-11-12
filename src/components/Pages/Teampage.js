import React, { useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight, faPeopleGroup, faUser } from '@fortawesome/free-solid-svg-icons';
import { onValue } from 'firebase/database';
import { getDownloadURL } from 'firebase/storage';
import { withFirebase } from '../Firebase';
import { AuthUserContext } from '../session';
import SharePageLink from '../constants/SharePageLink';
import './team-detail.css';

const pointFormat = new Intl.NumberFormat('en-US');

function TeamDetail({ firebase, teamId }) {
    const authUser = useContext(AuthUserContext);
    const [team, setTeam] = useState(null);
    const [status, setStatus] = useState('loading');
    const [logo, setLogo] = useState('');
    const [captain, setCaptain] = useState('');

    useEffect(() => {
        if (!teamId || /[.#$[\]/]/.test(teamId)) {
            setStatus('missing');
            return undefined;
        }
        return onValue(firebase.team(teamId), (snapshot) => {
            const record = snapshot.val();
            setTeam(record);
            setStatus(record ? 'ready' : 'missing');
        }, () => setStatus('error'));
    }, [firebase, teamId]);

    useEffect(() => {
        if (status !== 'ready') return undefined;
        let active = true;
        getDownloadURL(firebase.teamsPictures(`${teamId}.png`)).then((url) => {
            if (active) setLogo(url);
        }).catch(() => {
            if (active) setLogo('');
        });
        return () => { active = false; };
    }, [firebase, teamId, status]);

    const captainId = team?.leader;
    useEffect(() => {
        setCaptain('');
        if (!captainId) return undefined;
        return onValue(firebase.user(captainId), (snapshot) => {
            setCaptain(snapshot.val()?.name || '');
        }, () => setCaptain(''));
    }, [firebase, captainId]);

    const members = Object.values(team?.members || {}).filter(member =>
        Array.isArray(member) && typeof member[0] === 'string' && typeof member[1] === 'string' && member[1]
    );
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
                                {logo ? <img src={logo} alt="" onError={() => setLogo('')} />
                                    : <FontAwesomeIcon icon={faPeopleGroup} />}
                            </div>
                            <div className="team-detail__identity">
                                <h1>{title}</h1>
                                {team.description && <p>{team.description}</p>}
                                <div className="team-detail__actions">
                                    {authUser?.uid && authUser.uid === captainId ? (
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
                    </p>
                ) : (
                    <>
                        <dl className="team-detail__stats">
                            <div><dt>Team points</dt><dd>{Number.isFinite(points) ? pointFormat.format(points) : '—'}</dd></div>
                            <div><dt>Roster</dt><dd>{members.length}</dd></div>
                            <div>
                                <dt>Team captain</dt>
                                <dd>{captain && captainId
                                    ? <Link to={`/profilelookup/${encodeURIComponent(captainId)}`}>{captain}</Link>
                                    : '—'}</dd>
                            </div>
                        </dl>
                        <section aria-labelledby="team-roster">
                            <h2 id="team-roster">Team roster</h2>
                            {members.length ? (
                                <ul className="team-detail__roster">
                                    {members.map(([name, uid]) => (
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
    const teamId = team.toLowerCase();
    return <TeamDetail key={teamId} firebase={firebase} teamId={teamId} />;
}

export default withFirebase(Teampage);
