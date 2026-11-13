import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { onValue } from 'firebase/database';
import { FirebaseContext } from '../Firebase';
import { AuthUserContext } from '../session';
import { getFeaturedBadges } from '../constants/playerBadges';
import { getAllPlayerDisplayNames } from '../constants/playerDisplayNames';
import { getLeaderboardPrestige } from '../constants/playerPrestige';
import { AdminLeaderboardTv, LEADERBOARD_TV_PATH } from './leaderboard';

jest.mock('../Firebase', () => {
    const context = jest.requireActual('../Firebase/context');
    return { FirebaseContext: context.default, withFirebase: context.withFirebase };
});
jest.mock('firebase/database', () => ({ onValue: jest.fn() }));
jest.mock('../constants/playerBadges', () => ({
    ...jest.requireActual('../constants/playerBadges'),
    getFeaturedBadges: jest.fn(),
}));
jest.mock('../constants/playerDisplayNames', () => ({ getAllPlayerDisplayNames: jest.fn() }));
jest.mock('../constants/playerPrestige', () => ({
    ...jest.requireActual('../constants/playerPrestige'),
    getLeaderboardPrestige: jest.fn(),
}));

const admin = { uid: 'field-admin', roles: { ADMIN: true } };
const member = { uid: 'player-member', roles: {} };
const fixtures = {
    alpha: { name: 'Alpha', points: 130, wins: 12, losses: 3 },
    bravo: { name: 'Bravo', points: 150, wins: 15, losses: 2 },
    hidden: { name: 'Waiver Only', points: 700, roles: { WAIVER: true } },
};

function renderTv(cachedUser) {
    let onAuthChange;
    let onSignedOut;
    const unsubscribe = jest.fn();
    const firebase = {
        users: () => 'players',
        onAuthUserListener: (success, fallback) => {
            onAuthChange = success;
            onSignedOut = fallback;
            return unsubscribe;
        },
    };
    render(
        <MemoryRouter initialEntries={[LEADERBOARD_TV_PATH + '?view=monthly']}
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <FirebaseContext.Provider value={firebase}>
                <AuthUserContext.Provider value={cachedUser}>
                    <HelmetProvider>
                        <Routes>
                            <Route path={LEADERBOARD_TV_PATH} element={<AdminLeaderboardTv />} />
                            <Route path="/login" element={<h1>Sign in</h1>} />
                        </Routes>
                    </HelmetProvider>
                </AuthUserContext.Provider>
            </FirebaseContext.Provider>
        </MemoryRouter>,
    );
    return {
        verify: user => act(() => user ? onAuthChange(user) : onSignedOut()),
        unsubscribe,
    };
}

let publish;
let stopScores;
beforeEach(() => {
    jest.clearAllMocks();
    stopScores = jest.fn();
    getFeaturedBadges.mockResolvedValue({ bravo: 'blackout-protocol' });
    getAllPlayerDisplayNames.mockResolvedValue({});
    getLeaderboardPrestige.mockResolvedValue(new Map([['bravo', { prestigeCount: 2, cycleStartPoints: 0 }]]));
    onValue.mockImplementation((path, listener) => {
        publish = players => listener({ val: () => players });
        publish(fixtures);
        return stopScores;
    });
});

test.each([null, member])('requires fresh website admin verification for a direct TV URL', verifiedUser => {
    const session = renderTv(admin);
    expect(screen.queryByText('All-Time Leaderboard')).not.toBeInTheDocument();
    expect(onValue).not.toHaveBeenCalled();
    session.verify(verifiedUser);
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(onValue).not.toHaveBeenCalled();
    expect(session.unsubscribe).toHaveBeenCalledTimes(1);
});

test('renders and updates the same all-time standings as read-only TV rows', async () => {
    const session = renderTv(admin);
    session.verify(admin);
    const board = screen.getByRole('table', { name: 'All time player standings' });
    expect(within(board).getAllByRole('row')[1]).toHaveTextContent('Bravo');
    expect(within(board).queryByText('Waiver Only')).not.toBeInTheDocument();
    expect(within(board).queryByRole('link')).not.toBeInTheDocument();
    expect(within(board).getByText('15')).toHaveClass('field-lb-wins');
    expect(within(board).getByText('2')).toHaveClass('field-lb-losses');
    expect(await within(board).findByText('Prestige 2')).toBeInTheDocument();
    expect(within(board).getByRole('img', { name: 'Featured badge: Blackout Protocol' }))
        .toHaveAttribute('src', '/badges/thumbs/blackout-protocol.png');
    expect(onValue).toHaveBeenCalledTimes(1);
    expect(onValue).toHaveBeenCalledWith('players', expect.any(Function), expect.any(Function));

    await act(async () => publish({ ...fixtures, alpha: { ...fixtures.alpha, points: 160 } }));
    expect(within(board).getAllByRole('row')[1]).toHaveTextContent('Alpha');
    session.verify(null);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(stopScores).toHaveBeenCalledTimes(1);
});

test('paginates the TV board and follows native fullscreen entry and exit', async () => {
    const session = renderTv(admin);
    session.verify(admin);
    const extraPlayers = Object.fromEntries(Array.from({ length: 8 }, (_, index) => [
        `extra-${index}`, { name: `Player ${index}`, points: 10 - index },
    ]));
    await act(async () => publish({ ...fixtures, ...extraPlayers }));
    const board = screen.getByRole('table', { name: 'All time player standings' });
    expect(within(board).getAllByRole('row')).toHaveLength(9);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Next' })));
    expect(within(board).getAllByRole('row')).toHaveLength(3);
    expect(within(board).getByText('#9')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    const display = screen.getByRole('main');
    const fullscreenDescriptor = Object.getOwnPropertyDescriptor(document, 'fullscreenElement');
    const exitFullscreenDescriptor = Object.getOwnPropertyDescriptor(document, 'exitFullscreen');
    let fullscreenElement = null;
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreenElement });
    const exitFullscreen = jest.fn(async () => {
        fullscreenElement = null;
        document.dispatchEvent(new Event('fullscreenchange'));
    });
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exitFullscreen });
    display.requestFullscreen = jest.fn(async () => {
        fullscreenElement = display;
        document.dispatchEvent(new Event('fullscreenchange'));
    });

    try {
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Full screen' })));
        expect(display.requestFullscreen).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: 'Exit full screen' })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Back to staff' })).not.toBeInTheDocument();
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Exit full screen' })));
        expect(exitFullscreen).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: 'Full screen' })).toBeInTheDocument();

        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Full screen' })));
        act(() => {
            fullscreenElement = null;
            document.dispatchEvent(new Event('fullscreenchange'));
        });
        expect(screen.getByRole('button', { name: 'Full screen' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Back to staff' })).toHaveAttribute('href', '/admin');
    } finally {
        if (fullscreenDescriptor) Object.defineProperty(document, 'fullscreenElement', fullscreenDescriptor);
        else delete document.fullscreenElement;
        if (exitFullscreenDescriptor) Object.defineProperty(document, 'exitFullscreen', exitFullscreenDescriptor);
        else delete document.exitFullscreen;
    }
});

test('keeps the presentation visible when the browser rejects fullscreen', async () => {
    const session = renderTv(admin);
    session.verify(admin);
    screen.getByRole('main').requestFullscreen = jest.fn().mockRejectedValue(new Error('Permission denied'));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Full screen' })));
    expect(screen.getByRole('status')).toHaveTextContent('Use your browser’s full screen option');
    expect(screen.getByRole('table', { name: 'All time player standings' })).toBeInTheDocument();
});
