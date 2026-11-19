import { newScoreId } from '../constants/scoreHistory';

const memory = new Map();
const unsaved = new Set();
const storageKey = uid => 'usaw-score-desk-v2:' + uid;
const validId = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export function newScoreRound() {
    return { id: newScoreId(), mode: '', side: '', scored: {} };
}

// Earlier desks stored one ambiguity per player/outcome. Preserve the original
// reference and timestamp even when that result had no round details.
function legacyPending(storage, actor) {
    const prefix = 'usaw-score-pending-v1:' + actor + ':';
    const entries = [];
    for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key?.startsWith(prefix)) continue;
        const parts = key.slice(prefix.length).split(':');
        const removal = parts[0] === 'void';
        const [outcome, uid, day, count] = removal ? parts.slice(1) : parts;
        if (!['win', 'loss'].includes(outcome) || !/^[\w-]{1,128}$/.test(uid || '') ||
            (removal && (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(day) || !Number.isSafeInteger(+count) || +count < 1))) continue;
        let attempt;
        try { attempt = JSON.parse(storage.getItem(key)); } catch { continue; }
        if (validId.test(attempt?.id) && Number.isSafeInteger(attempt.at)) {
            entries.push({ key, operation: { uid, outcome, id: attempt.id, at: attempt.at,
                ...(removal && { day, expectedCount: +count }) } });
        }
    }
    return entries;
}

export function loadDesk(actor) {
    const key = storageKey(actor);
    if (unsaved.has(key)) return memory.get(key);
    let desk;
    try {
        const storage = window.sessionStorage;
        desk = JSON.parse(storage.getItem(key));
        if (!desk?.round?.scored || !Array.isArray(desk.pending)) desk = { round: newScoreRound(), pending: [] };
        const legacy = legacyPending(storage, actor);
        if (legacy.length) {
            for (const { operation } of legacy) {
                if (!desk.pending.some(item => item.id === operation.id)) desk.pending.push(operation);
            }
            storage.setItem(key, JSON.stringify(desk));
            for (const item of legacy) storage.removeItem(item.key);
        }
        return desk;
    } catch {
        return memory.get(key) || desk || { round: newScoreRound(), pending: [] };
    }
}

export function persistDesk(actor, desk) {
    const key = storageKey(actor);
    memory.set(key, desk);
    try {
        window.sessionStorage.setItem(key, JSON.stringify(desk));
        unsaved.delete(key);
    } catch { unsaved.add(key); }
}
