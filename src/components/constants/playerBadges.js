import catalog from './badgeCatalog.json';
import { patchDifficulty } from './patchDifficulty';
import { matchesSignedInEmail, verifySignedInAdminIdentity } from './officialAdminAccount';

const apiUrl = process.env.REACT_APP_USAW_BADGE_API_URL ?? 'https://usaw-badge-service.pink-bud-3735.chatgpt.site/api/player-badges';
const patchLeaderboardUrl = 'https://app.usairsoftfield.com/api/patch-leaderboard';
const scoreBadgesUrl = 'https://app.usairsoftfield.com/api/staff-score-badges';
const battleBadgesUrl = 'https://app.usairsoftfield.com/api/staff-battle-badges';
const artPath = `${process.env.PUBLIC_URL || ''}/badges`;

export const badgeServiceConfigured = /^https:\/\/[^?#]+$/i.test(apiUrl);

function withBadgeArt(badge) {
    const difficulty = patchDifficulty(badge.id);
    return {
        ...badge,
        difficultyFactor: difficulty.factor,
        difficultyName: difficulty.name,
        artUrl: `${artPath}/${badge.id}.png`,
        thumbUrl: `${artPath}/thumbs/${badge.id}.png`,
    };
}

export const BADGE_CATALOG = catalog.map(withBadgeArt);

// Historical metadata is kept separate so these awards cannot re-enter staff or player pickers.
export const RETIRED_BADGES = [
    { id: 'first-game', name: 'First Game', description: 'A welcome to the field after a first USAW game day.' },
    { id: 'team-death-match', name: 'Team Death Match', description: 'Recognized by staff for making a decisive play or showing standout teamwork in Team Death Match.' },
    { id: 'bb-confetti', name: 'BB Confetti', description: 'Finish a round and discover loose BBs collected in your boot or pouch.' },
    { id: 'tactical-click', name: 'Tactical Click', description: 'Start a live round with an empty magazine, hear the click, then reload and get back in the game.' },
].map(badge => withBadgeArt({ ...badge, retired: true }));

const retiredById = new Map(RETIRED_BADGES.map(badge => [badge.id, badge]));

export const badgeById = Object.assign(Object.create(null), Object.fromEntries(
    BADGE_CATALOG.map((badge) => [badge.id, badge])
));

export function historicalBadge(id) {
    return badgeById[id] || retiredById.get(id);
}

async function callBadgeApi({ query, firebase, body, staffToken, signal, endpoint = apiUrl } = {}) {
    if (endpoint === apiUrl && !badgeServiceConfigured) throw new Error('Badge services are unavailable.');

    const headers = { Accept: 'application/json' };
    const user = firebase?.auth.currentUser;
    if (firebase) {
        if (!user) throw new Error('Sign in to your USAW account to continue.');
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
        if (firebase.auth.currentUser !== user) throw new Error('Your signed-in account changed. Reopen the staff tool.');
    }
    if (body) headers['Content-Type'] = 'application/json';
    if (staffToken) headers['X-USAW-Staff-Session'] = staffToken;
    const url = new URL(endpoint);
    if (query) url.search = new URLSearchParams(query).toString();

    let response;
    try {
        response = await fetch(url, {
            method: body ? 'POST' : 'GET',
            credentials: 'omit',
            redirect: 'error',
            headers,
            ...(body ? { body: JSON.stringify(body) } : {}),
            signal,
        });
    } catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new Error('Badge services are temporarily unavailable. Please try again.');
    }

    const result = await response.json().catch(() => null);
    if (user && firebase.auth.currentUser !== user) throw new Error('Your signed-in account changed. Reopen the staff tool.');
    if (!response.ok || !result) {
        const error = new Error(result?.error || 'Badge services are temporarily unavailable. Please try again.');
        error.status = response.status;
        error.code = result?.code;
        error.membershipStatus = result?.membershipStatus;
        throw error;
    }
    return result;
}

export async function getFeaturedBadges(playerIds, { signal } = {}) {
    return (await getFeaturedBadgeDetails(playerIds, { signal })).featured;
}

export async function getFeaturedBadgeDetails(playerIds, { signal } = {}) {
    const ids = [...new Set(playerIds)].filter((id) => typeof id === 'string' && /^[A-Za-z0-9_-]{10,128}$/.test(id));
    if (!ids.length || !badgeServiceConfigured) return { featured: {}, featuredCounts: {} };
    const result = await callBadgeApi({ query: { playerIds: ids.join(',') }, signal });
    const found = ids.filter((id) => badgeById[result.featured?.[id]]);
    return {
        featured: Object.fromEntries(found.map((id) => [id, result.featured[id]])),
        featuredCounts: Object.fromEntries(found.map((id) => {
            const count = result.featuredCounts?.[id];
            return [id, Number.isSafeInteger(count) && count > 0 ? count : 1];
        })),
    };
}

export function getBadgeStandings(badgeId, { page = 1, signal } = {}) {
    return callBadgeApi({ query: { badgeId, page }, signal });
}

export async function getPatchLeaderboard({ page = 1, signal } = {}) {
    const url = new URL(patchLeaderboardUrl);
    url.searchParams.set('page', page);
    const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'omit',
        redirect: 'error',
        signal,
    });
    if (!response.ok) throw new Error('Patch leaderboard is unavailable.');
    const result = await response.json();
    if (result?.page !== page || typeof result.hasMore !== 'boolean' || !Array.isArray(result.standings)
        || !result.standings.every(row => row && typeof row.playerId === 'string'
            && /^[A-Za-z0-9_-]{10,128}$/.test(row.playerId)
            && Number.isSafeInteger(row.rank) && row.rank > 0
            && Number.isSafeInteger(row.totalPatches) && row.totalPatches > 0)) {
        throw new Error('Patch leaderboard is unavailable.');
    }
    return result;
}

export function getMyBadges(firebase, { signal } = {}) {
    return callBadgeApi({ query: { collection: 'mine' }, firebase, signal });
}

export function setFeaturedBadge(firebase, badgeId) {
    if (badgeId !== null && !badgeById[badgeId]) {
        return Promise.reject(new Error('Choose an earned patch from the current collection.'));
    }
    return callBadgeApi({ firebase, body: { action: 'feature', badgeId } });
}

export async function unlockBadgeStaff(firebase, { email, password }) {
    if (matchesSignedInEmail(firebase, email)) {
        await verifySignedInAdminIdentity(firebase, firebase.auth.currentUser, password);
        return unlockBadgeAdminAccount(firebase);
    }
    return callBadgeApi({ firebase, body: { action: 'unlock', email, password } });
}

export function unlockBadgeAdminAccount(firebase) {
    return callBadgeApi({ endpoint: 'https://app.usairsoftfield.com/api/staff-badge-session', firebase, body: { action: 'unlock-account' } });
}

export function getStaffBadgeCounts(firebase, playerId, staffToken, { signal } = {}) {
    return callBadgeApi({ firebase, staffToken, query: { playerId, awardCounts: '1' }, signal });
}

export function grantPlayerBadge(firebase, { playerId, badgeId, reason, grantId }, staffToken) {
    return callBadgeApi({ firebase, staffToken, body: { action: 'award', playerId, badgeId, reason, grantId } });
}

export async function getRoundPatchOptions(mode, signal) {
    const data = await callBadgeApi({ endpoint: scoreBadgesUrl, query: { mode }, signal });
    if (!Array.isArray(data.badgeIds)) throw new Error('The patches for this round could not be loaded.');
    return [...new Set(data.badgeIds)].map(id => badgeById[id]).filter(Boolean);
}

export async function awardRoundPatch(firebase, body, staffToken, signal) {
    const { award } = await callBadgeApi({ endpoint: scoreBadgesUrl, firebase, body, staffToken, signal });
    if (award?.badgeId !== body.badgeId || !Number.isSafeInteger(award.earnedCount) || award.earnedCount < 1) {
        throw new Error('The patch award could not be confirmed. Retry this patch.');
    }
    return award;
}

export function getStaffBadgeGrantHistory(firebase, { playerId, badgeId, before }, staffToken, { signal } = {}) {
    return callBadgeApi({
        firebase, staffToken, signal, query: { playerId, badgeId, grantHistory: '1', ...(before && { before }) },
    });
}

export function revokePlayerBadgeGrant(firebase, { playerId, badgeId, grantId }, staffToken) {
    return callBadgeApi({ firebase, staffToken, body: { action: 'revoke-one', playerId, badgeId, grantId } });
}

export async function staffBattleBadgeDay(firebase, staffToken, { body, signal } = {}) {
    const day = await callBadgeApi({ endpoint: battleBadgesUrl, firebase, staffToken, body, signal });
    const validAward = row => typeof row?.id === 'string' && typeof row.playerId === 'string' &&
        typeof row.playerName === 'string' && ['camo', 'solid'].includes(row.side);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Array.isArray(day.games) || !Number.isSafeInteger(day.nextGameNumber) ||
        !day.games.every(game => typeof game?.id === 'string' && typeof game.title === 'string' && Number.isFinite(Date.parse(game.startsAt))) ||
        !Array.isArray(day.awards) || !day.awards.every(validAward) ||
        (day.overrides !== undefined && (!Array.isArray(day.overrides) || !day.overrides.every(row =>
            validAward(row) && Number.isSafeInteger(row.overrideQuantity) && row.overrideQuantity > 0)))) {
        throw new Error('The field’s MVP record could not be confirmed. Check the field day again.');
    }
    return day;
}

export function dailyBattleBadgeNotifications(firebase, { signal, readId } = {}) {
    return callBadgeApi({ endpoint: 'https://app.usairsoftfield.com/api/battle-badge-notifications',
        firebase, signal, ...(readId && { body: { action: 'read', id: readId } }) });
}
