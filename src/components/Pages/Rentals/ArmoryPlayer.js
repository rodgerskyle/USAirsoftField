import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import { v4 as uuid } from 'uuid';
import { QuickGearDesk } from './QuickGearDesk';
import { validGearTag } from './utils/rentalGear';

export function ArmoryPlayer({ card, formLink, formLabel, onIssue, onSync, firebase }) {
    const {form, person, name, group, stage, pending, syncRequired, conflict, archived} = card;
    const [edits, setEdits] = useState({});
    const [working, setWorking] = useState(false);
    const [error, setError] = useState('');
    const [serviceOpen, setServiceOpen] = useState(false);
    const attempt = useRef(null);
    const lock = useRef(false);
    const numbers = Object.fromEntries(person.rows.map(row => [row.unitKey, edits[row.unitKey] ?? row.number ?? '']));
    const complete = person.rows.length > 0 && person.rows.every(row => validGearTag(String(numbers[row.unitKey])));
    const stateLabel = {waiting:complete ? 'Ready to hand over' : 'Equipment numbers needed', out:person.rows.some(row => row.checked) ? 'Partially returned' : 'Picked up', returned:archived ? 'Returned' : 'All gear returned', desk:'Waiver verification needed',arrival:'Awaiting check-in',scheduled:'Other field day'}[stage];
    async function save(event) {
        event.preventDefault();
        if (lock.current) return;
        setError(''); setWorking(true); lock.current = true;
        try {
            if (syncRequired) await onSync(card);
            else {
                const signature = JSON.stringify(numbers);
                if (attempt.current?.signature !== signature) attempt.current = {signature, id:uuid()};
                await onIssue(card, numbers, attempt.current.id);
            }
        } catch (failure) {
            setError(failure.message || 'Could not confirm pickup. Check the rental before retrying.');
        } finally {
            lock.current = false; setWorking(false);
        }
    }
    return <article className="rental-pickup__player" aria-label={'Rental for ' + name}>
        <div className="rental-pickup__identity"><h5>{name}</h5>
            <span className="rental-pickup__state" data-tone={['returned','out'].includes(stage) || (complete && stage === 'waiting') ? 'ready' : 'pending'}>
                {['desk','arrival','scheduled'].includes(stage) || (stage === 'waiting' && !complete) ? <AssignmentOutlined aria-hidden="true" /> : <CheckCircleOutline aria-hidden="true" />}{stateLabel}
            </span>
        </div>
        {(group !== name || form.transaction) && <p className="rental-pickup__group">
            {[group !== name && group,form.transaction && 'Transaction ' + form.transaction].filter(Boolean).join(' · ')}
        </p>}
        {['arrival','scheduled'].includes(stage) && <p>{stage === 'scheduled' && card.fieldDate ? 'Field day ' + card.fieldDate + '. ' : ''}Pickup opens when this player checks in with a signed waiver.</p>}
        {pending?.requestedGear && <p>{pending.requestedGear}</p>}
        {stage === 'waiting' ? <form onSubmit={save}>
            <fieldset className="armory-numbers" disabled={working}><legend>Equipment numbers</legend>
                {person.rows.map((row,index) => <label key={row.unitKey}>
                    <span>{row.label || row.value || 'Item'}{person.rows.filter(item => item.label === row.label).length > 1 ? ' · item ' + (index + 1) : ''}</span>
                    <input className="form-control" autoComplete="off" maxLength={80} value={numbers[row.unitKey]}
                        placeholder="Equipment number" aria-label={(row.label || 'Equipment') + ' number, item ' + (index + 1) + ' for ' + name}
                        onChange={event => setEdits({...edits,[row.unitKey]:event.target.value})} required />
                </label>)}
            </fieldset>
            <div className="rental-pickup__actions">
                <button type="submit" className="btn btn-primary" disabled={working || !complete} aria-label={'Confirm gear handed to ' + name}>
                    <Inventory2Outlined fontSize="small" aria-hidden="true" />{working ? 'Saving pickup…' : 'Confirm gear handed over'}
                </button>
                {formLink && <Link className="btn btn-outline-primary" to={formLink}>{formLabel}</Link>}
            </div>
        </form> : <>
            <ul className="armory-issued-list">{person.rows.map(row => <li key={row.unitKey}>
                <span>{row.label || row.value || 'Item'} {row.number && <strong>#{row.number}</strong>}</span>
                {row.checked && <span className="armory-returned"><CheckCircleOutline fontSize="small" aria-hidden="true" /> Returned</span>}
            </li>)}</ul>
            {conflict && <p role="alert">This check-in has a pickup receipt for another rental. Review both forms before handing over additional equipment.</p>}
            {syncRequired && <div className="armory-sync"><p>Pickup is saved. Update check-in to send this player to briefing.</p>
                <button type="button" className="btn btn-outline-primary" onClick={save} disabled={working}>{working ? 'Updating…' : 'Update check-in'}</button>
            </div>}
            {stage === 'desk' && formLink && <Link className="btn btn-primary" to={formLink}>Verify waiver on rental form</Link>}
            {stage === 'out' && !archived && <><button type="button" className="btn btn-primary" aria-expanded={serviceOpen}
                onClick={() => setServiceOpen(!serviceOpen)}>{serviceOpen ? 'Hide gear controls' : 'Swap or return gear'}</button>
                {serviceOpen && <QuickGearDesk form={form} personKey={person.personKey} firebase={firebase} />}</>}
        </>}
        {error && <p role="alert" className="rental-pickup__message" data-tone="attention">{error}</p>}
    </article>;
}
