const fieldDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function waiverAge(dob, now = new Date()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
    const birth = new Date(dob + 'T00:00:00Z');
    if (!Number.isFinite(+birth) || birth.toISOString().slice(0, 10) !== dob) return null;
    const parts = Object.fromEntries(fieldDay.formatToParts(now).map(({type, value}) => [type, value]));
    const age = Number(parts.year) - Number(dob.slice(0, 4)) - Number(parts.month + '-' + parts.day < dob.slice(5));
    return age >= 0 && age < 130 ? age : null;
}
