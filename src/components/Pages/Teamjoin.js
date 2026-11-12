import React, { useContext, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Typeahead } from 'react-bootstrap-typeahead';
import { Helmet } from 'react-helmet-async';
import { onValue } from 'firebase/database';
import { AuthUserContext, withAuthorization } from '../session';
import { withFirebase } from '../Firebase';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import './team-detail.css';

function TeamJoin({ firebase }) {
    const authUser = useContext(AuthUserContext);
    const [searchParams] = useSearchParams();
    const [teams, setTeams] = useState(null);
    const [selected, setSelected] = useState(null);
    const [unavailable, setUnavailable] = useState(false);
    const [request, setRequest] = useState('idle');
    const hasTeam = Boolean(authUser?.team);
    const desiredTeam = selected ?? searchParams.get('team');
    const teamId = teams?.includes(desiredTeam) ? desiredTeam : '';

    useEffect(() => {
        if (hasTeam) return undefined;
        return onValue(firebase.teams(), (snapshot) => {
            setTeams(Object.keys(snapshot.val() || {}).sort((a, b) => a.localeCompare(b)));
            setUnavailable(false);
        }, () => setUnavailable(true));
    }, [firebase, hasTeam]);

    async function submit(event) {
        event.preventDefault();
        if (!teamId || hasTeam || request === 'pending' || request === 'sent') return;
        setRequest('pending');
        try {
            const result = await firebase.requestTeam()({ team: teamId, user: authUser });
            setRequest(result.data?.message === 'Complete' ? 'sent' : 'failed');
        } catch {
            setRequest('failed');
        }
    }

    return (
        <main className="team-detail">
            <Helmet><title>US Airsoft Field | Join a Team</title></Helmet>
            <header className="team-detail__hero">
                <div className="team-detail__wrap">
                    <Link className="team-detail__back" to="/teams">Team directory</Link>
                    <h1>Join a team</h1>
                </div>
            </header>
            <div className="team-detail__wrap team-detail__content">
                {hasTeam ? (
                    <p className="team-detail__notice">Leave your current team before requesting to join another.</p>
                ) : (
                    <form className="team-detail__notice team-detail__join" onSubmit={submit}>
                        <p>Choose a team to send a join request to its captain.</p>
                        <label htmlFor="team-join">Team name</label>
                        <Typeahead
                            id="team-join"
                            onChange={([team]) => {
                                setSelected(team || '');
                                setRequest('idle');
                            }}
                            options={teams || []}
                            selected={teamId ? [teamId] : []}
                            disabled={!teams || unavailable || request === 'pending'}
                            inputProps={{ id: 'team-join' }}
                            placeholder="Search teams"
                        />
                        {unavailable && <p role="alert">The team directory is temporarily unavailable.</p>}
                        {!teams && !unavailable && <p role="status">Loading teams…</p>}
                        {request === 'sent' && <p role="status">Join request sent.</p>}
                        {request === 'failed' && <p role="alert">Could not send the request. Please try again.</p>}
                        <button className="team-detail__button team-detail__button--primary" type="submit"
                            disabled={!teamId || unavailable || request === 'pending' || request === 'sent'}>
                            {request === 'pending' ? 'Sending…' : 'Request to join'}
                        </button>
                    </form>
                )}
            </div>
        </main>
    );
}

export default withFirebase(withAuthorization(Boolean)(TeamJoin));
