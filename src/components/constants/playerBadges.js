import catalog from './badgeCatalog.json';

const apiUrl = process.env.REACT_APP_USAW_BADGE_API_URL ?? 'https://usaw-badge-service.pink-bud-3735.chatgpt.site/api/player-badges';
const artPath = `${process.env.PUBLIC_URL || ''}/badges`;

export const badgeServiceConfigured = /^https:\/\/[^?#]+$/i.test(apiUrl);

export const BADGE_CATALOG = catalog.map((badge) => ({
    ...badge,
    artUrl: `${artPath}/${badge.id}.png`,
    thumbUrl: `${artPath}/thumbs/${badge.id}.png`,
}));

export const badgeById = Object.assign(Object.create(null), Object.fromEntries(
    BADGE_CATALOG.map((badge) => [badge.id, badge])
));

async function callBadgeApi({ query, firebase, body, staffToken, signal } = {}) {
    if (!badgeServiceConfigured) throw new Error('Badge services are unavailable.');

    const headers = { Accept: 'application/json' };
    if (firebase) {
        const user = firebase.auth.currentUser;
        if (!user) throw new Error('Sign in to your USAW account to continue.');
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
    }
    if (body) headers['Content-Type'] = 'application/json';
    if (staffToken) headers['X-USAW-Staff-Session'] = staffToken;
    const url = new URL(apiUrl);
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

export function getMyBadges(firebase, { signal } = {}) {
    return callBadgeApi({ query: { collection: 'mine' }, firebase, signal });
}

export function setFeaturedBadge(firebase, badgeId) {
    return callBadgeApi({ firebase, body: { action: 'feature', badgeId } });
}

export function unlockBadgeStaff(firebase, { email, password }) {
    return callBadgeApi({ firebase, body: { action: 'unlock', email, password } });
}

export function getStaffBadgeCounts(firebase, playerId, staffToken, { signal } = {}) {
    return callBadgeApi({ firebase, staffToken, query: { playerId, awardCounts: '1' }, signal });
}

export function grantPlayerBadge(firebase, { playerId, badgeId, reason, grantId }, staffToken) {
    return callBadgeApi({ firebase, staffToken, body: { action: 'award', playerId, badgeId, reason, grantId } });
}
