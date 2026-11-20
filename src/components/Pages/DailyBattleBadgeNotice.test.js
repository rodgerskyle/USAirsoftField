import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import FirebaseContext from '../Firebase/context';
import AuthUserContext from '../session/context';
import DailyBattleBadgeNotice from './DailyBattleBadgeNotice';

// The app's real context providers and badge request adapter are used here.
// Only Firebase's signed-in identity and the private notification service are fixtures.
const player = { uid: 'fixture-mvp', getIdToken: async () => 'mvp-token' };
const teammate = { uid: 'fixture-teammate', getIdToken: async () => 'teammate-token' };
const notice = { id: 'award-fixture', date: '2026-11-20', totalAwards: 9 };
const endpoint = 'https://app.usairsoftfield.com/api/battle-badge-notifications';
const ok = data => ({ ok: true, status: 200, json: async () => data });
const originalFetch = global.fetch;

function Location() {
    const { pathname, search } = useLocation();
    return <output aria-label="Current route">{pathname + search}</output>;
}

function desk(firebase, authUser) {
    return <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <FirebaseContext.Provider value={firebase}>
            <AuthUserContext.Provider value={authUser}><DailyBattleBadgeNotice /></AuthUserContext.Provider>
        </FirebaseContext.Provider>
        <Location />
    </MemoryRouter>;
}

afterEach(() => { global.fetch = originalFetch; });

test('a private unread daily award links its recipient to milestones and acknowledges that award', async () => {
    let unread = true;
    global.fetch = jest.fn(async (url, opts) => {
        expect(String(url)).toBe(endpoint);
        expect(opts.credentials).toBe('omit');
        if (opts.headers.Authorization !== 'Bearer mvp-token') return ok({ notifications: [] });
        if (opts.method === 'POST') {
            expect(JSON.parse(opts.body)).toEqual({ action: 'read', id: notice.id });
            unread = false;
            return ok({ ok: true });
        }
        return ok({ notifications: unread ? [notice] : [] });
    });
    const firebase = { auth: { currentUser: teammate } };
    const view = render(desk(firebase, teammate));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByLabelText('Your daily Battle Badge')).toBeNull();
    firebase.auth.currentUser = player;
    view.rerender(desk(firebase, player));
    expect(await screen.findByText('You earned the Tower of Power!')).toBeVisible();
    const link = screen.getByRole('link', { name: 'View profile milestone' });
    expect(link).toHaveAttribute('href', '/account?section=milestones');
    fireEvent.click(link);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    expect(global.fetch.mock.calls[2][1]).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer mvp-token' } });
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/account?section=milestones');
    await waitFor(() => expect(screen.queryByLabelText('Your daily Battle Badge')).toBeNull());
    expect(unread).toBe(false);
});

test('discards an outstanding private response when accounts switch and keeps signed-out pages clear', async () => {
    let finish;
    global.fetch = jest.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
        .mockResolvedValueOnce(ok({ notifications: [] }));
    const firebase = { auth: { currentUser: player } };
    const view = render(desk(firebase, player));
    await waitFor(() => expect(finish).toEqual(expect.any(Function)));
    firebase.auth.currentUser = teammate;
    view.rerender(desk(firebase, teammate));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(global.fetch.mock.calls[0][1].signal.aborted).toBe(true);
    await act(async () => { finish(ok({ notifications: [notice] })); });
    expect(screen.queryByLabelText('Your daily Battle Badge')).toBeNull();
    firebase.auth.currentUser = null;
    view.rerender(desk(firebase, null));
    fireEvent(document, new Event('visibilitychange'));
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('link', { name: 'View profile milestone' })).toBeNull();
});
