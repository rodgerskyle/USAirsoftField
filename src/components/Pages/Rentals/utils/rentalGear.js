import { runTransaction } from 'firebase/database';
import { v4 as uuid } from 'uuid';
import { matchesRental, rentalIdentity, rentalParticipants, rentalRows } from './openRental';

const entries = value => Object.entries(value || {}).filter(([, entry]) => entry);
const copy = value => Array.isArray(value) ? [...value] : { ...value };
export const tag = number => String(number ?? '').trim();
const folded = number => tag(number).toUpperCase();
export function validGearTag(number) {
    return typeof number === 'string' && !!number.trim() && number.trim().length <= 80 &&
        Array.from(number).every(character => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127);
}
const owner = person => JSON.stringify([person.groupId || '', person.groupEntryId || '', person.ref || '', !!person.isDigital,
    person.groupEntryId || person.ref ? '' : person.name || '']);

export function gearRows(form) {
    return entries(form?.participants).flatMap(([personKey, person]) => entries(person.rentals).map(([unitKey, unit]) => ({
        personKey, unitKey, owner: owner(person), name: person.name || 'Unnamed participant',
        id: unit.id || '', value: unit.value, label: unit.label || unit.value, number: tag(unit.number),
        checked: unit.checked === true, operation: unit.gearOperation || '',
    })));
}

// Older reservations can hold a quantity on one unassigned row. Checked legacy
// items still hold stock until closure; quick returns release it immediately.
export function reservationCounts(form, optionsByValue) {
    const counts = new Map();
    function add(item, unassigned) {
        const option = optionsByValue.get(item.value);
        if (!option || item.stockReleased) return;
        const amount = Number(item.amount);
        const bulk = unassigned && !form.createRequestId && (!item.id || item.id === option.id) &&
            Number.isSafeInteger(amount) && amount > 0;
        counts.set(item.value, (counts.get(item.value) || 0) + (bulk ? amount : 1));
    }
    rentalRows(form.available).forEach(item => add(item, true));
    rentalParticipants(form.participants).forEach(person => person.rentals.forEach(item => add(item, false)));
    return counts;
}

export function heldCount(groups, option) {
    const options = new Map([[option.value, option]]);
    return rentalRows(groups).filter(form => !form.returned).reduce((total, form) =>
        total + (reservationCounts(form, options).get(option.value) || 0), rentalRows(option.repairHolds).length);
}

const sameUnit = (a, b) => a.owner === b.owner && a.id === b.id && a.value === b.value &&
    (a.id && a.owner ? true : a.personKey === b.personKey && a.unitKey === b.unitKey);
const sameIssue = (a, b) => sameUnit(a, b) && a.number === b.number && a.operation === b.operation && a.checked === b.checked;

export async function changeEquipment(firebase, form, rows, action, replacement = '', needsRepair = false) {
    const identity = rentalIdentity(form);
    if (!rows.length || !['assign', 'swap', 'return'].includes(action) ||
        (action !== 'return' && (rows.length !== 1 || !validGearTag(replacement)))) throw new Error('Choose the equipment and enter a valid number.');
    const operation = uuid();
    const at = Date.now();
    const newNumber = tag(replacement);
    let saved = false;
    const result = await runTransaction(firebase.rentals(), desk => {
        saved = false;
        if (desk === null) return null;
        const current = desk.group?.[form.key];
        if (!matchesRental(current, identity) || (!identity.requestId && form.transaction && form.transaction !== current.transaction)) throw new Error('This rental form changed or closed. Reopen it before continuing.');
        if (action === 'assign' && !current.complete) throw new Error('Activate the rental form before issuing equipment.');
        if (current.gearHistory?.[operation]) { saved = true; return desk; }
        const currentRows = gearRows(current);
        const participants = copy(current.participants);
        const group = copy(desk.group);
        const options = copy(desk.options);
        const touched = new Set();
        const changes = [];

        for (const review of rows) {
            const candidates = currentRows.filter(row => sameUnit(row, review));
            // Older items may reuse their catalog ID. Match the reviewed slot
            // and its issue version in that case, never every equal number.
            const row = candidates.length === 1 ? candidates[0] :
                candidates.find(item => item.personKey === review.personKey && item.unitKey === review.unitKey);
            if (!row || !sameIssue(row, review) || row.checked || (action !== 'assign' && !row.number) ||
                touched.has(JSON.stringify([row.personKey, row.unitKey]))) throw new Error('The selected equipment was returned or changed. Refresh the outstanding list.');
            touched.add(JSON.stringify([row.personKey, row.unitKey]));
            const catalog = entries(options).filter(([, option]) => option.value === row.value);
            if (catalog.length > 1) throw new Error('This equipment type has duplicate catalog entries. Review inventory.');
            const [catalogKey, option] = catalog[0] || [];
            if (action !== 'return') {
                if (row.number && folded(row.number) === folded(newNumber)) throw new Error('Enter a different replacement number.');
                if (rentalRows(desk.group).filter(f => !f.returned).some(f => gearRows(f).some(unit =>
                    unit.value === row.value && !unit.checked && folded(unit.number) === folded(newNumber)))) {
                    throw new Error('That equipment number is already issued on an open form.');
                }
                if (rentalRows(option?.repairHolds).some(item => folded(item.number) === folded(newNumber))) throw new Error('That item is waiting for inspection.');
            }
            const person = participants[row.personKey];
            const rentals = copy(person.rentals);
            const original = rentals[row.unitKey];
            if (action === 'return') {
                rentals[row.unitKey] = { ...original, checked: true, stockReleased: true, gearOperation: operation };
            } else {
                rentals[row.unitKey] = { ...original, number: newNumber, checked: false, gearOperation: operation };
            }
            participants[row.personKey] = { ...person, rentals };
            group[form.key] = { ...current, participants };
            if (option && action === 'return') {
                const stock = Number(option.stock) || 0;
                const release = Math.min(1, Math.max(0, stock - heldCount(group, option)));
                if (release) options[catalogKey] = { ...option, stock: stock - release };
            }
            if (action === 'swap' && needsRepair) {
                if (!option) throw new Error('Restore this equipment type in inventory before setting a repair hold.');
                const stock = Math.max(Number(option.stock) || 0, heldCount(group, option));
                if (option.max != null && stock >= Number(option.max)) throw new Error('No spare unit is available. Check the inventory maximum.');
                options[catalogKey] = { ...option, stock: stock + 1, repairHolds: { ...option.repairHolds,
                    [operation]: { number: row.number, at } } };
            }
            changes.push({ name: row.name, value: row.value, label: row.label, from: row.number,
                ...(action !== 'return' && { to: newNumber }) });
        }
        group[form.key] = { ...current, participants, gearHistory: { ...current.gearHistory,
            [operation]: { action, at, needsRepair: action === 'swap' && needsRepair, items: changes } } };
        saved = true;
        return { ...desk, group, options };
    }, { applyLocally: false });
    if (!result.committed || !saved) throw new Error('The equipment change was not confirmed. Refresh the form.');
}

export async function clearRepair(firebase, type, id) {
    let found = false;
    const result = await runTransaction(firebase.rentals(), desk => {
        found = false;
        if (desk === null) return null;
        const options = copy(desk.options);
        const [key, option] = entries(options).find(([, o]) => o.value === type && o.repairHolds?.[id]) || [];
        if (!option) throw new Error('That service hold has already changed.');
        const repairHolds = { ...option.repairHolds };
        delete repairHolds[id];
        const stock = Number(option.stock) || 0;
        const release = Math.min(1, Math.max(0, stock - heldCount(desk.group, { ...option, repairHolds })));
        options[key] = { ...option, repairHolds, stock: stock - release };
        found = true;
        return { ...desk, options };
    }, { applyLocally: false });
    if (!result.committed || !found) throw new Error('The updated inventory could not be confirmed.');
}
