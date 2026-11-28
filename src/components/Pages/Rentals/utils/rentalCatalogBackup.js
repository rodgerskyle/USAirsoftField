import { runTransaction } from 'firebase/database';
import { rentalInventoryCount } from './rentalGear';
import { assertEmptyRentalCatalog, openRentalStock } from './restoreRentalCatalog';

const owns = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const collection = obj => obj !== null && typeof obj === 'object';
const plainRecord = obj => collection(obj) && !Array.isArray(obj);
const reservedName = key => key === 'prototype' || owns(Object.prototype, key);
const firebaseKey = key => key.length > 0 && !reservedName(key) &&
    !Array.from(key).some(char => '.#$[]/'.includes(char) || char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
const name = value => typeof value === 'string' && value.trim().length > 0;
const identity = value => (name(value) && !reservedName(value)) || (Number.isSafeInteger(value) && value >= 0);
const optionFields = new Set(['id', 'value', 'label', 'cost', 'stock', 'max', 'amount', 'number', 'checked', 'repairHolds']);
const holdFields = new Set(['number', 'reason', 'at']);

function fieldsAreSupported(record, fields) {
    return plainRecord(record) && Object.keys(record).every(key => fields.has(key));
}

function copyHolds(holds) {
    if (!collection(holds)) throw new Error('A repair hold in this backup could not be read.');
    const result = Array.isArray(holds) ? [] : {};
    for (const [key, hold] of Object.entries(holds)) {
        if (hold === null && Array.isArray(holds)) {
            result[key] = null;
            continue;
        }
        if (!firebaseKey(key) || !fieldsAreSupported(hold, holdFields) ||
            !(name(hold.number) || Number.isSafeInteger(hold.number)) ||
            (hold.reason != null && typeof hold.reason !== 'string') ||
            (hold.at != null && !(Number.isSafeInteger(hold.at) && hold.at >= 0))) {
            throw new Error('A repair hold in this backup could not be read. Check its equipment number and details.');
        }
        result[key] = { ...hold };
    }
    return result;
}

function validPrice(value) {
    return (typeof value === 'number' || name(value)) && Number.isFinite(Number(value)) && Number(value) >= 0;
}

function prepare(options) {
    if (!collection(options)) throw new Error('This export does not contain a rental equipment catalog.');
    const safe = Array.isArray(options) ? [] : {};
    const labels = [];
    const values = new Set();
    const ids = new Set();
    let repairHoldCount = 0;
    for (const [key, option] of Object.entries(options)) {
        // RTDB serializes numerically keyed collections as arrays with null gaps.
        if (option === null && Array.isArray(options)) {
            safe[key] = null;
            continue;
        }
        if (!firebaseKey(key) || !fieldsAreSupported(option, optionFields) || !identity(option.value) ||
            (option.id != null && !identity(option.id)) || (option.label != null && !name(option.label)) ||
            !['cost','stock','max'].some(field => owns(option, field)) ||
            (option.checked != null && typeof option.checked !== 'boolean') ||
            (option.number != null && typeof option.number !== 'string' && !Number.isSafeInteger(option.number)) ||
            (option.cost != null && !validPrice(option.cost)) ||
            ['stock','max'].some(field => option[field] != null && rentalInventoryCount(option[field]) === null) ||
            (option.amount != null && option.amount !== '' && rentalInventoryCount(option.amount) === null)) {
            throw new Error('This file contains an unsupported rental equipment record. Use a Firebase export of rentals/options.');
        }
        const label = option.label || String(option.value);
        if (values.has(String(option.value))) throw new Error('This catalog contains duplicate equipment types. Check the backup before restoring.');
        values.add(String(option.value));
        if (option.id != null) {
            if (ids.has(String(option.id))) throw new Error('This catalog contains repeated equipment IDs. Check the backup before restoring.');
            ids.add(String(option.id));
        }
        const row = { ...option };
        if (option.repairHolds != null) {
            row.repairHolds = copyHolds(option.repairHolds);
            repairHoldCount += Object.values(row.repairHolds).filter(Boolean).length;
        }
        safe[key] = row;
        labels.push(label);
    }
    if (!labels.length) throw new Error('The selected backup contains no rental equipment.');
    return { options: safe, count: labels.length, labels, repairHoldCount };
}

async function readBackupText(file) {
    if (!file) throw new Error('Choose a Firebase JSON backup.');
    if (/\.(?:gz|gzip)$/i.test(file.name || '')) {
        if (typeof DecompressionStream === 'undefined' || typeof file.stream !== 'function' || typeof Response === 'undefined') {
            throw new Error('Unzip this backup and select its JSON file.');
        }
        return new Response(file.stream().pipeThrough(new DecompressionStream('gzip'))).text();
    }
    if (typeof file.text === 'function') return file.text();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('The selected backup could not be read.'));
        reader.readAsText(file);
    });
}

export async function readRentalCatalogBackup(file) {
    const contents = await readBackupText(file);
    let document;
    try {
        document = JSON.parse(contents.replace(/^\uFEFF/, ''));
    } catch {
        throw new Error('This file is not valid JSON. Select a Firebase rental inventory export.');
    }
    // A database export can include private records. Drop every other branch
    // in memory before handing a preview or transaction any data.
    if (plainRecord(document) && owns(document, 'rentals') && !identity(document.rentals?.value)) {
        return prepare(document.rentals?.options);
    }
    if (plainRecord(document) && owns(document, 'options') && !identity(document.options?.value)) {
        return prepare(document.options);
    }
    return prepare(document);
}

export async function restoreRentalCatalogBackup(firebase, reviewed) {
    const { options, count } = prepare(reviewed?.options);
    const rows = Object.values(options).filter(Boolean);
    let conflict;
    const result = await runTransaction(firebase.rentals(), desk => {
        // A null starting cache proposes the selected inventory. A real server
        // desk causes a retry against that desk before Firebase can commit.
        let currentHolds;
        try {
            assertEmptyRentalCatalog(desk);
            currentHolds = openRentalStock(desk?.group, rows);
        } catch (error) {
            // An RTDB conflict can rerun this callback asynchronously. Abort
            // the transaction and surface its reason to the caller.
            conflict = error;
            return undefined;
        }
        const restored = Array.isArray(options) ? [...options] : { ...options };
        for (const [key, option] of Object.entries(options)) {
            if (!option) continue;
            const held = currentHolds.get(option.value) || 0;
            // A newer, verified reservation can raise the backed-up count. A
            // missing form cannot silently release previously reserved gear.
            if (held > Number(option.stock ?? 0)) restored[key] = { ...option, stock: held };
        }
        return { ...desk, options: restored };
    }, { applyLocally: false });
    if (!result.committed) throw conflict || new Error('Inventory changed before the backup could be restored. Reopen Inventory.');
    return count;
}
