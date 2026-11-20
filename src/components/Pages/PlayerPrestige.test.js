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
const prestigeTwoProgress = (points, patches) => ({
  nextPrestige: 2,
  eligible: points >= 500 && patches >= 10,
  points: { earned: points, required: 500 },
  patches: [{ factor: 1, name: 'Fieldcraft', earned: patches, required: 10 }],
});
const respond = data => Promise.resolve({ ok: true, json: async () => data });
const isPrestigeLookup = url => new URL(url).pathname === '/api/player-prestige';
function profileFetch(prestigeHandler) {
  return jest.fn((url, options) => {
    const path = new URL(url).pathname;
    if (path === '/api/player-team') return respond({ team: null });
    if (path === '/api/battle-badges') return respond({
      progress: { totalAwards: 0, colorBadgeCount: 0, towerOfPower: false, silverStars: 0, goldStars: 0 },
    });
    if (isPrestigeLookup(url)) return prestigeHandler(url, options);
    throw new Error('Unexpected profile request: ' + path);
  });
}
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

beforeEach(() => { currentUser.getIdToken.mockResolvedValue('fixture-token'); });
afterEach(() => { global.fetch = originalFetch; });

test('requires two confirmations and keeps the five-star rank after Prestige', async () => {
  let persisted = record(0, 0);
  global.fetch = profileFetch((url, options) => {
    if (options.method !== 'POST') return respond(persisted);
    const action = JSON.parse(options.body).action;
    if (action === 'prepare') return respond({ challenge: 'fixture-review', nextPrestige: 1, pointsAtPreview: player.points });
    persisted = { ...record(1, player.points), progress: prestigeTwoProgress(0, 0) };
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
  expect(await within(progression).findByRole('status')).toHaveTextContent('Prestige 1 earned. Your five-star rank carries forward.');
  expect(transactions()).toEqual([{ action: 'prepare' }, { action: 'prepare' }, { action: 'confirm', challenge: 'fixture-review' }]);
  expect(screen.getByText('Prestige 1', { selector: '.player-profile__prestige span' })).toBeVisible();
  expect(screen.getByText('General Of The Army', { selector: '.player-profile__rank strong' })).toBeVisible();
  expect(within(progression).getByRole('progressbar', { name: 'Points since your last Prestige' })).toHaveAttribute('max', '500');
  expect(within(progression).getByRole('progressbar', { name: 'Factor 1 · Fieldcraft patches' })).toHaveAttribute('max', '10');
  expect(within(progression).queryByRole('button', { name: 'Start Prestige' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
  expect(screen.getByText('5,100')).toBeVisible();
  expect(screen.getByText('9', { selector: 'dd' })).toBeVisible();
  expect(screen.getByText('4', { selector: 'dd' })).toBeVisible();
  updateProfile({ ...player, points: player.points + 500 });
  persisted = { ...persisted, progress: prestigeTwoProgress(500, 9) };
  fireEvent(window, new Event('focus'));
  expect(await within(progression).findByText('9 / 10')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Prestige available' })).not.toBeInTheDocument();
  persisted = { ...persisted, progress: prestigeTwoProgress(500, 10) };
  fireEvent(window, new Event('focus'));
  expect(await screen.findByRole('button', { name: 'Prestige available' })).toBeVisible();
  expect(global.fetch).toHaveBeenCalledWith(
    'https://usaw-field-companion.pink-bud-3735.chatgpt.site/api/player-prestige?me=1',
    expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer fixture-token' }) }),
  );
});

test('shows another player’s five-star rank and Roman numeral in the emblem', async () => {
  global.fetch = profileFetch(() => respond(record(11, 8100)));
  renderProfile({ ...player, points: 8225 }, false);
  await screen.findByText('Prestige 11', { selector: '.player-profile__prestige span' });
  expect(screen.getByText('XI', { selector: '.player-profile__rank .usaw-prestige-emblem > span' })).toBeInTheDocument();
  expect(screen.getByText('General Of The Army', { selector: '.player-profile__rank strong' })).toBeVisible();
  expect(screen.getByText('8,225')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Progression' }));
  expect(within(screen.getByRole('region', { name: 'Prestige' })).getByText('11')).toBeVisible();
  expect(screen.queryByRole('button', { name: /start prestige/i })).not.toBeInTheDocument();
  const prestigeRequests = global.fetch.mock.calls.filter(([url]) => isPrestigeLookup(url));
  expect(prestigeRequests).toEqual([[
    `https://usaw-field-companion.pink-bud-3735.chatgpt.site/api/player-prestige?id=${playerId}`,
    expect.objectContaining({ credentials: 'omit' }),
  ]]);
});


test.each([
  [0, 0, 'Private', 'Private First Class', 0, 125],
  [124, 0, 'Private', 'Private First Class', 124, 125],
  [125, 0, 'Private First Class', 'Specialist', 0, 100],
  ['175', 0, 'Private First Class', 'Specialist', 50, 100],
  [4499, 0, 'General', 'General Of The Army', 384, 385],
  [4500, 0, 'General Of The Army', null, 1, 1],
  [125, 2, 'General Of The Army', null, 1, 1],
])('labels both ends of the profile rank bar at %s points, Prestige %s', async (points, prestige, current, next, earned, max) => {
  global.fetch = profileFetch(() => respond(record(prestige, prestige ? 4500 : 0)));
  renderProfile({ ...player, points }, false);
  const meter = await screen.findByRole('progressbar', { name: 'Rank progress' });
  const panel = within(meter.closest('section'));
  expect(panel.getByText('Current rank').parentElement).toHaveTextContent(current);
  expect(meter).toHaveAttribute('value', String(earned));
  expect(meter).toHaveAttribute('max', String(max));
  if (next) {
    expect(panel.getByText('Next rank').parentElement).toHaveTextContent(next);
    expect(panel.getByText(`${max - earned} ${max - earned === 1 ? 'point' : 'points'} to ${next}`)).toBeVisible();
    expect(panel.getByText(Math.floor(earned / max * 100) + '% complete')).toBeVisible();
  } else {
    expect(panel.queryByText('Next rank')).toBeNull();
    expect(panel.getByText('Highest rank reached')).toBeVisible();
    if (prestige) expect(panel.getByText('Prestige ' + prestige)).toBeVisible();
  }
});

test('rank bar reports unavailable rank data instead of showing an invented promotion target', async () => {
  global.fetch = profileFetch(() => respond(record(0, 0)));
  renderProfile({ ...player, points: 'unavailable' }, false);
  expect(await screen.findByText('Rank progress is temporarily unavailable.')).toBeVisible();
  expect(screen.queryByRole('progressbar', { name: 'Rank progress' })).toBeNull();
});
