import React, { useCallback, useRef, useState } from 'react';
import StaffWaiverPicker from '../StaffWaiverPicker';
import { searchRentalWaivers } from './utils/rentalWaiverProof';
import PaymentForm from './components/creditcard';
import { formatExpirationDate, formatCreditCardNumber, formatCVC } from '../../constants/formatcard';
import RenterGearChoices from './RenterGearChoices';
import { changeOpenRental, rentalIdentity, rentalRows } from './utils/openRental';
import { activateReadyRental, canUpgradeRental, currentRentalProof, depositErrors, gearOptions, intakeEntries, participantKey, rentalDraftProblem } from './utils/rentalActivation';

const blankCard={name:'',number:'',expiry:'',cvc:'',zipcode:''};
const same=(a,b)=>JSON.stringify(a ?? null)===JSON.stringify(b ?? null);
const normalizedName = name => String(name || '').normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g,' ');

export default function RentalIntakeEditor({form, firebase, uid}) {
    const [changes,setChanges]=useState({});
    const [receipt,setReceipt]=useState(null);
    const [card,setCard]=useState(null);
    const [notice,setNotice]=useState('');
    const [saving,setSaving]=useState(false);
    const busy=useRef(false);
    const upgrade=canUpgradeRental(form);
    const draft=upgrade ? {...form,complete:false} : form;
    const entries=intakeEntries(draft);
    const people=entries.map(([,person])=>({...person,...changes[participantKey(person)]?.fields}));
    const options=gearOptions(draft);
    const paymentMissing=(!form.complete || !form.activatedAt) && Object.keys(depositErrors(form.cc)).length>0;

    function changePerson(index,fields) {
        const person=entries[index][1], key=participantKey(person);
        setChanges(current=>({...current,[key]:{
            original:current[key]?.original || person,
            fields:{...current[key]?.fields,...fields},
        }}));
    }
    const searchWaivers=useCallback((name,signal)=>searchRentalWaivers(firebase,uid,name,signal),[firebase,uid]);

    async function save() {
        if (busy.current) return;
        busy.current=true; setSaving(true); setNotice('');
        try {
            const changed=Object.values(changes);
            const changedReceipt=receipt!==null && receipt.trim()!==String(form.transaction || '');
            if (card && Object.keys(depositErrors(card)).length) throw new Error('Complete the deposit details before saving.');
            let latest=form;
            if (changed.length || changedReceipt || card) {
                latest=await changeOpenRental(firebase.rentalGroup(form.key),current=>{
                    if (upgrade && !canUpgradeRental(current)) return undefined;
                    if (!upgrade && current.complete && !form.complete) return undefined;
                    const participants=Array.isArray(current.participants) ? [...current.participants] : {...current.participants};
                    const next={...current};
                    if (!current.complete) next.armoryVersion=1;
                    for (const {original,fields} of changed) {
                        const matches=Object.entries(participants).filter(([,person])=>person && participantKey(person)===participantKey(original));
                        if (matches.length!==1) return undefined;
                        const [key,person]=matches[0];
                        if (person.armoryIssuedAt || currentRentalProof(person.waiverProof) || !same(person.waiverProof,original.waiverProof) ||
                            !same(rentalRows(person.requestedItems),rentalRows(original.requestedItems)) ||
                            !same(rentalRows(person.rentals),rentalRows(original.rentals))) return undefined;
                        participants[key]={...person,...fields};
                    }
                    if (changed.length) next.participants=participants;
                    if (changedReceipt) {
                        if (!same(current.transaction,form.transaction) && current.transaction!==receipt.trim()) return undefined;
                        next.transaction=receipt.trim();
                    }
                    if (card) {
                        if (!same(current.cc,form.cc) || !Object.keys(depositErrors(current.cc)).length) return undefined;
                        next.cc=card;
                    }
                    return next;
                },rentalIdentity(form));
            }
            setChanges({}); setReceipt(null); setCard(null);
            const message=await activateReadyRental(firebase,uid,{...latest,key:form.key},{upgrade});
            setNotice(message || 'Ready for armory pickup.');
        } catch(error) {
            setNotice(error.message || 'Could not verify this rental. Reopen it and try again.');
        } finally {
            busy.current=false; setSaving(false);
        }
    }

    return <section className="rental-roster-review rental-intake-editor" aria-label="Armory readiness">
        <h3>{upgrade ? 'Verify for armory pickup' : 'Prepare for armory pickup'}</h3>
        <p>{rentalDraftProblem(draft) || 'The desk will release this rental when every renter has a current signed waiver.'}</p>
        {paymentMissing && <details><summary>Complete deposit details</summary>
            <PaymentForm {...(card || blankCard)} handleInputChange={event=>{
                const {name,value}=event.target;
                const format={number:formatCreditCardNumber,expiry:formatExpirationDate,cvc:formatCVC}[name];
                setCard(current=>({...blankCard,...current,[name]:format ? format(value) : value}));
            }}/></details>}
        <label>Receipt / transaction number
            <input className="form-control" maxLength={120} value={receipt ?? form.transaction ?? ''} disabled={saving}
                onChange={e=>setReceipt(e.target.value)}/></label>
        <RenterGearChoices people={people} options={options} disabled={saving} onChange={(i,requestedItems)=>changePerson(i,{requestedItems})}/>
        {people.map((person,i)=> !person.groupEntryId && !person.isMember && !/^guest:/.test(person.ref || '') &&
            !form.walkOnCheckIn && !form.playerCheckIn && <details key={participantKey(person)}>
                <summary>Match a signed waiver for {person.name}</summary>
                <StaffWaiverPicker searchWaivers={searchWaivers} name={person.name} disabled={saving} onChoose={match=>{
                    if (!match?.ref || !match.name?.trim()) return;
                    if (person.waiverProof && normalizedName(match.name)!==normalizedName(person.waiverName || person.name)) {
                        setNotice('Select the renewed signed waiver for '+(person.waiverName || person.name)+'.');
                        return;
                    }
                    changePerson(i,{isDigital:true,waiverRef:match.ref,waiverName:match.name.trim()});
                    setNotice('Save rental details to verify the waiver for '+person.name+'.');
                }}/>
            </details>)}
        {form.checkInGroup?.id && <a href={'/admin/field/check-in?group='+encodeURIComponent(form.checkInGroup.id)+'#arriving-group'}>Review group waivers</a>}
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>{saving?'Checking rental…':'Save rental details'}</button>
        {notice && <p role="status">{notice}</p>}
    </section>;
}
