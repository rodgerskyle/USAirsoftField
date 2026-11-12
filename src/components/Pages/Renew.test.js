import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { onValue } from 'firebase/database';
import { FirebaseContext } from '../Firebase';
import { AuthUserContext } from '../session';
import RenewSubscription from './Renew';

jest.mock('../Firebase', () => {
    const context = jest.requireActual('../Firebase/context');
    return { FirebaseContext: context.default, withFirebase: context.withFirebase };
});
jest.mock('firebase/database', () => ({ onValue: jest.fn(), update: jest.fn() }));
jest.mock('firebase/storage', () => ({ uploadBytes: jest.fn() }));
jest.mock('@react-pdf/renderer', () => ({ pdf: jest.fn() }));
jest.mock('./SignedWaiver', () => () => null);
jest.mock('react-signature-canvas', () => {
    const React = jest.requireActual('react');
    return React.forwardRef((props, ref) => React.createElement('canvas', { ref }));
});

function renderRenewal(path = '/admin/renewal', authUser = { roles: { ADMIN: true } }) {
    const unsubscribeUsers = jest.fn();
    onValue.mockImplementation(() => unsubscribeUsers);
    const firebase = {
        users: () => 'users',
        onAuthUserListener: (next, fallback) => {
            let active = true;
            Promise.resolve().then(() => {
                if (!active) return;
                if (authUser) next(authUser);
                else fallback();
            });
            return () => { active = false; };
        },
    };

    const view = render(
        <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <FirebaseContext.Provider value={firebase}>
                <AuthUserContext.Provider value={authUser}>
                    <HelmetProvider>
                        <Routes>
                            <Route path="/admin/renewal/:id?" element={<RenewSubscription />} />
                            <Route path="/dashboard/renewal" element={<RenewSubscription />} />
                            <Route path="/login" element={<p>Sign in</p>} />
                        </Routes>
                    </HelmetProvider>
                </AuthUserContext.Provider>
            </FirebaseContext.Provider>
        </MemoryRouter>
    );

    return {
        ...view,
        unsubscribeUsers,
        loadUsers: (users) => act(() => onValue.mock.calls[0][1]({ val: () => users })),
        failLoad: () => act(() => onValue.mock.calls[0][2](new Error('Permission denied'))),
    };
}

beforeEach(() => onValue.mockReset());

test('lists legacy members safely and preserves renewal date order and formatting', () => {
    const { loadUsers } = renderRenewal();
    loadUsers({
        latest: { name: 'Latest Player', username: 'latest', renewal: '12-4-2026' },
        legacy: { name: 'Legacy Player' },
        earlier: { name: 'Earlier Player', username: 'earlier', renewal: '3-5-2026' },
        january: { name: 'January Player', renewal: '1-31-2026' },
        february: { name: 'February Player', renewal: '2-1-2026' },
        invalid: { name: 'Invalid Date', renewal: '2-31-2026' },
        nonexpiring: { name: 'Nonexpiring Player', renewal: 'N/A' },
        malformed: null,
    });

    expect(screen.getAllByText(/Renewal Date:/).map((node) => node.textContent)).toEqual([
        'Renewal Date: 12-04-2026',
        'Renewal Date: 03-05-2026',
        'Renewal Date: 02-01-2026',
        'Renewal Date: 01-31-2026',
        'Renewal Date: Unknown',
        'Renewal Date: Unknown',
        'Renewal Date: N/A',
    ]);
    fireEvent.change(screen.getByRole('textbox', { name: /search/i }), { target: { value: 'legacy' } });
    expect(screen.getByText(/Legacy Player/)).toBeInTheDocument();
    expect(screen.queryByText(/Latest Player/)).not.toBeInTheDocument();
});

test('handles a missing member link without exposing the waiver', () => {
    const { loadUsers } = renderRenewal('/admin/renewal/missing');
    expect(screen.getByRole('status')).toHaveTextContent('Loading members');
    expect(screen.queryByText('Renewal Agreement')).not.toBeInTheDocument();
    loadUsers({ found: { name: 'Existing Player', username: 'existing', renewal: 'N/A' } });

    const warning = screen.getByRole('alert');
    expect(warning).toHaveTextContent('This member could not be found');
    expect(screen.queryByText('Renewal Agreement')).not.toBeInTheDocument();
    fireEvent.click(within(warning).getByRole('button', { name: 'Back to member list' }));
    expect(screen.getByText(/Existing Player/)).toBeInTheDocument();
});

test('reports an empty directory and unsubscribes on unmount', () => {
    const { loadUsers, unsubscribeUsers, unmount } = renderRenewal();
    expect(screen.getByRole('status')).toHaveTextContent('Loading members');
    loadUsers(null);
    expect(screen.getByText('No members found.')).toBeInTheDocument();
    unmount();
    expect(unsubscribeUsers).toHaveBeenCalledTimes(1);
});

test('reports a directory read failure', () => {
    const { failLoad } = renderRenewal();
    failLoad();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the member directory');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('opens the existing signed-waiver form when waiver staff select a member', () => {
    const { loadUsers } = renderRenewal('/dashboard/renewal', { roles: { WAIVER: true } });
    loadUsers({ found: { name: 'Existing Player', username: 'existing', renewal: 'N/A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Renew' }));
    expect(screen.getByText('Renewal Agreement')).toBeInTheDocument();
    expect(screen.getByText('Existing Player')).toBeInTheDocument();
});

test.each([null, { roles: {} }])('redirects a visitor without a staff role (%p)', async (authUser) => {
    renderRenewal('/admin/renewal', authUser);
    expect(await screen.findByText('Sign in')).toBeInTheDocument();
    expect(onValue).not.toHaveBeenCalled();
});
