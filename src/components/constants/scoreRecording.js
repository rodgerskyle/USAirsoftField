import { runTransaction } from 'firebase/database';
import { WAIVER } from './roles';

const POINTS_PER_FREE_GAME = 450;
const playerIdPattern = /^[A-Za-z0-9_-]{1,128}$/;
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

export async function recordPlayerResult(firebase, uid, outcome, date = new Date()) {
    if (typeof uid !== 'string' || !playerIdPattern.test(uid)) throw new Error('Choose a valid player ID.');
    if (outcome !== 'win' && outcome !== 'loss') throw new Error('Choose a win or loss.');

    const { year, month, day } = Object.fromEntries(fieldDate.formatToParts(date).map(({ type, value }) => [type, value]));
    // Existing game history and monthly standings use zero-based month keys.
    const dayKey = `${year}-${Number(month) - 1}-${day}`;
    const counter = outcome === 'win' ? 'wins' : 'losses';
    const awardedPoints = outcome === 'win' ? 10 : 3;

    let result;
    try {
        result = await runTransaction(firebase.user(uid), (player) => {
            // An empty local cache can look like a missing record on the first
            // attempt. Keep it empty so Firebase can retry against server data.
            if (player === null) return null;
            if (!isRecord(player) || player.roles?.[WAIVER]) return undefined;

            const points = scoreValue(player.points);
            const nextPoints = points + awardedPoints;
            const earnedFreeGame = nextPoints % POINTS_PER_FREE_GAME < points % POINTS_PER_FREE_GAME;
            const games = isRecord(player.games) ? player.games : {};
            const currentDay = isRecord(games[dayKey]) ? games[dayKey] : {};

            return {
                ...player,
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
    if (!result.committed) throw new Error('Scores can only be recorded for member accounts.');
}
