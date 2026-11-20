import { runTransaction } from 'firebase/database';
import { mergeRentalRoster, rentalGroupSource } from './groupRentalRoster';

export function rentalRows(value) {
    return value && typeof value === 'object' ? Object.values(value).filter(Boolean) : [];
}

export function rentalParticipants(value) {
    return rentalRows(value).map(person => ({ ...person, rentals: rentalRows(person.rentals) }));
}

export function rentalIdentity(form) {
    if (!form) return null;
    return { requestId: form.createRequestId || null, groupId: form.checkInGroup?.id || null, name: form.name || '' };
}

export function matchesRental(current, expected) {
    if (!current || current.returned) return false;
    if (!expected) return true;
    const actual = rentalIdentity(current);
    return actual.requestId === expected.requestId && (!expected.groupId || actual.groupId === expected.groupId) &&
        (Boolean(expected.requestId) || actual.name === expected.name);
}

export async function changeOpenRental(ref, transform, expected) {
    const result = await runTransaction(ref, current => {
        if (!matchesRental(current, expected)) return undefined;
        return transform(current);
    }, { applyLocally: false });
    if (!result.committed) throw new Error('The rental form changed or was returned. Reopen it and try again.');
    return result.snapshot.val();
}

export async function importRentalParticipants(formsRef, key, group, entries, expected) {
    const source = rentalGroupSource(group);
    const result = await runTransaction(formsRef, forms => {
        const current = forms?.[key];
        if (!matchesRental(current, expected)) return undefined;
        if (current.checkInGroup && current.checkInGroup.id !== source.id) {
            throw new Error('This rental form is linked to another group.');
        }
        const alreadyLinked = Object.entries(forms).some(([otherKey, other]) =>
            otherKey !== String(key) && other && !other.returned && other.checkInGroup?.id === source.id);
        if (alreadyLinked) throw new Error('This group already has another open rental form.');
        const participants = mergeRentalRoster(current.participants, group, entries);
        const next = Array.isArray(forms) ? [...forms] : { ...forms };
        next[key] = { ...current, checkInGroup: source, participants, size: Math.max(Number(current.size) || 0, participants.length) };
        return next;
    }, { applyLocally: false });
    if (!result.committed) throw new Error('This rental form was returned or removed. Reopen the rental desk.');
}
