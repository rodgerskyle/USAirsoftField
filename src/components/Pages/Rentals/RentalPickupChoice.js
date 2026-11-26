import React, { useEffect, useRef, useState } from 'react';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import { requestStaffFieldTool } from '../../constants/fieldStaffApi';

export default function RentalPickupChoice({ firebase, uid, onSaved, disabled }) {
    const [name, setName] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const request = useRef(null);
    useEffect(() => () => request.current?.abort(), [uid]);

    async function run(path, options, receive) {
        if (request.current || disabled) return;
        const controller = new AbortController();
        request.current = controller;
        setLoading(true);
        setError('');
        try {
            const data = await requestStaffFieldTool(firebase, uid, path, { ...options, signal: controller.signal });
            if (!controller.signal.aborted) receive(data);
        } catch (err) {
            if (!controller.signal.aborted) setError(err.message || 'Could not confirm the player’s rental choice.');
        } finally {
            if (request.current === controller) {
                request.current = null;
                if (!controller.signal.aborted) setLoading(false);
            }
        }
    }

    function find(event) {
        event.preventDefault();
        if (name.trim().length < 2) return;
        setResult(null);
        run('/api/rental-pickups?' + new URLSearchParams({q:name.trim()}), {}, data => {
            if (!Array.isArray(data.players) || !data.date) throw new Error('Could not read today’s admissions.');
            setResult(data);
        });
    }

    function choose(row, needsGear) {
        run('/api/rental-pickups', {method:'POST', body:{
            action:'setChoice', date:result.date, playerId:row.playerId, checkedInAt:row.checkedInAt, needsGear,
        }}, data => {
            if (data.playerId !== row.playerId || data.checkedInAt !== row.checkedInAt || data.needsGear !== needsGear) throw new Error('Refresh to confirm the gear choice.');
            setResult(null);
            setName('');
            onSaved(needsGear ? row.displayName + ' is on the pickup list.' : row.displayName + ' is bringing their own gear and can go to briefing.');
        });
    }

    return <details className="rental-pickup__choice"><summary>Change a checked-in player’s gear choice</summary>
        <form className="rental-pickup__search" onSubmit={find}><label>Checked-in player name
            <input className="form-control" autoComplete="off" value={name} maxLength={80} disabled={disabled || loading}
                onChange={event => { setName(event.target.value); setResult(null); setError(''); }} /></label>{' '}
            <button type="submit" className="btn btn-outline-primary" disabled={disabled || loading || name.trim().length < 2}><SearchOutlined fontSize="small" aria-hidden="true" /> Find checked-in player</button>
        </form>
        {loading && <p role="status">Updating gear choices…</p>}
        {error && <p className="rental-pickup__message" data-tone="attention" role="alert"><WarningAmberOutlined aria-hidden="true" />{error}</p>}
        {result?.players.length === 0 && <p>No matching players waiting for a gear decision.</p>}
        {result?.players.map(row => <article key={row.playerId} className="rental-pickup__result">
            <strong>{row.displayName}</strong> {row.groupName && <span>· {row.groupName}</span>}
            <p>Checked in {new Date(row.checkedInAt).toLocaleTimeString('en-US', {hour:'numeric',minute:'2-digit', timeZone:'America/Los_Angeles'})} · ID ending {row.playerId.slice(-6)}</p>
            <div className="rental-pickup__actions">
                <button className="btn btn-outline-primary" disabled={disabled || loading} onClick={() => choose(row, true)}>Needs rental gear</button>
                <button className="btn btn-outline-primary" disabled={disabled || loading} onClick={() => choose(row, false)}>Bringing own gear</button>
            </div>
        </article>)}
    </details>;
}
