import { unlockBadgeAdminAccount, unlockBadgeStaff } from './playerBadges';
import { officialAccountRoles } from './roles';

const originalFetch = global.fetch;
const endpoint = 'https://app.usairsoftfield.com/api/staff-badge-session';
const receipt = { staffToken: 'test-staff-session', expiresAt: '2030-01-01T00:00:00Z' };
const response = (data, status = 200) => ({ ok: status === 200, status, json: async () => data });
const account = uid => ({ uid, email: uid + '@example.com', getIdToken: jest.fn().mockResolvedValue('token-' + uid) });
beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; });

test.each([true, 1, 'ADMIN', 'true', '1'])('accepts the official admin role representation %p', value => {
    expect(officialAccountRoles({ ADMIN: value })).toEqual({ ADMIN: true });
});

test.each([false, null, 'false', '0', 'WAIVER'])('preserves waiver access without admin rights for %p', value => {
    expect(officialAccountRoles({ ADMIN: value, WAIVER: 'WAIVER' })).toEqual({ WAIVER: 'WAIVER' });
});

test.each(['admin-a', 'admin-b'])('uses Firebase for %s’s own password and sends only their identity token to the badge desk', async uid => {
    const user = account(uid);
    const firebase = { auth: { currentUser: user }, doReauthenticate: jest.fn().mockResolvedValue({}) };
    fetch.mockResolvedValue(response(receipt));
    await expect(unlockBadgeStaff(firebase, { email: user.email.toUpperCase(), password: 'test only' })).resolves.toEqual(receipt);
    expect(firebase.doReauthenticate).toHaveBeenCalledWith(user.email, 'test only');
    expect(user.getIdToken).toHaveBeenCalledWith(true);
    const [url, options] = fetch.mock.calls[0];
    expect(url.href).toBe(endpoint);
    expect(options.headers.Authorization).toBe('Bearer token-' + uid);
    expect(options.credentials).toBe('omit');
    expect(JSON.parse(options.body)).toEqual({ action: 'unlock-account' });
});

test('respects server denial of a non-admin and never tries shared credentials on role denial', async () => {
    const user = account('member');
    fetch.mockResolvedValue(response({ error: 'Admin role required', code: 'staff_role_required' }, 403));
    await expect(unlockBadgeAdminAccount({ auth: { currentUser: user } })).rejects.toMatchObject({ status: 403, code: 'staff_role_required' });
    expect(fetch).toHaveBeenCalledTimes(1);
});

test('rejects an identity change during password verification before requesting a badge token', async () => {
    const user = account('admin-a');
    const firebase = { auth: { currentUser: user }, doReauthenticate: async () => { firebase.auth.currentUser = account('member'); } };
    await expect(unlockBadgeStaff(firebase, { email: user.email, password: 'fixture' })).rejects.toThrow('signed-in account changed');
    expect(fetch).not.toHaveBeenCalled();
});
