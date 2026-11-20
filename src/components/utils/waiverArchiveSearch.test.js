import { get, ref } from 'firebase/database';
import { loadWaiverSearchIndex } from './waiverArchiveSearch';

jest.mock('firebase/database', () => ({ ref: jest.fn((db, path) => path), get: jest.fn() }));

test('searches only lightweight month buckets and keeps partial index failures visible', async () => {
    const now = Date.UTC(2026, 10, 20, 12);
    ref.mockImplementation((db, path) => path);
    get.mockImplementation(async path => {
        if (path.endsWith('2026-04')) throw new Error('unavailable');
        const present = path.endsWith('2026-11');
        return { exists: () => present, forEach: callback => {
            if (present) {
                callback({ key: 'a', val: () => ({ name: 'Alice Example', timestamp: now, data: { participantSignature: 'private' } }) });
                callback({ key: 'b', val: () => ({ name: 'Expired', timestamp: Date.UTC(2025, 10, 20, 12) }) });
            }
        } };
    });
    const results = await loadWaiverSearchIndex({ db: {} }, now);
    expect(results.flatMap(month => month.rows)).toEqual([{ ref: 'a', name: 'Alice Example', date: new Date(now), isDigital: true }]);
    expect(results.filter(month => month.missing)).toHaveLength(12);
    expect(ref.mock.calls.every(([, path]) => path.startsWith('digital_waiver_search/'))).toBe(true);
    expect(get).toHaveBeenCalledTimes(13);
});
