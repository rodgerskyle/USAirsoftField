import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PlayerMilestones from './PlayerMilestones';
import PlayerComparison from './PlayerComparison';
import { milestoneDate } from '../constants/playerExperience';
import { mergeMilestonePage } from '../constants/milestoneHistory';

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

test('the timeline shows dated and undated achievements once and stops a cursor cycle', async () => {
  const rank = { id: 'rank:1', title: 'Promoted to Private', type: 'rank', detail: 'Rank earned', date: '2024-06', datePrecision: 'month' };
  const pass = { id: 'free-game:1', title: 'Earned a free game pass', type: 'free-game', detail: 'Points award', date: '2024-07-03', datePrecision: 'day' };
  const unknown = { id: 'rank:2', title: 'Promoted to Corporal', type: 'rank', detail: 'Rank earned', date: null, datePrecision: 'unknown' };
  const team = { id: 'team:1', title: 'Joined a field team', type: 'team', detail: 'Team history', date: '2023-10-03' };
  const base = { player: { id: left, name: 'Operator' }, undatedItems: [unknown, unknown] };
  global.fetch.mockResolvedValueOnce(reply({ ...base, items: [pass, pass, null], nextCursor: 'cursor-1' }))
    .mockResolvedValueOnce(reply({ ...base, items: [pass, rank], nextCursor: 'cursor-2' }))
    .mockResolvedValueOnce(reply({ ...base, items: [rank, team], nextCursor: 'cursor-1' }));
  show(<PlayerMilestones playerId={left} embedded />);
  expect(await screen.findByText(pass.title)).toBeVisible();
  const undated = screen.getByRole('region', { name: 'Achievements without a recorded date' });
  expect(within(undated).getAllByText(unknown.title)).toHaveLength(1);
  expect(undated.querySelector('time')).toBeNull();
  const more = () => screen.getByRole('button', { name: 'Load earlier milestones' });
  fireEvent.click(more());
  expect(await screen.findByText('June 2024')).toBeVisible();
  expect(screen.getAllByText(pass.title)).toHaveLength(1);
  fireEvent.click(more());
  await screen.findByText(team.title);
  expect(screen.queryByRole('button', { name: 'Load earlier milestones' })).toBeNull();
  expect(screen.getAllByText(rank.title)).toHaveLength(1);
  expect(screen.getAllByText(unknown.title)).toHaveLength(1);
});

test('a terminal, empty, duplicate-only, or invalid cursor page cannot request page one again', () => {
  const item = { id: 'rank:1', title: 'Sergeant' };
  const base = { player: { id: left }, items: [item], nextCursor: 'good' };
  const first = mergeMilestonePage(left, base);
  expect(mergeMilestonePage(left, { ...base, nextCursor: null }).nextCursor).toBeNull();
  expect(mergeMilestonePage(left, { ...base, items: [], nextCursor: 'more' }, first).nextCursor).toBeNull();
  expect(mergeMilestonePage(left, { ...base, nextCursor: 'more' }, first).nextCursor).toBeNull();
  expect(mergeMilestonePage(left, { ...base, nextCursor: { page: 2 } }).nextCursor).toBeNull();
  expect(mergeMilestonePage(left, { ...base, nextCursor: '?private' }).nextCursor).toBeNull();
  expect(() => mergeMilestonePage(left, { ...base, items: null })).toThrow();
});

test('changing players during Load earlier cancels the old request and preserves the new timeline', async () => {
  const first = { player: { id: left, name: 'Alpha' }, items: [{ id: 'one', title: 'First rank' }], nextCursor: 'next' };
  let finish;
  global.fetch.mockResolvedValueOnce(reply(first)).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValueOnce(reply({ player: { id: right, name: 'Bravo' }, items: [], nextCursor: null }));
  const view = show(<PlayerMilestones playerId={left} embedded />);
  fireEvent.click(await screen.findByRole('button', { name: 'Load earlier milestones' }));
  view.rerender(<MemoryRouter><HelmetProvider><PlayerMilestones playerId={right} embedded /></HelmetProvider></MemoryRouter>);
  await screen.findByText('Bravo');
  expect(global.fetch.mock.calls[1][1].signal.aborted).toBe(true);
  await act(async () => { finish(reply({ ...first, items: [{ id: 'two', title: 'Old player pass' }] })); });
  expect(screen.queryByText('Old player pass')).toBeNull();
  expect(screen.queryByText('First rank')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Load earlier milestones' })).toBeNull();
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

test('registered-name lookup disambiguates matching names across pages and confirms the selected profile', async () => {
  const first = { id: left, name: 'Rapid Rebel', rank: 5, rankName: 'General', prestigeCount: 1, careerPoints: 6570 };
  const second = { ...first, id: right, rank: 42, rankName: 'Sergeant', careerPoints: 210 };
  global.fetch.mockImplementation(async url => {
    const query = new URL(url).searchParams;
    expect(query.get('lookup')).toBe('players');
    expect(query.get('q')).toBe('Nikolas Bradley');
    const page = Number(query.get('page'));
    return reply({ players: [page === 1 ? first : second], page, totalPages: 2, totalPlayers: 9 });
  });
  show(<PlayerComparison />);
  const picker = within(screen.getByRole('region', { name: 'Player 1' }));
  const input = picker.getByRole('searchbox', { name: 'Find a player' });
  fireEvent.change(input, { target: { value: 'Nikolas Bradley' } });
  fireEvent.click(picker.getByRole('button', { name: 'Find player' }));
  expect(await picker.findByText(left)).toBeInTheDocument();
  fireEvent.click(picker.getByRole('button', { name: 'Next' }));
  expect(await picker.findByText(right)).toBeInTheDocument();
  expect(picker.queryByText(left)).not.toBeInTheDocument();
  fireEvent.click(picker.getByRole('button', { name: /Rapid Rebel.*Sergeant.*#42 all time.*Select/ }));
  expect(picker.getByText('Selected player')).toBeInTheDocument();
  expect(picker.getByRole('link', { name: 'View player record' })).toHaveAttribute('href', '/player-milestones/' + right);
  expect(picker.getByText(right)).toBeInTheDocument();
  expect(picker.queryByRole('list')).toBeNull();
  fireEvent.change(input, { target: { value: 'Someone else' } });
  expect(picker.queryByText('Selected player')).not.toBeInTheDocument();
});

test('a single player linked from a profile is identified before selecting an opponent', async () => {
  global.fetch.mockResolvedValueOnce(reply({ players: [{ id: left, name: 'Alias', rank: 7, careerPoints: 1200 }] }));
  show(<PlayerComparison />, '/?left=' + left);
  const picker = within(screen.getByRole('region', { name: 'Player 1' }));
  expect(await picker.findByText('Alias')).toBeInTheDocument();
  expect(picker.getByText(left)).toBeInTheDocument();
  expect(picker.getByText(/#7 all time/)).toBeInTheDocument();
});
