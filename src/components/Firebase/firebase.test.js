import { get, onValue } from 'firebase/database';
import Firebase from './firebase';

jest.mock('firebase/app', () => ({ initializeApp: jest.fn() }));
jest.mock('firebase/auth', () => ({ getAuth: jest.fn() }));
jest.mock('firebase/database', () => ({ get: jest.fn(), getDatabase: jest.fn(), onValue: jest.fn() }));
jest.mock('firebase/functions', () => ({ getFunctions: jest.fn() }));
jest.mock('firebase/storage', () => ({ getStorage: jest.fn() }));

const admin = { uid: 'staff-account', email: 'staff@example.com' };
const member = { uid: 'player-account', email: 'player@example.com' };
const snapshot = value => ({ val: () => value });

function mockAuth() {
    const firebase = new Firebase();
    const stopAuth = jest.fn();
    let notify;
    firebase.auth = {
        currentUser: null,
        onAuthStateChanged: callback => {
            notify = callback;
            return stopAuth;
        },
    };
    firebase.user = uid => uid;
    return {
        firebase,
        change: user => {
            firebase.auth.currentUser = user;
            notify(user);
        },
        stopAuth,
    };
}

beforeEach(() => jest.resetAllMocks());

test('a completed lookup cannot restore the previous account and uses the Firebase identity', async () => {
    const { firebase, change } = mockAuth();
    const next = jest.fn();
    const fallback = jest.fn();
    let resolveOldAccount;
    get.mockReturnValueOnce(new Promise(resolve => { resolveOldAccount = resolve; }));
    get.mockResolvedValueOnce(snapshot({ uid: admin.uid, email: admin.email, name: 'Player' }));
    firebase.onAuthUserListener(next, fallback);

    change(admin);
    change(null);
    change(member);
    await Promise.resolve();
    resolveOldAccount(snapshot({ roles: { ADMIN: 'ADMIN' } }));
    await Promise.resolve();

    expect(fallback).toHaveBeenCalledTimes(1);
    expect(next.mock.calls).toEqual([[{ ...member, name: 'Player', roles: {} }]]);
});

test.each([null, [], 'invalid'])('fails closed for an unavailable account record (%p)', async value => {
    const { firebase, change } = mockAuth();
    const next = jest.fn();
    const fallback = jest.fn();
    get.mockResolvedValueOnce(snapshot(value));
    firebase.onAuthUserListener(next, fallback);
    change(member);
    await Promise.resolve();

    expect(fallback).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
});

test('a denied lookup clears the account and an unsubscribed lookup cannot emit it', async () => {
    const { firebase, change } = mockAuth();
    const next = jest.fn();
    const fallback = jest.fn();
    get.mockRejectedValueOnce(new Error('permission denied'));
    const stop = firebase.onAuthUserListener(next, fallback);
    change(member);
    await Promise.resolve();

    get.mockResolvedValueOnce(snapshot({ roles: { ADMIN: 'ADMIN' } }));
    change(admin);
    stop();
    await Promise.resolve();

    expect(fallback).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
});

test('profile watchers receive role updates and ignore prior-account data and late errors', () => {
    const { firebase, change, stopAuth } = mockAuth();
    const staffStop = jest.fn();
    const memberStop = jest.fn();
    const next = jest.fn();
    const fallback = jest.fn();
    const onPending = jest.fn();
    onValue.mockReturnValueOnce(staffStop).mockReturnValueOnce(memberStop);
    const unsubscribe = firebase.onAuthUserListener(next, fallback, { watchProfile: true, onPending });

    change(admin);
    const [, staffUpdate, staffError] = onValue.mock.calls[0];
    staffUpdate(snapshot({ roles: { ADMIN: 'ADMIN' } }));
    const refreshedStaff = { ...admin, email: 'updated-staff@example.com' };
    firebase.auth.currentUser = refreshedStaff;
    staffUpdate(snapshot({ roles: [] }));
    change(member);
    staffUpdate(snapshot({ roles: { ADMIN: 'ADMIN' } }));
    staffError(new Error('permission denied'));
    const [, memberUpdate, memberError] = onValue.mock.calls[1];
    memberError(new Error('permission denied'));
    unsubscribe();
    memberUpdate(snapshot({ roles: { ADMIN: 'ADMIN' } }));

    expect(next.mock.calls).toEqual([[{ ...admin, roles: { ADMIN: 'ADMIN' } }], [{ ...refreshedStaff, roles: {} }]]);
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(onPending).toHaveBeenCalledTimes(2);
    expect(staffStop).toHaveBeenCalledTimes(1);
    expect(memberStop).toHaveBeenCalledTimes(1);
    expect(stopAuth).toHaveBeenCalledTimes(1);
});
