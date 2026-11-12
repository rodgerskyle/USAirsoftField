import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { onValue } from 'firebase/database';

import { FirebaseContext } from '../Firebase';
import { getPlayerDisplayNames } from '../constants/playerDisplayNames';
import { usePlayerPrestige } from '../constants/playerPrestige';
import PlayerHubAccount from './PlayerHubAccount';

jest.mock('../Firebase', () => {
  const context = jest.requireActual('../Firebase/context');
  return { FirebaseContext: context.default, withFirebase: context.withFirebase };
});
jest.mock('firebase/database', () => ({ onValue: jest.fn() }));
jest.mock('../constants/playerDisplayNames', () => ({ getPlayerDisplayNames: jest.fn() }));
jest.mock('../constants/playerPrestige', () => ({
  ...jest.requireActual('../constants/playerPrestige'),
  usePlayerPrestige: jest.fn(),
}));

const firstPlayer = { uid: 'usaw-player-001', displayName: 'First account' };
const secondPlayer = { uid: 'usaw-player-002', displayName: 'Second account' };

function renderAccount() {
  let changeAuth;
  const auth = {
    currentUser: null,
    onAuthStateChanged: callback => {
      changeAuth = callback;
      return jest.fn();
    },
  };
  const firebase = { auth, user: uid => `users/${uid}` };
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <FirebaseContext.Provider value={firebase}><PlayerHubAccount /></FirebaseContext.Provider>
    </MemoryRouter>
  );
  return player => {
    auth.currentUser = player;
    act(() => changeAuth(player));
  };
}

function receiveRecord(subscription, record) {
  act(() => onValue.mock.calls[subscription][1]({ val: () => record }));
}

beforeEach(() => {
  jest.clearAllMocks();
  onValue.mockImplementation(() => jest.fn());
  getPlayerDisplayNames.mockResolvedValue({});
  usePlayerPrestige.mockReturnValue({ record: null });
});

test('shows sign-in for a signed-out viewer and live official stats for their verified account', async () => {
  getPlayerDisplayNames.mockResolvedValue({ [firstPlayer.uid]: 'Rapid Rebel' });
  const setPlayer = renderAccount();
  expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  setPlayer(null);
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  expect(onValue).not.toHaveBeenCalled();

  setPlayer(firstPlayer);
  expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  expect(onValue).toHaveBeenCalledWith(`users/${firstPlayer.uid}`, expect.any(Function), expect.any(Function));
  receiveRecord(0, { username: 'Old name', points: '150', wins: 3, losses: 1, team: 'Rebels' });
  expect(await screen.findByRole('heading', { name: 'Rapid Rebel' })).toBeInTheDocument();
  expect(screen.getByText('Private First Class')).toBeInTheDocument();
  expect(screen.getByText('Rebels')).toBeInTheDocument();
  expect(screen.getByText('150')).toBeInTheDocument();
  expect(screen.getByText('75%')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'My account' })).not.toBeInTheDocument();

  receiveRecord(0, { points: 175, wins: 4, losses: 1 });
  expect(screen.getByText('175')).toBeInTheDocument();
  expect(screen.getByText('80%')).toBeInTheDocument();
  setPlayer(null);
  expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  expect(screen.queryByText('Rapid Rebel')).not.toBeInTheDocument();
});

test('discards prior stats and pending names when a different account signs in', async () => {
  let resolveFirstName;
  getPlayerDisplayNames.mockImplementationOnce(() => new Promise(resolve => {
    resolveFirstName = resolve;
  }));
  const setPlayer = renderAccount();
  setPlayer(firstPlayer);
  receiveRecord(0, { name: 'First record', points: 321 });
  expect(screen.getByRole('heading', { name: 'First record' })).toBeInTheDocument();
  setPlayer(secondPlayer);
  expect(onValue.mock.results[0].value).toHaveBeenCalled();
  expect(screen.queryByText('First record')).not.toBeInTheDocument();
  receiveRecord(0, { name: 'Outdated record', points: 321 });
  await act(async () => resolveFirstName({ [firstPlayer.uid]: 'Outdated alias' }));

  receiveRecord(1, null);
  expect(screen.getByRole('heading', { name: 'Second account' })).toBeInTheDocument();
  expect(screen.getByText('Your player stats are currently unavailable.')).toBeInTheDocument();
  expect(screen.queryByText('Outdated record')).not.toBeInTheDocument();
  expect(screen.queryByText('Outdated alias')).not.toBeInTheDocument();
  expect(screen.queryByText('321')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
});

test('shows the current profile rank and Prestige count beside lifetime points', async () => {
  usePlayerPrestige.mockReturnValue({ record: { prestigeCount: 3, cycleStartPoints: 16100 } });
  getPlayerDisplayNames.mockResolvedValue({ [firstPlayer.uid]: 'Field Veteran' });
  const setPlayer = renderAccount();
  setPlayer(firstPlayer);
  receiveRecord(0, { name: 'Original name', points: 16225, wins: 12, losses: 8 });
  expect(await screen.findByRole('heading', { name: 'Field Veteran' })).toBeInTheDocument();
  expect(screen.getByText('Private First Class')).toBeInTheDocument();
  expect(screen.getByText('Prestige 3')).toBeInTheDocument();
  expect(screen.getByText('16,225')).toBeInTheDocument();
});
