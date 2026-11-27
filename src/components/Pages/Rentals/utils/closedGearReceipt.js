import { gearRows, tag } from './rentalGear';
import { rentalRows } from './openRental';

const fieldDate = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Los_Angeles',
});
const safeKey = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value) &&
    value !== 'prototype' && !Object.prototype.hasOwnProperty.call(Object.prototype, value);
const fields = (record, keys) => Object.fromEntries(keys.filter(key => record?.[key] != null).map(key => [key, record[key]]));
const mapRows = (rows, transform) => Object.fromEntries(Object.entries(rows || {}).filter(([, row]) => row).map(([key,row]) => [key,transform(row, key)]));

export function reservedGearReview(form) {
    const available = rentalRows(form.available);
    const labels = new Set(available.map(item => item.label || item.value || 'Unassigned equipment'));
    const reservations = available.map(item => ['reserve', item.id || '', item.value || '', tag(item.number), String(item.amount || '')]);
    for (const row of gearRows(form)) {
        if (!row.physicallyIssued && !row.checked) {
            labels.add([row.label || 'Equipment', row.number && '#' + row.number].filter(Boolean).join(' '));
            reservations.push(['assigned', row.owner, row.personKey, row.unitKey, row.id, row.value || '', row.number]);
        }
    }
    return { signature: reservations.map(item => JSON.stringify(item)).sort().join('\n'), labels: [...labels] };
}

// The return receipt survives removal of the active form. Only the fields
// needed for equipment history and pickup reconciliation leave that form.
export function archiveClosedGear(desk, form, key, fallbackId, closedAt) {
    const id = safeKey(form.createRequestId) ? form.createRequestId : fallbackId;
    if (desk.closedGear?.[id]) throw new Error('This rental receipt already exists. Refresh the rental desk.');
    const dates = new Set();
    function noteMovement(value) {
        if (Number.isSafeInteger(value) && value > 0 && Number.isFinite(new Date(value).getTime())) dates.add(fieldDate.format(value));
    }
    const movements = new Map(gearRows(form).map(row => [JSON.stringify([row.personKey, row.unitKey]), row]));
    const receipt = {
        ...fields(form, ['name','createRequestId','returnListId','armoryVersion','complete']),
        formKey: String(key), receiptId: id, closedAt,
        gearHistory: mapRows(form.gearHistory, entry => ({
            ...fields(entry, ['action','at','reason','needsRepair']),
            items: rentalRows(entry.items).map(item => fields(item,['personKey','unitKey','id','name','value','label','from','to'])),
        })),
    };
    for (const link of ['checkInGroup', 'walkOnCheckIn', 'playerCheckIn']) {
        if (!form[link]) continue;
        receipt[link] = fields(form[link], link === 'checkInGroup' ? ['id','date'] : ['playerId','date']);
    }
    receipt.participants = mapRows(form.participants, (person, personKey) => {
        const row = fields(person,['name','isMember','isDigital','date','groupId','groupEntryId','armoryIssuedAt']);
        if (!person.isDigital && person.isMember !== false && person.ref != null) row.ref = person.ref;
        if (person.armoryAdmission) {
            row.armoryAdmission = fields(person.armoryAdmission, ['playerId','date','checkedInAt','groupId','groupEntryId']);
        }
        noteMovement(row.armoryIssuedAt);
        row.rentals = mapRows(person.rentals, (unit, unitKey) => {
            const movement = movements.get(JSON.stringify([personKey, unitKey]));
            noteMovement(unit.issuedAt);
            noteMovement(movement.pickedUpAt);
            noteMovement(movement.returnedAt);
            for (const previous of movement.previousNumbers) {
                noteMovement(previous.pickedUpAt);
                noteMovement(previous.returnedAt);
            }
            return { ...fields(unit, ['id','value','label','number','checked','issuedAt','stockReleased','gearOperation']),
                ...(unit.gearOperation && { movementOperation: unit.gearOperation }),
                ...(movement.pickedUpAt && { pickedUpAt: movement.pickedUpAt }),
                ...(movement.returnedAt && { returnedAt: movement.returnedAt }),
                ...(movement.previousNumbers.length > 0 && { previousNumbers: movement.previousNumbers }),
            };
        });
        if (Number.isSafeInteger(row.armoryIssuedAt) && row.armoryIssuedAt > 0 && /^\d{4}-\d{2}-\d{2}$/.test(row.armoryAdmission?.date || '')) {
            dates.add(row.armoryAdmission.date);
        }
        return row;
    });
    const closedGear = { ...desk.closedGear, [id]: receipt };
    if (!dates.size) return { closedGear };
    const closedGearByDay = { ...desk.closedGearByDay };
    for (const day of dates) {
        closedGearByDay[day] = { ...closedGearByDay[day], [id]: String(key) };
    }
    return { closedGear, closedGearByDay };
}
