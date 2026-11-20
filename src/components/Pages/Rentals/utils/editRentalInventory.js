import { runTransaction } from 'firebase/database';
import { v4 as uuid } from 'uuid';
import { matchesRental, rentalRows } from './openRental';

const copyCollection = collection => Array.isArray(collection) ? [...collection] : { ...collection };

function inventorySignature(items) {
    return JSON.stringify(rentalRows(items), (key, value) =>
        value && typeof value === 'object' && !Array.isArray(value)
            ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))
            : value);
}

export async function editRentalInventory(rentalsRef, review, quantities) {
    const signature = inventorySignature(review.available);
    const desired = new Map(Object.entries(quantities));
    for (const count of desired.values()) {
        if (!Number.isSafeInteger(count) || count < 0) throw new Error('Enter a whole number for each rental type.');
    }
    const newIds = new Map();

    const result = await runTransaction(rentalsRef, desk => {
        // A cold Firebase cache can initially be empty. Compare against the server
        // before deciding that an open form is missing.
        if (desk === null) return null;
        const form = desk.group?.[review.key];
        if (!matchesRental(form, review.identity) || inventorySignature(form.available) !== signature) return undefined;
        const available = rentalRows(form.available);
        const counts = new Map();
        for (const item of available) {
            const type = String(item.value);
            counts.set(type, (counts.get(type) || 0) + 1);
        }
        const retained = new Map();
        const nextAvailable = available.filter(item => {
            const type = String(item.value);
            const count = (retained.get(type) || 0) + 1;
            retained.set(type, count);
            return count <= (desired.get(type) || 0);
        });
        const options = copyCollection(desk.options);
        for (const type of new Set([...counts.keys(), ...desired.keys()])) {
            const delta = (desired.get(type) || 0) - (counts.get(type) || 0);
            if (!delta) continue;
            const matches = Object.entries(options).filter(([, option]) => option && String(option.value) === type);
            if (matches.length !== 1) throw new Error('Check the rental option for ' + type + ' before saving inventory.');
            const [optionKey, option] = matches[0];
            const stock = Number(option.stock ?? 0);
            const max = Number(option.max);
            const nextStock = stock + delta;
            if (!Number.isSafeInteger(stock) || stock < 0 || !Number.isSafeInteger(nextStock) || nextStock < 0) {
                throw new Error('The in-use count for ' + type + ' needs review.');
            }
            if (delta > 0 && (option.max == null || !Number.isSafeInteger(max) || nextStock > max)) {
                throw new Error('There is not enough available stock for ' + type + '. Review the inventory limit.');
            }
            options[optionKey] = { ...option, stock: nextStock };
            if (delta > 0) {
                // The Firebase SDK can replay this callback as other forms reserve
                // equipment. Give the same requested units the same IDs each time.
                if (!newIds.has(type)) newIds.set(type, Array.from({ length: delta }, () => uuid()));
                for (const id of newIds.get(type)) {
                    nextAvailable.push({ value: option.value, label: option.label || type, id, number: '', checked: false });
                }
            }
        }
        const group = copyCollection(desk.group);
        group[review.key] = { ...form, available: nextAvailable };
        return { ...desk, options, group };
    }, { applyLocally: false });
    if (!result.committed || !result.snapshot.exists()) throw new Error('The rental form or its available gear changed. Reopen Edit Inventory to review it.');
}
