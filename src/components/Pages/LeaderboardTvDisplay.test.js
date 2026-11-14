import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { onValue } from 'firebase/database';
import { FirebaseContext } from '../Firebase';
import { AuthUserContext } from '../session';
import { getFeaturedBadges } from '../constants/playerBadges';
import { getAllPlayerDisplayNames } from '../constants/playerDisplayNames';
import { getLeaderboardPrestige } from '../constants/playerPrestige';
import { PublicLeaderboardTv, LEADERBOARD_TV_PATH } from './leaderboard';

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

function renderTv(user = null) {
    const firebase = {
        users: () => 'players',
        onAuthUserListener: jest.fn(),
    };
    const route = authUser => (
        <MemoryRouter initialEntries={[LEADERBOARD_TV_PATH]}
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <FirebaseContext.Provider value={firebase}>
                <AuthUserContext.Provider value={authUser}>
                    <HelmetProvider>
                        <Routes>
                            <Route path={LEADERBOARD_TV_PATH} element={<PublicLeaderboardTv />} />
                            <Route path="/login" element={<h1>Sign in</h1>} />
                        </Routes>
                    </HelmetProvider>
                </AuthUserContext.Provider>
            </FirebaseContext.Provider>
        </MemoryRouter>
    );
    const { rerender, unmount } = render(route(user));
    return {
        setUser: next => rerender(route(next)),
        onAuthUserListener: firebase.onAuthUserListener,
        unmount,
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

test.each([null, member])('opens the direct TV URL without admin access (%p)', async user => {
    const session = renderTv(user);
    const board = screen.getByRole('table', { name: 'All time player standings' });
    expect(await within(board).findByText('Prestige 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'All-Time Leaderboard' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back to staff' })).not.toBeInTheDocument();
    expect(session.onAuthUserListener).not.toHaveBeenCalled();
    await waitFor(() => expect(document.head.querySelector('meta[name="robots"]'))
        .toHaveAttribute('content', 'noindex, nofollow'));
});

test('renders and updates the same all-time standings as read-only TV rows', async () => {
    const session = renderTv();
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
    session.unmount();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(stopScores).toHaveBeenCalledTimes(1);
});

test('scrolls through additional standings and resets to the top when switching periods in fullscreen', async () => {
    renderTv();
    const now = new Date();
    const month = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const gameDate = `${now.getFullYear()}-${now.getMonth()}-1`;
    const extraPlayers = Object.fromEntries(Array.from({ length: 53 }, (_, index) => [
        `extra-player-${index}`, { name: `Player ${index}`, points: 60 - index },
    ]));
    await act(async () => publish({
        ...fixtures,
        ...extraPlayers,
        alpha: { ...fixtures.alpha, games: { [gameDate]: { wins: 3, losses: 1 } } },
        bravo: { ...fixtures.bravo, games: { [gameDate]: { wins: 1, losses: 2 } } },
    }));
    const board = screen.getByRole('table', { name: 'All time player standings' });
    expect(within(board).getAllByRole('row')).toHaveLength(51);
    expect(within(board).getAllByRole('row')[1]).toHaveTextContent('Bravo');
    expect(screen.queryByRole('navigation', { name: 'Standings pages' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    const scroller = screen.getByRole('region', { name: 'All-Time Leaderboard' });
    expect(scroller).toHaveAttribute('tabindex', '0');
    Object.defineProperties(scroller, {
        clientHeight: { configurable: true, value: 600 },
        scrollHeight: { configurable: true, value: 2400 },
    });

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
        expect(scroller).toHaveFocus();

        getLeaderboardPrestige.mockClear();
        getFeaturedBadges.mockClear();
        scroller.scrollTop = 400;
        await act(async () => fireEvent.scroll(scroller));
        expect(within(board).queryByText('#51')).not.toBeInTheDocument();
        scroller.scrollTop = 1750;
        await act(async () => fireEvent.scroll(scroller));
        expect(within(board).getAllByRole('row')).toHaveLength(56);
        expect(within(board).getByText('#55')).toBeInTheDocument();
        for (const fetchDetails of [getLeaderboardPrestige, getFeaturedBadges]) {
            expect(fetchDetails).toHaveBeenCalledTimes(1);
            expect(fetchDetails.mock.calls[0][0]).toHaveLength(5);
        }

        const monthly = screen.getByRole('button', { name: 'Monthly', pressed: false });
        await act(async () => fireEvent.click(monthly));
        expect(monthly).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('heading', { name: `${month} Leaderboard` })).toBeInTheDocument();
        const monthlyBoard = screen.getByRole('table', { name: `${month} player standings` });
        const firstRow = within(monthlyBoard).getAllByRole('row')[1];
        expect(firstRow).toHaveTextContent('Alpha');
        expect(within(firstRow).getByText('33')).toHaveClass('field-lb-points');
        expect(scroller.scrollTop).toBe(0);
        expect(within(monthlyBoard).queryByText('#51')).not.toBeInTheDocument();
        expect(screen.getByRole('main')).toBe(display);
        expect(document.fullscreenElement).toBe(display);

        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'All time', pressed: false })));
        expect(screen.getByRole('heading', { name: 'All-Time Leaderboard' })).toBeInTheDocument();
        expect(within(board).getAllByRole('row')[1]).toHaveTextContent('Bravo');
        expect(document.fullscreenElement).toBe(display);
        expect(onValue).toHaveBeenCalledTimes(1);

        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Exit full screen' })));
        expect(exitFullscreen).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: 'Full screen' })).toBeInTheDocument();

        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Full screen' })));
        act(() => {
            fullscreenElement = null;
            document.dispatchEvent(new Event('fullscreenchange'));
        });
        expect(screen.getByRole('button', { name: 'Full screen' })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Back to staff' })).not.toBeInTheDocument();
    } finally {
        if (fullscreenDescriptor) Object.defineProperty(document, 'fullscreenElement', fullscreenDescriptor);
        else delete document.fullscreenElement;
        if (exitFullscreenDescriptor) Object.defineProperty(document, 'exitFullscreen', exitFullscreenDescriptor);
        else delete document.exitFullscreen;
    }
});

test('keeps the TV display open when staff signs out', async () => {
    const session = renderTv(admin);
    expect(screen.getByRole('link', { name: 'Back to staff' })).toHaveAttribute('href', '/admin');
    await act(async () => session.setUser(null));
    expect(screen.queryByRole('link', { name: 'Back to staff' })).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'All time player standings' })).toBeInTheDocument();
    expect(onValue).toHaveBeenCalledTimes(1);
});

test('keeps the presentation visible when the browser rejects fullscreen', async () => {
    renderTv();
    screen.getByRole('main').requestFullscreen = jest.fn().mockRejectedValue(new Error('Permission denied'));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Full screen' })));
    expect(screen.getByRole('status')).toHaveTextContent('Use your browser’s full screen option');
    expect(screen.getByRole('table', { name: 'All time player standings' })).toBeInTheDocument();
});
