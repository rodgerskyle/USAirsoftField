import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import Refresh from '@mui/icons-material/Refresh';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import RentalPickupChoice from './RentalPickupChoice';
import './RentalPickupQueue.css';
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
    const [confirmingId, setConfirmingId] = useState(null);
    const busy = confirmingId !== null;
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
        setConfirmingId(row.playerId); setNotice(''); setError('');
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
        } finally { sending.current = false; if (!signal.aborted) setConfirmingId(null); }
    }

    return <section className="rental-pickup" aria-label="Rental pickup queue">
        <header className="rental-pickup__header">
            <div><h3>Rental pickup</h3><p>Confirm each pickup as you hand the player their numbered gear.</p></div>
            <button className="btn btn-outline-primary" disabled={busy} onClick={() => setRevision(value => value + 1)}>
                <Refresh fontSize="small" aria-hidden="true" /> Refresh pickups
            </button>
        </header>
        {error && <p className="rental-pickup__message" data-tone="attention" role="alert"><WarningAmberOutlined aria-hidden="true" />{error}</p>}
        {notice && <p className="rental-pickup__message" data-tone="ready" role="status"><CheckCircleOutline aria-hidden="true" />{notice}</p>}
        {!players && !error && <p className="rental-pickup__message" role="status"><ScheduleOutlined aria-hidden="true" />Loading pickups…</p>}
        {players?.length === 0 && <p className="rental-pickup__message"><CheckCircleOutline aria-hidden="true" />No checked-in players are waiting for gear.</p>}
        {players?.length > 0 && <h4 className="rental-pickup__list-title">Waiting for pickup <span>{players.length}</span></h4>}
        {players?.map(row => {
            const form = linkedPlayerRental(rentalForms, row);
            const gear = issuedGear(form, row);
            const assigned = form?.complete && gear.length > 0 && gear.every(item => !item.checked && String(item.number ?? '').trim());
            const formLink = row.groupId ? groupRentalLink(row.groupId, isAdmin) : checkInRentalLink(row.playerId, row.date, isAdmin);
            const link = formLink && formLink + '&pickup=arrived';
            const formLabel = row.groupId ? 'Open party rental' : 'Open player rental';
            return <article className="rental-pickup__player" key={row.playerId}>
                <div className="rental-pickup__identity">
                    <h5>{row.displayName}</h5>
                    <span className="rental-pickup__state" data-tone={assigned ? 'ready' : 'pending'}>
                        {assigned ? <CheckCircleOutline aria-hidden="true" /> : <AssignmentOutlined aria-hidden="true" />}
                        {assigned ? 'Ready to hand over' : 'Gear assignment needed'}
                    </span>
                </div>
                {row.groupName && <p className="rental-pickup__group">{row.groupName}</p>}
                <dl className="rental-pickup__gear">
                    <div><dt>Requested gear</dt><dd>{row.requestedGear || 'Rental gear requested'}</dd></div>
                    {gear.length > 0 && <div><dt>Assigned equipment</dt><dd>{gear.map(item => [item.label || item.value, item.number].filter(value => value != null && String(value).trim()).join(' #')).join(', ')}</dd></div>}
                </dl>
                <div className="rental-pickup__actions">
                    {assigned && <button className="btn btn-primary" disabled={busy} onClick={() => confirm(row, form)} aria-label={'Confirm gear handed to ' + row.displayName}>
                        <Inventory2Outlined fontSize="small" aria-hidden="true" />{confirmingId === row.playerId ? 'Saving pickup…' : 'Confirm gear handed over'}
                    </button>}
                    {link && <Link className={assigned ? 'btn btn-outline-primary' : 'btn btn-primary'} to={link}>{formLabel}</Link>}
                </div>
            </article>;
        })}
        <RentalPickupChoice firebase={firebase} uid={uid} disabled={busy} onSaved={message => {
            setNotice(message); setRevision(value => value + 1);
        }} />
    </section>;
}
