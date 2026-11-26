import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
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

function renderFor(user, route = "/live-polls") {
  const firebase = { auth: { onAuthStateChanged: callback => { callback(user); return jest.fn(); } } };
  render(
    <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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

test('a player with a ballot open sees the vote disappear and the next ballot starts with no selection', async () => {
  jest.useFakeTimers();
  try {
    let live = board;
    global.fetch.mockImplementation(async () => reply(live));
    renderFor(null);
    await act(async () => {});
    fireEvent.click(screen.getByRole('radio', {name:/Countdown/}));
    expect(screen.getByRole('button', {name:'Cast my vote'})).toBeEnabled();

    live = { ...board, poll:null, canVote:false };
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(screen.getByText(/no live poll right now/i)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name:'Cast my vote'})).not.toBeInTheDocument();
    expect(screen.queryByText(poll.title)).not.toBeInTheDocument();

    live = { ...board, poll:{...poll, id:'new-poll', title:'Choose the evening game'} };
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(screen.getByRole('heading', {name:'Choose the evening game'})).toBeInTheDocument();
    expect(screen.getByRole('radio', {name:/Countdown/})).not.toBeChecked();
    expect(screen.getByRole('button', {name:'Cast my vote'})).toBeDisabled();
  } finally { jest.useRealTimers(); }
});

const mvpPoll = {
  id: 'mvp-poll-1', gameId: 'round-1', roundTitle: 'Battle Flag', startsAt: board.serverNow,
  closesAt: poll.closesAt, closed: false, myVote: null, totalVotes: 2,
};

test.each([null, {uid:'member-id', getIdToken:async () => 'signed-token'}])(
  'a player can cast and update an independent round MVP name or description', async user => {
    let current = mvpPoll;
    const posts = [];
    global.fetch.mockImplementation(async (_, options) => {
      if (options.method === 'POST') {
        const body = JSON.parse(options.body);
        posts.push(body);
        expect(options.credentials).toBe('include');
        expect(options.headers.Authorization).toBe(user ? 'Bearer signed-token' : undefined);
        current = {...current, myVote:{nomination:body.nomination}};
        return reply({ok:true, pollId:current.id, myVote:current.myVote});
      }
      return reply({...board, mvpPoll:{...current, nominees:[{nomination:'Private Aggregate'}]}});
    });
    renderFor(user);
    const field = await screen.findByRole('textbox', { name:'Player name or description' });
    expect(screen.queryByText(/Private Aggregate/)).not.toBeInTheDocument();
    expect(screen.getByRole('radio', {name:/Countdown/})).toBeEnabled();
    fireEvent.change(field, {target:{value:'  '}});
    expect(screen.getByRole('button', {name:'Submit MVP vote'})).toBeDisabled();
    fireEvent.change(field, {target:{value:'  Blue team, white helmet #21  '}});
    fireEvent.click(screen.getByRole('button', {name:'Submit MVP vote'}));
    expect(await screen.findByText('Blue team, white helmet #21')).toBeInTheDocument();
    expect(posts).toEqual([{action:'voteMvp', pollId:current.id, nomination:'Blue team, white helmet #21'}]);
    await act(async () => {});
    expect(screen.getByRole('button', {name:'Update my MVP vote'})).toBeDisabled();
    fireEvent.change(field, {target:{value:'María José O’Neil-Santos'}});
    fireEvent.click(screen.getByRole('button', {name:'Update my MVP vote'}));
    expect(await screen.findByText('María José O’Neil-Santos')).toBeInTheDocument();
    expect(posts).toHaveLength(2);
  },
);

test('MVP draft and focus survive board refreshes, then reset when staff change rounds', async () => {
  jest.useFakeTimers();
  let current = mvpPoll;
  try {
    global.fetch.mockImplementation(async () => reply({...board, poll:null, canVote:false, mvpPoll:current}));
    renderFor(null);
    await act(async () => {});
    const field = screen.getByLabelText('Player name or description');
    field.focus();
    fireEvent.change(field, {target:{value:'Li'}});
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(field).toHaveFocus();
    expect(field).toHaveValue('Li');
    expect(screen.getByRole('button',{name:'Submit MVP vote'})).toBeEnabled();

    current = {...current, closed:true};
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(screen.getByText('MVP voting is closed for this round.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Player name or description')).not.toBeInTheDocument();
    current = null;
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(screen.queryByRole('heading', {name:'Round MVP'})).not.toBeInTheDocument();
    current = {...mvpPoll, id:'mvp-poll-2', roundTitle:'Countdown'};
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(screen.getByLabelText('Player name or description')).toHaveValue('');
  } finally { jest.useRealTimers(); }
});

test('an older nomination invitation cannot vote in a different round', async () => {
  global.fetch.mockImplementation(async () => reply({...board, mvpPoll}));
  renderFor(null, '/live-polls?mvp=older-round#round-mvp');
  expect(await screen.findByText('Nominations for this round are closed.')).toBeInTheDocument();
  expect(screen.queryByLabelText('Player name or description')).not.toBeInTheDocument();
  expect(screen.getByRole('radio', {name:/Countdown/})).toBeInTheDocument();
});
