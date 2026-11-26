import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import RentalPickupChoice from './RentalPickupChoice';
import { requestStaffFieldTool } from '../../constants/fieldStaffApi';
import { checkInRentalLink, groupRentalLink } from '../../constants/groupRentalLink';
import { isCheckInRenter, linkedPlayerRental } from './utils/checkInRenter';

function issuedGear(form, player) {
    const people = Object.values(form?.participants || {}).filter(person => isCheckInRenter(person, player));
    return people.length === 1 ? Object.values(people[0].rentals || {}).filter(Boolean) : [];
}

export default function RentalPickupQueue({ firebase, uid, isAdmin, rentalForms }) {
    const [players, setPlayers] = useState(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [revision, setRevision] = useState(0);
    const sending = useRef(false);
    const visit = useRef(null);
    useEffect(() => {
        const controller = new AbortController();
        visit.current = controller;
        let loading = false;
        async function refresh() {
            if (loading || sending.current) return;
            loading = true;
            try {
                const data = await requestStaffFieldTool(firebase, uid, '/api/rental-groups?pickup=today', { signal: controller.signal });
                if (!Array.isArray(data.players)) throw new Error('Could not read today’s pickup queue.');
                if (!controller.signal.aborted && !sending.current) { setPlayers(data.players); setError(''); }
            } catch (err) {
                if (!controller.signal.aborted) setError(err.message || 'Could not refresh pickups.');
            } finally { loading = false; }
        }
        refresh();
        const tick = setInterval(() => { if (!document.hidden) refresh(); }, 15000);
        return () => { clearInterval(tick); controller.abort(); };
    }, [firebase, uid, revision]);

    async function confirm(row, form) {
        if (sending.current) return;
        sending.current = true;
        setBusy(true); setNotice(''); setError('');
        const signal = visit.current.signal;
        try {
            const data = await requestStaffFieldTool(firebase, uid, '/api/rental-pickups', { method: 'POST', signal, body: {
                action: 'handOut', date: row.date, playerId: row.playerId, checkedInAt: row.checkedInAt, formKey: String(form.key),
            } });
            if (data.playerId !== row.playerId || data.checkedInAt !== row.checkedInAt || !data.handedOutAt) throw new Error('Refresh to confirm the handoff.');
            if (!signal.aborted) {
                setPlayers(list => list?.filter(item => item.playerId !== row.playerId));
                setNotice(row.displayName + ' has their gear. Next stop: the barracks for briefing.');
                setRevision(value => value + 1);
            }
        } catch (err) {
            if (!signal.aborted) setError(err.message || 'Could not confirm the handoff. Refresh and retry.');
        } finally { sending.current = false; if (!signal.aborted) setBusy(false); }
    }

    return <section className="admin-panel-card p-3" aria-label="Rental pickup queue">
        <h3>Rental pickup</h3><p>Checked-in players who requested gear appear here. Confirm pickup when you hand over their assigned items.</p>
        <button className="btn btn-outline-primary" disabled={busy} onClick={() => setRevision(value => value + 1)}>Refresh pickups</button>
        <RentalPickupChoice firebase={firebase} uid={uid} disabled={busy} onSaved={message => {
            setNotice(message); setRevision(value => value + 1);
        }} />
        {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
        {!players && !error && <p role="status">Loading pickups…</p>}
        {players?.length === 0 && <p>No checked-in players are waiting for gear.</p>}
        {players?.map(row => {
            const form = linkedPlayerRental(rentalForms, row);
            const gear = issuedGear(form, row);
            const assigned = form?.complete && gear.length > 0 && gear.every(item => !item.checked && String(item.number ?? '').trim());
            const link = row.groupId ? groupRentalLink(row.groupId, isAdmin) + '&pickup=arrived' : checkInRentalLink(row.playerId, row.date, isAdmin);
            return <article className="rental-pickup-row" key={row.playerId}>
                <h4>{row.displayName}</h4>
                {row.groupName && <p>{row.groupName}</p>}
                <p>{row.requestedGear || 'Rental gear requested'}</p>
                {gear.length > 0 && <p>Assigned equipment: {gear.map(item => [item.label || item.value, item.number].filter(Boolean).join(' #')).join(', ')}</p>}
                <div className="d-flex flex-wrap gap-2">
                    {link && <Link className="btn btn-outline-primary" to={link}>{row.groupId ? 'Open party rental' : 'Open player rental'}</Link>}
                    {assigned && <button className="btn btn-primary" disabled={busy} onClick={() => confirm(row, form)}>Confirm gear handed to {row.displayName}</button>}
                </div>
            </article>;
        })}
    </section>;
}
