export function rentalGroupSource({ id, name, date, kind }) {
    return { id, name, date, kind };
}

function sameRenter(participant, group, entry) {
    return (participant.groupId === group.id && participant.groupEntryId === entry.id) ||
        Boolean(entry.playerId && !participant.isDigital && participant.ref === entry.playerId);
}

export function rentalHasGroupEntry(participants, group, entry) {
    return Object.values(participants || {}).some(person => person && sameRenter(person, group, entry));
}

export function mergeRentalRoster(participants, group, entries) {
    const merged = Object.values(participants || {}).filter(Boolean);
    for (const entry of entries) {
        if (!entry.id || !entry.displayName?.trim() || rentalHasGroupEntry(merged, group, entry)) continue;
        merged.push({
            ref: entry.playerId || 'group:' + group.id + ':' + entry.id,
            name: entry.displayName,
            groupId: group.id,
            groupEntryId: entry.id,
            date: group.date,
            rentals: [],
        });
    }
    return merged;
}
