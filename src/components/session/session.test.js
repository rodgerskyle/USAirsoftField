import React, { useContext } from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FirebaseContext } from '../Firebase';
import { AuthUserContext, withAuthentication, withAuthorization } from './index';

jest.mock('../Firebase', () => {
    const context = jest.requireActual('../Firebase/context');
    return { FirebaseContext: context.default, withFirebase: context.withFirebase };
});

const staff = { uid: 'staff-account', email: 'staff@example.com', roles: { ADMIN: 'ADMIN' } };
const regular = { uid: 'player-account', roles: {} };

const StaffPage = withAuthorization(user => Boolean(user?.roles?.ADMIN || user?.roles?.WAIVER))(
    () => <h1>Staff controls</h1>,
);
const Session = withAuthentication(function SessionView() {
    const user = useContext(AuthUserContext);
    return <p>{user ? `Signed in as ${user.uid}` : 'Signed out'}</p>;
});

function mockSession() {
    const listeners = [];
    return {
        listeners,
        firebase: {
            onAuthUserListener: (next, fallback, options) => {
                listeners.push({ next, fallback, ...options });
                return jest.fn();
            },
        },
    };
}

function renderStaff(contextUser) {
    const { firebase, listeners } = mockSession();
    const renderPage = user => (
        <MemoryRouter initialEntries={['/staff']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <FirebaseContext.Provider value={firebase}>
                <AuthUserContext.Provider value={user}>
                    <Routes>
                        <Route path="/staff" element={<StaffPage />} />
                        <Route path="/login" element={<h1>Sign in</h1>} />
                    </Routes>
                </AuthUserContext.Provider>
            </FirebaseContext.Provider>
        </MemoryRouter>
    );
    const { rerender } = render(renderPage(contextUser));
    return { verification: listeners[0], updateContext: user => rerender(renderPage(user)) };
}

beforeEach(() => localStorage.clear());

test.each([JSON.stringify(staff), '{corrupt'])('clears the legacy account cache before accepting a Firebase profile', stored => {
    localStorage.setItem('authUser', stored);
    const { firebase, listeners } = mockSession();
    render(<FirebaseContext.Provider value={firebase}><Session /></FirebaseContext.Provider>);

    expect(screen.getByText('Signed out')).toBeInTheDocument();
    expect(localStorage.getItem('authUser')).toBeNull();
    expect(listeners[0].watchProfile).toBe(true);
    act(() => listeners[0].next(staff));
    expect(screen.getByText('Signed in as staff-account')).toBeInTheDocument();
    expect(localStorage.getItem('authUser')).toBeNull();
    act(() => listeners[0].onPending());
    expect(screen.getByText('Signed out')).toBeInTheDocument();
});

test('a stale staff context cannot render controls while waiting for verification', () => {
    const { verification } = renderStaff(staff);
    expect(verification.watchProfile).toBe(true);
    expect(screen.queryByRole('heading', { name: 'Staff controls' })).not.toBeInTheDocument();
    act(() => verification.next(regular));
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
});

test('verified staff controls close when privileges are removed or an account changes', () => {
    const { verification, updateContext } = renderStaff(staff);
    act(() => verification.next(staff));
    expect(screen.getByRole('heading', { name: 'Staff controls' })).toBeInTheDocument();
    act(() => verification.onPending());
    expect(screen.queryByRole('heading', { name: 'Staff controls' })).not.toBeInTheDocument();

    act(() => verification.next(staff));
    updateContext({ ...staff, uid: regular.uid });
    expect(screen.queryByRole('heading', { name: 'Staff controls' })).not.toBeInTheDocument();

    updateContext(staff);
    act(() => verification.next({ ...staff, roles: {} }));
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
});
