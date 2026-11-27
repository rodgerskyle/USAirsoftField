import { runTransaction, serverTimestamp } from 'firebase/database';
import { v4 as uuid } from 'uuid';
import { matchesRental, rentalIdentity, rentalParticipants, rentalRows } from './openRental';

const entries = value => Object.entries(value || {}).filter(([, entry]) => entry);
const copy = value => Array.isArray(value) ? [...value] : { ...value };
export const tag = number => String(number ?? '').trim();
const folded = number => tag(number).toUpperCase();
const timestamp = value => Number.isSafeInteger(value) && value > 0;
export function validGearTag(number) {
    return typeof number === 'string' && !!number.trim() && number.trim().length <= 80 &&
        Array.from(number).every(character => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127);
}
const owner = person => JSON.stringify([person.groupId || '', person.groupEntryId || '', person.ref || '', !!person.isDigital,
    person.groupEntryId || person.ref ? '' : person.name || '']);

const knownTime = value => timestamp(value) && Number.isFinite(new Date(value).getTime()) ? value : null;

// Historical swaps kept the original handoff stamp on the slot. Match their movement
// records to the rental unit, including old forms that shared a catalog ID across units.
function movementHistory(form) {
    const byEquipment = new Map();
    for (const [operation, { action, at, items }] of entries(form?.gearHistory)) {
        if (!knownTime(at)) continue;
        for (const item of rentalRows(items)) {
            const equipment = JSON.stringify([item.value, item.id || '']);
            const slot = JSON.stringify([String(item.personKey), String(item.unitKey)]);
            if (!byEquipment.has(equipment)) byEquipment.set(equipment, new Map());
            const slots = byEquipment.get(equipment);
            if (!slots.has(slot)) slots.set(slot, []);
            slots.get(slot).push({ operation, action, at, from: tag(item.from), to: tag(item.to) });
        }
    }
    return (unit, personKey, unitKey) => {
        const slots = byEquipment.get(JSON.stringify([unit.value, unit.id || '']));
        if (!slots) return [];
        const exact = slots.get(JSON.stringify([personKey, unitKey])) || [];
        if (!unit.gearOperation || exact.some(event => event.operation === unit.gearOperation)) return exact;

        // Editing an older roster could compact its Firebase numeric keys. The last
        // operation identifies a moved unit only when it points to one history slot.
        const matches = [...slots.values()].filter(events => events.some(event => event.operation === unit.gearOperation));
        return matches.length === 1 ? matches[0] : exact;
    };
}

function serialMovements(unit, events, armoryVersion) {
    let number = tag(unit.number);
    let returnedAt = knownTime(unit.returnedAt);
    if (!number) return { pickedUpAt: null, returnedAt, previousNumbers: [] };

    const savedNumbers = rentalRows(unit.previousNumbers).filter(item => tag(item.number)).map(item => ({
        number: tag(item.number), pickedUpAt: knownTime(item.pickedUpAt), returnedAt: knownTime(item.returnedAt),
    }));
    if (unit.movementOperation && unit.movementOperation === unit.gearOperation) {
        return { pickedUpAt: knownTime(unit.pickedUpAt), returnedAt, previousNumbers: savedNumbers };
    }

    // A cached desk can swap an item without updating the physical-serial snapshot.
    // Follow the logged serial changes backwards to the last known pickup or snapshot.
    const newestFirst = events.slice().sort((a, b) => b.at - a.at ||
        Number(b.operation === unit.gearOperation) - Number(a.operation === unit.gearOperation) ||
        Number(b.action === 'swap') - Number(a.action === 'swap'));
    const returned = newestFirst.find(event => event.action === 'return' && folded(event.from) === folded(number));
    if (unit.checked === true || unit.stockReleased === true) returnedAt ??= returned?.at || null;
    const sequence = [{ number, pickedUpAt: null, returnedAt }];
    const handoffs = newestFirst.filter(event => event.action === 'issue' || event.action === 'swap' ||
        (event.action === 'assign' && armoryVersion !== 1));
    let end = Infinity;
    let prefix = [];
    for (;;) {
        const latestTime = end;
        const serial = folded(number);
        const index = handoffs.findIndex(event => event.at <= latestTime && folded(event.to) === serial);
        const current = sequence[sequence.length - 1];
        if (index === -1) {
            current.pickedUpAt = knownTime(unit.issuedAt);
            break;
        }
        const [event] = handoffs.splice(index, 1);
        current.pickedUpAt = event.at;
        if (event.operation === unit.movementOperation) {
            prefix = savedNumbers;
            break;
        }
        if (event.action !== 'swap' || !event.from) break;
        number = event.from;
        end = event.at;
        sequence.push({ number, pickedUpAt: null, returnedAt: event.at });
    }
    const latest = sequence.shift();
    return { pickedUpAt: latest.pickedUpAt, returnedAt, previousNumbers: prefix.concat(sequence.reverse()) };
}

export function gearRows(form) {
    const units = entries(form?.participants).flatMap(([personKey, person]) => entries(person.rentals)
        .map(([unitKey, unit]) => ({ personKey, unitKey, person, unit })));
    let history;
    return units.map(({ personKey, unitKey, person, unit }) => {
        let events = [];
        if (tag(unit.number) && (!unit.movementOperation || unit.movementOperation !== unit.gearOperation) && form.gearHistory) {
            history ??= movementHistory(form);
            events = history(unit, personKey, unitKey);
        }
        const movements = serialMovements(unit, events, form.armoryVersion);
        return {
            personKey, unitKey, owner: owner(person), name: person.name || 'Unnamed participant',
            id: unit.id || '', value: unit.value || '', label: unit.label || unit.value || 'Equipment', number: tag(unit.number),
            checked: unit.checked === true || unit.stockReleased === true || knownTime(unit.returnedAt) !== null,
            operation: unit.gearOperation || '', issuedAt: knownTime(unit.issuedAt), ...movements,
            physicallyIssued: Boolean(tag(unit.number)) && (movements.pickedUpAt !== null || form.armoryVersion !== 1),
        };
    });
}

export function isArmoryReady(form, personKey, now = Date.now()) {
    const proof = form?.participants?.[personKey]?.waiverProof;
    return Boolean(form?.complete && !form.returned && proof?.status === 'signed' &&
        typeof proof.ref === 'string' && proof.ref.trim() && timestamp(proof.signedAt) && proof.signedAt <= now &&
        timestamp(proof.expiresAt) && proof.expiresAt > now);
}

export function armoryPeople(form) {
    const byPerson = new Map();
    for (const row of gearRows(form)) {
        if (!byPerson.has(row.personKey)) byPerson.set(row.personKey, []);
        byPerson.get(row.personKey).push(row);
    }
    return entries(form?.participants).map(([personKey, person]) => {
        const assigned = byPerson.get(personKey) || [];
        const returned = assigned.filter(row => row.checked).length;
        const issuedAt = timestamp(person.armoryIssuedAt) ? person.armoryIssuedAt : null;
        const state = returned ? (returned === assigned.length ? 'returned' : 'partial-return') :
            (issuedAt || (assigned.length > 0 && assigned.every(row => row.physicallyIssued))) ? 'issued' : 'requested';
        return {personKey, name: person.name || 'Unnamed participant', ref: person.ref,
            groupId:person.groupId, groupEntryId:person.groupEntryId, state, rows:assigned, issuedAt};
    });
}

// A reservation already owns its share of stock. Activation only moves those
// units from the shared form inventory to the requested person's inventory.
export function allocateRequestedGear(form, options = []) {
    const optionsByValue = new Map(rentalRows(options).map(option => [option.value, option]));
    const available = rentalRows(form.available).flatMap(item => {
        const count = reservationQuantity(form, item, optionsByValue.get(item.value));
        if (count === 1) return [item];
        if (count > 10000) throw new Error('Review the quantity on this older reservation.');
        return Array.from({length:count}, () => ({...item, amount:1}));
    });
    const participants = copy(form.participants);
    if (!entries(participants).length) throw new Error('Add a renter before activating this form.');
    for (const [personKey, person] of entries(participants)) {
        const name = person.name || 'this renter';
        const assigned = rentalRows(person.rentals);
        const requested = rentalRows(person.requestedItems);
        if (!requested.length && !assigned.length) throw new Error('Choose requested gear for ' + name + '.');
        if (!requested.length) continue;
        const remaining = new Map();
        for (const {value, quantity} of requested) {
            if (!value || !Number.isSafeInteger(quantity) || quantity < 1 || remaining.has(value)) {
                throw new Error('Review the requested equipment quantities for ' + name + '.');
            }
            remaining.set(value, quantity);
        }
        for (const item of assigned) {
            const need = remaining.get(item.value) || 0;
            if (!need) throw new Error('The requested quantities do not match the equipment already assigned to ' + name + '.');
            remaining.set(item.value, need - 1);
        }
        const rentals = copy(person.rentals || []);
        let nextKey = entries(rentals).reduce((max,[key]) => /^\d+$/.test(key) ? Math.max(max,Number(key)+1) : max, 0);
        for (const [value, quantity] of remaining) {
            const selected = available.filter(unit => unit.value === value && !unit.checked && !unit.stockReleased && !tag(unit.number)).slice(0, quantity);
            if (selected.length !== quantity) throw new Error('Not enough reserved ' + value + ' for ' + name + '. Review the requested gear.');
            for (const unit of selected) {
                rentals[nextKey++] = unit;
                available.splice(available.indexOf(unit), 1);
            }
        }
        participants[personKey] = {...person, rentals};
    }
    return {participants, available};
}

export function reservationQuantity(form, item, option) {
    const count = Number(item.amount);
    return !form.createRequestId && (!item.id || item.id === option?.id) && Number.isSafeInteger(count) && count > 0 ? count : 1;
}

// Older reservations can hold a quantity on one unassigned row. Checked legacy
// items still hold stock until closure; quick returns release it immediately.
export function reservationCounts(form, optionsByValue) {
    const counts = new Map();
    function add(item, unassigned) {
        const option = optionsByValue.get(item.value);
        if (!option || item.stockReleased) return;
        counts.set(item.value, (counts.get(item.value) || 0) + (unassigned ? reservationQuantity(form, item, option) : 1));
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

// Older catalog entries store whole-number counts as strings.
export function rentalInventoryCount(value) {
    if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
    const count = Number(value);
    return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

export function availableRentalUnits(option, reserved = option?.stock ?? 0) {
    const maximum = rentalInventoryCount(option?.max);
    const inUse = rentalInventoryCount(reserved);
    if (maximum === null || inUse === null) return 0;
    return Math.max(0, maximum - inUse);
}

const sameUnit = (a, b) => a.owner === b.owner && a.id === b.id && a.value === b.value &&
    (a.id && a.owner ? true : a.personKey === b.personKey && a.unitKey === b.unitKey);
const sameIssue = (a, b) => sameUnit(a, b) && a.number === b.number && a.operation === b.operation && a.checked === b.checked;

function confirmIdentity(current, form) {
    if (!matchesRental(current, rentalIdentity(form)) ||
        (!form.createRequestId && form.transaction && form.transaction !== current.transaction)) {
        throw new Error('This rental form changed or closed. Reopen it before continuing.');
    }
}

function operationKey(value = uuid()) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value) ||
        Object.prototype.hasOwnProperty.call(Object.prototype, value) || value === 'prototype') throw new Error('Invalid equipment operation.');
    return value;
}

function isReplay(form, operation, signature) {
    const prior = form.gearHistory?.[operation];
    if (!prior) return false;
    if (prior.signature !== signature) throw new Error('This operation was already used for a different equipment change.');
    return true;
}

function catalogOption(options, type) {
    const catalog = entries(options).filter(([, option]) => option.value === type);
    if (catalog.length > 1) throw new Error('This equipment type has duplicate catalog entries. Review inventory.');
    return catalog[0] || [];
}

function checkNumber(desk, formKey, row, number, option) {
    const inUse = entries(desk.group).some(([key, form]) => !form.returned && gearRows(form).some(unit =>
        !(key === String(formKey) && row.personKey === unit.personKey && row.unitKey === unit.unitKey) &&
        unit.value === row.value && !unit.checked && folded(unit.number) === folded(number)));
    if (inUse) throw new Error('That equipment number is already issued on an open form.');
    if (rentalRows(option?.repairHolds).some(hold => folded(hold.number) === folded(number))) throw new Error('That item is waiting for inspection.');
}

function resolveReviewedRow(rows, review) {
    const matches = rows.filter(row => sameUnit(row, review));
    return matches.length === 1 ? matches[0] : matches.find(row => row.personKey === review.personKey && row.unitKey === review.unitKey);
}

function logItem(row, extra) {
    return {personKey:row.personKey, unitKey:row.unitKey, id:row.id, name:row.name, value:row.value, label:row.label, from:row.number, ...extra};
}

function visitInfo(form, person, admission) {
    const linked = form.playerCheckIn || form.walkOnCheckIn;
    const memberId = !person.isDigital && person.isMember !== false && !String(person.ref || '').startsWith('group:') ? person.ref : null;
    const direct = Boolean(linked && linked.playerId === person.ref);
    const group = person.groupId && person.groupEntryId && person.groupId === form.checkInGroup?.id;
    const date = (direct && linked.date) || (group && form.checkInGroup.date);
    const exactGroup = group && admission?.groupId === person.groupId && admission?.groupEntryId === person.groupEntryId;
    if (admission && (!/^\d{4}-\d\d-\d\d$/.test(admission.date) || !admission.playerId ||
        !Number.isFinite(Date.parse(admission.checkedInAt)) || (date && admission.date !== date) ||
        (group && admission.groupId && !exactGroup) ||
        !(exactGroup || memberId === admission.playerId || (direct && linked.playerId === admission.playerId)) ||
        (direct && linked.checkedInAt && linked.checkedInAt !== admission.checkedInAt))) {
        throw new Error('This admission does not match the reviewed renter. Refresh the pickup queue.');
    }
    const day = date || admission?.date;
    if (!day || !/^\d{4}-\d\d-\d\d$/.test(day)) return null;
    const playerId = admission?.playerId || (direct && linked.playerId) || memberId;
    const checkedInAt = admission?.checkedInAt || (direct && linked.checkedInAt) || null;
    return {date:day, ...(playerId && {playerId}), ...(checkedInAt && {checkedInAt}),
        ...(group && {groupId:person.groupId,groupEntryId:person.groupEntryId})};
}

function claimAdmission(desk, form, issue, visit) {
    if (!visit) return null;
    const keys = [];
    if (visit.playerId) keys.push(['player',visit.playerId]);
    if (visit.groupEntryId) keys.push(['group',visit.groupId,visit.groupEntryId]);
    const oldClaims = desk.armoryHandoffs || {};
    const claims = {...oldClaims[visit.date]};
    for (const parts of keys) {
        const key = encodeURIComponent(JSON.stringify(parts)).replace(/\./g,'%2E');
        if (key.length > 700) throw new Error('The rental visit identifier is too long. Review the admission.');
        const prior = claims[key];
        if (prior) {
            const distinctVisit = prior.checkedInAt && visit.checkedInAt && Date.parse(visit.checkedInAt) > Date.parse(prior.checkedInAt);
            const oldForm = desk.group?.[prior.formKey];
            const oldPerson = rentalRows(oldForm?.participants).find(person => person.armoryIssueId === prior.operation);
            if (!distinctVisit || (oldPerson && rentalRows(oldPerson.rentals).some(item => !item.checked))) {
                throw new Error('This arrival already received equipment on a rental form. Review that handoff.');
            }
        }
        claims[key] = {formKey:String(form.key), operation:issue, ...(visit.checkedInAt && {checkedInAt:visit.checkedInAt})};
    }
    return {...oldClaims,[visit.date]:claims};
}

export async function issueRentalGear(firebase, form, personKey, numbers, operationId, admission) {
    const reviewed = gearRows(form).filter(row => row.personKey === String(personKey));
    if (!reviewed.length || !numbers || Object.keys(numbers).length !== reviewed.length ||
        reviewed.some(row => !Object.prototype.hasOwnProperty.call(numbers,row.unitKey) || !validGearTag(numbers[row.unitKey]))) {
        throw new Error('Enter the equipment number for every requested item before handing it over.');
    }
    const operation = operationKey(operationId);
    const at = serverTimestamp();
    const signature = JSON.stringify(['issue', reviewed.map(row => [row.owner,row.id,row.unitKey,row.value,folded(numbers[row.unitKey])]),
        admission ? [admission.date,admission.playerId,admission.checkedInAt] : null]);
    const result = await runTransaction(firebase.rentals(), desk => {
        if (desk === null) return null;
        const current = desk.group?.[form.key];
        confirmIdentity(current, form);
        if (isReplay(current, operation, signature)) return desk;
        const currentRows = gearRows(current);
        const rows = reviewed.map(review => resolveReviewedRow(currentRows, review));
        const targetKey = rows[0]?.personKey;
        const person = current.participants?.[targetKey];
        if (!person || rows.some((row,index) => !row || row.personKey !== targetKey || !sameIssue(row,reviewed[index]) || row.checked) ||
            rows.length !== rentalRows(person.rentals).length || new Set(rows.map(row => row.unitKey)).size !== rows.length) {
            throw new Error('The requested equipment changed or was returned. Refresh the rental form.');
        }
        if (timestamp(person.armoryIssuedAt) || rows.some(row => row.issuedAt)) throw new Error('This renter has already received their gear.');
        if (!admission && current.armoryVersion !== 1 && rows.every(row => row.physicallyIssued)) {
            throw new Error('This older rental already has issued numbers. Use swaps or returns for its gear.');
        }
        if (!isArmoryReady(current, targetKey)) throw new Error('Activate the form and verify this renter’s current signed waiver before handout.');
        const visit = visitInfo(current, person, admission);
        const claims = claimAdmission(desk, form, operation, visit);
        const rentals = copy(person.rentals);
        const assigned = new Set();
        const history = [];
        for (const [index,row] of rows.entries()) {
            const number = tag(numbers[reviewed[index].unitKey]);
            const [,option] = catalogOption(desk.options, row.value);
            if (!option) throw new Error('Restore this equipment type in inventory before issuing it.');
            const maximum = rentalInventoryCount(option.max);
            const stock = rentalInventoryCount(option.stock);
            const held = heldCount(desk.group, option);
            // Older forms could reserve units before a maximum was configured. Pickup
            // consumes that recorded reservation without allocating additional stock.
            if (rentals[row.unitKey].stockReleased || held < 1 || stock === null || stock < held ||
                (option.max != null && (maximum === null || stock > maximum))) {
                throw new Error('The reserved inventory count needs review before handout.');
            }
            if (row.number && folded(row.number) !== folded(number)) throw new Error('Confirm the existing equipment number or review a swap.');
            const identifier = JSON.stringify([row.value, folded(number)]);
            if (assigned.has(identifier)) throw new Error('The same equipment number was entered twice for this equipment type.');
            assigned.add(identifier);
            checkNumber(desk, form.key, row, number, option);
            rentals[row.unitKey] = {...rentals[row.unitKey], number, issuedAt:at, pickedUpAt:row.pickedUpAt || at, movementOperation:operation, gearOperation:operation, checked:false};
            history.push(logItem(row, {to:number}));
        }
        const participants = copy(current.participants);
        participants[targetKey] = {...person, rentals, armoryIssuedAt:at, armoryIssueId:operation, ...(visit && {armoryAdmission:visit})};
        const group = copy(desk.group);
        group[form.key] = {...current, participants, gearHistory:{...current.gearHistory,
            [operation]:{action:'issue',at,signature,items:history}}};
        return {...desk,group,...(claims && {armoryHandoffs:claims})};
    }, {applyLocally:false});
    const issuedAt = result.committed && result.snapshot.child('group/' + form.key + '/gearHistory/' + operation + '/at').val();
    if (!knownTime(issuedAt)) throw new Error('The handoff was not confirmed. Refresh the rental form.');
    return {issuedAt, operationId:operation};
}

export async function changeEquipment(firebase, form, rows, action, replacement = '', needsRepair = false, details) {
    if (!rows.length || !['assign', 'swap', 'return'].includes(action) ||
        (action !== 'return' && (rows.length !== 1 || !validGearTag(replacement)))) throw new Error('Choose the equipment and enter a valid number.');
    const reason = String(details?.reason ?? (needsRepair && !details ? 'Reported malfunction' : '')).trim();
    if ((needsRepair && !reason) || reason.length > 200) throw new Error('Enter a malfunction reason of up to 200 characters.');
    const operation = operationKey(details?.operationId);
    const signature = JSON.stringify([action, rows.map(row => [row.owner,row.id,row.value,row.personKey,row.unitKey,row.number,row.operation]),
        folded(replacement),Boolean(needsRepair),reason]);
    const at = serverTimestamp();
    const newNumber = tag(replacement);
    let saved = false;
    const result = await runTransaction(firebase.rentals(), desk => {
        saved = false;
        if (desk === null) return null;
        const current = desk.group?.[form.key];
        confirmIdentity(current, form);
        if (action === 'assign' && !current.complete) throw new Error('Activate the rental form before issuing equipment.');
        if (isReplay(current, operation, signature)) { saved = true; return desk; }
        const currentRows = gearRows(current);
        const participants = copy(current.participants);
        const group = copy(desk.group);
        const options = copy(desk.options);
        const touched = new Set();
        const changes = [];

        for (const review of rows) {
            const row = resolveReviewedRow(currentRows, review);
            if (!row || !sameIssue(row, review) || row.checked || (action !== 'assign' && !row.physicallyIssued) ||
                touched.has(JSON.stringify([row.personKey, row.unitKey]))) throw new Error('The selected equipment was returned or changed. Refresh the outstanding list.');
            touched.add(JSON.stringify([row.personKey, row.unitKey]));
            const [catalogKey, option] = catalogOption(options, row.value);
            if (action !== 'return') {
                if (!option) throw new Error('Restore this equipment type in inventory before assigning a number.');
                if (row.number && folded(row.number) === folded(newNumber)) throw new Error('Enter a different replacement number.');
                checkNumber(desk, form.key, row, newNumber, option);
                if (action === 'assign' && (row.issuedAt || row.physicallyIssued)) {
                    throw new Error('Use an equipment swap to change an issued number.');
                }
            }
            const person = participants[row.personKey];
            const rentals = copy(person.rentals);
            const original = rentals[row.unitKey];
            if (action === 'return') {
                rentals[row.unitKey] = { ...original, checked: true, stockReleased: true, returnedAt:at,
                    pickedUpAt: row.pickedUpAt, previousNumbers: row.previousNumbers, movementOperation: operation, gearOperation: operation };
            } else if (action === 'swap') {
                const previousNumbers = [...row.previousNumbers, { number: row.number, pickedUpAt: row.pickedUpAt, returnedAt: at }];
                rentals[row.unitKey] = { ...original, number: newNumber, pickedUpAt: at, previousNumbers, movementOperation: operation, checked: false, gearOperation: operation };
            } else {
                // Numbering a modern reservation only stages the serial for handoff.
                rentals[row.unitKey] = { ...original, number: newNumber, ...(current.armoryVersion !== 1 && { pickedUpAt: at, movementOperation: operation }),
                    checked: false, gearOperation: operation };
            }
            participants[row.personKey] = { ...person, rentals };
            group[form.key] = { ...current, participants };
            if (option && action === 'return') {
                const stock = Number(option.stock) || 0;
                const release = Math.min(1, Math.max(0, stock - heldCount(group, option)));
                if (release) options[catalogKey] = { ...option, stock: stock - release };
            }
            if (action === 'swap' && needsRepair) {
                if (option.repairHolds?.[operation]) throw new Error('This service hold was already used. Reopen the swap.');
                const stock = Math.max(Number(option.stock) || 0, heldCount(group, option));
                if (option.max == null || !Number.isSafeInteger(Number(option.max)) || stock >= Number(option.max)) throw new Error('No spare unit is available. Check the inventory maximum.');
                options[catalogKey] = { ...option, stock: stock + 1, repairHolds: { ...option.repairHolds,
                    [operation]: { number: row.number, at, reason } } };
            }
            changes.push(logItem(row, action !== 'return' ? {to:newNumber} : {}));
        }
        group[form.key] = { ...current, participants, gearHistory: { ...current.gearHistory,
            [operation]: { action, at, signature, ...(reason && {reason}), needsRepair: action === 'swap' && needsRepair, items: changes } } };
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
