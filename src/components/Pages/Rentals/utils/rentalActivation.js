import { allocateRequestedGear } from './rentalGear';
import { changeOpenRental, rentalIdentity, rentalRows } from './openRental';
import { verifyRentalWaivers } from './rentalWaiverProof';

export function rentalFieldDay(now = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {timeZone:'America/Los_Angeles', year:'numeric', month:'2-digit', day:'2-digit'}).format(now);
}

export function rentalPlayDate(form) {
    return form.checkInGroup?.date || form.walkOnCheckIn?.date || form.playerCheckIn?.date || form.playDate || rentalFieldDay();
}

export function depositErrors(cc = {}) {
    const errors = {};
    if (!String(cc.name || '').trim()) errors.nameError = 'Enter the name on the deposit card.';
    if (!/^\d{15,19}$/.test(String(cc.number || '').replace(/[ -]/g,''))) errors.numberError = 'Enter a valid deposit card number.';
    if (!/^\d{3,4}$/.test(String(cc.cvc || ''))) errors.cvcError = 'Enter a 3- or 4-digit CVC.';
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(String(cc.expiry || ''))) errors.expiryError = 'Enter the expiration as MM/YY.';
    if (!/^\d{5}$/.test(String(cc.zipcode || ''))) errors.zipcodeError = 'Enter a 5-digit ZIP code.';
    return errors;
}

export function participantKey(person) {
    return JSON.stringify([person.renterKey || '',person.groupId || '',person.groupEntryId || '',person.ref || '',
        Boolean(person.isDigital),Boolean(person.isMember),person.waiverRef || '',person.name?.trim() || '']);
}

export function currentRentalProof(proof,now=Date.now()) {
    return proof?.status==='signed' && typeof proof.ref==='string' && !!proof.ref.trim() &&
        Number.isSafeInteger(proof.signedAt) && proof.signedAt>0 && proof.signedAt<=now &&
        Number.isSafeInteger(proof.expiresAt) && proof.expiresAt>now;
}

export function intakeEntries(form) {
    return Object.entries(form?.participants || {}).filter(([,person])=>person && (!form.complete || (
        form.armoryVersion===1 && !person.armoryIssuedAt && !currentRentalProof(person.waiverProof)
    )));
}

export function needsRentalIntake(form) {
    return Boolean(form && !form.returned && (!form.complete || intakeEntries(form).length));
}

function forAllocation(form) {
    return {...form,participants:intakeEntries(form).map(([,person])=>person)};
}

export function rentalDraftProblem(form) {
    if (!form || form.returned) return 'This rental is closed.';
    if (!form.name?.trim()) return 'Enter a rental name.';
    const people = rentalRows(form.participants);
    const size = Number(form.size);
    if (!Number.isInteger(size) || size < 1 || people.length !== size || people.some(p=>!p.name?.trim())) {
        return 'Add a named renter for each participant on the form.';
    }
    const previouslyVerified=form.complete && form.armoryVersion===1 && Number.isSafeInteger(form.activatedAt) && form.activatedAt>0;
    if (!previouslyVerified && Object.keys(depositErrors(form.cc)).length) return 'Complete the deposit card details.';
    if (!String(form.transaction || '').trim()) return 'Enter the payment receipt or transaction number.';
    try { allocateRequestedGear(forAllocation(form)); }
    catch (failure) { return failure.message || 'Review each renter’s equipment choices.'; }
    return '';
}

function reviewIdentities(form) {
    return JSON.stringify([rentalPlayDate(form),rentalRows(form.participants).map(participantKey)]);
}

export async function readRentalProofs(firebase, uid, form) {
    const participants = intakeEntries(form).map(([,person])=>person);
    if (!participants.length || !uid) return null;
    const proofs = await verifyRentalWaivers(firebase, uid, participants, { groupId:form.checkInGroup?.id, playDate:rentalPlayDate(form) });
    return { identities:reviewIdentities(form), proofs };
}

function waiverProblem(form,review,now) {
    const candidates=intakeEntries(form);
    const proofs=review?.proofs;
    if (!Array.isArray(proofs) || proofs.length!==candidates.length) return 'Renter waivers could not be verified.';
    const futureDate = rentalPlayDate(form) > rentalFieldDay(new Date(now)) ? rentalPlayDate(form) : null;
    const refs=new Set();
    for (const [key,person] of Object.entries(form.participants || {})) {
        if (person?.waiverProof?.ref && !candidates.some(([candidate])=>candidate===key)) refs.add(person.waiverProof.ref);
    }
    for (const [index,[,person]] of candidates.entries()) {
        const proof=proofs[index];
        if (!currentRentalProof(proof,now)) {
            return proof?.status==='unavailable' ? 'Waiver verification unavailable for '+person.name+'. Try again.' :
                'Current signed waiver needed for '+person.name+'.';
        }
        if (futureDate && rentalFieldDay(new Date(proof.expiresAt))<=futureDate) return 'The waiver for '+person.name+' expires before the end of the scheduled visit.';
        if (refs.has(proof.ref)) return 'Each renter needs their own signed waiver. Review the match for '+person.name+'.';
        refs.add(proof.ref);
    }
    return '';
}

export function pendingRentalMessage(form, review, now=Date.now()) {
    return rentalDraftProblem(form) || waiverProblem(form,review,now);
}

// Recheck the server's current roster, requested quantities, payment record and proof dates
// inside the transaction. Allocating already reserved units never changes catalog stock.
export function activateVerifiedRental(form, review, now = Date.now()) {
    if (!needsRentalIntake(form) || !review || review.identities !== reviewIdentities(form) || rentalDraftProblem(form)) return form;
    const entries = intakeEntries(form);
    if (waiverProblem(form,review,now)) return form;
    const allocated = allocateRequestedGear(forAllocation(form));
    const participants = Array.isArray(form.participants) ? [...form.participants] : {...form.participants};
    entries.forEach(([key],index)=>{
        const {ref,signedAt,expiresAt}=review.proofs[index];
        participants[key]={...allocated.participants[index],waiverProof:{status:'signed',ref,signedAt,expiresAt,verifiedAt:now}};
    });
    return {...form,available:allocated.available,participants,complete:true,armoryVersion:1,activatedAt:form.activatedAt || now};
}

export async function activateReadyRental(firebase, uid, source, {upgrade=false}={}) {
    if (!uid || !firebase?.rentalGroup) return 'Sign in to the rental desk to verify waivers.';
    if (upgrade && !canUpgradeRental(source)) return 'This active form has changed. Review its issued items.';
    const form = upgrade ? {...source,complete:false} : source;
    if (!needsRentalIntake(form)) return '';
    const problem = rentalDraftProblem(form);
    if (problem) return problem;
    const review = await readRentalProofs(firebase,uid,form);
    const preview = activateVerifiedRental(form,review);
    if (preview===form) return waiverProblem(form,review,Date.now()) || 'The rental changed. Review the latest form.';
    const result = await changeOpenRental(firebase.rentalGroup(form.key),current=>{
        if (upgrade && current.armoryVersion!==1 && !canUpgradeRental(current)) return undefined;
        const latest=upgrade && current.armoryVersion!==1 ? {...current,complete:false} : current;
        if (!needsRentalIntake(latest)) return current;
        const next = activateVerifiedRental(latest,review);
        return next!==latest ? next : undefined;
    },rentalIdentity(form));
    return result.complete ? '' : 'The rental changed. Review the latest form.';
}

export function canUpgradeRental(form) {
    return Boolean(form?.complete && !form.returned && form.armoryVersion!==1 &&
        !rentalRows(form.participants).some(p=>p.armoryIssuedAt || rentalRows(p.rentals).some(item=>item.issuedAt || item.number || item.checked)));
}

export function gearOptions(form) {
    const options=new Map();
    for (const item of [...rentalRows(form.available),...intakeEntries(form).flatMap(([,person])=>rentalRows(person.rentals))]) {
        if (!item.value) continue;
        const option=options.get(item.value) || {value:item.value,label:item.label || item.value,quantity:0};
        option.quantity+=Math.max(1,Number(item.quantity)||1);
        options.set(item.value,option);
    }
    return [...options.values()];
}
