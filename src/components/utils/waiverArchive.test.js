import { archiveDateRanges, archiveMonthKeys, recentPaperWaivers, waiverArchiveStart } from './waiverArchive';

test('the rolling archive crosses a calendar year and clamps February 29', () => {
    expect(waiverArchiveStart(Date.parse('2026-11-20T10:11:12.345Z')))
        .toBe(Date.parse('2025-11-20T10:11:12.345Z'));
    expect(waiverArchiveStart(Date.parse('2024-02-29T10:11:12.345Z')))
        .toBe(Date.parse('2023-02-28T10:11:12.345Z'));
});

test('includes the two partial months in an archive window', () => {
    const start = new Date(2025, 10, 20, 10).getTime();
    const end = new Date(2026, 10, 20, 10).getTime();
    const keys = archiveMonthKeys(start, end);
    expect(keys).toHaveLength(13);
    expect(keys[0]).toBe('2025-11');
    expect(keys[12]).toBe('2026-11');
});

test('only dated paper waivers inside the archive are returned, with their original file refs', () => {
    const now = new Date(2026, 10, 20, 10, 30).getTime();
    const current = { name: 'Alice Example(11-20-2025:10:30:0:1).pdf' };
    const items = [
        current,
        { name: 'On anniversary(11-20-2025:10:30:0:0).pdf' },
        { name: 'After today(11-20-2026:10:30:0:1).pdf' },
        { name: 'Undated.pdf' },
        { name: 'Invalid date(2-31-2026:10:0:0:0).pdf' },
    ];
    expect(recentPaperWaivers(items, now)).toEqual([{
        name: 'Alice Example', date: new Date(2025, 10, 20, 10, 30, 0, 1), ref: current, isDigital: false
    }]);
});

test('date filters produce only matching time intervals, newest first', () => {
    const time = (month, day) => new Date(2026, month - 1, day).getTime();
    const now = time(11, 20) + 1234;
    expect(archiveDateRanges(2026, 8, 32, now)).toEqual([{ start: time(8, 1), end: time(9, 1) - 1 }]);
    expect(archiveDateRanges(2026, 2, 31, now)).toEqual([]);
    const days = archiveDateRanges(2026, 13, 10, now);
    expect(days).toHaveLength(11);
    expect(days[0]).toEqual({ start: time(11, 10), end: time(11, 11) - 1 });
    expect(archiveDateRanges(2027, 13, 32, now)).toEqual([{ start: waiverArchiveStart(now) + 1, end: now }]);
});
