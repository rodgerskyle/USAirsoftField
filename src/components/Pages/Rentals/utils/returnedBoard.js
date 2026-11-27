import { child, runTransaction, update } from 'firebase/database';
import { v4 as uuid, v5 as digest } from 'uuid';
import { armoryFieldDay } from './armoryQueue';
import { armoryPeople } from './rentalGear';
import { matchesRental, rentalIdentity } from './openRental';

const returnListId = form => form.createRequestId || form.returnListId || form.receiptId;

// Bound to the exact observed returns, so late returns are still visible even
// if the first desk's clear reaches Firebase after another desk checked them in.
export function returnMarkers(card, day, identity = returnListId(card.form)) {
    if (card.stage !== 'returned' || card.syncRequired || card.conflict || card.pending) return [];
    const {form, person} = card;
    const slot = String(form.key ?? '');
    if (!slot || !person.rows.length || !person.rows.every(row => row.checked)) return [];
    return person.rows.flatMap(row => {
        const bucket = row.returnedAt ? armoryFieldDay(row.returnedAt) : 'undated';
        if ((bucket !== day && bucket !== 'undated') || row.unitKey == null || person.personKey == null) return [];
        // A receptionist can remove an unissued guest earlier in a roster.
        // Modern numbered units keep their reservation ID and return operation through that reorder.
        const unit = row.id && row.operation ? ['movement', row.id] : ['position', person.personKey, row.unitKey, row.id];
        const version = [slot, identity || null, unit, row.value, row.number,
            row.operation || '', row.returnedAt || null];
        return [bucket + '/' + digest(JSON.stringify(version), digest.URL)];
    }).sort();
}

function sameMarkers(first, second) {
    return first.length > 0 && first.length === second.length && first.every((key, index) => key === second[index]);
}

async function identifyLegacyRental(firebase, cards, day) {
    const form = cards[0].form;
    const id = uuid();
    const receipt = await runTransaction(child(firebase.rentals(), 'group/' + form.key), current => {
        if (current === null) return null; // Cold RTDB cache; await the server's current form.
        if (!matchesRental(current, rentalIdentity(form)) || current.transaction !== form.transaction || !current.complete) return;
        const people = armoryPeople(current);
        for (const card of cards) {
            const person = people.find(candidate => candidate.personKey === card.person.personKey);
            if (!person || person.name !== card.person.name || !sameMarkers(returnMarkers(card, day, ''),
                returnMarkers({...card, form:{...current, key:form.key}, person}, day, ''))) return;
        }
        return current.returnListId ? current : {...current, returnListId:id};
    }, {applyLocally:false});
    const saved = receipt.snapshot?.val()?.returnListId;
    if (!receipt.committed || !saved) throw new Error('The rental changed. Refresh the Returned list and try again.');
    return saved;
}

export async function clearReviewedReturns(firebase, cards, day) {
    const legacy = new Map();
    for (const card of cards) {
        if (!returnListId(card.form)) {
            if (card.archived) throw new Error('Refresh to load the original return receipt.');
            if (!legacy.has(card.form.key)) legacy.set(card.form.key, []);
            legacy.get(card.form.key).push(card);
        }
    }
    const ids = new Map();
    for (const [key, rows] of legacy) ids.set(key, await identifyLegacyRental(firebase, rows, day));
    const updates = {};
    for (const card of cards) {
        const id = returnListId(card.form) || ids.get(card.form.key);
        if (!id) throw new Error('Refresh to verify this rental before clearing it.');
        for (const key of returnMarkers(card, day, id)) updates[key] = true;
    }
    if (Object.keys(updates).length) await update(child(firebase.rentals(), 'returnListClears'), updates);
}

export function matchesArmorySearch(card, terms) {
    return !terms || [card.name, card.group, card.form.transaction, ...card.person.rows.flatMap(row => [
        row.number, ...(row.previousNumbers || []).map(previous => previous.number),
    ])].some(value => String(value || '').toLowerCase().includes(terms));
}
