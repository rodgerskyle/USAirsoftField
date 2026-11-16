import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import AdminFieldRounds from './AdminFieldRounds';
import BarracksTV from './BarracksTV';
import { fieldTimeISO, LIVE_ROUNDS_PATH, ROUND_CATALOG_PATH } from './FieldRoundsShared';

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
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(LIVE_ROUNDS_PATH, { signal: expect.anything() });
});

test('rejects nonexistent and repeated times during California clock changes', () => {
    expect(() => fieldTimeISO('2026-03-08T02:30')).toThrow('does not exist');
    expect(() => fieldTimeISO('2026-11-01T01:30')).toThrow('occurs twice');
});
