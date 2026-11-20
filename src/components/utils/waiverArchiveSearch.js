import { get, ref } from 'firebase/database';
import { archiveMonthKeys, waiverArchiveStart } from './waiverArchive';

// Read the names and creation dates maintained for rental lookups. A missing
// month is distinct from a successful search that has no matching name.
export async function loadWaiverSearchIndex(firebase, now = Date.now()) {
    const cutoff = waiverArchiveStart(now);
    return Promise.all(archiveMonthKeys(cutoff + 1, now).map(async month => {
        try {
            const snapshot = await get(ref(firebase.db, 'digital_waiver_search/' + month));
            const rows = [];
            snapshot.forEach(child => {
                const { name, timestamp } = child.val();
                if (typeof name === 'string' && name.trim() && timestamp > cutoff && timestamp <= now) {
                    rows.push({ ref: child.key, name, date: new Date(Number(timestamp)), isDigital: true });
                }
            });
            return { rows, missing: !snapshot.exists() };
        } catch {
            return { rows: [], missing: true };
        }
    }));
}
