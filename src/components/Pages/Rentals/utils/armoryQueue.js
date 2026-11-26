import { armoryPeople, isArmoryReady } from './rentalGear';
import { isCheckInRenter } from './checkInRenter';

const visitKey = row => JSON.stringify([row.date, row.playerId, row.checkedInAt]);
const groupId = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const fieldId = /^(?:guest:[0-9a-f]{64}|[A-Za-z0-9_-]{10,128})$/;
const present = value => Object.values(value || {}).filter(Boolean);
const pacific = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'});
export function armoryFieldDay(at = Date.now()) {
    const clock = new Date(at);
    return Number.isFinite(clock.getTime()) ? pacific.format(clock) : null;
}

export function armoryQueries(forms, fieldDate) {
    const ids = new Set();
    function add(key, value) {
        if ((key === 'group' ? groupId : fieldId).test(value || '')) ids.add(key + '=' + encodeURIComponent(value));
    }
    for (const form of forms) {
        if (!form.complete || form.returned) continue;
        const date = (form.checkInGroup || form.playerCheckIn || form.walkOnCheckIn)?.date;
        if (fieldDate && date && date !== fieldDate) continue;
        if (form.checkInGroup?.id) add('group', form.checkInGroup.id);
        if (form.playerCheckIn || form.walkOnCheckIn) add('member', (form.playerCheckIn || form.walkOnCheckIn).playerId);
        for (const person of present(form.participants)) {
            if (person.groupId) add('group', person.groupId);
            else if (!person.isDigital && (person.isMember || form.playerCheckIn || form.walkOnCheckIn)) add('member', person.ref);
        }
    }
    const sorted = [...ids].sort();
    const base = '/api/rental-groups?pickup=today';
    if (!sorted.length) return [base];
    const routes = [];
    for (let i = 0; i < sorted.length; i += 40) routes.push(base + '&' + sorted.slice(i, i + 40).join('&'));
    return routes;
}

export function mergeAdmissionPages(pages) {
    const date = pages[0]?.date;
    if (!pages.length || pages.some(page => !Array.isArray(page.players) || page.date !== date)) throw new Error('Refresh to load today’s rental admissions.');
    const rows = name => [...new Map(pages.flatMap(page => page[name] || []).map(row => [visitKey(row), row])).values()];
    return { date, players: rows('players'), admitted: rows('admitted'), issued: rows('issued') };
}

function linkedPerson(form, person, admission) {
    const original = form.participants?.[person.personKey];
    if (!original || !isCheckInRenter(original, admission)) return false;
    if (form.checkInGroup) return form.checkInGroup.id === admission.groupId && form.checkInGroup.date === admission.date;
    const visit = form.playerCheckIn || form.walkOnCheckIn;
    if (visit) return visit.playerId === admission.playerId && visit.date === admission.date;
    if (original.groupId) return original.groupId === admission.groupId && original.date === admission.date;
    // A standalone member may have a signed waiver and a separate check-in request.
    return !original.isDigital && original.ref === admission.playerId && (original.date === admission.date ||
        (form.activatedAt && armoryFieldDay(form.activatedAt) === admission.date));
}

function receiptMatches(form, receipt) {
    return String(receipt.formKey) === String(form.key) && (!receipt.createRequestId || receipt.createRequestId === form.createRequestId);
}

export function armoryQueue(forms, desk, closed = []) {
    const open = forms.filter(form => form.complete && !form.returned);
    const requests = desk?.players || [];
    const receipts = desk?.issued || [];
    const admissions = [...requests, ...(desk?.admitted || []), ...receipts];
    const cards = [];
    const represented = new Set();
    const activeIds = new Set(open.map(form => form.createRequestId).filter(Boolean));
    for (const form of [...open, ...closed.filter(form => !form.createRequestId || !activeIds.has(form.createRequestId))]) {
        const archived = closed.includes(form);
        for (const person of armoryPeople(form)) {
            const key = JSON.stringify([form.key, form.receiptId || form.createRequestId || '', person.personKey]);
            if (!person.rows.length) continue;
            const storedVisit = form.participants?.[person.personKey]?.armoryAdmission;
            const admission = admissions.find(row => storedVisit ? visitKey(row) === visitKey(storedVisit) : linkedPerson(form, person, row));
            const pending = requests.find(row => admission && visitKey(row) === visitKey(admission));
            const prior = receipts.find(row => admission && visitKey(row) === visitKey(admission));
            const handedHere = prior && receiptMatches(form, prior);
            const returnedToday = archived ? person.rows.filter(row => row.physicallyIssued && row.checked && row.returnedAt && armoryFieldDay(row.returnedAt) === (desk?.date || armoryFieldDay())) : [];
            const needsArchiveSync = archived && pending && person.issuedAt && storedVisit && form.createRequestId;
            if (archived && !returnedToday.length && !needsArchiveSync) continue;
            // An existing receipt for a different form already completed this physical visit.
            if (prior && !handedHere && !person.issuedAt) continue;
            const checkInRequired = Boolean(form.checkInGroup || form.playerCheckIn || form.walkOnCheckIn || person.groupEntryId);
            const pickedUp = Boolean(person.issuedAt || handedHere);
            const legacyService = !pending && form.armoryVersion !== 1 && person.rows.some(row => row.physicallyIssued);
            const serviced = pickedUp || legacyService || ['issued','partial-return','returned'].includes(person.state);
            const ready = !archived && isArmoryReady(form, person.personKey);
            const fieldDate = (form.checkInGroup || form.playerCheckIn || form.walkOnCheckIn)?.date || (person.groupId && form.participants[person.personKey].date);
            let stage = 'waiting';
            if (archived) stage = returnedToday.length ? 'returned' : 'out';
            else if (person.state === 'returned' || (pickedUp && person.rows.every(row => row.checked))) stage = 'returned';
            else if (serviced && !(pending && !person.issuedAt && !prior)) stage = 'out';
            else if (checkInRequired && !admission && fieldDate && desk?.date && fieldDate !== desk.date) stage = 'scheduled';
            else if (!ready) stage = 'desk';
            else if (checkInRequired && !admission) stage = 'arrival';
            cards.push({key, form, person: archived && returnedToday.length ? {...person,rows:returnedToday} : person,
                admission, pending, archived, checkInRequired, pickedUp, fieldDate, stage,
                syncRequired: Boolean(person.issuedAt && storedVisit && admission && !handedHere && !prior),
                conflict: Boolean(prior && !handedHere),
                name: form.participants?.[person.personKey]?.name || pending?.displayName || person.name,
                group: pending?.groupName || form.checkInGroup?.name || form.name || 'Rental form',
            });
            if (pending) represented.add(visitKey(pending));
        }
    }
    return {cards, unassigned: requests.filter(row => !represented.has(visitKey(row)))};
}
