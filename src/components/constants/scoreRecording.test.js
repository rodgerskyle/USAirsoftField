import { runTransaction } from 'firebase/database';
import { recordPlayerResult } from './scoreRecording';

jest.mock('firebase/database', () => ({ runTransaction: jest.fn() }));

const playerId = 'test-player-42';
const firebase = { user: jest.fn(() => 'memberRef') };
const scoringTime = new Date('2026-12-01T07:59:59Z');

function transactionResult(value, committed = true) {
    return { committed, snapshot: { exists: () => value != null } };
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
        await expect(recordPlayerResult(firebase, playerId, 'win', scoringTime, operationId)).resolves.toEqual({ replayed: false });
        expect(stored).toEqual({
            ...original,
            points: 455,
            wins: 1,
            freegames: 1,
            games: { '2026-10-30': { wins: 1, losses: 0 } },
            scoreOperations: { [operationId]: { outcome: 'win', day: '2026-10-30', at: Date.parse('2026-12-01') } },
        });

        clock.mockReturnValue(scoringTime.getTime() + 5000);
        runTransaction.mockImplementationOnce(async (_reference, update) => {
            const retried = update(stored);
            expect(retried).toBe(stored);
            return transactionResult(retried);
        });
        await expect(recordPlayerResult(firebase, playerId, 'win', scoringTime, operationId)).resolves.toEqual({ replayed: true });

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
