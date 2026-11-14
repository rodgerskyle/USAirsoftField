import { readScannedMemberCard, verifyScannedMemberCard } from './scoreCards';

const token = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
const playerId = 'PlayerFirebaseId123456789012';
const companion = 'https://usaw-field-companion.pink-bud-3735.chatgpt.site';
const branded = 'https://app.usairsoftfield.com';
const originalFetch = global.fetch;

function admin() {
    return { auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue('official-admin-token') } } };
}

function response(status, data) {
    return { ok: status >= 200 && status < 300, status, json: async () => data };
}

afterEach(() => {
    global.fetch = originalFetch;
});

test('recognizes current and branded card URLs while leaving manual IDs and names to the player lookup', () => {
    expect(readScannedMemberCard(`  ${companion}/index.html#verify/${token}\n`)).toBe(token);
    expect(readScannedMemberCard(`${branded}/#verify/${token.toLowerCase()}`)).toBe(token.toLowerCase());
    expect(readScannedMemberCard(token)).toBeNull();
    expect(readScannedMemberCard('A Member')).toBeNull();
    expect(readScannedMemberCard(`https://other.example/#verify/${token}`)).toBeNull();
    expect(() => readScannedMemberCard(`${branded}/#verify/invalid`)).toThrow(/valid USAW Companion card/);
    expect(() => readScannedMemberCard(`http://app.usairsoftfield.com/#verify/${token}`)).toThrow(/valid USAW Companion card/);
});

test('verifies an active card at the fixed Companion endpoint using the current Firebase token', async () => {
    const firebase = admin();
    const { signal } = new AbortController();
    global.fetch = jest.fn().mockResolvedValue(response(200, { status: 'active', playerId }));
    await expect(verifyScannedMemberCard(firebase, token, { signal })).resolves.toBe(playerId);
    expect(global.fetch).toHaveBeenCalledWith(`${companion}/api/member-card/verify`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: 'Bearer official-admin-token',
        },
        body: JSON.stringify({ token }),
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        signal,
    });
});

test.each([
    [401, {}, /admin account/],
    [404, { status: 'notFound' }, /current Companion card/],
    [200, { status: 'expired', playerId }, /membership has expired/],
    [200, { status: 'waiver-only', playerId }, /waiver-only/],
    [200, { status: 'unconfirmed', playerId }, /could not be confirmed/],
    [200, { status: 'active', playerId: 'not/a/player' }, /verification is unavailable/],
])('does not resolve rejected or malformed cards', async (status, data, message) => {
    global.fetch = jest.fn().mockResolvedValue(response(status, data));
    await expect(verifyScannedMemberCard(admin(), token)).rejects.toThrow(message);
});

test('discards an otherwise valid verification after the website switches accounts', async () => {
    const firebase = admin();
    global.fetch = jest.fn().mockImplementation(async () => {
        firebase.auth.currentUser = null;
        return response(200, { status: 'active', playerId });
    });
    await expect(verifyScannedMemberCard(firebase, token)).rejects.toMatchObject({ name: 'AbortError' });
});
