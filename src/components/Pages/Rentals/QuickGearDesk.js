import React, { useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { GearMovementTimes, GearTime } from './GearMovementTimes';
import { StaffCardScanner } from '../StaffCardScanner';
import { changeEquipment, gearRows, tag, validGearTag } from './utils/rentalGear';
import { rentalIdentity } from './utils/openRental';
import './quick-gear.css';

function equipmentCode(raw) {
    const number = tag(raw).replace(/^\]C[01]/, '');
    return validGearTag(number) && !number.includes('://') ? number : null;
}
export function GearScan({ onScan, disabled }) {
    return <StaffCardScanner parseEquipmentTag={equipmentCode} onScan={onScan} disabled={disabled}
        manualFallback="Type the number printed on the equipment or use a connected scanner." />;
}

const labelOf = row => row.label + (row.number ? ' #' + row.number : '');
const keyOf = row => JSON.stringify([row.personKey, row.unitKey]);

export function QuickGearDesk(props) {
    const { form, personKey } = props;
    const selection = JSON.stringify([form.key, rentalIdentity(form), form.transaction || '', personKey]);
    return <RentalGearReview key={selection} {...props} />;
}

function RentalGearReview({ form, firebase, initialTag = '', personKey }) {
    const [filter, setFilter] = useState(initialTag);
    const [review, select] = useState(null);
    const [replacement, setReplacement] = useState('');
    const [repair, setRepair] = useState(true);
    const [reason, setReason] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const inFlight = useRef(false);
    const rows = gearRows(form).filter(row => personKey == null || row.personKey === String(personKey));
    const outstanding = rows.filter(row => row.physicallyIssued && !row.checked);
    const returned = rows.filter(row => row.checked).length;
    const search = filter.trim().toLowerCase();
    const matchesCurrent = row => !search || row.number.toLowerCase().includes(search) ||
        row.name.toLowerCase().includes(search) || String(row.label).toLowerCase().includes(search);
    const canService = row => row.physicallyIssued && !row.checked && matchesCurrent(row) &&
        (row.number.toLowerCase() === search || !row.previousNumbers?.some(item => item.number.toLowerCase() === search));
    const displayed = rows.filter(row => matchesCurrent(row) ||
        row.previousNumbers?.some(item => item.number.toLowerCase().includes(search)));

    function choose(action, items) {
        setMessage(''); setError(''); setReplacement(''); setRepair(true); setReason(''); select({ action, items, operationId: uuid() });
    }
    async function save(event) {
        event.preventDefault();
        if (!review || inFlight.current) return;
        inFlight.current = true; setBusy(true); setError('');
        try {
            await changeEquipment(firebase, form, review.items, review.action, replacement, review.action === 'swap' && repair,
                { reason: repair && review.action === 'swap' ? reason.trim() : '', operationId: review.operationId });
            const item = review.items[0];
            setMessage(review.action === 'swap'
                ? labelOf(item) + ' swapped for #' + tag(replacement) + (repair ? '. Original item held for inspection.' : '.')
                : review.items.length + (review.items.length === 1 ? ' item returned.' : ' items returned.'));
            select(null); setFilter('');
        } catch (failure) {
            setError(failure.message || 'Could not save. Review the current gear before retrying.');
        } finally {
            inFlight.current = false; setBusy(false);
        }
    }

    return <section className="gear-desk" aria-label="Quick rental swaps and returns">
        <h3>{personKey == null ? 'Equipment on this rental' : 'Player equipment'}</h3>
        <p aria-live="polite">{outstanding.length} picked up · {rows.length - outstanding.length - returned} awaiting pickup · {returned} returned</p>
        {message && <p role="status">{message}</p>}
        {review ? <form className="gear-review" onSubmit={save}>
            <h4>{review.action === 'swap' ? 'Swap equipment' : 'Confirm returned equipment'}</h4>
            <ul>{review.items.map(item => <li key={keyOf(item)}>{item.name} · {labelOf(item)}</li>)}</ul>
            {review.action === 'swap' && <>
                <label>Replacement equipment number<input className="form-control" required maxLength={80} autoFocus
                    autoComplete="off" value={replacement} onChange={event => setReplacement(event.target.value)} /></label>
                <GearScan onScan={setReplacement} disabled={busy} />
                <label className="gear-inspection-toggle"><input type="checkbox" checked={repair} onChange={event => setRepair(event.target.checked)} /> Hold the old item for inspection</label>
                {repair && <label>What is wrong with {labelOf(review.items[0])}?<input className="form-control"
                    value={reason} required maxLength={200} onChange={event => setReason(event.target.value)} /></label>}
            </>}
            {error && <p role="alert">{error}</p>}
            <div className="gear-actions"><button type="submit" className="btn btn-primary" disabled={busy || (review.action === 'swap' && repair && !reason.trim())}>{review.action === 'swap' ? 'Save swap' : 'Confirm return'}</button>
                <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={() => select(null)}>Cancel</button></div>
        </form> : <>
            {rows.length > 0 && <>
                <label>Find a renter or equipment number<input className="form-control" value={filter} autoComplete="off"
                    onChange={event => setFilter(event.target.value)} /></label>
                <GearScan onScan={setFilter} />
                {displayed.length ? <ul className="gear-lines">{displayed.map(row => <li key={keyOf(row)}>
                    <div><span><strong>{row.name}</strong> · {labelOf(row)} <small className="gear-status">{row.checked ? 'Returned' : row.physicallyIssued ? 'Picked up' : 'Awaiting pickup'}</small></span>
                        <GearMovementTimes row={row} search={search} />
                    </div>
                    {canService(row) && <div className="gear-actions"><button type="button" className="btn btn-outline-primary" onClick={() => choose('swap', [row])}>Swap</button>
                        <button type="button" className="btn btn-primary" onClick={() => choose('return', [row])}>Return</button></div>}
                </li>)}</ul> : <p>No equipment matches that search.</p>}
                {outstanding.length > 1 && !filter && <button type="button" className="btn btn-outline-primary"
                    onClick={() => choose('return', outstanding)}>Return all {outstanding.length} outstanding items</button>}
            </>}
            {!rows.length && <p>No equipment has been assigned to a renter.</p>}
            {personKey == null && <EquipmentHistory entries={form.gearHistory} />}
        </>}
    </section>;
}


export function EquipmentHistory({ entries }) {
    const history = Object.entries(entries || {}).filter(([, entry]) => entry).sort(([, a], [, b]) => b.at - a.at);
    const actions = { swap: 'Swap', return: 'Return', issue: 'Picked up', assign: 'Number assigned' };
    return history.length > 0 && <details className="gear-history"><summary>Equipment history</summary><ul>
        {history.map(([id, entry]) => <li key={id}><GearTime value={entry.at} /> · {actions[entry.action] || 'Equipment updated'}
            {entry.needsRepair && ' · sent for inspection'}{entry.reason && ' · ' + entry.reason}
            <ul>{Object.values(entry.items || {}).map((item, i) => <li key={i}>{item.name} · {item.label || item.value} {item.from && '#' + item.from}{item.to && (item.from ? ' → #' : '#') + item.to}</li>)}</ul>
        </li>)}
    </ul></details>;
}
