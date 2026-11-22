import React, { useCallback, useEffect, useRef, useState } from 'react';
import { requestStaffFieldTool } from '../../constants/fieldStaffApi';
import { rentalHasGroupEntry } from './utils/groupRentalRoster';
import './GroupRentalPicker.css';

const endpoint = '/api/rental-groups';
const kindLabel = group => group.kind === 'party' ? 'Birthday / private event' : 'Check-in group';

export default function GroupRentalPicker({ firebase, uid, initialGroupId, linkedGroupId, existingEntries = [], onAdd, onPrefill, disabled = false }) {
    const [query, setQuery] = useState('');
    const [date, setDate] = useState('');
    const [results, setResults] = useState(null);
    const [group, setGroup] = useState(null);
    const [excluded, setExcluded] = useState([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const active = useRef(null);
    const applying = useRef(false);
    const targetId = linkedGroupId || initialGroupId;

    const load = useCallback(async (params, prefill = false) => {
        active.current?.abort();
        const operation = new AbortController();
        active.current = operation;
        setLoading(true);
        setError('');
        setStatus('');
        setGroup(null);
        setExcluded([]);
        if (!params.id) setResults(null);
        try {
            const data = await requestStaffFieldTool(firebase, uid, endpoint + '?' + new URLSearchParams(params), {
                signal: operation.signal,
            });
            if (operation.signal.aborted) return;
            if (params.id) {
                if (data.group?.id !== params.id || !Array.isArray(data.group.entries)) throw new Error('The group roster could not be loaded.');
                setGroup(data.group);
                if (prefill && data.group.entries.length) onPrefill?.(data.group, data.group.entries);
            } else {
                if (!Array.isArray(data.groups)) throw new Error('Group search is unavailable.');
                setResults({ ...data, params });
            }
        } catch (failure) {
            if (!operation.signal.aborted) setError(failure.message || 'Unable to load check-in groups.');
        } finally {
            if (active.current === operation) {
                active.current = null;
                setLoading(false);
            }
        }
    }, [firebase, uid, onPrefill]);

    useEffect(() => {
        setResults(null);
        setGroup(null);
        setStatus('');
        setError('');
        setLoading(false);
        if (uid && targetId) load({ id: targetId }, true);
        return () => active.current?.abort();
    }, [uid, targetId, load]);

    const locked = disabled || loading || adding;
    const eligible = group?.entries.filter(entry => !rentalHasGroupEntry(existingEntries, group, entry)) || [];
    const selected = eligible.filter(entry => !excluded.includes(entry.id));
    function find() {
        if (!locked) load({ page: '1', ...(query.trim() && { q: query.trim() }), ...(date && { date }) });
    }

    async function add() {
        if (locked || applying.current || !selected.length) return;
        applying.current = true;
        setAdding(true);
        setStatus('');
        setError('');
        try {
            if (await onAdd(group, selected) === false) return;
            setExcluded(group.entries.map(entry => entry.id));
            setStatus(`${selected.length} ${selected.length === 1 ? 'player added' : 'players added'} to the rental form.`);
        } catch (failure) {
            setError(failure.message || 'The players could not be added. Try again.');
        } finally {
            applying.current = false;
            setAdding(false);
        }
    }

    if (!uid) return null;
    return <section className="group-rental-picker" aria-label="Import check-in players">
        <h3>Import check-in players</h3>
        {!linkedGroupId && <div className="group-rental-picker__filters">
            <label>Group name or invite code
                <input className="form-control" value={query} maxLength={80} disabled={locked} autoComplete="off"
                    onChange={event => setQuery(event.target.value)}
                    onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); find(); } }} />
            </label>
            <label>Visit date <small>(optional)</small>
                <input type="date" className="form-control" value={date} disabled={locked} onChange={event => setDate(event.target.value)} />
            </label>
            <button type="button" className="btn btn-outline-primary" disabled={locked} onClick={find}>Find groups</button>
        </div>}
        {loading && <p role="status">Loading check-in groups…</p>}
        {error && <p role="alert">{error}</p>}
        {results && !group && !linkedGroupId && <div>
            {results.groups.length ? <ul className="group-rental-picker__groups">{results.groups.map(item => <li key={item.id}>
                <button type="button" className="btn btn-outline-secondary" disabled={locked} onClick={() => load({ id: item.id })}>
                    <strong>{item.name}</strong>
                    <span>{kindLabel(item)} · {item.date} · {item.memberCount} {item.memberCount === 1 ? 'player' : 'players'}</span>
                </button>
            </li>)}</ul> : <p role="status">No matching groups. Check the name, invite code or visit date.</p>}
            {results.totalPages > 1 && <div className="group-rental-picker__actions">
                <button type="button" className="btn btn-outline-secondary" disabled={locked || results.page <= 1} onClick={() =>
                    load({ ...results.params, page: String(results.page - 1) })}>Previous groups</button>
                <span>Page {results.page} of {results.totalPages}</span>
                <button type="button" className="btn btn-outline-secondary" disabled={locked || results.page >= results.totalPages} onClick={() =>
                    load({ ...results.params, page: String(results.page + 1) })}>More groups</button>
            </div>}
        </div>}
        {group && <div className="group-rental-picker__roster">
            <h4>{group.name}</h4>
            <p>{kindLabel(group)} · {group.date}</p>
            <button type="button" className="btn btn-outline-secondary" disabled={locked} onClick={() => load({ id: group.id })}>Refresh roster</button>
            {group.entries.length > 0 ? <>
                <fieldset disabled={locked}>
                    <legend>Players to add</legend>
                    {eligible.length > 1 && <label className="group-rental-picker__select-all">
                        <input type="checkbox" checked={selected.length === eligible.length}
                            onChange={event => setExcluded(event.target.checked ? [] : eligible.map(entry => entry.id))} /> Select all available
                    </label>}
                    {group.entries.map(entry => {
                        const present = rentalHasGroupEntry(existingEntries, group, entry);
                        return <label key={entry.id}>
                            <input type="checkbox" disabled={present} checked={present || !excluded.includes(entry.id)}
                                onChange={() => setExcluded(current => current.includes(entry.id)
                                    ? current.filter(id => id !== entry.id) : [...current, entry.id])} />
                            <span>{entry.displayName}</span>{present && <small> Already on form</small>}
                        </label>;
                    })}
                </fieldset>
                {eligible.length > 0 ? <button type="button" className="btn btn-primary" disabled={locked || !selected.length} onClick={add}>
                    {adding ? 'Adding players…' : `Add selected players (${selected.length})`}
                </button> : <p>All players are already on this form.</p>}
            </> : <p>This group has no players yet.</p>}
        </div>}
        {!group && error && targetId && <button type="button" className="btn btn-outline-secondary" disabled={locked}
            onClick={() => load({ id: targetId }, true)}>Retry linked roster</button>}
        {status && <p role="status">{status}</p>}
    </section>;
}
