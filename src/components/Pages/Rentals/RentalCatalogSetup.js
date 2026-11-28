import React, { useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { historicalRentalCatalog } from './utils/historicalRentalCatalog';
import { rentalCatalogHistory, restoreRentalCatalog } from './utils/restoreRentalCatalog';
import './rental-catalog-setup.css';

const labelKey = label => String(label || '').trim().toLowerCase();
const draftKey = value => typeof value + ':' + value;

function catalogSuggestions(forms) {
    const history = rentalCatalogHistory(forms, historicalRentalCatalog);
    const seenValues = new Set(history.map(item => String(item.value)));
    const seenNames = new Set(history.map(item => labelKey(item.label)));
    const remaining = historicalRentalCatalog.filter(item =>
        !seenValues.has(String(item.value)) && !seenNames.has(labelKey(item.label)));
    return [...history, ...remaining];
}

function prepareEntries(items) {
    const entries = [];
    for (const item of items) {
        const name = item.label.trim();
        if (String(item.max).trim() === '') {
            if (item.required || item.custom) throw new Error('Enter a maximum for ' + (name || 'the custom item') + '.');
            continue;
        }
        if (!name) throw new Error('Enter an equipment name for the custom item.');
        const max = Number(item.max);
        if (!Number.isSafeInteger(max) || max < 0) throw new Error('Enter a whole-number maximum of zero or more for ' + name + '.');
        if (item.required && max < item.stock) throw new Error(name + ' needs a maximum of at least ' + item.stock + ' to cover existing rentals.');
        const cost = Number(item.cost);
        if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(String(item.cost).trim()) || !Number.isSafeInteger(Math.round(cost * 100))) {
            throw new Error('Enter a replacement value in dollars and cents for ' + name + '.');
        }
        entries.push({ value: item.value, label: name, cost, max, ...(item.id != null && { id: item.id }) });
    }
    if (!entries.length) throw new Error('Enter a maximum for at least one equipment type.');
    return entries;
}

const money = new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'});

export default function RentalCatalogSetup({ firebase, rentalForms, onRestored }) {
    const [open, setOpen] = useState(false);
    const [drafts, setDrafts] = useState({});
    const [custom, setCustom] = useState([]);
    const [review, setReview] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const lock = useRef(false);
    const items = [...catalogSuggestions(rentalForms), ...custom].map(item => ({
        ...item, max: '', ...drafts[draftKey(item.value)]
    }));

    function change(item, field, value) {
        const key = draftKey(item.value);
        setDrafts(previous => ({ ...previous, [key]: { ...previous[key], [field]: value } }));
        setError('');
    }

    function reviewItems(event) {
        event.preventDefault();
        setError('');
        try {
            setReview(prepareEntries(items));
        } catch (failure) {
            setError(failure.message);
        }
    }

    async function save() {
        if (lock.current || !review) return;
        lock.current = true;
        setError('');
        setSaving(true);
        try {
            await restoreRentalCatalog(firebase, review);
            setSaved(true);
            onRestored?.(review.length);
        } catch (failure) {
            setError(failure.message || 'Could not save the rental inventory. Try again.');
        } finally {
            setSaving(false);
            lock.current = false;
        }
    }

    if (saved) return <p role="status">Rental inventory saved.</p>;
    if (!open) return <button type="button" className="btn btn-outline-primary catalog-setup-open"
        onClick={() => setOpen(true)}>Set up inventory manually</button>;

    return <section className="rental-catalog-setup" aria-label="Manual rental inventory setup">
        <h4>{review ? 'Review rental inventory' : 'Set up rental inventory'}</h4>
        {review ? <>
            <ul className="catalog-setup-review" aria-label="Equipment to save">{review.map(item =>
                <li key={draftKey(item.value)}><strong>{item.label}</strong>
                    <span>{item.max} maximum · {money.format(item.cost)} replacement value</span></li>)}</ul>
            <div className="desk-inventory-actions">
                <button type="button" className="btn btn-primary" disabled={saving}
                    onClick={save}>{saving ? 'Saving inventory…' : 'Save rental inventory'}</button>
                <button type="button" className="btn btn-outline-primary" disabled={saving}
                    onClick={() => { setReview(null); setError(''); }}>Edit quantities</button>
            </div>
        </> : <form onSubmit={reviewItems} noValidate>
            <p>Include every equipment type the armory needs before saving. Check the suggested replacement values against your records.
                Count usable gear, including units already reserved or out with players. Enter 0 to list an item as out of stock and update it later. Leave unused suggestions blank.</p>
            <div className="catalog-setup-items">{items.map((item,index) => {
                const caption = item.label || 'custom item ' + (index + 1);
                return <div key={draftKey(item.value)} className="catalog-setup-row">
                    <div className="catalog-setup-name">{item.custom ? <>
                        <label>Equipment name<input className="form-control" type="text" value={item.label}
                            onChange={e => change(item, 'label', e.target.value)} /></label>
                        <button type="button" className="btn btn-link" aria-label={'Remove ' + caption}
                            onClick={() => {setCustom(rows => rows.filter(row => row.value !== item.value)); setError('');}}>Remove</button>
                    </> : <strong>{caption}</strong>}
                    {item.required && <small>{item.stock} reserved · maximum required</small>}</div>
                    <label>Replacement value ($)<input className="form-control" type="number" min="0" step=".01" inputMode="decimal"
                        aria-label={'Replacement value for ' + caption} value={item.cost ?? ''}
                        onChange={e => change(item, 'cost', e.target.value)} /></label>
                    <label>Maximum units<input className="form-control" type="number" min={item.required ? item.stock : 0} step="1" inputMode="numeric"
                        aria-label={'Maximum units for ' + caption} value={item.max}
                        onChange={e => change(item, 'max', e.target.value)} /></label>
                </div>;
            })}</div>
            <div className="desk-inventory-actions">
                <button type="button" className="btn btn-outline-primary" onClick={() => {
                    setCustom(previous => [...previous, { value: 'custom-' + uuid(), label: '', cost: '', custom: true }]);
                    setError('');
                }}>Add custom equipment</button>
                <button type="submit" className="btn btn-primary">Review inventory</button>
                <button type="button" className="btn btn-link" onClick={() => {setOpen(false); setError('');}}>Close</button>
            </div>
        </form>}
        {error && <p className="alert alert-danger" role="alert">{error}</p>}
    </section>;
}
