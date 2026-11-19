import { child, get, runTransaction } from 'firebase/database';
import { checkScoreOperation, loadPlayerScoreHistory, recordPlayerResult, voidPlayerResult } from './scoreRecording';
import { scoreRankMilestones } from './scoreRankMilestones';
import { scoreHistoryFields } from './scoreHistory';
import rankThresholds from './rankincrements';
import rankNames from './ranks';

jest.mock('firebase/database', () => ({ get: jest.fn(), child: jest.fn(), runTransaction: jest.fn() }));

const playerId = 'test-player-42';
const firebase = { user: jest.fn(() => 'memberRef') };
const scoringTime = new Date('2026-12-01T07:59:59Z');

const originalCrypto = Object.getOwnPropertyDescriptor(global, 'crypto');
beforeAll(() => Object.defineProperty(global, 'crypto', { configurable: true, value: require('crypto').webcrypto }));
afterAll(() => {
    if (originalCrypto) Object.defineProperty(global, 'crypto', originalCrypto);
    else delete global.crypto;
});

function recordedGame(player, day, outcome, at) {
    const ids = Object.keys(player.gameResultHistory[day]);
    expect(ids).toHaveLength(1);
    expect(ids[0]).toMatch(/^[a-f0-9-]{36}$/);
    return { [day]: { [ids[0]]: { outcome, at } } };
}


function transactionResult(value, committed = true) {
    return { committed, snapshot: { exists: () => value != null, val: () => value } };
}

beforeEach(() => {
    jest.clearAllMocks();
    firebase.user.mockReturnValue('memberRef');
});

test('uses the latest score on retry and keeps history, rewards and unrelated member data', async () => {
    const previousDay = { wins: 3, losses: 8 };
    const player = {
        username: 'member', points: 441, wins: 12, losses: 7, freegames: 3,
        games: { '2026-10-29': previousDay, '2026-10-30': { wins: 1, losses: 3 } },
    };
    const concurrentUpdate = {
        ...player, points: 444, losses: 8,
        games: { ...player.games, '2026-10-30': { wins: 1, losses: 4 } },
    };

    runTransaction.mockImplementationOnce(async (reference, update) => {
        const first = update(player);
        const retry = update(concurrentUpdate);
        expect(first.points).toBe(451);
        expect(retry).toEqual({
            ...concurrentUpdate, points: 454, wins: 13, freegames: 4,
            freeGameMilestones: { 'pass-1': { passNumber: 1, at: scoringTime.getTime() } },
            gameResultHistory: recordedGame(first, '2026-10-30', 'win', scoringTime.getTime()),
            rankMilestones: { 'rank-5': { at: scoringTime.getTime(), rankLevel: 5, rankName: 'Sergeant' } },
            games: { '2026-10-29': previousDay, '2026-10-30': { wins: 2, losses: 4 } },
        });
        expect(player.games['2026-10-30']).toEqual({ wins: 1, losses: 3 });
        return transactionResult(retry);
    });

    await recordPlayerResult(firebase, playerId, 'win', scoringTime);
    expect(firebase.user).toHaveBeenCalledWith(playerId);
    expect(runTransaction).toHaveBeenCalledWith('memberRef', expect.any(Function), { applyLocally: false });
});

test('records a loss using legacy numeric values and initializes missing history after a cold cache', async () => {
    runTransaction.mockImplementationOnce(async (reference, update) => {
        expect(update(null)).toBeNull();
        const saved = update({ name: 'Member', points: '447', wins: 2, freegames: '2', games: null });
        expect(saved).toEqual({
            name: 'Member', points: 450, wins: 2, losses: 1, freegames: 3,
            freeGameMilestones: { 'pass-1': { passNumber: 1, at: Date.parse('2026-12-01T08:00:00Z') } },
            gameResultHistory: recordedGame(saved, '2026-11-1', 'loss', Date.parse('2026-12-01T08:00:00Z')),
            rankMilestones: { 'rank-5': { at: Date.parse('2026-12-01T08:00:00Z'), rankLevel: 5, rankName: 'Sergeant' } },
            games: { '2026-11-1': { wins: 0, losses: 1 } },
        });
        return transactionResult(saved);
    });

    await recordPlayerResult(firebase, playerId, 'loss', new Date('2026-12-01T08:00:00Z'));
});

test('does not award another free game for a result after the threshold', async () => {
    runTransaction.mockImplementationOnce(async (reference, update) => {
        const player = {
            name: 'Member', points: 450, losses: '8', freegames: 3,
            games: { '2026-10-30': { wins: 2, losses: '1' } },
        };
        const saved = update(player);
        expect(saved).toEqual({
            ...player, points: 453, losses: 9,
            gameResultHistory: recordedGame(saved, '2026-10-30', 'loss', scoringTime.getTime()),
            games: { '2026-10-30': { wins: 2, losses: 2 } },
        });
        return transactionResult(saved);
    });

    await recordPlayerResult(firebase, playerId, 'loss', scoringTime);
});

test('does not recreate a missing member or score a waiver-only record', async () => {
    runTransaction.mockImplementationOnce(async (reference, update) => transactionResult(update(null)));
    await expect(recordPlayerResult(firebase, playerId, 'win', scoringTime)).rejects.toThrow('member record was not found');

    const waiverOnly = { name: 'Guest', roles: { WAIVER: true }, points: 50 };
    runTransaction.mockImplementationOnce(async (reference, update) => {
        expect(update(waiverOnly)).toBeUndefined();
        return transactionResult(waiverOnly, false);
    });
    await expect(recordPlayerResult(firebase, playerId, 'loss', scoringTime)).rejects.toThrow('member accounts');
});

test('rejects unsafe paths and reports a server rejection', async () => {
    await expect(recordPlayerResult(firebase, 'invalid/path', 'win', scoringTime)).rejects.toThrow('valid player ID');
    await expect(recordPlayerResult(firebase, playerId, 'tie', scoringTime)).rejects.toThrow('win or loss');
    expect(runTransaction).not.toHaveBeenCalled();

    runTransaction.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));
    await expect(recordPlayerResult(firebase, playerId, 'win', scoringTime)).rejects.toThrow('score could not be saved');
});

test('records a scan once across retries while preserving the original Pacific date', async () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(scoringTime.getTime());
    const operationId = '94f1ada5-8134-45d8-9ec4-70db1f5cbadc';
    const expired = 'ad6f9529-a400-4a99-bb34-ef7282a09815';
    const original = {
        username: 'Member',
        points: 445,
        freegames: 0,
        scoreOperations: { [expired]: { outcome: 'loss', day: '2026-10-20', at: Date.parse('2026-11-20') } },
    };
    let stored;
    runTransaction.mockImplementationOnce(async (_reference, update) => {
        stored = update(original);
        return transactionResult(stored);
    });
    try {
        await expect(recordPlayerResult(firebase, playerId, 'win', scoringTime, operationId)).resolves.toEqual({ replayed: false, day: '2026-10-30', eventId: expect.any(String) });
        expect(stored).toEqual({
            ...original,
            points: 455,
            freeGameMilestones: { 'pass-1': { passNumber: 1, at: scoringTime.getTime() } },
            gameResultHistory: recordedGame(stored, '2026-10-30', 'win', scoringTime.getTime()),
            rankMilestones: { 'rank-5': { at: scoringTime.getTime(), rankLevel: 5, rankName: 'Sergeant' } },
            wins: 1,
            freegames: 1,
            games: { '2026-10-30': { wins: 1, losses: 0 } },
            scoreOperations: { [operationId]: { outcome: 'win', day: '2026-10-30', at: Date.parse('2026-12-01'),
                requestedAt: scoringTime.getTime(), eventId: Object.keys(stored.gameResultHistory['2026-10-30'])[0] } },
        });

        expect(stored.gameResultHistory['2026-10-30']).not.toHaveProperty(operationId);
        clock.mockReturnValue(scoringTime.getTime() + 5000);
        runTransaction.mockImplementationOnce(async (_reference, update) => {
            const retried = update(stored);
            expect(retried).toBe(stored);
            return transactionResult(retried);
        });
        await expect(recordPlayerResult(firebase, playerId, 'win', scoringTime, operationId)).resolves.toEqual({ replayed: true, day: '2026-10-30', eventId: stored.scoreOperations[operationId].eventId });

        runTransaction.mockImplementationOnce(async (_reference, update) => {
            expect(update(stored)).toBeUndefined();
            return transactionResult(stored, false);
        });
        await expect(recordPlayerResult(firebase, playerId, 'loss', scoringTime, operationId)).rejects
            .toThrow('already used for a different entry');
    } finally {
        clock.mockRestore();
    }
});


test('a correction clears an invalid promotion and a later crossing records its actual operation time', async () => {
    const at = scoringTime.getTime();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(at + 5000);
    let player = { username: 'Member', points: 115, wins: 0, losses: 0, freegames: 0 };
    runTransaction.mockImplementation(async (_reference, update) => {
        player = update(player);
        return transactionResult(player);
    });
    try {
        await recordPlayerResult(firebase, playerId, 'win', new Date(at), '114131bd-6b4a-452a-89b7-27711170277a');
        expect(player.rankMilestones).toEqual({ 'rank-2': { at, rankLevel: 2, rankName: 'Private First Class' } });
        await voidPlayerResult(firebase, playerId, { day: '2026-10-30', result: 'win', expectedCount: 1,
            operationId: '214131bd-6b4a-452a-89b7-27711170277a', operationAt: at + 1000 });
        expect(player.points).toBe(115);
        expect(player.rankMilestones).toEqual({});
        await recordPlayerResult(firebase, playerId, 'win', new Date(at + 2000), '314131bd-6b4a-452a-89b7-27711170277a');
        expect(player.rankMilestones['rank-2'].at).toBe(at + 2000);
        expect(player.points).toBe(125);
        expect(player.wins).toBe(1);
    } finally { clock.mockRestore(); }
});

test('legacy numeric milestone arrays are preserved as stable Firebase map keys', () => {
    const legacy = [];
    legacy[2] = { at: 1000, rankLevel: 2, rankName: 'Private First Class' };
    legacy[3] = { at: 2000, rankLevel: 3, rankName: 'Specialist' };
    const result = scoreRankMilestones(legacy, 225, 235, 3000, rankThresholds, rankNames);
    expect(result).toEqual({ 'rank-2': legacy[2], 'rank-3': legacy[3] });
    expect(legacy[2].at).toBe(1000);
});

test('dates each new earned pass once, reverses a mistaken score, and keeps redeemed balance separate', async () => {
    const at = scoringTime.getTime();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(at + 1000);
    let player = { name: 'Member', points: 895, wins: 65, losses: 65, freegames: 0 };
    runTransaction.mockImplementation(async (_ref, update) => {
        player = update(player);
        return transactionResult(player);
    });
    try {
        const day = '2026-10-30';
        const score = '114131bd-6b4a-452a-89b7-27711170277a';
        await recordPlayerResult(firebase, playerId, 'win', new Date(at), score);
        const [eventId] = Object.keys(player.gameResultHistory[day]);
        expect(player.freeGameMilestones).toEqual({ 'pass-2': { passNumber: 2, at } });
        expect(player.freegames).toBe(1);
        player = { ...player, freegames: 0 }; // The pass was redeemed independently.
        const correction = { day, result: 'win', expectedCount: 1, operationId: '214131bd-6b4a-452a-89b7-27711170277a', operationAt: at + 500 };
        await voidPlayerResult(firebase, playerId, correction);
        await voidPlayerResult(firebase, playerId, correction);
        expect(player.freegames).toBe(0);
        expect(player.freeGameMilestones).toEqual({});
        expect(player.gameResultHistory[day]).toEqual({ [eventId]: { outcome: 'win', at, voided: true, voidedAt: at + 500 } });
        await recordPlayerResult(firebase, playerId, 'win', new Date(at + 1000), '314131bd-6b4a-452a-89b7-27711170277a');
        expect(player.freeGameMilestones).toEqual({ 'pass-2': { passNumber: 2, at: at + 1000 } });
        // The re-earned result landed exactly at midnight on the next Pacific day.
        expect(Object.values(player.gameResultHistory[day]).every(event => event.voided)).toBe(true);
        expect(Object.values(player.gameResultHistory['2026-11-1'])).toEqual([{ outcome: 'win', at: at + 1000 }]);
    } finally { clock.mockRestore(); }
});

test('reconciles an older client’s aggregate correction without dating it or reviving the excess event', () => {
    const day = '2026-10-30';
    const first = { outcome: 'win', at: 1000 };
    const second = { outcome: 'win', at: 2000 };
    const other = { outcome: 'loss', at: 2500 };
    const player = { gameResultHistory: { [day]: { first, second, other } } };
    const fields = scoreHistoryFields(player, { day, outcome: 'win', dailyCount: 1, removing: false,
        previousPoints: 459, nextPoints: 469, at: 3000, eventId: 'new' });
    expect(fields.gameResultHistory[day]).toEqual({ first, second: { ...second, voided: true }, other, new: { outcome: 'win', at: 3000 } });
    expect(player.gameResultHistory[day].second).toEqual(second);
    expect(fields.freeGameMilestones).toBeUndefined();
    expect(scoreHistoryFields({}, { day, outcome: 'loss', dailyCount: 2, removing: true, previousPoints: 456, nextPoints: 453, at: 4000 })).toEqual({});
});

test('keeps the mode and team on one Companion event and binds retries to the original round', async () => {
    const at = scoringTime.getTime();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(at + 1000);
    const id = '194f1ada-5134-45d8-9ec4-70db1f5cbadc';
    const round = { mode: 'Ring the Bell', side: 'solid' };
    const day = '2026-10-30';
    let player = { name: 'Player' };
    runTransaction.mockImplementation(async (_ref, update) => {
        const next = update(player);
        if (next) player = next;
        return transactionResult(player, !!next);
    });
    try {
        const { eventId } = await recordPlayerResult(firebase, playerId, 'loss', scoringTime, id, round);
        expect(eventId).not.toEqual(id);
        expect(player.gameResultHistory[day]).toEqual({ [eventId]: { ...round, at, outcome: 'loss' } });
        expect(player.scoreOperations[id]).toMatchObject({ ...round, requestedAt: at, eventId, outcome: 'loss', day });
        await expect(recordPlayerResult(firebase, playerId, 'loss', scoringTime, id, round))
            .resolves.toEqual({ eventId, day, replayed: true });
        for (const [date, context] of [[scoringTime, { ...round, side: 'camo' }],
            [scoringTime, { ...round, mode: '3 Flag' }], [new Date(at + 100), round]]) {
            await expect(recordPlayerResult(firebase, playerId, 'loss', date, id, context))
                .rejects.toMatchObject({ code: 'score_conflict', retryable: false });
        }
        expect(player.losses).toBe(1);
        expect(player.points).toBe(3);
        expect(Object.keys(player.gameResultHistory[day])).toEqual([eventId]);
    } finally { clock.mockRestore(); }
});

test('corrects the exact receipt and leaves a newer same-outcome event and legacy counters intact', async () => {
    const at = scoringTime.getTime();
    const day = '2026-10-30';
    const clock = jest.spyOn(Date, 'now').mockReturnValue(at + 1000);
    const ids = ['194f1ada-5134-45d8-9ec4-70db1f5cbadc', '294f1ada-5134-45d8-9ec4-70db1f5cbadc',
        '394f1ada-5134-45d8-9ec4-70db1f5cbadc'];
    let player = { name: 'Member', points: 10, wins: 1, games: { [day]: { wins: 1 } } };
    runTransaction.mockImplementation(async (_ref, update) => {
        const next = update(player);
        if (next) player = next;
        return transactionResult(player, !!next);
    });
    try {
        const first = await recordPlayerResult(firebase, playerId, 'win', scoringTime, ids[0], { mode: '3 Flag', side: 'camo' });
        const second = await recordPlayerResult(firebase, playerId, 'win', new Date(at + 10), ids[1], { mode: 'Countdown', side: 'solid' });
        const correction = { result: 'win', day, operationAt: at + 100, operationId: ids[2], targetEventId: first.eventId, expectedCount: 3 };
        get.mockResolvedValueOnce(transactionResult(player).snapshot);
        const previous = await loadPlayerScoreHistory(firebase, playerId);
        expect(previous.history[0].events.map(event => event.id)).toEqual([second.eventId, first.eventId]);
        const corrected = await voidPlayerResult(firebase, playerId, correction);
        expect(corrected.eventId).toBe(first.eventId);
        expect(corrected.history[0]).toMatchObject({ wins: 2, events: [{ id: second.eventId, mode: 'Countdown', side: 'solid' }] });
        expect(player.gameResultHistory[day][first.eventId]).toEqual({ outcome: 'win', at, mode: '3 Flag', side: 'camo', voided: true, voidedAt: at + 100 });
        expect(player.gameResultHistory[day][second.eventId].voided).toBeUndefined();
        expect((await voidPlayerResult(firebase, playerId, correction)).duplicate).toBe(true);
        await expect(voidPlayerResult(firebase, playerId, { ...correction, targetEventId: second.eventId }))
            .rejects.toMatchObject({ code: 'score_conflict' });
        await expect(voidPlayerResult(firebase, playerId, { ...correction, expectedCount: 2, operationId: '494f1ada-5134-45d8-9ec4-70db1f5cbadc' }))
            .rejects.toMatchObject({ code: 'score_changed' });
        expect(player.wins).toBe(2);
        expect(player.points).toBe(20);
    } finally { clock.mockRestore(); }
});

test('status reads the exact server marker, preserves legacy confirmations, and never submits a score', async () => {
    const at = scoringTime.getTime();
    const id = '194f1ada-5134-45d8-9ec4-70db1f5cbadc';
    const eventId = '294f1ada-5134-45d8-9ec4-70db1f5cbadc';
    const op = { id, at, outcome: 'win', side: 'solid', mode: '3 Flag' };
    const clock = jest.spyOn(Date, 'now').mockReturnValue(at + 1000);
    const api = { ...firebase, auth: { currentUser: { getIdToken: async () => 'test-user-token' } } };
    child.mockReturnValue(new URL('https://example.invalid/users/member/scoreOperations/' + id));
    const originalFetch = global.fetch;
    const marker = { at: Date.parse('2026-12-01'), day: '2026-10-30', outcome: 'win' };
    const reply = record => ({ ok: true, json: async () => record });
    global.fetch = jest.fn()
        .mockResolvedValueOnce(reply(null))
        .mockResolvedValueOnce(reply({ ...marker, eventId, side: 'solid', mode: '3 Flag', requestedAt: at }))
        .mockResolvedValueOnce(reply({ ...marker, side: 'camo', mode: '3 Flag', requestedAt: at }))
        .mockResolvedValueOnce(reply(marker))
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce(reply(null));
    try {
        await expect(checkScoreOperation(api, playerId, op)).resolves.toEqual({ confirmed: false, eventId: null });
        expect(child).toHaveBeenCalledWith('memberRef', 'scoreOperations/' + id);
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(id + '.json?auth='), expect.objectContaining({ cache: 'no-store' }));
        await expect(checkScoreOperation(api, playerId, op)).resolves.toEqual({ confirmed: true, day: marker.day, eventId });
        await expect(checkScoreOperation(api, playerId, op)).rejects.toMatchObject({ code: 'score_conflict' });
        await expect(checkScoreOperation(api, playerId, { id, at, outcome: 'win' })).resolves.toEqual({ confirmed: true, day: marker.day, eventId: null });
        await expect(checkScoreOperation(api, playerId, op)).rejects.toThrow('could not be checked');
        clock.mockReturnValue(at + 3 * 86400000);
        await expect(checkScoreOperation(api, playerId, op)).rejects.toMatchObject({ code: 'operation_expired' });
        expect(runTransaction).not.toHaveBeenCalled();
        expect(get).not.toHaveBeenCalled();
    } finally {
        global.fetch = originalFetch;
        clock.mockRestore();
    }
});

test('refuses invalid receipt metadata before starting a write', async () => {
    for (const round of [{ mode: 'A'.repeat(81), side: 'camo' }, { mode: '3 Flag', side: 'other' }, { mode: ' ', side: 'solid' }]) {
        await expect(recordPlayerResult(firebase, playerId, 'win', scoringTime, undefined, round)).rejects.toMatchObject({ retryable: false });
    }
    expect(runTransaction).not.toHaveBeenCalled();
});

test('can confirm an exact correction using the display details saved on the original pending entry', async () => {
    const at = scoringTime.getTime();
    const id = '194f1ada-5134-45d8-9ec4-70db1f5cbadc';
    const targetEventId = '294f1ada-5134-45d8-9ec4-70db1f5cbadc';
    const correction = { id, at, day: '2026-10-30', outcome: 'loss', expectedCount: 1, targetEventId,
        mode: 'Countdown', side: 'solid' };
    const api = { ...firebase, auth: { currentUser: { getIdToken: async () => 'test-user-token' } } };
    child.mockReturnValue(new URL('https://example.invalid/users/member/scoreOperations/' + id));
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({
        at: Date.parse('2026-12-01'), requestedAt: at, kind: 'void', day: correction.day,
        outcome: 'loss', expectedCount: 1, targetEventId, eventId: targetEventId,
    }) });
    try {
        await expect(checkScoreOperation(api, playerId, correction)).resolves.toEqual({ confirmed: true, day: correction.day, eventId: targetEventId });
        expect(runTransaction).not.toHaveBeenCalled();
    } finally { global.fetch = originalFetch; }
});

test('a queued Firebase write releases the desk and a late commit can be retried exactly once', async () => {
    const at = scoringTime.getTime();
    const id = '194f1ada-5134-45d8-9ec4-70db1f5cbadc';
    const context = { mode: '3 Flag', side: 'camo' };
    let player = { name: 'Member' };
    let commit;
    runTransaction.mockImplementationOnce((_ref, update) => new Promise(resolve => {
        commit = () => { player = update(player); resolve(transactionResult(player)); };
    }));
    jest.useFakeTimers();
    jest.setSystemTime(at);
    try {
        const first = recordPlayerResult(firebase, playerId, 'win', scoringTime, id, context);
        const checkFailure = expect(first).rejects.toThrow('could not be saved or confirmed');
        jest.advanceTimersByTime(12500);
        await checkFailure;
        commit();
        runTransaction.mockImplementationOnce(async (_ref, update) => {
            player = update(player);
            return transactionResult(player);
        });
        const second = await recordPlayerResult(firebase, playerId, 'win', scoringTime, id, context);
        expect(second.replayed).toBe(true);
        expect(Object.keys(player.gameResultHistory['2026-10-30'])).toEqual([second.eventId]);
        expect(player.points).toBe(10);
        expect(player.wins).toBe(1);
    } finally { jest.useRealTimers(); }
});

test('removes only a surplus legacy result without touching a recorded receipt on the same day', async () => {
    const at = scoringTime.getTime(), day = '2026-10-30';
    const eventId = '194f1ada-5134-45d8-9ec4-70db1f5cbadc';
    const id = '294f1ada-5134-45d8-9ec4-70db1f5cbadc';
    const originalEvent = { at, outcome: 'win', mode: 'Countdown', side: 'solid' };
    let player = { name: 'Member', points: 20, wins: 2, games: { [day]: { wins: 2 } },
        gameResultHistory: { [day]: { [eventId]: originalEvent } } };
    const clock = jest.spyOn(Date, 'now').mockReturnValue(at + 1000);
    runTransaction.mockImplementation(async (_ref, update) => {
        const next = update(player);
        if (next) player = next;
        return transactionResult(player, !!next);
    });
    const originalFetch = global.fetch;
    const api = { ...firebase, auth: { currentUser: { getIdToken: async () => 'test-token' } } };
    child.mockReturnValue(new URL('https://example.invalid/users/member/scoreOperations/' + id));
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => player.scoreOperations[id] }));
    try {
        const correction = { operationId: id, operationAt: at + 100, result: 'win', day, expectedCount: 2, legacyOnly: true };
        const removed = await voidPlayerResult(firebase, playerId, correction);
        expect(removed).toMatchObject({ wins: 1, points: 10, eventId: null, day });
        expect(player.gameResultHistory[day]).toEqual({ [eventId]: originalEvent });
        expect(player.scoreOperations[id]).toMatchObject({ kind: 'void', legacyOnly: true });
        const check = { id, at: at + 100, outcome: 'win', day, expectedCount: 2, legacyOnly: true };
        await expect(checkScoreOperation(api, playerId, check)).resolves.toEqual({ confirmed: true, day, eventId: null });
        await expect(checkScoreOperation(api, playerId, { ...check, legacyOnly: false }))
            .rejects.toMatchObject({ code: 'score_conflict' });
        expect((await voidPlayerResult(firebase, playerId, correction)).duplicate).toBe(true);
        await expect(voidPlayerResult(firebase, playerId, { ...correction, legacyOnly: false }))
            .rejects.toMatchObject({ code: 'score_conflict' });
        await expect(voidPlayerResult(firebase, playerId, {
            ...correction, expectedCount: 1, operationId: '394f1ada-5134-45d8-9ec4-70db1f5cbadc',
        })).rejects.toMatchObject({ code: 'score_changed' });
        expect(player.wins).toBe(1);
        expect(player.gameResultHistory[day][eventId]).toEqual(originalEvent);
    } finally {
        clock.mockRestore();
        global.fetch = originalFetch;
    }
});
