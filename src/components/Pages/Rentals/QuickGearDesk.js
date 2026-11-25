import React, { useRef, useState } from 'react';
import { StaffCardScanner } from '../StaffCardScanner';
import { changeEquipment, gearRows, tag, validGearTag } from './utils/rentalGear';
import './quick-gear.css';

function equipmentCode(raw) {
    const number = tag(raw).replace(/^\]C[01]/, '');
    return validGearTag(number) && !number.includes('://') ? number : null;
}
export function GearScan({ onScan, disabled }) {
    return <StaffCardScanner parseEquipmentTag={equipmentCode} onScan={onScan} disabled={disabled}
        manualFallback="Type the number printed on the equipment or use a connected scanner." />;
}

const labelOf = row => row.label + ' #' + row.number;
const keyOf = row => JSON.stringify([row.personKey, row.unitKey]);

export function QuickGearDesk({ form, firebase, initialTag = '' }) {
    const [filter, setFilter] = useState(initialTag);
    const [review, select] = useState(null);
    const [replacement, setReplacement] = useState('');
    const [repair, setRepair] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const inFlight = useRef(false);
    const rows = gearRows(form).filter(row => row.number);
    const outstanding = rows.filter(row => !row.checked);
    const search = filter.trim().toLowerCase();
    const displayed = outstanding.filter(row => !search || row.number.toLowerCase().includes(search) ||
        row.name.toLowerCase().includes(search) || String(row.label).toLowerCase().includes(search));

    function choose(action, items) {
        setMessage(''); setError(''); setReplacement(''); setRepair(true); select({ action, items });
    }
    async function save(event) {
        event.preventDefault();
        if (!review || inFlight.current) return;
        inFlight.current = true; setBusy(true); setError('');
        try {
            await changeEquipment(firebase, form, review.items, review.action, replacement, repair);
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
    const history = Object.entries(form.gearHistory || {}).sort(([, a], [, b]) => b.at - a.at);
    return <section className="gear-desk" aria-label="Quick rental swaps and returns">
        <h3>Issued equipment</h3>
        <p aria-live="polite">{outstanding.length} outstanding · {rows.length - outstanding.length} returned</p>
        {message && <p role="status">{message}</p>}
        {review ? <form className="gear-review" onSubmit={save}>
            <h4>{review.action === 'swap' ? 'Swap equipment' : 'Confirm returned equipment'}</h4>
            <ul>{review.items.map(item => <li key={keyOf(item)}>{item.name} · {labelOf(item)}</li>)}</ul>
            {review.action === 'swap' && <>
                <label>Replacement equipment number<input className="form-control" required maxLength={80} autoFocus
                    autoComplete="off" value={replacement} onChange={event => setReplacement(event.target.value)} /></label>
                <GearScan onScan={setReplacement} disabled={busy} />
                <label><input type="checkbox" checked={repair} onChange={event => setRepair(event.target.checked)} /> Hold the old item for inspection</label>
            </>}
            {error && <p role="alert">{error}</p>}
            <div className="gear-actions"><button type="submit" className="btn btn-primary" disabled={busy}>{review.action === 'swap' ? 'Save swap' : 'Confirm return'}</button>
                <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={() => select(null)}>Cancel</button></div>
        </form> : <>
            {outstanding.length > 0 && <>
                <label>Find a renter or equipment number<input className="form-control" value={filter} autoComplete="off"
                    onChange={event => setFilter(event.target.value)} /></label>
                <GearScan onScan={setFilter} />
                {displayed.length ? <ul className="gear-lines">{displayed.map(row => <li key={keyOf(row)}>
                    <span><strong>{row.name}</strong> · {labelOf(row)}</span>
                    <div className="gear-actions"><button type="button" className="btn btn-outline-primary" onClick={() => choose('swap', [row])}>Swap</button>
                        <button type="button" className="btn btn-primary" onClick={() => choose('return', [row])}>Return</button></div>
                </li>)}</ul> : <p>No outstanding gear matches that search.</p>}
                {outstanding.length > 1 && !filter && <button type="button" className="btn btn-outline-primary"
                    onClick={() => choose('return', outstanding)}>Return all {outstanding.length} outstanding items</button>}
            </>}
            {!outstanding.length && <p>{rows.length ? 'All numbered equipment has been returned.' : 'No numbered equipment has been issued.'}</p>}
            {history.length > 0 && <details><summary>Equipment history</summary><ul>
                {history.map(([id, entry]) => <li key={id}>{new Date(entry.at).toLocaleString()} · {entry.action === 'swap' ? 'Swap' : entry.action === 'return' ? 'Return' : 'Number assigned'}{entry.needsRepair ? ' · sent for inspection' : ''}
                    <ul>{Object.values(entry.items || {}).map((item, i) => <li key={i}>{item.name} · {item.label} {item.from && '#' + item.from}{item.to && (item.from ? ' → #' : '#') + item.to}</li>)}</ul></li>)}
            </ul></details>}
        </>}
    </section>;
}
