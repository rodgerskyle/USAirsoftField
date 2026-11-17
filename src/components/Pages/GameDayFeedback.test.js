import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GameDayFeedback from './GameDayFeedback';

const originalFetch = global.fetch;
const endpoint = 'https://app.usairsoftfield.com/api/game-day-feedback';
const date = '2026-11-15';
const playerId = 'official-player';
const reply = data => ({ ok: true, json: async () => data });

function renderForPlayer() {
  const firebase = { auth: { currentUser: { uid: playerId, getIdToken: async () => 'owner-token' } } };
  return { firebase, ...render(<GameDayFeedback firebase={firebase} playerId={playerId} date={date} />) };
}

beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; });

test('feedback is optional and a completed day can be rated and updated', async () => {
  const prior = { id: 'feedback-one', date, overall: 4, gameVariety: 3, breakTimes: null, teamBalance: null, comment: 'More flag games please.' };
  global.fetch.mockResolvedValueOnce(reply({ feedback: prior }))
    .mockResolvedValueOnce(reply({ ok: true, feedback: { ...prior, overall: 5, teamBalance: 4 } }));
  renderForPlayer();
  expect(global.fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Share game-day feedback' }));
  const rating = await screen.findByLabelText('Overall experience');
  expect(rating).toHaveValue('4');
  expect(screen.getByLabelText('Anything else? (optional)')).toHaveValue(prior.comment);
  fireEvent.change(rating, { target: { value: '5' } });
  fireEvent.change(screen.getByLabelText('Team balance (optional)'), { target: { value: '4' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update feedback' }));
  expect(await screen.findByText('Thanks. Your game-day feedback has been saved.')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(endpoint, expect.objectContaining({
    method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer owner-token' }), credentials: 'omit',
    body: JSON.stringify({ date, overall: 5, gameVariety: 3, breakTimes: null, teamBalance: 4, comment: prior.comment }),
  }));
});

test('failed save preserves entries and does not claim success', async () => {
  global.fetch.mockResolvedValueOnce(reply({ feedback: null })).mockRejectedValueOnce(new Error('offline'));
  renderForPlayer();
  fireEvent.click(screen.getByRole('button', { name: 'Share game-day feedback' }));
  const rating = await screen.findByLabelText('Overall experience');
  fireEvent.change(rating, { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Anything else? (optional)'), { target: { value: 'Please shorten the lunch break.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
  await screen.findByRole('alert');
  expect(rating).toHaveValue('3');
  expect(screen.getByLabelText('Anything else? (optional)')).toHaveValue('Please shorten the lunch break.');
  expect(screen.queryByText('Thanks. Your game-day feedback has been saved.')).not.toBeInTheDocument();
});

test('a changed sign-in aborts display of the former player feedback', async () => {
  let receive;
  global.fetch.mockImplementation(() => new Promise(resolve => { receive = resolve; }));
  const view = renderForPlayer();
  fireEvent.click(screen.getByRole('button', { name: 'Share game-day feedback' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  view.firebase.auth.currentUser = { uid: 'different-player' };
  receive(reply({ feedback: { id: 'one', date, overall: 5, comment: 'Old player comment.' } }));
  await screen.findByRole('alert');
  expect(screen.queryByDisplayValue('Old player comment.')).not.toBeInTheDocument();
});
