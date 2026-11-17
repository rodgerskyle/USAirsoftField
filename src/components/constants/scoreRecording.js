import { get, runTransaction } from 'firebase/database';
import { WAIVER } from './roles';
import rankThresholds from './rankincrements';
import rankNames from './ranks';
import { scoreRankMilestones } from './scoreRankMilestones';

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

function validatePlayer(uid) {
    if (typeof uid !== 'string' || !playerIdPattern.test(uid)) throw new Error('Choose a valid player ID.');
}

function scoreDate(key) {
    if (typeof key !== 'string') return null;
    const parts = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(key);
    if (!parts) return null;
    const [year, month, day] = parts.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return null;
    return date.toISOString().slice(0, 10);
}

function scoreHistory(uid, player) {
    const games = isRecord(player.games) ? player.games : {};
    const count = value => {
        const number = scoreValue(value);
        return Number.isSafeInteger(number) && number > 0 ? number : 0;
    };
    const history = Object.entries(games).flatMap(([day, game]) => {
        const date = scoreDate(day);
        if (!date) return [];
        const wins = count(game?.wins);
        const losses = count(game?.losses);
        return wins || losses ? [{ day, date, wins, losses }] : [];
    }).sort((a, b) => b.date.localeCompare(a.date));
    return {
        playerId: uid, history,
        wins: scoreValue(player.wins), losses: scoreValue(player.losses), points: scoreValue(player.points),
    };
}

export async function loadPlayerScoreHistory(firebase, uid) {
    validatePlayer(uid);
    const snapshot = await get(firebase.user(uid));
    const player = snapshot.val();
    if (!player || player.accountRemovedAt) throw new Error('The member record was not found.');
    if (!isRecord(player) || player.roles?.[WAIVER]) throw new Error('Score history is available for member accounts.');
    return scoreHistory(uid, player);
}

export async function recordPlayerResult(firebase, uid, outcome, date = new Date(), operationId) {
    validatePlayer(uid);
    if (outcome !== 'win' && outcome !== 'loss') throw new Error('Choose a win or loss.');

    const operationAt = date.getTime();
    const now = Date.now();
    if (operationId !== undefined && !isCurrentScoreOperation(operationId, operationAt, now)) {
        throw new Error('This result retry is no longer valid. Start a new entry.');
    }

    const { year, month, day } = Object.fromEntries(fieldDate.formatToParts(date).map(({ type, value }) => [type, value]));
    // Existing game history and monthly standings use zero-based month keys.
    const dayKey = `${year}-${Number(month) - 1}-${day}`;
    const { replayed } = await transactScore(firebase, uid, { outcome, day: dayKey, operationAt, operationId }, now);
    return { replayed };
}

export async function voidPlayerResult(firebase, uid, { day, result: outcome, expectedCount, operationId, operationAt } = {}) {
    validatePlayer(uid);
    if (!scoreDate(day) || (outcome !== 'win' && outcome !== 'loss') || !Number.isSafeInteger(expectedCount) || expectedCount < 1) {
        throw new Error('Choose a dated win or loss to remove.');
    }
    const now = Date.now();
    if (!isCurrentScoreOperation(operationId, operationAt, now)) {
        throw new Error('This correction retry has expired. Review the score history before trying again.');
    }
    const { replayed, snapshot } = await transactScore(firebase, uid, { outcome, day, operationAt, operationId, expectedCount }, now);
    return { ...scoreHistory(uid, snapshot.val()), day, result: outcome, duplicate: replayed };
}

async function transactScore(firebase, uid, change, now) {
    const { outcome, day, operationAt, operationId, expectedCount } = change;
    const removing = expectedCount !== undefined;
    const receiptKey = operationId?.toLowerCase();
    const receipt = {
        outcome, day, at: Math.floor(operationAt / DAY_MS) * DAY_MS,
        ...(removing && { kind: 'void', expectedCount }),
    };
    const earliestReceipt = Math.floor((now - SCORE_RETRY_WINDOW_MS) / DAY_MS) * DAY_MS;
    const counter = outcome === 'win' ? 'wins' : 'losses';
    const delta = removing ? -1 : 1;

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
            if (player.accountRemovedAt) {
                operationError = new Error('The member record was not found.');
                return undefined;
            }

            let operationFields = {};
            if (receiptKey !== undefined) {
                const receipts = isRecord(player.scoreOperations) ? player.scoreOperations : {};
                const existing = receipts[receiptKey];
                if (existing) {
                    if (existing.outcome !== outcome || existing.day !== day || existing.at !== receipt.at ||
                        existing.kind !== receipt.kind || existing.expectedCount !== expectedCount) {
                        operationError = new Error('This result reference was already used for a different entry. Start a new entry.');
                        return undefined;
                    }
                    replayed = true;
                    return player;
                }
                const retained = Object.entries(receipts).filter(([id, receipt]) =>
                    operationIdPattern.test(id) && Number.isSafeInteger(receipt?.at) && receipt.at >= earliestReceipt
                );
                if (retained.length >= MAX_SCORE_RECEIPTS) {
                    operationError = new Error('This player has reached the limit for recent score entries.');
                    return undefined;
                }
                operationFields = {
                    scoreOperations: { ...Object.fromEntries(retained), [receiptKey]: receipt },
                };
            }

            const points = scoreValue(player.points);
            const nextPoints = points + (outcome === 'win' ? 10 : 3) * delta;
            const games = isRecord(player.games) ? player.games : {};
            const currentDay = isRecord(games[day]) ? games[day] : {};
            const dailyCount = scoreValue(currentDay[counter]);
            const careerCount = scoreValue(player[counter]);
            if (removing && (dailyCount !== expectedCount || !Number.isSafeInteger(careerCount) || careerCount < 1 || nextPoints < 0)) {
                operationError = Object.assign(new Error('The score no longer matches the official record. Reload the history before correcting it.'), { code: 'score_changed' });
                return undefined;
            }
            const freeGamesChange = removing
                ? Math.floor(nextPoints / POINTS_PER_FREE_GAME) - Math.floor(points / POINTS_PER_FREE_GAME)
                : Number(nextPoints % POINTS_PER_FREE_GAME < points % POINTS_PER_FREE_GAME);
            const freeGames = scoreValue(player.freegames) + freeGamesChange;

            const rankMilestones = scoreRankMilestones(player.rankMilestones, points, nextPoints, operationAt, rankThresholds, rankNames);
            return {
                ...player,
                ...(Object.keys(rankMilestones).length || player.rankMilestones !== undefined ? { rankMilestones } : {}),
                ...operationFields,
                points: nextPoints,
                [counter]: careerCount + delta,
                freegames: removing ? Math.max(0, freeGames) : freeGames,
                games: {
                    ...games,
                    [day]: {
                        wins: 0,
                        losses: 0,
                        ...currentDay,
                        [counter]: dailyCount + delta,
                    },
                },
            };
        }, { applyLocally: false });
    } catch (error) {
        if (removing) throw Object.assign(new Error('The correction could not be confirmed. Check your connection and admin access.'), {
            retryable: error?.code !== 'PERMISSION_DENIED' && error?.code !== 'permission-denied',
        });
        throw new Error('The score could not be saved. Check your connection and admin access.');
    }

    if (!result.snapshot.exists()) throw new Error('The member record was not found.');
    if (operationError) throw operationError;
    if (!result.committed) throw new Error('Scores can only be recorded for member accounts.');
    return { replayed, snapshot: result.snapshot };
}
