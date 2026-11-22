import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import AdminFieldRounds from './AdminFieldRounds';
import BarracksTV from './BarracksTV';
import { fieldTimeISO, LIVE_ROUNDS_PATH, ROUND_CATALOG_PATH, STAFF_ROUNDS_PATH } from './FieldRoundsShared';

const serverNow = '2026-11-16T18:00:00.000Z';
const scheduled = {
    id: '4705884b-9fea-4206-bb3a-e7cbdebe2184', revision: 6, status: 'queued',
    title: 'Countdown', startsAt: '2026-11-16T18:15:00.000Z', endsAt: '2026-11-16T18:40:00.000Z',
    location: 'Main field', briefingLocation: 'Barracks', camoSpawn: 'Alpha HQ', solidSpawn: 'Foxtrot HQ',
};
const playing = { ...scheduled, status: 'live', revision: 7, startsAt: serverNow, endsAt: '2026-11-16T18:25:00.000Z' };
const catalog = { minOptions: 2, maxOptions: 7, sections: [{ name: 'Field games', modes: [
    { id: 'countdown', name: 'Countdown' }, { id: 'three-flag', name: '3 Flag' }, { id: 'downed-pilot', name: 'Downed Pilot' },
] }] };

function mockStaffRequest({ current, onWrite }) {
    return jest.fn(async (path, options) => {
        if (path === ROUND_CATALOG_PATH) return catalog;
        if (options.method === 'POST') return onWrite(options.body);
        return { serverNow, isStaff: true, poll: null, games: current() };
    });
}

test('starts a staff-controlled round against its revision and reloads the official timer', async () => {
    let game = scheduled;
    const request = mockStaffRequest({ current: () => [game], onWrite: () => {
        game = playing;
        return { ok: true, gameId: game.id };
    } });
    render(<AdminFieldRounds request={request} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start now' }));

    await screen.findByRole('button', { name: 'End round' });
    expect(request).toHaveBeenCalledWith(LIVE_ROUNDS_PATH, expect.objectContaining({
        method: 'POST', body: { action: 'startRound', gameId: scheduled.id, revision: 6 },
    }));
    expect(screen.getByRole('timer')).toHaveTextContent('25:00');
});

test('keeps a draft through temporary staff verification failure and retries the protected board', async () => {
    let offline = false;
    const request = jest.fn(async path => {
        if (path === ROUND_CATALOG_PATH) return catalog;
        if (path !== STAFF_ROUNDS_PATH) throw new Error('Expected protected board');
        if (offline) throw Object.assign(new Error('Verification unavailable.'), { status: 503 });
        return { serverNow, isStaff: true, poll: null, games: [] };
    });
    render(<AdminFieldRounds request={request} />);
    const form = within(await screen.findByRole('region', { name: 'Schedule a round' }));
    const field = await form.findByLabelText('Camo respawn');
    fireEvent.change(field, { target: { value: 'Keep this location' } });
    offline = true;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh board' }));
    await screen.findByText(/Verification unavailable/);
    expect(field).toBeDisabled();
    offline = false;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh board' }));
    await waitFor(() => expect(field).toBeEnabled());
    expect(field).toHaveValue('Keep this location');
});

test('writes a scheduled mode with official California time and both team respawns', async () => {
    const request = mockStaffRequest({ current: () => [], onWrite: () => ({ ok: true }) });
    render(<AdminFieldRounds request={request} />);
    const schedule = within(await screen.findByRole('region', { name: 'Schedule a round' }));
    fireEvent.change(await schedule.findByLabelText('Game mode'), { target: { value: 'three-flag' } });
    fireEvent.change(schedule.getByLabelText('Start time · California'), { target: { value: '2026-11-16T10:35' } });
    fireEvent.change(schedule.getByLabelText('Camo respawn'), { target: { value: 'Alpha HQ' } });
    fireEvent.change(schedule.getByLabelText('Solid respawn'), { target: { value: 'Foxtrot HQ' } });
    fireEvent.click(schedule.getByRole('button', { name: 'Add to field schedule' }));

    await screen.findByText('Round added to the field schedule.');
    expect(request).toHaveBeenCalledWith(LIVE_ROUNDS_PATH, expect.objectContaining({
        method: 'POST', body: expect.objectContaining({
            action: 'createGame', modeId: 'three-flag', startsAt: '2026-11-16T18:35:00.000Z',
            staffControlled: true, camoSpawn: 'Alpha HQ', solidSpawn: 'Foxtrot HQ',
        }),
    }));
});

test('saves map-relative tap and keyboard positions when scheduling a round', async () => {
    const request = mockStaffRequest({ current: () => [], onWrite: () => ({ ok: true }) });
    render(<AdminFieldRounds request={request} />);
    const schedule = within(await screen.findByRole('region', { name: 'Schedule a round' }));
    fireEvent.click(schedule.getByText('Place map pins'));
    const briefing = await schedule.findByRole('button', { name: 'Place Briefing pin on field map' });
    jest.spyOn(briefing, 'getBoundingClientRect').mockReturnValue({ left: 20, top: 10, width: 400, height: 225 });
    fireEvent.click(briefing, { detail: 1, clientX: 120, clientY: 190 });
    expect(schedule.getByText('Briefing pin placed.')).toBeInTheDocument();

    fireEvent.click(schedule.getByRole('button', { name: 'Camo respawn', exact: true }));
    fireEvent.keyDown(schedule.getByRole('button', { name: 'Place Camo respawn pin on field map' }), { key: 'ArrowRight' });
    fireEvent.click(schedule.getByRole('button', { name: 'Add to field schedule' }));

    await screen.findByText('Round added to the field schedule.');
    expect(request).toHaveBeenCalledWith(LIVE_ROUNDS_PATH, expect.objectContaining({
        method: 'POST', body: expect.objectContaining({
            action: 'createGame', mapPins: { briefing: { x: .25, y: .8 }, camo: { x: .51, y: .5 } },
        }),
    }));
    expect(schedule.getByText('Camo respawn pin unset.')).toBeInTheDocument();
});

test('clears the last pin from an existing round against its revision', async () => {
    let round = { ...playing, mapPins: { solid: { x: .8, y: .25 } } };
    const request = mockStaffRequest({ current: () => [round], onWrite: () => {
        round = { ...round, revision: 8, mapPins: {} };
        return { ok: true };
    } });
    render(<AdminFieldRounds request={request} />);
    const card = within(await screen.findByRole('article'));
    fireEvent.click(card.getByText('Edit round locations'));
    fireEvent.click(card.getByText('Place map pins'));
    fireEvent.click(card.getByRole('button', { name: 'Solid respawn', exact: true }));
    fireEvent.click(card.getByRole('button', { name: 'Clear Solid respawn pin' }));
    fireEvent.change(card.getByLabelText('Briefing location'), { target: { value: 'Hive entry' } });
    fireEvent.click(card.getByRole('button', { name: 'Save round locations' }));

    await screen.findByText('Round locations updated.');
    expect(request).toHaveBeenCalledWith(LIVE_ROUNDS_PATH, expect.objectContaining({
        method: 'POST', body: {
            action: 'updateSpawns', gameId: playing.id, revision: 7,
            briefingLocation: 'Hive entry', camoSpawn: 'Alpha HQ', solidSpawn: 'Foxtrot HQ', mapPins: {},
        },
    }));
});

test('omits unchanged pins when saving an existing round’s text locations', async () => {
    const round = { ...playing, mapPins: { camo: { x: .29, y: .6 } } };
    const request = mockStaffRequest({ current: () => [round], onWrite: () => ({ ok: true }) });
    render(<AdminFieldRounds request={request} />);
    const card = within(await screen.findByRole('article'));
    fireEvent.click(card.getByText('Edit round locations'));
    fireEvent.change(card.getByLabelText('Camo respawn'), { target: { value: 'New Camo HQ' } });
    fireEvent.click(card.getByRole('button', { name: 'Save round locations' }));

    await screen.findByText('Round locations updated.');
    expect(request).toHaveBeenCalledWith(LIVE_ROUNDS_PATH, expect.objectContaining({
        method: 'POST', body: {
            action: 'updateSpawns', gameId: playing.id, revision: 7,
            briefingLocation: 'Barracks', camoSpawn: 'New Camo HQ', solidSpawn: 'Foxtrot HQ',
        },
    }));
});

test('uses catalog options for voting and publishes a staff-selected winner from a tie', async () => {
    const pollId = '95f68466-2c3d-4259-9801-9b449d9be09e';
    let poll = null;
    const request = jest.fn(async (path, options) => {
        if (path === ROUND_CATALOG_PATH) return catalog;
        if (options.method !== 'POST') return { games: [], poll, serverNow, isStaff: true };
        if (options.body.action === 'createPoll') {
            poll = { id: pollId, title: 'What should we play next?', closesAt: options.body.closesAt, closed: false,
                options: [{ modeId: 'countdown', label: 'Countdown', votes: 1 }, { modeId: 'three-flag', label: '3 Flag', votes: 1 }],
                totalVotes: 2, winnerModeIds: ['countdown', 'three-flag'] };
        }
        if (options.body.action === 'closePoll') poll = { ...poll, closed: true };
        if (options.body.action === 'publishWinner') poll = { ...poll, publishedGameId: scheduled.id };
        return { ok: true };
    });
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    try {
        render(<AdminFieldRounds request={request} />);
        const voting = within(await screen.findByRole('region', { name: 'Player voting' }));
        fireEvent.click(await voting.findByRole('checkbox', { name: 'Downed Pilot' }));
        fireEvent.click(voting.getByRole('button', { name: 'Open voting' }));
        const close = await voting.findByRole('button', { name: 'Close this vote' });
        expect(request).toHaveBeenCalledWith(LIVE_ROUNDS_PATH, expect.objectContaining({ method: 'POST', body: expect.objectContaining({
            action: 'createPoll', options: ['countdown', 'three-flag'], closesAt: '2026-11-16T18:10:00.000Z',
        }) }));

        fireEvent.click(close);
        const publish = within(await screen.findByRole('region', { name: 'Publish the vote winner' }));
        fireEvent.change(publish.getByLabelText('Winning mode'), { target: { value: 'three-flag' } });
        fireEvent.click(publish.getByRole('button', { name: 'Publish winning round' }));
        await screen.findByText('Winning round published.');
        expect(request).toHaveBeenCalledWith(LIVE_ROUNDS_PATH, expect.objectContaining({ method: 'POST', body: expect.objectContaining({
            action: 'publishWinner', pollId, modeId: 'three-flag',
        }) }));
    } finally {
        confirm.mockRestore();
    }
});

const currentPoll = {
    id: '95f68466-2c3d-4259-9801-9b449d9be09e', title: 'Which mode is next?',
    closesAt: '2026-11-16T18:15:00.000Z', closed: false, totalVotes: 8, winnerModeIds: ['countdown'],
    options: [{ modeId: 'countdown', label: 'Countdown', votes: 5 }, { modeId: 'three-flag', label: '3 Flag', votes: 3 }],
};

test.each([
    ['open', {}],
    ['closed with a scheduled winner', { closed: true, publishedGameId: scheduled.id }],
    ['expired', { closesAt: serverNow }],
])('staff can clear an %s vote and immediately open a fresh vote', async (_, state) => {
    let poll = { ...currentPoll, ...state };
    const request = jest.fn(async (path, options) => {
        if (path === ROUND_CATALOG_PATH) return catalog;
        if (options.method !== 'POST') return { serverNow, isStaff: true, games: [scheduled], poll };
        poll = null;
        return { ok: true };
    });
    const confirm = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    try {
        render(<AdminFieldRounds request={request} />);
        const staffVoting = within(await screen.findByRole('region', { name: 'Player voting' }));
        const clear = await staffVoting.findByRole('button', { name: 'Clear vote' });
        fireEvent.click(clear);
        expect(confirm).toHaveBeenCalledWith(expect.stringContaining(currentPoll.title));
        expect(request.mock.calls.some(([, options]) => options.method === 'POST')).toBe(false);
        expect(staffVoting.getByRole('heading', { name: currentPoll.title })).toBeInTheDocument();
        fireEvent.click(clear);
        expect(await staffVoting.findByText('No vote is on Barracks TV.')).toBeInTheDocument();
        expect(request).toHaveBeenCalledWith(LIVE_ROUNDS_PATH, expect.objectContaining({
            method: 'POST', body: { action: 'clearPoll', pollId: currentPoll.id },
        }));
        expect(screen.getByText('Vote cleared from Barracks TV and player voting.')).toBeInTheDocument();
        expect(staffVoting.queryByRole('button', { name: 'Clear vote' })).not.toBeInTheDocument();
        expect(staffVoting.getByRole('button', { name: 'Open voting' })).toBeEnabled();
        expect(screen.getByRole('heading', { name: scheduled.title })).toBeInTheDocument();
    } finally {
        confirm.mockRestore();
    }
});

test('a stale clear shows the error and reloads the newer vote for review', async () => {
    let poll = currentPoll;
    const request = jest.fn(async (path, options) => {
        if (path === ROUND_CATALOG_PATH) return catalog;
        if (options.method !== 'POST') return { serverNow, isStaff: true, games: [], poll };
        poll = { ...currentPoll, id: '5983801c-1c9b-4a65-ae98-46965c9e1d8b', title: 'New game vote' };
        throw Object.assign(new Error('The vote has changed.'), { status: 409 });
    });
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    try {
        render(<AdminFieldRounds request={request} />);
        fireEvent.click(await screen.findByRole('button', { name: 'Clear vote' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('The vote has changed.');
        expect(await screen.findByRole('heading', { name: 'New game vote' })).toBeInTheDocument();
        expect(screen.queryByText('Vote cleared from Barracks TV and player voting.')).not.toBeInTheDocument();
        expect(request.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
    } finally {
        confirm.mockRestore();
    }
});

test('uses a read-only public board and displays live round and both respawns in Barracks TV', async () => {
    const request = jest.fn().mockResolvedValue({ serverNow, isStaff: false, poll: null, games: [playing] });
    render(<HelmetProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BarracksTV request={request} />
    </MemoryRouter></HelmetProvider>);

    expect(await screen.findByRole('heading', { name: 'Countdown' })).toBeInTheDocument();
    expect(screen.getByText('Alpha HQ')).toBeInTheDocument();
    expect(screen.getByText('Foxtrot HQ')).toBeInTheDocument();
    expect(screen.getByRole('timer', { name: 'Round time remaining' })).toHaveTextContent('25:00');
    expect(screen.queryByRole('button', { name: 'End round' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /on map/i })).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(LIVE_ROUNDS_PATH, { signal: expect.anything() });
});

test('opens the selected public map pin and labels it with the round location', async () => {
    const round = { ...playing, briefingLocation: '', mapPins: { briefing: { x: .25, y: .8 }, camp: { x: .1, y: .2 }, solid: { x: .7, y: .35 } } };
    const request = jest.fn().mockResolvedValue({ serverNow, isStaff: false, poll: null, games: [round] });
    render(<HelmetProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BarracksTV request={request} />
    </MemoryRouter></HelmetProvider>);

    const solid = await screen.findByRole('button', { name: 'Show Solid respawn on map' });
    expect(screen.getByText('Marked on map')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show Camo respawn on map' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Map pin locations' })).not.toBeInTheDocument();
    fireEvent.click(solid);
    expect(solid).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: /highlighting Solid respawn/ })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Map pin locations' })).getByText(/Foxtrot HQ/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show Briefing on map' }));
    expect(solid).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('img', { name: /highlighting Briefing/ })).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
});

test('rejects nonexistent and repeated times during California clock changes', () => {
    expect(() => fieldTimeISO('2026-03-08T02:30')).toThrow('does not exist');
    expect(() => fieldTimeISO('2026-11-01T01:30')).toThrow('occurs twice');
});

test('staff start a preset TV timer, replace its remaining time and stop it', async () => {
    let clock = { kind: null, endsAt: null, revision: 0 };
    const request = jest.fn(async (path, { method, body }) => {
        if (path === ROUND_CATALOG_PATH) return catalog;
        if (method !== 'POST') return { serverNow, games: [], isStaff: true, barracksClock: clock };
        expect(body.revision).toBe(clock.revision);
        clock = { kind: body.kind ?? null, revision: clock.revision + 1,
            endsAt: body.kind ? new Date(Date.parse(serverNow) + body.durationMinutes * 60000).toISOString() : null };
        return { ok: true };
    });
    render(<AdminFieldRounds request={request} />);
    const region = within(await screen.findByRole('region', { name: 'Barracks TV countdown' }));
    fireEvent.click(region.getByRole('button', { name: '5-minute break' }));
    expect(await region.findByRole('timer')).toHaveTextContent('05:00');
    fireEvent.change(region.getByLabelText('Timer type'), { target: { value: 'lunch' } });
    fireEvent.change(region.getByLabelText('Minutes'), { target: { value: '24' } });
    fireEvent.click(region.getByRole('button', { name: 'Replace timer' }));
    await waitFor(() => expect(region.getByRole('timer')).toHaveTextContent('24:00'));
    expect(clock.kind).toBe('lunch');
    fireEvent.click(region.getByRole('button', { name: '60 min to safety brief' }));
    expect(await region.findByRole('timer', { name: 'Time until safety brief' })).toHaveTextContent('1:00:00');
    expect(request).toHaveBeenCalledWith(LIVE_ROUNDS_PATH, expect.objectContaining({
        method: 'POST', body: { action: 'setBarracksClock', kind: 'safetyBrief', durationMinutes: 60, revision: 2 },
    }));
    expect(region.getByText(/Safety brief starts at/)).toBeInTheDocument();
    expect(region.getByLabelText('Timer type')).toHaveValue('safetyBrief');
    expect(region.getByLabelText('Minutes')).toHaveValue(60);
    fireEvent.change(region.getByLabelText('Minutes'), { target: { value: '12' } });
    fireEvent.click(region.getByRole('button', { name: 'Replace timer' }));
    await waitFor(() => expect(region.getByRole('timer', { name: 'Time until safety brief' })).toHaveTextContent('12:00'));
    expect(request).toHaveBeenCalledWith(LIVE_ROUNDS_PATH, expect.objectContaining({
        method: 'POST', body: { action: 'setBarracksClock', kind: 'safetyBrief', durationMinutes: 12, revision: 3 },
    }));
    fireEvent.click(region.getByRole('button', { name: 'Stop timer' }));
    expect(await region.findByText('No countdown running.')).toBeInTheDocument();
});

test.each([
    ['lunch', 'Lunch break', 'Time until break ends', 'Return at'],
    ['safetyBrief', 'Safety brief', 'Time until safety brief', 'Safety brief starts at'],
])('a public TV reads a remote %s deadline, counts down against server time and returns to the round', async (kind, heading, timerLabel, deadlineText) => {
    jest.useFakeTimers();
    try {
        const request = jest.fn().mockResolvedValue({ serverNow, games: [scheduled], isStaff: false,
            barracksClock: { kind, endsAt: '2026-11-16T18:00:03.000Z', revision: 4 } });
        render(<HelmetProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <BarracksTV request={request} />
        </MemoryRouter></HelmetProvider>);
        await act(async () => {});
        expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
        expect(screen.getByText(new RegExp(deadlineText))).toHaveTextContent(/10:00 AM Pacific/);
        expect(screen.getByRole('timer', { name: timerLabel })).toHaveTextContent('00:03');
        act(() => jest.advanceTimersByTime(2000));
        expect(screen.getByRole('timer', { name: timerLabel })).toHaveTextContent('00:01');
        act(() => jest.advanceTimersByTime(1000));
        expect(screen.queryByRole('heading', { name: heading })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Countdown' })).toBeInTheDocument();
        expect(request).toHaveBeenCalledWith(LIVE_ROUNDS_PATH, { signal: expect.anything() });
    } finally {
        jest.useRealTimers();
    }
});

test('Barracks TV starts with new awards, retries a failed fetch, and plays every patch in a burst while the break clock runs', async () => {
    jest.useFakeTimers();
    try {
        const awards = [
            { sequence: 13, playerName: 'North Star', patchName: 'Tower of Power', kind: 'battle', imageUrl: 'https://app.usairsoftfield.com/assets/battle-badges/field-badges.svg#tower-of-power' },
            { sequence: 14, playerName: 'Mongoose', patchName: 'Battle Buddy', kind: 'virtual', imageUrl: 'https://app.usairsoftfield.com/assets/badges/battle-buddy.webp' },
            { sequence: 15, playerName: 'North Star', patchName: 'Silver Star', kind: 'battle', imageUrl: 'https://app.usairsoftfield.com/assets/battle-badges/field-badges.svg#silver-star' },
        ];
        let firstAttempt = true;
        const request = jest.fn(async path => {
            if (path === LIVE_ROUNDS_PATH) return { serverNow, games: [scheduled], isStaff: false, celebrationCursor: firstAttempt ? 12 : 15,
                barracksClock: { kind: 'break', endsAt: '2026-11-16T18:05:00.000Z', revision: 7 } };
            if (path.endsWith('After=12')) {
                if (firstAttempt) { firstAttempt = false; throw Error('Offline'); }
                return { cursor: 14, events: awards.slice(0, 2), hasMore: true };
            }
            if (path.endsWith('After=14')) return { cursor: 15, events: awards.slice(1), hasMore: false };
            return { cursor: 15, events: [], hasMore: false };
        });
        render(<HelmetProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <BarracksTV request={request} />
        </MemoryRouter></HelmetProvider>);
        await act(async () => {});
        expect(screen.queryByLabelText('Patch celebration')).not.toBeInTheDocument();
        await act(async () => { jest.advanceTimersByTime(3000); });
        let card = screen.getByLabelText('Patch celebration');
        expect(within(card).getByRole('heading', { name: 'North Star' })).toBeInTheDocument();
        expect(card.querySelector('img')).toHaveAttribute('src', awards[0].imageUrl);
        expect(card).toHaveTextContent('Tower of Power');
        expect(screen.getByRole('timer', { name: 'Time until break ends' })).toHaveTextContent('04:57');
        await act(async () => { jest.advanceTimersByTime(1); });
        await act(async () => { jest.advanceTimersByTime(5999); });
        card = screen.getByLabelText('Patch celebration');
        expect(card).toHaveTextContent('Mongoose');
        expect(card).toHaveTextContent('Battle Buddy');
        await act(async () => { jest.advanceTimersByTime(6000); });
        expect(screen.getByLabelText('Patch celebration')).toHaveTextContent('Silver Star');
        await act(async () => { jest.advanceTimersByTime(6000); });
        expect(screen.queryByLabelText('Patch celebration')).not.toBeInTheDocument();
        expect(request.mock.calls.some(([path]) => path.endsWith('After=0'))).toBe(false);
        expect(screen.getByRole('heading', { name: 'Countdown' })).toBeInTheDocument();
    } finally {
        jest.useRealTimers();
    }
});
