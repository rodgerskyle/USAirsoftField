import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { child, get, onValue } from 'firebase/database';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import Refresh from '@mui/icons-material/Refresh';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import RentalPickupChoice from './RentalPickupChoice';
import { ArmoryPlayer } from './ArmoryPlayer';
import { armoryFieldDay, armoryQueries, armoryQueue, mergeAdmissionPages } from './utils/armoryQueue';
import { issueRentalGear } from './utils/rentalGear';
import { requestStaffFieldTool } from '../../constants/fieldStaffApi';
import { checkInRentalLink, groupRentalLink } from '../../constants/groupRentalLink';
import './RentalPickupQueue.css';

const stages = [['waiting', 'Waiting for pickup'], ['out','Picked up'], ['returned','Returned'], ['arrival','Awaiting check-in'], ['desk','Waiver review'], ['scheduled','Other field days']];
const visitMatches = (a, b) => a && b && a.date === b.date && a.playerId === b.playerId && a.checkedInAt === b.checkedInAt;

export default function RentalPickupQueue({ firebase, uid, isAdmin, rentalForms }) {
    const [desk, setDesk] = useState(null);
    const [archived, setArchived] = useState([]);
    const [archiveError, setArchiveError] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [actionError, setActionError] = useState('');
    const [stage, setStage] = useState('waiting');
    const [query, setQuery] = useState('');
    const [revision, setRevision] = useState(0);
    const [archiveRetry, setArchiveRetry] = useState(0);
    const inFlight = useRef(new Set());
    const backPath = isAdmin ? '/admin/rentalform' : '/dashboard/rentalform';
    const date = desk?.date || armoryFieldDay();
    const routes = armoryQueries(rentalForms, date).join('\n');
    const readDesk = useCallback(async signal => mergeAdmissionPages(await Promise.all(routes.split('\n').map(path =>
        requestStaffFieldTool(firebase, uid, path, {signal})))), [routes,firebase,uid]);
    useEffect(() => {
        const controller = new AbortController();
        let reading = false;
        async function refresh() {
            if (reading || inFlight.current.size) return;
            reading = true;
            try {
                const next = await readDesk(controller.signal);
                if (!controller.signal.aborted) { setDesk(next); setError(''); }
            } catch (failure) {
                if (!controller.signal.aborted) setError(failure.message || 'Could not refresh the armory.');
            } finally { reading = false; }
        }
        refresh();
        const tick = setInterval(() => { if (!document.hidden) refresh(); },15000);
        return () => { clearInterval(tick); controller.abort(); };
    }, [firebase,readDesk,revision]);

    // Keep an in-flight action alive across a live form update while still ending it when the staff account changes.
    const actor = useRef(null);
    useEffect(() => {
        const controller = new AbortController(); actor.current = controller;
        return () => controller.abort();
    }, [uid,firebase]);

    useEffect(() => {
        setArchived([]); setArchiveError('');
        if (!date || typeof firebase.rentals !== 'function') return;
        const cache = new Map();
        let generation = 0;
        let unsubscribe;
        const failed = () => setArchiveError('Closed return receipts could not be loaded. Refresh pickups to retry.');
        try {
            const root = firebase.rentals();
            unsubscribe = onValue(child(root,'closedGearByDay/'+date), async snapshot => {
                const cycle = ++generation;
                try {
                    const indexed = Object.entries(snapshot.val() || {});
                    const matches = [];
                    for (let i=0; i<indexed.length && cycle===generation; i+=12) {
                        const batch = await Promise.all(indexed.slice(i,i+12).map(async ([id,key])=>{
                            if (!cache.has(id)) {
                                const receipt=(await get(child(root,'closedGear/'+id))).val();
                                if (receipt && (receipt.receiptId || receipt.createRequestId)===id && String(receipt.formKey)===String(key)) {
                                    cache.set(id,{...receipt,key});
                                }
                            }
                            return cache.get(id);
                        }));
                        matches.push(...batch.filter(Boolean));
                    }
                    if (cycle===generation) {setArchived(matches);setArchiveError('');}
                } catch { if (cycle===generation) failed(); }
            },failed);
        } catch { failed(); }
        return () => {generation++;unsubscribe?.();};
    }, [firebase,date,uid,archiveRetry]);

    const queue = useMemo(() => armoryQueue(rentalForms,desk,archived),[rentalForms,desk,archived]);
    async function sync(card, admission, signal) {
        const {form} = card;
        const {playerId, date, checkedInAt} = admission;
        const result = await requestStaffFieldTool(firebase, uid, '/api/rental-pickups', { method:'POST', signal,
            body:{action:'handOut', playerId, date, checkedInAt, formKey:String(form.key), ...(form.createRequestId && {createRequestId:form.createRequestId})} });
        if (!visitMatches(result, admission) || !result.handedOutAt) throw new Error('Pickup is saved. Refresh to confirm check-in.');
        return result;
    }
    async function perform(card, numbers, operationId) {
        if (inFlight.current.has(card.key)) return;
        inFlight.current.add(card.key);
        const signal = actor.current.signal;
        setNotice(''); setError(''); setActionError('');
        let physicalSaved = card.pickedUp;
        try {
            let admission = card.admission;
            const renter = card.form.participants?.[card.person.personKey];
            const couldMatchMember = renter?.isMember && !renter.isDigital;
            let currentDesk;
            if (card.checkInRequired || admission || couldMatchMember) {
                currentDesk = await readDesk(signal);
                if (signal.aborted) return;
                const possible = armoryQueue(card.archived ? [] : [card.form], currentDesk, card.archived ? [card.form] : [])
                    .cards.find(item => item.key === card.key);
                if (admission && !visitMatches(possible?.admission,admission)) {
                    throw new Error('This player’s signed check-in changed. Refresh the armory.');
                }
                if (card.checkInRequired && !possible?.admission) throw new Error('The player must check in before picking up gear.');
                if (!possible) throw new Error('This pickup changed. Review the current rental form.');
                admission = possible.admission;
            }
            if (admission) {
                const receipt = currentDesk.issued.find(row => visitMatches(row,admission));
                if (receipt && (String(receipt.formKey) !== String(card.form.key) ||
                    (receipt.createRequestId && receipt.createRequestId !== card.form.createRequestId))) {
                    throw new Error('This check-in already has a pickup on a different rental form.');
                }
                if (!receipt && !currentDesk.players.some(row => visitMatches(row,admission))) {
                    const {playerId, date, checkedInAt} = admission;
                    const result = await requestStaffFieldTool(firebase,uid,'/api/rental-pickups',{method:'POST',signal,
                        body:{action:'setChoice',playerId,date,checkedInAt,needsGear:true}});
                    if (!visitMatches(result,admission) || !result.needsGear) throw new Error('Refresh to confirm the player’s gear choice.');
                }
            }
            if (!physicalSaved) {
                await issueRentalGear(firebase, card.form, card.person.personKey, numbers, operationId, admission || undefined);
                physicalSaved = true;
            }
            if (signal.aborted) return;
            if (admission) {
                await sync(card, admission, signal);
                if (signal.aborted) return;
            }
            setNotice(card.name + ' has their gear.' + (admission ? ' Send them to the barracks for briefing.' : ' Manage swaps and returns under Picked up.'));
        } catch (failure) {
            if (!signal.aborted) {
                const message = physicalSaved ?
                    'Gear pickup is saved. Check-in still needs confirmation. Use Update check-in under Picked up or Returned. ' + (failure.message || '') :
                    failure.message || 'Could not save this pickup.';
                setActionError(message);
                throw new Error(message);
            }
        } finally {
            inFlight.current.delete(card.key);
            if (!signal.aborted) setRevision(value=>value+1);
        }
    }

    const terms = query.trim().toLowerCase();
    const visible = queue.cards.filter(card => card.stage === stage && (!terms ||
        [card.name,card.group,card.form.transaction,...card.person.rows.map(row=>row.number)].some(value=>String(value || '').toLowerCase().includes(terms))));
    const unassigned = stage === 'waiting' ? queue.unassigned.filter(row => !terms || [row.displayName,row.groupName].join(' ').toLowerCase().includes(terms)) : [];
    const counts = Object.fromEntries(stages.map(([key])=>[key,queue.cards.filter(card=>card.stage===key).length + (key === 'waiting' ? queue.unassigned.length : 0)]));
    return <section className="rental-pickup" aria-label="Rental pickup queue">
        <header className="rental-pickup__header"><div><h3>Armory pickup</h3><p>Enter the equipment numbers when the player collects their gear.</p></div>
            <button className="btn btn-outline-primary" onClick={() => {setRevision(value=>value+1);if (archiveError) setArchiveRetry(value=>value+1);}}><Refresh fontSize="small" aria-hidden="true" /> Refresh pickups</button>
        </header>
        {(actionError || error) && <p className="rental-pickup__message" data-tone="attention" role="alert"><WarningAmberOutlined aria-hidden="true" />{actionError || error}</p>}
        {archiveError && stage === 'returned' && <p role="alert" className="rental-pickup__message" data-tone="attention">{archiveError}</p>}
        {notice && <p className="rental-pickup__message" data-tone="ready" role="status"><CheckCircleOutline aria-hidden="true" />{notice}</p>}
        <div className="armory-stages" role="group" aria-label="Rental status">{stages.filter(([key]) => ['waiting','out','returned'].includes(key) || counts[key] || stage === key).map(([key,label])=>
            <button type="button" aria-pressed={key === stage} className="btn btn-outline-primary" key={key}
                onClick={()=>{setStage(key);setQuery('');}}>{label} <span>{counts[key]}</span></button>)}</div>
        {(counts[stage] > 0 || query) && <label className="armory-filter">Find a player, party, or equipment number
            <input className="form-control" type="search" autoComplete="off" value={query} onChange={event=>setQuery(event.target.value)} /></label>}
        {visible.map(card => {
            const {form,admission} = card;
            const source = admission?.groupId ? groupRentalLink(admission.groupId,isAdmin) : admission && checkInRentalLink(admission.playerId,admission.date,isAdmin);
            const params = new URLSearchParams(source && card.stage !== 'desk' ? source.split('?')[1] : '');
            params.set('view','edit');
            params.set('form',String(form.key));
            if (form.createRequestId) params.set('instance',form.createRequestId);
            if (source && card.stage !== 'desk') params.set('pickup','arrived');
            const link = backPath + '?' + params;
            return <ArmoryPlayer key={card.key} card={card} formLink={link} formLabel={admission?.groupId ? 'Open party rental' : 'Open player rental'}
                firebase={firebase} onIssue={perform} onSync={perform}/>;
        })}
        {unassigned.map(row=>{
            const path = row.groupId ? groupRentalLink(row.groupId,isAdmin) : checkInRentalLink(row.playerId,row.date,isAdmin);
            return <article className="rental-pickup__player" key={row.playerId}><h5>{row.displayName}</h5>
                {row.groupName && <p>{row.groupName}</p>}<p>{row.requestedGear || 'Rental gear requested'}</p><p>Gear assignment needed</p>
                {path && <Link className="btn btn-primary" to={path+'&pickup=arrived'}>{row.groupId?'Open party rental':'Open player rental'}</Link>}
            </article>;
        })}
        {!desk && !error && <p role="status">Checking today’s rental admissions…</p>}
        {desk && !visible.length && !unassigned.length && <p className="rental-pickup__message">{terms ? 'No rentals match that search.' :
            stage === 'waiting' ? 'No checked-in players are waiting for gear.' : stage === 'out' ? 'No gear is currently checked out.' :
            stage === 'returned' ? 'No completed returns to show today.' : stage === 'arrival' ? 'No renters awaiting check-in.' :
            stage === 'scheduled' ? 'No activated bookings for other field days.' : 'All listed renters have verified waivers.'}</p>}
        <RentalPickupChoice firebase={firebase} uid={uid} onSaved={message=>{setNotice(message);setRevision(value=>value+1);}} />
    </section>;
}
