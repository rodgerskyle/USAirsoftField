import { runTransaction } from 'firebase/database';
import { WAIVER } from './roles';

const POINTS_PER_FREE_GAME = 450;
const playerIdPattern = /^[A-Za-z0-9_-]{1,128}$/;
const operationIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SCORE_RETRY_WINDOW_MS = 48 * 60 * 60 * 1000;
const SCORE_CLOCK_TOLERANCE_MS = 5 * 60 * 1000;
const MAX_SCORE_RECEIPTS = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const fieldDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: 'numeric', day: 'numeric',
});

function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function scoreValue(value) {
    const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : 0;
    return Number.isFinite(number) ? number : 0;
}

export function isCurrentScoreOperation(id, at, now = Date.now()) {
    return typeof id === 'string' && operationIdPattern.test(id) && Number.isSafeInteger(at) &&
        at >= now - SCORE_RETRY_WINDOW_MS && at <= now + SCORE_CLOCK_TOLERANCE_MS;
}

export async function recordPlayerResult(firebase, uid, outcome, date = new Date(), operationId) {
    if (typeof uid !== 'string' || !playerIdPattern.test(uid)) throw new Error('Choose a valid player ID.');
    if (outcome !== 'win' && outcome !== 'loss') throw new Error('Choose a win or loss.');

    const operationAt = date.getTime();
    const now = Date.now();
    if (operationId !== undefined && !isCurrentScoreOperation(operationId, operationAt, now)) {
        throw new Error('This result retry is no longer valid. Start a new entry.');
    }

    const { year, month, day } = Object.fromEntries(fieldDate.formatToParts(date).map(({ type, value }) => [type, value]));
    // Existing game history and monthly standings use zero-based month keys.
    const dayKey = `${year}-${Number(month) - 1}-${day}`;
    const receiptKey = operationId?.toLowerCase();
    const receiptDay = Math.floor(operationAt / DAY_MS) * DAY_MS;
    const earliestReceipt = Math.floor((now - SCORE_RETRY_WINDOW_MS) / DAY_MS) * DAY_MS;
    const counter = outcome === 'win' ? 'wins' : 'losses';
    const awardedPoints = outcome === 'win' ? 10 : 3;

    let result;
    let replayed = false;
    let operationError;
    try {
        result = await runTransaction(firebase.user(uid), (player) => {
            replayed = false;
            operationError = undefined;
            // An empty local cache can look like a missing record on the first
            // attempt. Keep it empty so Firebase can retry against server data.
            if (player === null) return null;
            if (!isRecord(player) || player.roles?.[WAIVER]) return undefined;

            let operationFields = {};
            if (receiptKey !== undefined) {
                const receipts = isRecord(player.scoreOperations) ? player.scoreOperations : {};
                const existing = receipts[receiptKey];
                if (existing) {
                    if (existing.outcome !== outcome || existing.day !== dayKey || existing.at !== receiptDay) {
                        operationError = 'This result reference was already used for a different entry. Start a new entry.';
                        return undefined;
                    }
                    replayed = true;
                    return player;
                }
                const retained = Object.entries(receipts).filter(([id, receipt]) =>
                    operationIdPattern.test(id) && Number.isSafeInteger(receipt?.at) && receipt.at >= earliestReceipt
                );
                if (retained.length >= MAX_SCORE_RECEIPTS) {
                    operationError = 'This player has reached the limit for recent score entries.';
                    return undefined;
                }
                operationFields = {
                    scoreOperations: { ...Object.fromEntries(retained), [receiptKey]: { outcome, day: dayKey, at: receiptDay } },
                };
            }

            const points = scoreValue(player.points);
            const nextPoints = points + awardedPoints;
            const earnedFreeGame = nextPoints % POINTS_PER_FREE_GAME < points % POINTS_PER_FREE_GAME;
            const games = isRecord(player.games) ? player.games : {};
            const currentDay = isRecord(games[dayKey]) ? games[dayKey] : {};

            return {
                ...player,
                ...operationFields,
                points: nextPoints,
                [counter]: scoreValue(player[counter]) + 1,
                freegames: scoreValue(player.freegames) + Number(earnedFreeGame),
                games: {
                    ...games,
                    [dayKey]: {
                        wins: 0,
                        losses: 0,
                        ...currentDay,
                        [counter]: scoreValue(currentDay[counter]) + 1,
                    },
                },
            };
        }, { applyLocally: false });
    } catch {
        throw new Error('The score could not be saved. Check your connection and admin access.');
    }

    if (!result.snapshot.exists()) throw new Error('The member record was not found.');
    if (operationError) throw new Error(operationError);
    if (!result.committed) throw new Error('Scores can only be recorded for member accounts.');
    return { replayed };
}
