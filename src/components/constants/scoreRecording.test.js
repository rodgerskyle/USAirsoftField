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
