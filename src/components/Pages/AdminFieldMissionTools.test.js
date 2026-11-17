import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import AdminFieldMissionTools from './AdminFieldMissionTools';

const endpoint = '/api/field-mission-tools';
const rounds = [
  { modeId: 'countdown', title: 'Countdown', startsAt: '2026-11-17T18:00:00.000Z', endsAt: '2026-11-17T18:25:00.000Z', location: 'The Hive', briefingLocation: 'Barracks', camoSpawn: 'North', solidSpawn: 'South', notes: '' },
  { modeId: 'three-flag', title: '3 Flag', startsAt: '2026-11-17T18:35:00.000Z', endsAt: '2026-11-17T19:00:00.000Z', location: 'The Hive', briefingLocation: 'Barracks', camoSpawn: 'North', solidSpawn: 'South', notes: '' },
];
const library = {
  serverNow: '2026-11-17T17:00:00.000Z', suggestedDay: { startsAt: rounds[0].startsAt, endsAt: '2026-11-17T21:00:00.000Z' },
  modes: [{ id: 'countdown', name: 'Countdown', type: 'Capture & control' }, { id: 'three-flag', name: '3 Flag', type: 'Capture & control' }],
  recentGames: [{ id: 'published-round', ...rounds[0] }], feedback: null,
};
let confirm;
beforeEach(() => {
  confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => '6f8b59cd-0144-4f27-89c4-e675fe893ff3' } });
});
afterEach(() => confirm.mockRestore());

test('plans without publishing and preserves the same publication request when a saved response is lost', async () => {
  let attempts = 0;
  const request = jest.fn(async (_path, options) => {
    if (!options.body) return library;
    if (options.body.action === 'plan') return { plan: { rounds: rounds.map(round => ({ ...round })), unusedMinutes: 10 } };
    if (++attempts === 1) throw new Error('Connection interrupted');
    return { ok: true, count: 2, gameIds: ['one', 'two'] };
  });
  render(<AdminFieldMissionTools request={request} />);
  const planner = within(await screen.findByRole('region', { name: 'Game rotation planner' }));
  fireEvent.change(planner.getByLabelText('Field area'), { target: { value: 'The Hive' } });
  fireEvent.click(planner.getByRole('button', { name: 'Suggest rotation' }));
  await planner.findByText('Review your rotation');
  expect(request.mock.calls.some(([, options]) => options.body?.action === 'publishPlan')).toBe(false);
  fireEvent.click(planner.getByRole('button', { name: 'Move round 2 earlier' }));
  expect(planner.getByLabelText('Round 1 game mode')).toHaveValue('three-flag');
  fireEvent.click(planner.getByRole('button', { name: 'Publish reviewed rotation' }));
  await screen.findByText('Connection interrupted');
  fireEvent.click(planner.getByRole('button', { name: 'Publish reviewed rotation' }));
  await screen.findByText('2 rounds added to Round Controls. Staff start each round from the live board.');
  const publications = request.mock.calls.filter(([, options]) => options.body?.action === 'publishPlan');
  expect(publications[0][0]).toBe(endpoint);
  expect(publications[0][1].body).toEqual(publications[1][1].body);
  expect(publications[0][1].body.rounds[0].modeId).toBe('three-flag');
  expect(confirm).toHaveBeenCalledTimes(2);
});

test('loads an existing round and keeps unconfirmed briefing rules visible in the print view', async () => {
  const request = jest.fn(async (_path, options) => options.body ? { brief: {
    title: 'Countdown', objective: 'Contest the field clock.', modeNote: 'Confirm the clock at briefing.', location: 'The Hive',
    briefingLocation: 'Barracks', camoSpawn: 'North', solidSpawn: 'South', respawns: 'Confirm at briefing',
    winCondition: 'First timer at zero', notes: '<img src=x>', missing: ['Hit / revive / respawn rules'],
  } } : library);
  const print = jest.spyOn(window, 'print').mockImplementation(() => {});
  render(<AdminFieldMissionTools request={request} />);
  const briefing = within(await screen.findByRole('region', { name: 'Referee briefing builder' }));
  fireEvent.change(briefing.getByLabelText('Load a published round'), { target: { value: 'published-round' } });
  expect(briefing.getByLabelText('Camo spawn')).toHaveValue('North');
  fireEvent.change(briefing.getByLabelText('Winning condition'), { target: { value: 'First timer at zero' } });
  fireEvent.click(briefing.getByRole('button', { name: 'Build briefing' }));
  await briefing.findByText('Confirm before play · Hit / revive / respawn rules');
  expect(request).toHaveBeenLastCalledWith(endpoint, expect.objectContaining({ body: expect.objectContaining({ action: 'brief', camoSpawn: 'North', winCondition: 'First timer at zero' }) }));
  expect(briefing.getByText('<img src=x>')).toBeInTheDocument();
  fireEvent.click(briefing.getByRole('button', { name: 'Print briefing' }));
  expect(print).toHaveBeenCalledTimes(1);
  print.mockRestore();
});

test('renders a denied staff response without leaving planning controls on screen', async () => {
  const request = jest.fn().mockRejectedValue(new Error('Unlock USAW Staff Controls.'));
  render(<AdminFieldMissionTools request={request} />);
  await screen.findByText('Unlock USAW Staff Controls.');
  expect(screen.queryByRole('button', { name: 'Suggest rotation' })).not.toBeInTheDocument();
});
