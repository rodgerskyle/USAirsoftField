import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PlayerMilestones from './PlayerMilestones';
import PlayerComparison from './PlayerComparison';
import { milestoneDate } from '../constants/playerExperience';

jest.mock('./PlayerPrestige', () => ({ PrestigeEmblem: ({ count }) => <span>Prestige {count}</span> }));
const left = 'PlayerLeft1234';
const right = 'PlayerRight1234';
const originalFetch = global.fetch;
const reply = data => ({ ok: true, json: async () => data });
function show(element, path = '/') { return render(<MemoryRouter initialEntries={[path]}><HelmetProvider>{element}</HelmetProvider></MemoryRouter>); }
beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; });

test('timeline shows recorded dates, current rank context, and earlier milestones without rendering markup', async () => {
  const record = { player: { id: left, name: 'Operator <script>', points: 455, rankName: 'Sergeant', prestigeCount: 0, patchesEarned: 4 }, items: [{ id: 'one', date: '2026-11-17', type: 'first-game', title: 'First recorded game day', detail: '2 wins · 1 loss' }], nextCursor: 'page-two', historyNote: 'Earlier rank promotion dates may be unavailable.' };
  global.fetch.mockResolvedValueOnce(reply(record)).mockResolvedValueOnce(reply({ ...record, items: [{ id: 'two', date: '2026-11-16T21:00:00.000Z', type: 'team', title: 'Joined Rebels', detail: 'Field team' }], nextCursor: null }));
  show(<PlayerMilestones playerId={left} embedded />);
  expect(await screen.findByText('First recorded game day')).toBeInTheDocument();
  expect(screen.getByText('Operator <script>')).toBeInTheDocument();
  expect(document.querySelector('script')).toBeNull();
  expect(screen.getByText('Earlier rank promotion dates may be unavailable.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Load earlier milestones' }));
  expect(await screen.findByText('Joined Rebels')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenLastCalledWith(expect.stringContaining('cursor=page-two'), expect.objectContaining({ credentials: 'omit' }));
});

test('changing the timeline player aborts and hides the previous player records', async () => {
  let first;
  global.fetch.mockImplementationOnce(() => new Promise(resolve => { first = resolve; })).mockResolvedValueOnce(reply({ player: { id: right, name: 'Bravo', rankName: 'Private', points: 0, patchesEarned: 0 }, items: [], nextCursor: null }));
  const view = show(<PlayerMilestones playerId={left} embedded />);
  view.rerender(<MemoryRouter><HelmetProvider><PlayerMilestones playerId={right} embedded /></HelmetProvider></MemoryRouter>);
  expect(await screen.findByText('Bravo')).toBeInTheDocument();
  first(reply({ player: { id: left, name: 'Stale name' }, items: [] }));
  expect(screen.queryByText('Stale name')).not.toBeInTheDocument();
  expect(global.fetch.mock.calls[0][1].signal.aborted).toBe(true);
});

test('monthly comparisons keep lifetime spot and current Prestige clearly labeled', async () => {
  const players = [left, right].map((id, index) => ({ id, name: index ? 'Bravo' : 'Alpha', points: index ? 13 : 20, careerPoints: 4600, wins: index ? 1 : 2, losses: index ? 1 : 0, rankName: 'General Of The Army', prestigeCount: 2, patchesEarned: index ? 3 : 4, uniquePatches: 2, allTimePlace: index + 7 }));
  global.fetch.mockResolvedValueOnce(reply({ players, view: 'all', month: null })).mockResolvedValueOnce(reply({ players, view: 'monthly', month: '2026-11' }));
  show(<PlayerComparison />, `/?left=${left}&right=${right}`);
  expect(await screen.findByRole('table')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Compare results'), { target: { value: 'monthly' } });
  fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-11' } });
  fireEvent.click(screen.getByRole('button', { name: 'Compare players' }));
  expect(await screen.findByText('2026-11 game results')).toBeInTheDocument();
  const table = screen.getByRole('table');
  expect(within(table).getByRole('rowheader', { name: 'All-time leaderboard spot' })).toBeInTheDocument();
  expect(within(table).getByRole('rowheader', { name: 'Current Prestige' })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenLastCalledWith(expect.stringContaining('view=monthly&month=2026-11'), expect.objectContaining({ credentials: 'omit' }));
});


test('milestone timestamps use Pacific dates while date-only game dates retain their day', () => {
  expect(milestoneDate('2026-11-17T02:00:00.000Z')).toBe('Nov 16, 2026');
  expect(milestoneDate('2026-11-17')).toBe('Nov 17, 2026');
});
