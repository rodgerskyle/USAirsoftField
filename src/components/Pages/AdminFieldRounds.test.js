import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import AdminFieldRounds from './AdminFieldRounds';
import BarracksTV from './BarracksTV';
import { fieldTimeISO, LIVE_ROUNDS_PATH, ROUND_CATALOG_PATH, STAFF_ROUNDS_PATH } from './FieldRoundsShared';

const serverNow = '2026-11-16T18:00:00.000Z';
const briefingPath = LIVE_ROUNDS_PATH + '?briefing=1';
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
    const request = jest.fn(async path => path === briefingPath ? { briefing: null, displayRevision: 0 } :
        { serverNow, isStaff: false, poll: null, games: [playing] });
    render(<HelmetProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BarracksTV request={request} />
    </MemoryRouter></HelmetProvider>);

    expect(await screen.findByRole('heading', { name: 'Countdown' })).toBeInTheDocument();
    expect(screen.getByText('Alpha HQ')).toBeInTheDocument();
    expect(screen.getByText('Foxtrot HQ')).toBeInTheDocument();
    expect(screen.getByRole('timer', { name: 'Round time remaining' })).toHaveTextContent('25:00');
    expect(screen.queryByRole('button', { name: 'End round' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /on map/i })).not.toBeInTheDocument();
    expect(request.mock.calls.map(([path]) => path).sort()).toEqual([LIVE_ROUNDS_PATH, briefingPath]);
    expect(request).toHaveBeenCalledWith(LIVE_ROUNDS_PATH, { signal: expect.anything() });
});

test('opens the selected public map pin and labels it with the round location', async () => {
    const round = { ...playing, briefingLocation: '', mapPins: { briefing: { x: .25, y: .8 }, camp: { x: .1, y: .2 }, solid: { x: .7, y: .35 } } };
    const request = jest.fn(async path => path === briefingPath ? { briefing: null, displayRevision: 0 } :
        { serverNow, isStaff: false, poll: null, games: [round] });
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
    expect(request.mock.calls.map(([path]) => path).sort()).toEqual([LIVE_ROUNDS_PATH, briefingPath]);
});

test('the staff device can prepare and present a round while a separate TV follows the marks and zoom', async () => {
    let game = { ...scheduled, briefingRevision: 0, briefingMap: { marks: [], view: { zoom: 1, x: .5, y: .5 } } };
    let displayGameId = null;
    let displayRevision = 0;
    const staffRequest = jest.fn(async (path, { body } = {}) => {
        if (path === ROUND_CATALOG_PATH) return catalog;
        if (path === STAFF_ROUNDS_PATH) return { serverNow, games: [game], isStaff: true, briefingGameId: displayGameId, briefingDisplayRevision: displayRevision };
        if (body.gameId !== game.id) throw Error('Wrong round');
        if (body.action === 'saveBriefingMap') {
            expect(body.revision).toBe(game.briefingRevision);
            game = { ...game, briefingMap: body.map, briefingRevision: game.briefingRevision + 1 };
            return { ok: true, revision: game.briefingRevision };
        }
        expect(body.displayRevision).toBe(displayRevision);
        displayGameId = body.action === 'showBriefingMap' ? game.id : null;
        return { ok: true, displayRevision: ++displayRevision };
    });
    const publicRequest = jest.fn(async path => {
        if (path === LIVE_ROUNDS_PATH) return { serverNow, games: [], isStaff: false };
        if (path === briefingPath) return { displayRevision, briefing: displayGameId && {
            gameId: game.id, title: game.title, mapPins: {}, map: game.briefingMap, revision: game.briefingRevision,
        } };
        throw Error('Unexpected public request');
    });
    const staff = within(render(<AdminFieldRounds request={staffRequest} />).container);
    const tv = within(render(<HelmetProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BarracksTV request={publicRequest} />
    </MemoryRouter></HelmetProvider>).container);
    const receive = () => act(async () => { window.dispatchEvent(new Event('online')); });

    fireEvent.click(await staff.findByRole('button', { name: 'Open briefing map' }));
    const editor = within(staff.getByRole('region', { name: 'Briefing map for Countdown' }));
    const stage = editor.getByRole('img', { name: 'Official field map' });
    fireEvent.click(editor.getByRole('button', { name: 'Circle' }));
    fireEvent.keyDown(stage, { key: 'Enter' });
    await waitFor(() => expect(game.briefingMap.marks).toEqual([{type:'circle',color:'yellow',x:.5,y:.5}]));
    fireEvent.click(editor.getByRole('button', { name: 'X' }));
    fireEvent.keyDown(stage, { key: 'ArrowRight' });
    fireEvent.keyDown(stage, { key: 'Enter' });
    await waitFor(() => expect(game.briefingMap.marks[1]).toEqual({type:'x',color:'yellow',x:.515,y:.5}));
    expect(tv.queryByRole('region', { name: 'Round briefing' })).not.toBeInTheDocument();
    fireEvent.click(editor.getByRole('button', { name: 'Show on Barracks TV' }));
    await editor.findByRole('button', { name: 'Stop showing on TV' });
    await receive();
    const display = within(tv.getByRole('region', { name: 'Round briefing' }));
    expect(display.getByRole('heading', { name: game.title })).toBeVisible();
    const screenMap = display.getByRole('img', { name: 'Official field map' });
    expect(screenMap.querySelector('[data-layer="drawings"] circle')).toHaveAttribute('r', '36');
    expect(screenMap.querySelector('[data-layer="drawings"] path')).toBeVisible();
    expect(tv.getByRole('button', { name: 'Full screen' })).toBeVisible();
    expect(tv.queryByRole('heading', { name: 'No round on the board' })).not.toBeInTheDocument();
    expect(tv.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument();

    // A round can go live and move to the top of the board while staff are drawing.
    game = { ...game, status: 'live', startsAt: serverNow, revision: game.revision + 1 };
    fireEvent.click(staff.getByRole('button', { name: 'Refresh board' }));
    await staff.findByRole('button', { name: 'End round' });
    expect(editor.getByRole('img', { name: 'Official field map' })).toBe(stage);
    fireEvent.click(editor.getByRole('button', { name: 'Zoom in' }));
    await waitFor(() => expect(game.briefingMap.view.zoom).toBeGreaterThan(1));
    await receive();
    expect(screenMap.getAttribute('viewBox')).toBe(stage.getAttribute('viewBox'));
    fireEvent.click(editor.getByRole('button', { name: 'Stop showing on TV' }));
    await editor.findByRole('button', { name: 'Show on Barracks TV' });
    await receive();
    expect(tv.getByRole('heading', { name: 'No round on the board' })).toBeVisible();
    expect(tv.queryByRole('region', { name: 'Round briefing' })).not.toBeInTheDocument();
    expect(publicRequest.mock.calls.every(([, options]) => !options?.method || options.method === 'GET')).toBe(true);
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

test('staff open an MVP write-in vote for a specific played round and review tied names before clearing', async () => {
    const game = { id: playing.id, title: 'Game one', startsAt: serverNow };
    let poll = null;
    let available = [game];
    let locked = false;
    const saved = [];
    const request = jest.fn(async (path, opts) => {
        if (path === ROUND_CATALOG_PATH) return catalog;
        if (opts.method !== 'POST') {
            expect(path).toBe(STAFF_ROUNDS_PATH);
            if (locked) throw new Error('Staff access expired.');
            return { isStaff: true, serverNow, games: [], mvpRounds: available, mvpPoll: poll, mvpPastResults: [
                {id:'past', roundTitle:'Opening round', startsAt:serverNow, totalVotes:4,
                    leaders:[{nomination:'Quinn River',votes:3}], nominees:[{nomination:'Quinn River',votes:3},{nomination:'Blue scarf',votes:1}]},
                {id:'first', roundTitle:'Warmup', startsAt:serverNow, totalVotes:0, leaders:[]},
            ] };
        }
        const body = opts.body;
        saved.push(body);
        if (body.action === 'createMvpPoll') {
            available = [];
            poll = { id: 'mvp-first', gameId: body.gameId, roundTitle: game.title, startsAt: serverNow,
                closesAt: body.closesAt, closed: false, totalVotes: 2,
                nominees: [{nomination: 'Alex Smith', votes: 1}, {nomination: 'Player in the blue vest', votes: 1}] };
        } else if (body.action === 'closeMvpPoll') poll = {...poll, closed: true};
        else if (body.action === 'clearMvpPoll') { poll = null; available = [game]; }
        return { ok: true, pollId: 'mvp-first' };
    });
    render(<AdminFieldRounds request={request} />);
    const panel = within(await screen.findByRole('region', {name: 'Round MVP voting'}));
    fireEvent.change(panel.getByLabelText('Round for MVP voting'), {target: {value: game.id}});
    fireEvent.change(panel.getByLabelText('MVP voting closes · California'), {target: {value: '2026-11-16T10:22'}});
    fireEvent.click(panel.getByRole('button', {name: 'Open MVP voting'}));
    await panel.findByRole('heading', {name: game.title});
    expect(saved).toEqual([{action: 'createMvpPoll', gameId: game.id, closesAt: '2026-11-16T18:22:00.000Z'}]);
    expect(panel.getByText('Alex Smith')).toBeInTheDocument();
    expect(panel.getByText('Player in the blue vest')).toBeInTheDocument();
    const earlier = panel.getByText('Earlier round results').closest('details');
    expect(earlier.open).toBe(false);
    fireEvent.click(panel.getByText('Earlier round results'));
    expect(within(earlier).getByText('Blue scarf · 1 vote')).toBeInTheDocument();
    expect(within(earlier).getByText('No votes')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Open voting'})).toBeInTheDocument();
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    try {
        fireEvent.click(panel.getByRole('button', {name: 'Close MVP voting'}));
        expect(saved).toHaveLength(1);
        confirm.mockReturnValue(true);
        fireEvent.click(panel.getByRole('button', {name: 'Close MVP voting'}));
        await panel.findByRole('link', {name: 'Wins & Losses'});
        expect(saved.at(-1)).toEqual({action: 'closeMvpPoll', pollId: 'mvp-first'});
        locked = true;
        fireEvent.click(screen.getByRole('button', {name: 'Refresh board'}));
        await screen.findByRole('alert');
        expect(screen.queryByText('Alex Smith')).not.toBeInTheDocument();
        locked = false;
        fireEvent.click(screen.getByRole('button', {name: 'Refresh board'}));
        fireEvent.click(await screen.findByRole('button', {name: 'Clear MVP vote'}));
        await waitFor(() => expect(screen.queryByText('Alex Smith')).not.toBeInTheDocument());
        expect(saved.at(-1)).toEqual({action: 'clearMvpPoll', pollId: 'mvp-first'});
        expect(screen.queryByRole('button', {name: 'Clear MVP vote'})).not.toBeInTheDocument();
        expect(screen.getByLabelText('Round for MVP voting').querySelector('option[value="' + game.id + '"]')).toBeInTheDocument();
    } finally { confirm.mockRestore(); }
});


test('round shortcuts focus the chosen controls without submitting an action', async () => {
    const request = jest.fn(async path => path === ROUND_CATALOG_PATH ? catalog : {
        serverNow, isStaff: true, games: [], poll: null, mvpRounds: [],
    });
    render(<AdminFieldRounds request={request} />);
    const sections = await screen.findByRole('navigation', { name: 'Round control sections' });
    fireEvent.click(within(sections).getByRole('link', { name: 'MVP vote' }));
    expect(screen.getByRole('heading', { name: 'Round MVP voting' })).toHaveFocus();
    fireEvent.click(within(sections).getByRole('link', { name: 'TV countdown' }));
    expect(screen.getByRole('heading', { name: 'Barracks TV countdown' })).toHaveFocus();
    expect(request.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
});

test.each([false, true])('one-screen desk ends the selected game with optional nominations (%s)', async openVote => {
    const finishButton = openVote ? 'End game & open MVP nominations' : 'End game';
    const other = { ...scheduled, id: 'c92cb5f1-47d7-4788-8e1f-40ac0ab72812', title: 'Second field game' };
    let selected = other;
    const writes = [];
    const request = mockStaffRequest({ current: () => [scheduled, selected], onWrite: body => {
        writes.push(body);
        if (body.phase === 'start') selected = { ...other, ...playing, id: other.id, title: other.title };
        if (body.phase === 'finish') selected = { ...selected, status: 'ended' };
        return { ok: true, commandId: body.commandId };
    } });
    const oldCrypto = window.crypto;
    if (!window.crypto?.randomUUID) Object.defineProperty(window, 'crypto', { configurable: true, value: { ...oldCrypto,
        randomUUID: () => 'ca19b898-de43-479b-a8e2-f18eb5fa2b88' } });
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    try {
        render(<AdminFieldRounds request={request} />);
        const panel = within(await screen.findByRole('region', { name: 'Run the next round' }));
        fireEvent.change(panel.getByRole('combobox'), { target: { value: other.id } });
        fireEvent.click(panel.getByRole('button', { name: 'Start game' }));
        await waitFor(() => expect(panel.getByRole('button', { name: finishButton })).toBeEnabled());
        expect(writes[0]).toEqual(expect.objectContaining({ action: 'runRoundConsole', phase: 'start', gameId: other.id, revision: 6 }));
        fireEvent.click(panel.getByRole('button', { name: finishButton }));
        expect(writes).toHaveLength(1);
        confirm.mockReturnValue(true);
        fireEvent.click(panel.getByRole('button', { name: finishButton }));
        await waitFor(() => expect(writes).toHaveLength(2));
        expect(writes[1]).toEqual(expect.objectContaining({ phase: 'finish', gameId: other.id, revision: 7 }));
        expect(writes[1].openMvpVote).toBe(openVote || undefined);
        await screen.findByText(openVote ? 'Round ended and MVP nominations are open.' : 'Round ended.');
    } finally {
        confirm.mockRestore();
        if (window.crypto !== oldCrypto) Object.defineProperty(window, 'crypto', { value: oldCrypto, configurable: true });
    }
});

test('an existing nomination vote only disables the optional end-and-nominate action', async () => {
    const request = jest.fn(async path => path === ROUND_CATALOG_PATH ? catalog : {
        isStaff: true, serverNow, games: [playing], mvpPoll: {
            id: 'earlier-vote', gameId: 'previous-round', closesAt: playing.endsAt, closed: false,
        },
    });
    render(<AdminFieldRounds request={request} />);
    const panel = within(await screen.findByRole('region', { name: 'Run the next round' }));
    expect(panel.getByRole('button', { name: 'End game' })).toBeEnabled();
    expect(panel.getByRole('button', { name: 'End game & open MVP nominations' })).toBeDisabled();
});

test('ending a game opens its saved lineup and requires separate winner review and confirmation', async () => {
    let ended = false;
    const lineup = {
        game: { ...playing, status:'ended', startedAt:serverNow }, recentGames: [{ ...playing, startedAt:serverNow }],
        players:[{playerId:'member-a',displayName:'Avery',side:'camo',member:true},
            {playerId:'guest-b',displayName:'Jordan',side:'solid',member:false}],
        candidates:[], revision:4, winner:null, progress:{saved:0,remaining:0,failed:0}, failures:[],
    };
    const request = jest.fn(async (path, options) => {
        if (path === ROUND_CATALOG_PATH) return catalog;
        if (path === '/api/round-roster') {
            if (options.body.action === 'lineupResult') {
                expect(options.body).toEqual({action:'lineupResult',gameId:playing.id,winner:'camo',revision:4});
                return {...lineup, winner:'camo', progress:{saved:1,remaining:0,failed:0}};
            }
            expect(options.body).toEqual({action:'lineup',gameId:playing.id});
            return lineup;
        }
        if (options.method === 'POST') {
            ended = true;
            return {ok:true,gameId:playing.id};
        }
        return {serverNow,isStaff:true,games:ended ? [] : [playing]};
    });
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    try {
        render(<AdminFieldRounds request={request} />);
        fireEvent.click(await screen.findByRole('button',{name:'End round'}));
        const desk = within(await screen.findByRole('region',{name:'Round lineup and result'}));
        fireEvent.click(await desk.findByRole('button',{name:'Review Yellow / Camo win'}));
        expect(desk.getByText(/1 member win.*0 member loss.*1 walk-on/)).toBeVisible();
        expect(request.mock.calls.filter(([,options]) => options.body?.action === 'lineupResult')).toHaveLength(0);
        fireEvent.click(desk.getByRole('button',{name:'Confirm round result'}));
        expect(await desk.findByText('Round result recorded.')).toBeVisible();
        expect(desk.getByRole('link',{name:'Individual score corrections and MVP awards'})).toHaveAttribute('href','/admin/scores');
    } finally { confirm.mockRestore(); }
});

test('one result confirmation saves a 40-member lineup across ten score requests', async () => {
    const game = { ...playing, status:'ended', startedAt:serverNow };
    const players = Array.from({length:40}, (_, i) => ({
        playerId:'member-' + i, displayName:'Member ' + i, side:i < 24 ? 'camo' : 'solid', member:true,
    }));
    const scored = [];
    const batches = [];
    const request = jest.fn(async (path, options) => {
        if (path === ROUND_CATALOG_PATH) return catalog;
        if (path !== '/api/round-roster') return { serverNow, isStaff:true, games:[] };
        const { body } = options;
        if (body.action === 'lineupResult') {
            batches.push(body);
            const page = players.slice(scored.length, scored.length + 4);
            if (!page.length) throw Error('Unexpected request after the final score');
            scored.push(...page.map(player => player.playerId));
        }
        return { game, recentGames:[game], players, candidates:[], revision:9, winner:scored.length ? 'solid' : null,
            progress:{saved:scored.length, remaining:players.length - scored.length, failed:0}, failures:[] };
    });
    render(<AdminFieldRounds request={request} />);
    const desk = within(await screen.findByRole('region',{name:'Round lineup and result'}));
    fireEvent.click(desk.getByRole('button',{name:'Review lineup'}));
    fireEvent.click(await desk.findByRole('button',{name:'Review Blue / Solid win'}));
    expect(desk.getByText(/16 member wins.*24 member losses/)).toBeVisible();
    expect(batches).toHaveLength(0);
    fireEvent.click(desk.getByRole('button',{name:'Confirm round result'}));
    expect(await desk.findByText('Round result recorded.')).toBeVisible();
    expect(batches).toEqual(Array(10).fill({action:'lineupResult',gameId:game.id,winner:'solid',revision:9}));
    expect(scored).toEqual(players.map(player => player.playerId));
    expect(desk.queryByRole('button',{name:'Resume saving results'})).not.toBeInTheDocument();
});
