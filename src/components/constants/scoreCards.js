const companionOrigin = 'https://usaw-field-companion.pink-bud-3735.chatgpt.site';
const cardOrigins = new Set([companionOrigin, 'https://app.usairsoftfield.com']);
const cardHostnames = new Set([...cardOrigins].map(origin => new URL(origin).hostname));
const cardToken = /^[A-Za-z0-9_-]{32}$/;
const playerId = /^[A-Za-z0-9_-]{10,128}$/;
const invalidCard = 'Scan a valid USAW Companion card, or enter the player’s name or ID.';
const verificationUnavailable = 'Card verification is unavailable. Try again or enter the player’s name or ID.';

export function readScannedMemberCard(input) {
    const value = typeof input === 'string' ? input.trim() : '';
    let url;
    try {
        url = new URL(value);
    } catch {
        const hostname = value.match(/^https?:\/\/([^/:?#\s]+)/i)?.[1]?.toLowerCase();
        if (cardHostnames.has(hostname)) throw new Error(invalidCard);
        return null;
    }
    if (!cardHostnames.has(url.hostname)) return null;

    const token = url.hash.match(/^#verify\/([A-Za-z0-9_-]{32})$/)?.[1];
    if (!cardOrigins.has(url.origin) || url.username || url.password || url.search ||
        (url.pathname !== '/' && url.pathname !== '/index.html') || !token) {
        throw new Error(invalidCard);
    }
    return token;
}

export async function verifyScannedMemberCard(firebase, token, { signal } = {}) {
    if (typeof token !== 'string' || !cardToken.test(token)) throw new Error(invalidCard);
    const user = firebase.auth.currentUser;
    if (!user) throw new Error('Sign in to your USAW admin account to verify a card.');

    function ensureSameSession() {
        if (signal?.aborted || firebase.auth.currentUser !== user) {
            throw new DOMException('The admin session changed.', 'AbortError');
        }
    }

    ensureSameSession();
    let response;
    try {
        const idToken = await user.getIdToken();
        ensureSameSession();
        response = await fetch(`${companionOrigin}/api/member-card/verify`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ token }),
            credentials: 'omit',
            cache: 'no-store',
            redirect: 'error',
            signal,
        });
    } catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new Error(verificationUnavailable);
    }
    const data = await response.json().catch(() => null);
    ensureSameSession();

    if (response.status === 401 || response.status === 403) {
        throw new Error('Sign in again with a USAW admin account to verify this card.');
    }
    if (data?.status === 'notFound') {
        throw new Error('This card could not be found. Ask the player to open their current Companion card.');
    }
    if (response.ok && data?.status === 'expired') {
        throw new Error('This player’s membership has expired. Check their renewal before recording a result.');
    }
    if (response.ok && data?.status === 'waiver-only') {
        throw new Error('This card belongs to a waiver-only account. Select a USAW member.');
    }
    if (response.ok && data?.status === 'unconfirmed') {
        throw new Error('The player’s membership could not be confirmed. Check their membership record first.');
    }
    if (!response.ok || data?.status !== 'active' || typeof data.playerId !== 'string' || !playerId.test(data.playerId)) {
        throw new Error(verificationUnavailable);
    }
    return data.playerId;
}
