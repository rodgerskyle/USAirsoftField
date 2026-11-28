import { runTransaction } from 'firebase/database';
import { rentalParticipants, rentalRows } from './openRental';
import { rentalInventoryCount, reservationCounts, reservationQuantity } from './rentalGear';

function identifier(value) {
    if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0;
    return typeof value === 'string' && !!value.trim() && !Object.prototype.hasOwnProperty.call(Object.prototype, value) && value !== 'prototype';
}

function holdCost(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    const entered = String(value).trim();
    if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(entered)) return null;
    const amount = Number(entered);
    return Number.isSafeInteger(Math.round(amount * 100)) ? amount : null;
}

function visitEquipment(form, visit) {
    rentalRows(form.available).forEach(item => visit(item, true));
    rentalParticipants(form.participants).forEach(person => person.rentals.forEach(item => visit(item, false)));
}

export function assertEmptyRentalCatalog(desk) {
    if (desk == null) return;
    if (typeof desk !== 'object' || Array.isArray(desk)) throw new Error('The rental desk data needs review before restoring inventory.');
    if (desk.options == null || (typeof desk.options === 'object' && !Object.keys(desk.options).length)) return;
    throw new Error('There is already data in rental inventory. Refresh the inventory to review it.');
}

// Return only equipment metadata to the setup screen. Never carry a customer or
// payment field from an old form into a catalog row.
export function rentalCatalogHistory(groups, knownOptions = []) {
    const history = new Map();
    const known = new Map(rentalRows(knownOptions).map(option => [option.value, option]));
    for (const form of rentalRows(groups)) {
        visitEquipment(form, (item, unassigned) => {
            if (!identifier(item.value)) return;
            let entry = history.get(item.value);
            if (!entry) {
                entry = { value: item.value, label: String(item.value), costs: new Set(), legacyIds: new Set(), held: [] };
                history.set(item.value, entry);
            }
            if (typeof item.label === 'string' && item.label.trim()) entry.label = item.label.trim();
            const cost = holdCost(item.cost);
            if (cost !== null) entry.costs.add(cost);
            if (form.returned || item.stockReleased) return;
            entry.held.push({ form, item, unassigned });
            // Older unassigned rows could store one quantity under the catalog ID.
            // Newer forms copy each reservation into its own uniquely identified row.
            if (unassigned && !form.createRequestId && identifier(item.id) && Number(item.amount) > 1) {
                entry.legacyIds.add(item.id);
            }
        });
    }
    return Array.from(history.values(), entry => {
        const knownId = known.get(entry.value)?.id;
        const id = knownId ?? (entry.legacyIds.size === 1 ? [...entry.legacyIds][0] : null);
        const ambiguousId = entry.legacyIds.size > 0 && !entry.legacyIds.has(id);
        const stock = entry.held.reduce((count, { form, item, unassigned }) =>
            count + (unassigned ? reservationQuantity(form, item, { id }) : 1), 0);
        return { value: entry.value, label: entry.label, required: stock > 0, stock,
            ...(id != null && { id }), ...(entry.costs.size === 1 && { cost: [...entry.costs][0] }),
            ...(ambiguousId && { ambiguousId: true }) };
    });
}

// A historical value can be either a number or a string. Reservation lookups
// use its original type; the new-form checkbox maps both to the same string key.
export function openRentalStock(groups, options) {
    const byValue = new Map();
    const keys = new Set();
    const counts = new Map();
    for (const option of options) {
        if (!identifier(option.value) || keys.has(String(option.value))) throw new Error('Each equipment type must have a unique catalog value.');
        keys.add(String(option.value));
        byValue.set(option.value, option);
        counts.set(option.value, rentalRows(option.repairHolds).length);
    }
    for (const form of rentalRows(groups)) {
        if (form.returned) continue;
        visitEquipment(form, item => {
            if (!item.stockReleased && !byValue.has(item.value)) {
                throw new Error('Include the original equipment type for ' + (item.label || item.value || 'the unidentified item') + ' reserved on an open rental.');
            }
        });
        for (const [value, count] of reservationCounts(form, byValue)) counts.set(value, counts.get(value) + count);
    }
    return counts;
}

function reviewedRows(rows) {
    if (!Array.isArray(rows) || !rows.length) throw new Error('Choose equipment to restore.');
    return rows.map(row => {
        const label = typeof row?.label === 'string' ? row.label.trim() : '';
        if (!label || !identifier(row.value)) throw new Error('Enter an equipment name and type for each row.');
        const max = rentalInventoryCount(row.max);
        const cost = holdCost(row.cost);
        if (max === null) throw new Error('Enter a whole-number maximum for ' + label + '.');
        if (cost === null) throw new Error('Enter a valid hold amount for ' + label + '.');
        if (row.id != null && !identifier(row.id)) throw new Error('Review the catalog ID for ' + label + '.');
        return { value: row.value, label, cost, max, ...(row.id != null && { id: row.id }) };
    });
}

function rebuildCatalog(desk, reviewed) {
    assertEmptyRentalCatalog(desk);
    const groups = desk?.group;
    const history = new Map(rentalCatalogHistory(groups, reviewed).map(row => [row.value, row]));
    const options = reviewed.map(row => {
        const prior = history.get(row.value);
        if (prior?.ambiguousId) throw new Error('Confirm the original catalog ID for ' + row.label + ' from a backup before restoring its outstanding quantities.');
        return { ...row, id: row.id ?? prior?.id ?? row.value };
    });
    if (new Set(options.map(row => String(row.id))).size !== options.length) throw new Error('Review the repeated catalog IDs before restoring equipment.');
    const stock = openRentalStock(groups, options);
    for (const option of options) {
        option.stock = stock.get(option.value);
        if (option.max < option.stock) throw new Error(option.label + ' has ' + option.stock + ' reserved. Include those units in the maximum.');
    }
    return { ...desk, options };
}

export async function restoreRentalCatalog(firebase, rows) {
    const reviewed = reviewedRows(rows);
    let failure;
    const result = await runTransaction(firebase.rentals(), desk => {
        // An empty cache must propose the catalog. During a server replay, use
        // undefined to abort cleanly if another desk has already restored it.
        try {
            return rebuildCatalog(desk, reviewed);
        } catch (error) {
            failure = error;
            return undefined;
        }
    }, { applyLocally: false });
    if (!result.committed) throw failure || new Error('Inventory changed. Refresh the desk before trying again.');
}
