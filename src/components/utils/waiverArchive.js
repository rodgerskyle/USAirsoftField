// Date.now() and digital_waivers.timestamp are both milliseconds since the epoch.
export function waiverArchiveStart(now = Date.now()) {
    const date = new Date(now);
    const month = date.getUTCMonth();
    date.setUTCFullYear(date.getUTCFullYear() - 1);
    // February 29 has no calendar anniversary in a non-leap year.
    if (date.getUTCMonth() !== month) date.setUTCDate(0);
    return date.getTime();
}

export function archiveMonthKeys(start, end) {
    const date = new Date(start);
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
    const keys = [];
    while (date.getTime() <= end) {
        keys.push(date.toISOString().slice(0, 7));
        date.setUTCMonth(date.getUTCMonth() + 1);
    }
    return keys;
}

export function recentPaperWaivers(items, now = Date.now()) {
    const cutoff = waiverArchiveStart(now);
    return items.flatMap(item => {
        // Scanners store the creation time inside the filename, before the extension.
        const match = /\((\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ :](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?::(\d{1,3}))?)?)?\)\.pdf$/i.exec(item.name);
        if (!match) return [];
        const [, month, day, year, hour = 0, min = 0, sec = 0, ms = 0] = match;
        const date = new Date(+year, month - 1, +day, +hour, +min, +sec, +ms);
        if (hour > 23 || min > 59 || sec > 59 || date.getMonth() !== month - 1 ||
            date.getDate() !== +day || date <= cutoff || date > now) return [];
        return [{ name: item.name.slice(0, match.index).trim(), date, ref: item, isDigital: false }];
    });
}

// Build contiguous timestamp ranges so a filter such as "the 20th of each
// month" never reads documents from the days in between.
export function archiveDateRanges(year, month, day, now = Date.now()) {
    const start = waiverArchiveStart(now) + 1;
    const date = new Date(start);
    date.setHours(0, 0, 0, 0);
    const allYears = new Date(now).getFullYear() + 1;
    const ranges = [];
    while (date.getTime() <= now) {
        const lower = date.getTime();
        const matches = (year === allYears || year === date.getFullYear()) &&
            (month === 13 || month === date.getMonth() + 1) && (day === 32 || day === date.getDate());
        date.setDate(date.getDate() + 1);
        if (!matches) continue;
        const upper = Math.min(now, date.getTime() - 1);
        const previous = ranges[ranges.length - 1];
        if (previous && previous.end === lower - 1) previous.end = upper;
        else ranges.push({ start: Math.max(start, lower), end: upper });
    }
    return ranges.reverse();
}
