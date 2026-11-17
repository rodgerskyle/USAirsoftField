import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import PlayerGameHistory from './PlayerGameHistory';
import { requestPlayerExperience } from '../constants/playerExperience';

jest.mock('../constants/playerExperience', () => ({ requestPlayerExperience: jest.fn() }));
const player = { id: 'fixture-member-1', name: 'Player One', wins: 15, losses: 6, points: 218 };
const outcome = { id: 'new-result', type: 'game', precision: 'instant', date: '2026-11-15T23:20:00Z', outcome: 'win', wins: 1, losses: 0, points: 10 };
const day = { id: 'old-day', type: 'day', precision: 'day', date: '2026-10-03', wins: 10, losses: 4, points: 112 };
const month = { id: 'old-month', type: 'month', precision: 'month', date: '2026-09', wins: 3, losses: 2, points: 36 };
const undated = { id: 'legacy-other', type: 'undated', precision: 'unknown', date: null, wins: 1, losses: 0, points: 10 };
const response = (items, nextCursor = null) => ({ player, items, nextCursor, historyNote: 'Earlier results use the period on file.' });
beforeEach(() => requestPlayerExperience.mockReset());

test('loads every page in order, labels date precision, deduplicates and removes the last button', async () => {
  requestPlayerExperience.mockResolvedValueOnce(response([outcome, day], 'page-two'))
    .mockRejectedValueOnce(new Error('Connection interrupted'))
    .mockResolvedValueOnce(response([day, month, undated]));
  render(<PlayerGameHistory playerId={player.id} />);
  const more = await screen.findByRole('button', { name: 'Load more game history' });
  expect(screen.getByText('15 career wins · 6 career losses · 218 career points')).toBeVisible();
  expect(screen.getByText(/Recorded Nov 15, 2026/)).toBeVisible();
  fireEvent.click(more);
  fireEvent.click(await screen.findByRole('button', { name: 'Retry game history' }));
  await screen.findByText('All available results shown.');
  const rows = within(screen.getByRole('list', { name: 'Recorded game results' })).getAllByRole('listitem');
  expect(rows).toHaveLength(4);
  expect(rows[0]).toHaveTextContent('Win');
  expect(rows[1]).toHaveTextContent('10 wins · 4 lossesOct 3, 2026');
  expect(rows[2]).toHaveTextContent('3 wins · 2 lossesSeptember 2026');
  expect(rows[3]).toHaveTextContent('Date unavailable');
  expect(screen.queryByRole('button')).toBeNull();
  expect(requestPlayerExperience.mock.calls.map(([url]) => url)).toEqual([
    '/api/player-game-history?playerId=fixture-member-1',
    '/api/player-game-history?playerId=fixture-member-1&cursor=page-two',
    '/api/player-game-history?playerId=fixture-member-1&cursor=page-two',
  ]);
});

test('changing profiles during a page request clears the old record and ignores a late response', async () => {
  let resolveEarlier;
  requestPlayerExperience.mockResolvedValueOnce(response([outcome], 'more'))
    .mockImplementationOnce(() => new Promise(resolve => { resolveEarlier = resolve; }))
    .mockResolvedValueOnce({ player: { ...player, id: 'fixture-member-2', wins: 0, losses: 0, points: 50 }, items: [], nextCursor: null });
  const view = render(<PlayerGameHistory playerId={player.id} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Load more game history' }));
  view.rerender(<PlayerGameHistory playerId="fixture-member-2" />);
  await screen.findByText('No game results have been recorded.');
  expect(requestPlayerExperience.mock.calls[1][1].aborted).toBe(true);
  await act(async () => resolveEarlier(response([day])));
  expect(screen.queryByRole('listitem')).toBeNull();
  expect(screen.getByText('0 career wins · 0 career losses · 50 career points')).toBeVisible();
});
