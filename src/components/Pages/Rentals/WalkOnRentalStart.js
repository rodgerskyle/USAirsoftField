import React, { useEffect, useState } from 'react';
import { requestStaffFieldTool } from '../../constants/fieldStaffApi';
import CreateRentalForm from './CreateRentalForm';

function resolveWalkOn(firebase, uid, playerId, date, signal) {
    const path = '/api/rental-groups?' + new URLSearchParams({ walkOn: playerId, date });
    return requestStaffFieldTool(firebase, uid, path, { signal }).then(({ walkOn }) => {
        if (walkOn?.playerId !== playerId || walkOn.date !== date || !walkOn.displayName?.trim()) {
            throw new Error('Could not confirm this walk-on. Reopen the player from check-in.');
        }
        return walkOn;
    });
}

export default function WalkOnRentalStart({ playerId, date, ...props }) {
    const { firebase, uid } = props;
    const [attempt, setAttempt] = useState(0);
    const [player, setPlayer] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
        const operation = new AbortController();
        setError('');
        setPlayer(null);
        resolveWalkOn(firebase, uid, playerId, date, operation.signal).then(row => {
            if (!operation.signal.aborted) setPlayer(row);
        }).catch(failure => {
            if (!operation.signal.aborted) setError(failure.message || 'Could not load the walk-on. Please retry.');
        });
        return () => operation.abort();
    }, [firebase, uid, playerId, date, attempt]);

    if (error) return <section className="admin-panel-card p-3">
        <p role="alert">{error}</p>
        <button type="button" className="btn btn-outline-primary" onClick={() => setAttempt(value => value + 1)}>Retry walk-on lookup</button>
    </section>;
    if (!player) return <p role="status">Loading the checked-in player…</p>;
    return <CreateRentalForm {...props} walkOn={player} verifyWalkOn={() => resolveWalkOn(firebase, uid, playerId, date)} />;
}
