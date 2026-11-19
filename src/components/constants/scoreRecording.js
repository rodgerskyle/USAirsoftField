import { child, get, runTransaction } from 'firebase/database';
import { WAIVER } from './roles';
import rankThresholds from './rankincrements';
import rankNames from './ranks';
import { scoreRankMilestones } from './scoreRankMilestones';
import { activeScoreEvents, newScoreId, pointsPerFreeGame, scoreHistoryFields } from './scoreHistory';

const playerIdPattern = /^[A-Za-z0-9_-]{1,128}$/;
const operationIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SCORE_RETRY_WINDOW_MS = 48 * 60 * 60 * 1000;
const SCORE_CLOCK_TOLERANCE_MS = 5 * 60 * 1000;
const MAX_SCORE_RECEIPTS = 100;
const CONFIRM_TIMEOUT_MS = 12000;
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

function declined(message, code) {
    return Object.assign(new Error(message), { retryable: false, code });
}

async function withinConfirmationWindow(work, onTimeout) {
    let timer;
    try {
        return await Promise.race([work, new Promise((_, reject) => {
            timer = setTimeout(() => {
                if (onTimeout) onTimeout();
                reject(new Error('Score confirmation timed out.'));
            }, CONFIRM_TIMEOUT_MS);
        })]);
    } finally {
        clearTimeout(timer);
    }
}

function validatePlayer(uid) {
    if (typeof uid !== 'string' || !playerIdPattern.test(uid)) throw declined('Choose a valid player ID.');
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
        if (!wins && !losses) return [];
        const details = player.gameResultHistory?.[day];
        const events = [...activeScoreEvents(details, 'win', wins), ...activeScoreEvents(details, 'loss', losses)]
            .filter(([id]) => operationIdPattern.test(id))
            .map(([id, event]) => ({ id, outcome: event.outcome, at: event.at,
                ...(typeof event.mode === 'string' && { mode: event.mode }),
                ...(['camo', 'solid'].includes(event.side) && { side: event.side }) }))
            .sort((a, b) => b.at - a.at || b.id.localeCompare(a.id));
        return [{ day, date, wins, losses, events }];
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

function fieldDay(at) {
    const { year, month, day } = Object.fromEntries(fieldDate.formatToParts(at).map(({ type, value }) => [type, value]));
    // Official game history, monthly standings and Companion receipts all use zero-based months.
    return `${year}-${Number(month) - 1}-${day}`;
}

function scoreChange({ id, at, outcome, mode, side, day, expectedCount, targetEventId, legacyOnly }) {
    if (id !== undefined && (typeof id !== 'string' || !operationIdPattern.test(id))) throw declined('Invalid score entry reference.');
    if (!Number.isSafeInteger(at) || !Number.isFinite(new Date(at).getTime())) throw declined('Invalid score entry time.');
    if (outcome !== 'win' && outcome !== 'loss') throw declined('Choose a win or loss.');
    if (mode != null && (typeof mode !== 'string' || !mode.trim() || mode.length > 80 ||
        [...mode].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127))) {
        throw declined('Choose a valid game mode.');
    }
    if (side != null && side !== 'camo' && side !== 'solid') throw declined('Choose Camo or Solid.');
    const removing = day !== undefined || expectedCount !== undefined || targetEventId !== undefined || legacyOnly === true;
    if (legacyOnly !== undefined && (typeof legacyOnly !== 'boolean' || (legacyOnly && targetEventId))) {
        throw declined('Choose a specific receipt or an earlier result to remove.');
    }
    if (removing && (!scoreDate(day) || !Number.isSafeInteger(expectedCount) || expectedCount < 1 ||
        (targetEventId !== undefined && (typeof targetEventId !== 'string' || !operationIdPattern.test(targetEventId))))) {
        throw declined('Choose a dated win or loss to remove.');
    }
    return {
        outcome, day: removing ? day : fieldDay(at), at: Math.floor(at / DAY_MS) * DAY_MS, requestedAt: at,
        ...(!removing && mode && { mode: mode.trim() }), ...(!removing && side && { side }),
        ...(removing && { kind: 'void', expectedCount }), ...(legacyOnly && { legacyOnly: true }),
        ...(targetEventId && { targetEventId: targetEventId.toLowerCase() }),
    };
}

function assertSameEntry(stored, requested) {
    const fields = ['outcome', 'day', 'at', 'mode', 'side', 'kind', 'expectedCount', 'targetEventId', 'legacyOnly'];
    if (!isRecord(stored) || fields.some(key => stored[key] !== requested[key]) ||
        (stored.requestedAt !== undefined && stored.requestedAt !== requested.requestedAt)) {
        throw declined('This result reference was already used for a different entry. Review the original score.', 'score_conflict');
    }
}

export async function checkScoreOperation(firebase, uid, operation) {
    validatePlayer(uid);
    const expected = scoreChange(operation);
    if (!operation.id) throw declined('Invalid score entry reference.');
    const user = firebase.auth.currentUser;
    if (!user) throw new Error('Sign in again to check the official score.');
    // Firebase SDK get() can return cached data while offline. A status check must
    // distinguish a server-confirmed absence from a local or unacknowledged write.
    const url = new URL(child(firebase.user(uid), 'scoreOperations/' + operation.id.toLowerCase()).toString());
    url.pathname += '.json';
    const controller = new AbortController();
    async function readMarker() {
        url.searchParams.set('auth', await user.getIdToken());
        if (controller.signal.aborted || firebase.auth.currentUser !== user) throw new Error('The staff session changed.');
        const response = await fetch(url.toString(), { cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal });
        if (!response.ok) throw new Error('Score status unavailable.');
        return response.json();
    }
    try {
        const marker = await withinConfirmationWindow(readMarker(), () => controller.abort());
        if (firebase.auth.currentUser !== user) throw new Error('The staff session changed.');
        if (marker === null) {
            if (!isCurrentScoreOperation(operation.id, operation.at)) {
                throw declined('The confirmation window has closed. Review this player’s official score history.', 'operation_expired');
            }
            return { confirmed: false, eventId: null };
        }
        assertSameEntry(marker, expected);
        return { confirmed: true, day: marker.day, eventId: marker.eventId || null };
    } catch (error) {
        if (error.retryable === false) throw error;
        throw new Error('The official score could not be checked. Keep this entry and try again.');
    }
}

export async function recordPlayerResult(firebase, uid, outcome, date = new Date(), operationId, context = {}) {
    validatePlayer(uid);
    const at = date.getTime();
    const receipt = scoreChange({ id: operationId, at, outcome, mode: context.mode, side: context.side });
    const now = Date.now();
    if (operationId !== undefined && !isCurrentScoreOperation(operationId, at, now)) {
        throw declined('This result retry has expired. Check the official score history.', 'operation_expired');
    }
    const { replayed, eventId } = await transactScore(firebase, uid, operationId, receipt, now);
    return { replayed, eventId, day: receipt.day };
}

export async function voidPlayerResult(firebase, uid, { day, result, expectedCount, operationId, operationAt, targetEventId, legacyOnly } = {}) {
    validatePlayer(uid);
    if (!day || !expectedCount) throw declined('Choose a dated win or loss to remove.');
    const receipt = scoreChange({ id: operationId, at: operationAt, outcome: result, day, expectedCount, targetEventId, legacyOnly });
    const now = Date.now();
    if (!isCurrentScoreOperation(operationId, operationAt, now)) {
        throw declined('This correction retry has expired. Review the score history before trying again.', 'operation_expired');
    }
    const { replayed, eventId, snapshot } = await transactScore(firebase, uid, operationId, receipt, now);
    return { ...scoreHistory(uid, snapshot.val()), day, result, eventId, duplicate: replayed };
}

async function transactScore(firebase, uid, operationId, receipt, now) {
    const { outcome, day, requestedAt: operationAt, expectedCount, targetEventId, legacyOnly, mode, side } = receipt;
    const removing = receipt.kind === 'void';
    const receiptKey = operationId?.toLowerCase();
    const earliestReceipt = Math.floor((now - SCORE_RETRY_WINDOW_MS) / DAY_MS) * DAY_MS;
    const counter = outcome === 'win' ? 'wins' : 'losses';
    const delta = removing ? -1 : 1;
    const newEventId = removing ? null : newScoreId();
    let eventId = newEventId;

    let result;
    let replayed = false;
    let operationError;
    try {
        const transaction = runTransaction(firebase.user(uid), (player) => {
            replayed = false;
            eventId = newEventId;
            operationError = undefined;
            // An empty local cache can look like a missing record on the first
            // attempt. Keep it empty so Firebase can retry against server data.
            if (player === null) return null;
            if (!isRecord(player) || player.roles?.[WAIVER]) return undefined;
            if (player.accountRemovedAt) {
                operationError = declined('The member record was not found.');
                return undefined;
            }

            let retained;
            if (receiptKey !== undefined) {
                const receipts = isRecord(player.scoreOperations) ? player.scoreOperations : {};
                const existing = receipts[receiptKey];
                if (existing) {
                    try { assertSameEntry(existing, receipt); }
                    catch (error) { operationError = error; return undefined; }
                    eventId = existing.eventId || null;
                    replayed = true;
                    return player;
                }
                retained = Object.entries(receipts).filter(([id, receipt]) =>
                    operationIdPattern.test(id) && Number.isSafeInteger(receipt?.at) && receipt.at >= earliestReceipt
                );
                if (retained.length >= MAX_SCORE_RECEIPTS) {
                    operationError = declined('This player has reached the limit for recent score entries.');
                    return undefined;
                }
            }

            const points = scoreValue(player.points);
            const nextPoints = points + (outcome === 'win' ? 10 : 3) * delta;
            const games = isRecord(player.games) ? player.games : {};
            const currentDay = isRecord(games[day]) ? games[day] : {};
            const dailyCount = scoreValue(currentDay[counter]);
            const careerCount = scoreValue(player[counter]);
            if (removing) {
                const eligible = activeScoreEvents(player.gameResultHistory?.[day], outcome, dailyCount);
                if (!legacyOnly) {
                    const target = targetEventId ? eligible.find(([id]) => id === targetEventId) : eligible[eligible.length - 1];
                    eventId = target?.[0] || null;
                }
                if (dailyCount !== expectedCount || !Number.isSafeInteger(careerCount) || careerCount < 1 || nextPoints < 0 ||
                    (targetEventId && !eventId) || (legacyOnly && dailyCount <= eligible.length)) {
                    operationError = declined('The score no longer matches the official record. Reload the history before correcting it.', 'score_changed');
                    return undefined;
                }
            }
            const freeGamesChange = removing
                ? Math.floor(nextPoints / pointsPerFreeGame) - Math.floor(points / pointsPerFreeGame)
                : Number(nextPoints % pointsPerFreeGame < points % pointsPerFreeGame);
            const freeGames = scoreValue(player.freegames) + freeGamesChange;

            const rankMilestones = scoreRankMilestones(player.rankMilestones, points, nextPoints, operationAt, rankThresholds, rankNames);
            return {
                ...player,
                ...(Object.keys(rankMilestones).length || player.rankMilestones !== undefined ? { rankMilestones } : {}),
                ...scoreHistoryFields(player, { day, outcome, at: operationAt, eventId, dailyCount, removing, mode, side, previousPoints: points, nextPoints }),
                ...(retained && { scoreOperations: {
                    ...Object.fromEntries(retained), [receiptKey]: { ...receipt, ...(eventId && { eventId }) },
                } }),
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
        // An offline SDK transaction can stay queued. Release the desk while keeping
        // its original operation ID available for read-only verification and retry.
        result = await withinConfirmationWindow(transaction);
    } catch (error) {
        if (removing) throw new Error('The correction could not be confirmed. Check your connection and admin access.');
        throw new Error('The score could not be saved or confirmed. Check the saved status and your admin access.');
    }

    if (operationError) throw operationError;
    if (!result.snapshot.exists()) throw declined('The member record was not found.');
    if (!result.committed) throw declined('Scores can only be recorded for member accounts.');
    return { replayed, eventId, snapshot: result.snapshot };
}
