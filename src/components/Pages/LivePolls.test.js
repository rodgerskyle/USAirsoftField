import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { FirebaseContext } from '../Firebase';
import LivePolls from './LivePolls';

jest.mock('../Firebase', () => {
  const context = jest.requireActual('../Firebase/context');
  return { FirebaseContext: context.default, withFirebase: context.withFirebase };
});

const url = 'https://app.usairsoftfield.com/api/live-games';
const originalFetch = global.fetch;
const reply = data => ({ ok: true, json: async () => data });
const poll = {
  id: 'game-day-poll', title: 'Pick the next game', closesAt: '2099-06-15T20:50:00Z', closed: false,
  options: [{ modeId: 'countdown', label: 'Countdown', votes: 0 }, { modeId: 'three-flag', label: '3 Flag', votes: 0 }],
  totalVotes: 0, myVote: null, winnerModeIds: [], publishedGameId: null,
};
const board = { poll, canVote: true, serverNow: '2099-06-15T20:45:00Z', games: [] };

function renderFor(user) {
  const firebase = { auth: { onAuthStateChanged: callback => { callback(user); return jest.fn(); } } };
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <FirebaseContext.Provider value={firebase}><HelmetProvider><LivePolls /></HelmetProvider></FirebaseContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; });

test('anonymous players use the shared game-day ballot and receive a vote confirmation', async () => {
  global.fetch.mockResolvedValueOnce(reply(board))
    .mockResolvedValueOnce(reply({ ok: true, pollId: poll.id, myVote: 'countdown' }))
    .mockResolvedValue(reply({ ...board, poll: { ...poll, myVote: 'countdown', totalVotes: 1 } }));
  renderFor(null);
  fireEvent.click(await screen.findByRole('radio', { name: /Countdown/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Cast my vote' }));
  expect(await screen.findByText('Your vote was recorded.')).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Update my vote' })).toBeDisabled();
  expect(global.fetch).toHaveBeenCalledWith(url, expect.objectContaining({
    method: 'POST', credentials: 'include',
    body: JSON.stringify({ action: 'vote', pollId: poll.id, modeId: 'countdown' }),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  }));
});

test('a signed-in nonmember can view an open poll without a staff session', async () => {
  global.fetch.mockResolvedValue(reply(board));
  renderFor({ uid: 'waiver-player', getIdToken: async () => 'player-token' });
  fireEvent.click(await screen.findByRole('radio', { name: /3 Flag/ }));
  expect(screen.getByRole('button', { name: 'Cast my vote' })).toBeEnabled();
  expect(global.fetch).toHaveBeenCalledWith(url, expect.objectContaining({
    method: 'GET', credentials: 'include', headers: expect.objectContaining({ Authorization: 'Bearer player-token' }),
  }));
});

test('a closed poll shows results without an option to vote', async () => {
  global.fetch.mockResolvedValue(reply({ ...board, canVote: false, poll: { ...poll, closed: true, winnerModeIds: ['three-flag'] } }));
  renderFor(null);
  expect(await screen.findByText('Voting closed')).toBeInTheDocument();
  expect(screen.getByText('Top vote')).toBeInTheDocument();
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cast my vote' })).not.toBeInTheDocument();
});
