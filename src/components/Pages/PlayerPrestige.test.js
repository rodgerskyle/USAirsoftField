import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import PlayerProfileView from './PlayerProfileView';

jest.mock('../constants/playerBadges', () => ({
  badgeById: {},
  getFeaturedBadgeDetails: async () => ({ featured: {}, featuredCounts: {} }),
  getMyBadges: async () => ({ awards: [] }),
}));
jest.mock('../constants/playerDisplayNames', () => ({ getPlayerDisplayNames: async () => ({}) }));

const playerId = 'prestige-fixture-user';
const player = { uid: playerId, username: 'Field Player', points: 5100, wins: 9, losses: 4, roles: {} };
const currentUser = { uid: playerId, getIdToken: jest.fn(async () => 'fixture-token') };
const firebase = { auth: { currentUser } };
const record = (prestigeCount, cycleStartPoints) => ({ prestigeCount, cycleStartPoints, lastPrestigedAt: null });
const respond = data => Promise.resolve({ ok: true, json: async () => data });
const originalFetch = global.fetch;

function renderProfile(user, account) {
  const profile = value => (
    <HelmetProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PlayerProfileView firebase={firebase} user={value} playerId={playerId} account={account} />
      </MemoryRouter>
    </HelmetProvider>
  );
  const page = render(profile(user));
  return next => page.rerender(profile(next));
}

afterEach(() => { global.fetch = originalFetch; });

test('requires two confirmations and restarts only profile rank after Prestige', async () => {
  let persisted = record(0, 0);
  global.fetch = jest.fn((_url, options) => {
    if (options.method !== 'POST') return respond(persisted);
    const action = JSON.parse(options.body).action;
    if (action === 'prepare') return respond({ challenge: 'fixture-review', nextPrestige: 1, pointsAtPreview: player.points });
    persisted = record(1, player.points);
    return respond(persisted);
  });
  const updateProfile = renderProfile(player, true);
  const transactions = () => global.fetch.mock.calls
    .filter(([, options]) => options.method === 'POST')
    .map(([, options]) => JSON.parse(options.body));
  fireEvent.click(await screen.findByRole('button', { name: 'Prestige available' }));

  const progression = screen.getByRole('region', { name: 'Prestige' });
  fireEvent.click(within(progression).getByRole('button', { name: 'Start Prestige' }));
  expect(within(progression).getByRole('heading', { name: 'Review Prestige 1' })).toHaveFocus();
  expect(transactions()).toEqual([]);
  fireEvent.click(within(progression).getByRole('button', { name: 'Continue to final confirmation' }));
  expect(await within(progression).findByRole('heading', { name: 'Confirm Prestige 1' })).toHaveFocus();
  expect(transactions()).toEqual([{ action: 'prepare' }]);
  fireEvent.click(within(progression).getByRole('button', { name: 'Cancel' }));
  expect(transactions()).toEqual([{ action: 'prepare' }]);

  fireEvent.click(within(progression).getByRole('button', { name: 'Start Prestige' }));
  fireEvent.click(within(progression).getByRole('button', { name: 'Continue to final confirmation' }));
  fireEvent.click(await within(progression).findByRole('button', { name: 'Confirm Prestige 1' }));
  expect(await within(progression).findByRole('status')).toHaveTextContent('Prestige 1 earned. Your profile rank is now Private.');
  expect(transactions()).toEqual([{ action: 'prepare' }, { action: 'prepare' }, { action: 'confirm', challenge: 'fixture-review' }]);
  expect(screen.getByText('Prestige 1', { selector: '.player-profile__prestige span' })).toBeVisible();
  expect(screen.getByText('Private', { selector: '.player-profile__rank strong' })).toBeVisible();
  expect(within(progression).queryByRole('button', { name: 'Start Prestige' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
  expect(screen.getByText('5,100')).toBeVisible();
  expect(screen.getByText('9', { selector: 'dd' })).toBeVisible();
  expect(screen.getByText('4', { selector: 'dd' })).toBeVisible();
  updateProfile({ ...player, points: player.points + 4500 });
  expect(screen.getByRole('button', { name: 'Prestige available' })).toBeVisible();
});

test('shows another player’s current cycle rank and emblem while keeping public controls read-only', async () => {
  global.fetch = jest.fn(() => respond(record(11, 8100)));
  renderProfile({ ...player, points: 8225 }, false);
  const label = await screen.findByText('Prestige 11', { selector: '.player-profile__prestige span' });
  expect(label.closest('.player-profile__prestige').querySelector('.usaw-prestige-emblem--crimson')).toBeInTheDocument();
  expect(screen.getByText('Private First Class', { selector: '.player-profile__rank strong' })).toBeVisible();
  expect(screen.getByText('8,225')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Progression' }));
  expect(within(screen.getByRole('region', { name: 'Prestige' })).getByText('11')).toBeVisible();
  expect(screen.queryByRole('button', { name: /start prestige/i })).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledWith(
    `https://usaw-field-companion.pink-bud-3735.chatgpt.site/api/player-prestige?id=${playerId}`,
    expect.objectContaining({ credentials: 'omit' }),
  );
});
