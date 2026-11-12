import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { onValue } from 'firebase/database';
import { getDownloadURL } from 'firebase/storage';
import { FirebaseContext } from '../Firebase';
import Teams from './Teams';
import Teampage from './Teampage';

jest.mock('../Firebase', () => {
    const context = jest.requireActual('../Firebase/context');
    return { FirebaseContext: context.default, withFirebase: context.withFirebase };
});
jest.mock('firebase/database', () => ({
    child: (reference, name) => `${reference}/${name}`,
    onValue: jest.fn(),
}));
jest.mock('firebase/storage', () => ({ getDownloadURL: jest.fn() }));

const id = '1ba1b987-74ae-4373-8b44-d484c1d10d50';
const captainId = 'captain-id-01';
const profile = `/teams/${id}?source=companion`;
const team = {
    id, source: 'companion', name: 'Rebels', description: 'Founded by Rapid Rebel',
    points: 23, wins: 2, losses: 1, memberCount: 1, hasLogo: false,
    captainId, members: [{ id: captainId, name: 'Rapid Rebel' }],
};
const legacy = {
    name: 'Rebels', points: 46, leader: 'legacy-captain-01', description: 'USAW field team',
    members: [['Field Captain', 'legacy-captain-01']],
};
const response = data => ({ ok: true, json: async () => data });
const account = uid => ({ uid, getIdToken: jest.fn().mockResolvedValue(`${uid}-token`) });

function mount(user, path = '/teams') {
    let authListener;
    const auth = {
        currentUser: user,
        onAuthStateChanged(callback) {
            authListener = callback;
            callback(this.currentUser);
            return jest.fn();
        },
    };
    const firebase = {
        auth, teams: () => 'teams', team: slug => `teams/${slug}`,
        teamsPictures: name => `logos/${name}`, user: uid => `users/${uid}`,
    };
    render(<FirebaseContext.Provider value={firebase}>
        <HelmetProvider>
            <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                    <Route path="/teams" element={<Teams />} />
                    <Route path="/teams/:team" element={<Teampage />} />
                </Routes>
            </MemoryRouter>
        </HelmetProvider>
    </FirebaseContext.Provider>);
    return next => act(() => {
        auth.currentUser = next;
        authListener(next);
    });
}

beforeEach(() => {
    jest.clearAllMocks();
    getDownloadURL.mockRejectedValue(new Error('No uploaded logo'));
    onValue.mockImplementation((path, next) => {
        const data = path === 'teams' ? { rebels: legacy } : path === 'teams/rebels' ? legacy : 'Field Captain';
        next({ val: () => data });
        return jest.fn();
    });
    global.fetch = jest.fn(async url => url.searchParams.has('id')
        ? response({ team, ownTeamId: id }) : response({ teams: [team], ownTeamId: id }));
});

test('shows both teams with the same name and keeps their identities and score labels distinct', async () => {
    const changeAccount = mount(account(captainId));
    const standings = screen.getByRole('region', { name: 'Team standings' });
    const member = await within(standings).findByRole('link', { name: /Rebels.*Earned points/i });
    const field = within(standings).getByRole('link', { name: /Rank 1.*Rebels.*Points/i });
    expect(member).toHaveAttribute('href', profile);
    expect(field).toHaveAttribute('href', '/teams/rebels');
    expect(global.fetch).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/api/team-directory' }),
        expect.objectContaining({ credentials: 'omit', headers: expect.objectContaining({ Authorization: `Bearer ${captainId}-token` }) }),
    );
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'rebels' } });
    expect(within(standings).getAllByRole('heading', { name: 'Rebels' })).toHaveLength(2);
    changeAccount(null);
    expect(within(standings).queryByRole('link', { name: /Rebels.*Earned points/i })).not.toBeInTheDocument();
    expect(field).toBeInTheDocument();
});

test('shows protected roster and membership operations for the matching Companion team', async () => {
    mount(account(captainId), profile);
    expect(await screen.findByRole('heading', { name: 'Rebels' })).toBeInTheDocument();
    expect(screen.getByText('Founded by Rapid Rebel')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage in Companion' })).toHaveAttribute(
        'href', `https://usaw-field-companion.pink-bud-3735.chatgpt.site/#teams/my/${id}`,
    );
    expect(within(screen.getByRole('region', { name: 'Team roster' })).getByRole('link', { name: /Rapid Rebel/ }))
        .toHaveAttribute('href', `/profilelookup/${captainId}`);
    expect(onValue).not.toHaveBeenCalled();
});

test('requires membership for Companion profiles and keeps the legacy Firebase profile available', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 403 });
    mount(account('expired-player'), profile);
    expect(await screen.findByText('An active USAW membership is required to see this team.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Team roster' })).not.toBeInTheDocument();
    mount(null, '/teams/rebels');
    expect(await screen.findByText('USAW field team')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in to request to join' })).toHaveAttribute('href', '/login?team=rebels');
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
});
