import React from 'react';
import { webcrypto } from 'crypto';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import KnifeKillLeaderboard from './KnifeKillLeaderboard';
import StaffKnifeKills from './StaffKnifeKills';

const player = { uid: 'field12345678', name: 'Rook' };
const firebase = { auth: { currentUser: { uid: 'officialRef123', getIdToken: async () => 'id-token' } } };
const originalFetch = global.fetch;
const response = data => ({ ok: true, status: 200, json: async () => data });
const staffState = {
    playerId: player.uid, total: 23, recorded: 23, openingTotal: null,
    eligibleForPatches: true, pendingPatches: [], history: [],
};

function board() {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><HelmetProvider>
        <KnifeKillLeaderboard /></HelmetProvider></MemoryRouter>);
}

function recorder(token = 'staff-session') {
    const view = render(<StaffKnifeKills {...{ player, firebase, token }} onLock={jest.fn()} />);
    if (token) fireEvent.click(screen.getByRole('button', { name: 'Open player record' }));
    return view;
}

const previousCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
beforeAll(() => Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto }));
afterAll(() => {
    if (previousCrypto) Object.defineProperty(globalThis, 'crypto', previousCrypto);
    else delete globalThis.crypto;
});
afterEach(() => { global.fetch = originalFetch; sessionStorage.clear(); });

test('shows member milestones and public tied standings with profile links and server pagination', async () => {
    const row = { rank: 1, playerId: player.uid, displayName: player.name, total: 25 };
    global.fetch = jest.fn().mockResolvedValueOnce(response({
        page: 1, hasMore: true, standings: [row, { ...row, playerId: 'second12345', displayName: 'Blue' }],
    })).mockResolvedValueOnce(response({ page: 2, hasMore: false, standings: [] }));
    board();
    const table = await screen.findByRole('table');
    expect(within(table).getAllByText('#1')).toHaveLength(2);
    expect(within(table).getByRole('link', { name: 'Rook' })).toHaveAttribute('href','/profilelookup/field12345678');
    expect(screen.getByText('Ninja Warrior 25')).toBeInTheDocument();
    expect(screen.getByText('Ninja Warrior 50')).toBeInTheDocument();
    expect(screen.getByText('Bayonet 100')).toBeInTheDocument();
    expect(screen.getByText('Every 100 kills')).toBeInTheDocument();
    expect(global.fetch.mock.calls[0][1]).toMatchObject({ credentials: 'omit', headers: { Accept: 'application/json' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('No more players on this page.')).toBeInTheDocument();
    expect(global.fetch.mock.calls[1][0].href).toBe('https://app.usairsoftfield.com/api/knife-kills?page=2');
});

test('distinguishes a failed load from empty standings and allows retry', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(response({ page: 1, standings: [] }))
        .mockResolvedValueOnce(response({ page: 1, hasMore: false, standings: [] }));
    board();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No knife kills have been recorded yet.')).toBeInTheDocument();
});

test('uses staff credentials and retries the same receipt after losing a response and reopening', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(response(staffState)).mockRejectedValueOnce(new TypeError('Offline'))
        .mockResolvedValueOnce(response(staffState)).mockResolvedValueOnce(response({
            ...staffState, recorded: 25, total: 25, newlyEarned: ['ninja-warrior-25'],
        }));
    recorder();
    fireEvent.change(await screen.findByLabelText('New knife kills'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record knife kills' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Close player record' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open player record' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retry same entry' }));
    expect(await screen.findByText(/Rook now has 25.*Ninja Warrior 25/)).toBeInTheDocument();
    const first = global.fetch.mock.calls[1][1];
    expect(first.headers).toMatchObject({ Authorization: 'Bearer id-token', 'X-USAW-Staff-Session': 'staff-session' });
    expect(JSON.parse(first.body)).toEqual({ action: 'record', count: 2, playerId: player.uid, requestId: expect.stringMatching(/^[a-f0-9-]{36}$/i) });
    expect(global.fetch.mock.calls[3][1].body).toBe(first.body);
});

test('reviews historical opening count separately from newly recorded kills and only allows one opening total', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(response({ ...staffState, eligibleForPatches: false }))
        .mockResolvedValueOnce(response({ ...staffState, eligibleForPatches: false, openingTotal: 80, total: 103, newlyEarned: [] }));
    recorder();
    expect(await screen.findByText(/once membership is active/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Enter historical opening total'));
    fireEvent.change(screen.getByLabelText('Historical knife kills'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review opening total' }));
    expect(screen.getByText(/With 23 recorded here, their total will be 103/)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm opening total' }));
    await screen.findByText(/Opening total saved/);
    expect(screen.queryByText('Enter historical opening total')).toBeNull();
    expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toMatchObject({ action: 'opening', count: 80, playerId: player.uid });
});

test('awards pending member patches on renewal without an additional kill', async () => {
    const current = { ...staffState, total: 51, recorded: 51, pendingPatches: ['ninja-warrior-25', 'ninja-warrior-50'] };
    global.fetch = jest.fn().mockResolvedValueOnce(response(current))
        .mockResolvedValueOnce(response({ ...current, pendingPatches: [], newlyEarned: current.pendingPatches }));
    recorder();
    fireEvent.click(await screen.findByRole('button', { name: 'Award earned patches' }));
    expect(await screen.findByText(/Rook now has 51.*Ninja Warrior 25, Ninja Warrior 50/)).toBeInTheDocument();
    expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({ action: 'reconcile', playerId: player.uid, requestId: expect.any(String) });
});

test('locked desk never requests a staff record or allows entries', () => {
    global.fetch = jest.fn();
    recorder('');
    expect(screen.queryByRole('button', { name: 'Open player record' })).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
});

test('shows the Bayonets awarded by this entry separately from the member’s lifetime count', async () => {
    const current = { ...staffState, recorded: 199, total: 199, earnedPatchCounts: { 'bayonet-100': 1 } };
    global.fetch = jest.fn().mockResolvedValueOnce(response(current)).mockResolvedValueOnce(response({
        ...current, recorded: 305, total: 305, newlyEarned: ['bayonet-100'],
        newlyEarnedCounts: { 'bayonet-100': 2 }, earnedPatchCounts: { 'bayonet-100': 3 },
    }));
    recorder();
    fireEvent.change(await screen.findByLabelText('New knife kills'), { target: { value: '106' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record knife kills' }));
    expect(await screen.findByText('Knife kills recorded. Rook now has 305. Earned Bayonet 100 ×2.')).toBeInTheDocument();
    expect(screen.getByText('Bayonets earned').nextElementSibling).toHaveTextContent('3');
});
