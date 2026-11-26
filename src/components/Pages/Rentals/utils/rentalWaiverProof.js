import { requestStaffFieldTool } from '../../../constants/fieldStaffApi';

const visitDate = /^\d{4}-\d{2}-\d{2}$/;
const groupKey = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const guestId = /^guest:[0-9a-f]{64}$/;
const memberId = /^[A-Za-z0-9_-]{10,128}$/;
const waiverId = /^[A-Za-z0-9_-]{1,128}$/;

function selector(person, { groupId, playDate }) {
    if (!person) return null;
    const date = visitDate.test(person.date) ? person.date : playDate;
    if (person.groupId || person.groupEntryId) {
        if (!groupKey.test(person.groupId || groupId || '') || !groupKey.test(person.groupEntryId || '') || !visitDate.test(date)) return null;
        return { kind: 'group', groupId: person.groupId || groupId, entryId: person.groupEntryId, date };
    }
    if (person.isDigital) {
        const ref = person.waiverRef || person.ref;
        return typeof ref === 'string' && waiverId.test(ref) ? { kind: 'waiver', ref } : null;
    }
    if (typeof person.ref !== 'string') return null;
    if (guestId.test(person.ref) && visitDate.test(date)) return { kind: 'visit', ref: person.ref, date };
    if (person.isMember === false) return null;
    if (person.isMember && memberId.test(person.ref)) return { kind: 'member', ref: person.ref };
    if (visitDate.test(date) && memberId.test(person.ref)) {
        return { kind: 'visit', ref: person.ref, date };
    }
    return null;
}

function verifiedRow(row) {
    if (row?.status === 'signed' && typeof row.ref === 'string' && row.ref &&
        Number.isSafeInteger(row.signedAt) && row.signedAt > 0 && row.signedAt <= Date.now() &&
        Number.isSafeInteger(row.expiresAt) && row.expiresAt > Date.now()) {
        return { status: 'signed', ref: row.ref, signedAt: row.signedAt, expiresAt: row.expiresAt };
    }
    return { status: ['missing', 'expired'].includes(row?.status) ? row.status : 'unavailable' };
}

// Only the staff's exact selections leave this form. The verifier returns no names or signature images.
export async function verifyRentalWaivers(firebase, uid, participants, options = {}) {
    const result = participants.map(() => ({ status: 'missing' }));
    const selected = participants.map((person, index) => ({ index, row: selector(person, options) })).filter(item => item.row);
    for (let start = 0; start < selected.length; start += 4) {
        const batch = selected.slice(start, start + 4);
        let proofs;
        try {
            const data = await requestStaffFieldTool(firebase, uid, '/api/rental-waivers', {
                method: 'POST', body: { renters: batch.map(item => item.row) },
            });
            if (Array.isArray(data.proofs) && data.proofs.length === batch.length) proofs = data.proofs;
        } catch {
            // Keep other batches usable when this verification needs to be retried.
        }
        batch.forEach(({ index }, i) => { result[index] = verifiedRow(proofs?.[i]); });
    }
    return result;
}

export function searchRentalWaivers(firebase, uid, name, signal) {
    return requestStaffFieldTool(firebase, uid, '/api/rental-waivers', {
        method: 'POST', body: { name }, signal,
    });
}
