const endpoint = 'https://usaw-badge-service.pink-bud-3735.chatgpt.site/api/player-display-names';
const playerIdPattern = /^[A-Za-z0-9_-]{10,128}$/;

async function requestDisplayNames({ query, signal, user, displayName } = {}) {
    const url = new URL(endpoint);
    if (query) url.search = new URLSearchParams(query).toString();
    const headers = { Accept: 'application/json' };
    const options = { credentials: 'omit', redirect: 'error', headers };
    if (user) {
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
        headers['Content-Type'] = 'application/json';
        options.method = 'POST';
        options.body = JSON.stringify({ displayName });
    }

    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 15000);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result) {
            throw new Error(result?.error || 'Display names are temporarily unavailable. Please try again.');
        }
        return result;
    } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abort);
    }
}

function copyNames(target, names) {
    for (const [id, name] of Object.entries(names || {})) {
        if (playerIdPattern.test(id) && typeof name === 'string') target[id] = name;
    }
    return target;
}

export async function getPlayerDisplayNames(playerIds, { signal } = {}) {
    const ids = [...new Set(playerIds)].filter(id => typeof id === 'string' && playerIdPattern.test(id));
    const names = Object.create(null);
    if (!ids.length) return names;
    const result = await requestDisplayNames({ query: { playerIds: ids.join(',') }, signal });
    return copyNames(names, result.names);
}

export async function getAllPlayerDisplayNames({ signal } = {}) {
    const names = Object.create(null);
    let cursor = null;
    do {
        const { names: page, nextCursor } = await requestDisplayNames({
            query: cursor ? { after: cursor } : undefined,
            signal,
        });
        copyNames(names, page);
        if (nextCursor !== null && (typeof nextCursor !== 'string' || !playerIdPattern.test(nextCursor) || (cursor && nextCursor <= cursor))) {
            throw new Error('The display-name list could not be loaded.');
        }
        cursor = nextCursor;
    } while (cursor);
    return names;
}

export async function savePlayerDisplayName(firebase, displayName, { signal } = {}) {
    const user = firebase.auth.currentUser;
    if (!user) throw new Error('Sign in to your USAW account to update your display name.');
    const result = await requestDisplayNames({ user, displayName, signal });
    if (result.displayName !== null && typeof result.displayName !== 'string') {
        throw new Error('The display-name update could not be verified. Try again.');
    }
    return result;
}
