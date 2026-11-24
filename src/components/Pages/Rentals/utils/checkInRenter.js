const fieldDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
});

function participantDate(row) {
    if (typeof row.date !== 'string') return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return row.date;
    // Older manually added members store their visit as an ISO timestamp.
    if (row.isMember && /(?:Z|[+-]\d{2}:\d{2})$/.test(row.date)) {
        const instant = Date.parse(row.date);
        if (Number.isFinite(instant)) return fieldDay.format(new Date(instant));
    }
    return null;
}

export function sameVisit(link, player) {
    return Boolean(link && player && link.playerId === player.playerId && link.date === player.date);
}

export function isCheckInRenter(row, player) {
    if (!row || !player) return false;
    if (player.groupId && player.groupEntryId && row.groupId === player.groupId && row.groupEntryId === player.groupEntryId) return true;
    return !row.isDigital && row.isMember !== false && row.ref === player.playerId;
}

export function playerRentalMatch(form, player) {
    if (!form || form.returned || !player) return false;
    if (sameVisit(form.playerCheckIn || form.walkOnCheckIn, player)) return true;
    return Object.values(form.participants || {}).some(row => isCheckInRenter(row, player) &&
        (form.checkInGroup?.date === player.date || participantDate(row) === player.date));
}

export function linkedPlayerRental(forms, player) {
    if (!player) return null;
    return forms.find(row => playerRentalMatch(row, player)) || (player.groupId && forms.find(row =>
        !row.returned && row.checkInGroup?.id === player.groupId && row.checkInGroup?.date === player.date)) || null;
}
