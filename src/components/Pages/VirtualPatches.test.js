import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { get, onValue } from 'firebase/database';
import { getDownloadURL } from 'firebase/storage';
import { FirebaseContext } from '../Firebase';
import { AuthUserContext } from '../session';
import {
  getBadgeStandings, getFeaturedBadges, getFeaturedBadgeDetails, getMyBadges, setFeaturedBadge, unlockBadgeStaff,
} from '../constants/playerBadges';
import { getAllPlayerDisplayNames, getPlayerDisplayNames } from '../constants/playerDisplayNames';
import Redirect from '../constants/redirect';
import AdminBadgeAwards from './AdminBadgeAwards';
import Pricing from './Pricing';
import VirtualPatches from './VirtualPatches';
import PlayerProfileView from './PlayerProfileView';
import Leaderboard from './leaderboard';

jest.mock('../Firebase', () => {
  const context = jest.requireActual('../Firebase/context');
  return { FirebaseContext: context.default, withFirebase: context.withFirebase };
});
jest.mock('firebase/database', () => ({
  child: (ref, field) => `${ref}/${field}`,
  get: jest.fn(),
  onValue: jest.fn(),
}));
jest.mock('firebase/storage', () => ({ getDownloadURL: jest.fn() }));
jest.mock('../constants/playerBadges', () => ({
  ...jest.requireActual('../constants/playerBadges'),
  getBadgeStandings: jest.fn(),
  getFeaturedBadges: jest.fn(),
  getFeaturedBadgeDetails: jest.fn(),
  getMyBadges: jest.fn(),
  setFeaturedBadge: jest.fn(),
  unlockBadgeStaff: jest.fn(),
}));
jest.mock('../constants/playerDisplayNames', () => ({
  getAllPlayerDisplayNames: jest.fn(),
  getPlayerDisplayNames: jest.fn(),
}));
jest.mock('../constants/playerPrestige', () => ({
  ...jest.requireActual('../constants/playerPrestige'),
  usePlayerPrestige: () => ({ record: null, failed: false }),
}));

const playerId = 'test-player-123';
const firebase = {
  user: id => `users/${id}`,
  users: () => 'users',
  team: id => `teams/${id}`,
  teamsPictures: name => `team-logos/${name}`,
};
const user = { uid: playerId, username: 'Patch Hunter', roles: {} };
const originalFetch = global.fetch;
const companionTeam = { id: '1ba1b987-74ae-4373-8b44-d484c1d10d50', name: 'Rebels', hasLogo: false };

const teamResponse = team => ({ ok: true, json: async () => ({ team }) });

function respondToPrestigeBatch(url, records = {}) {
  const ids = new URL(url).searchParams.get('ids').split(',');
  const players = Object.fromEntries(ids.map(id => [id, records[id] ?? { prestigeCount: 0, cycleStartPoints: 0 }]));
  return Promise.resolve({ ok: true, json: async () => ({ players }) });
}

function renderPage(page, { path = '/virtual-patches', authUser = null } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <FirebaseContext.Provider value={firebase}>
        <AuthUserContext.Provider value={authUser}>
          <HelmetProvider>{page}</HelmetProvider>
        </AuthUserContext.Provider>
      </FirebaseContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(url => new URL(url).pathname === '/api/player-team'
    ? Promise.resolve(teamResponse(null))
    : respondToPrestigeBatch(url));
  get.mockResolvedValue({ val: () => user.username });
  getAllPlayerDisplayNames.mockResolvedValue({});
  getPlayerDisplayNames.mockResolvedValue({});
  getFeaturedBadges.mockResolvedValue({});
  getFeaturedBadgeDetails.mockResolvedValue({ featured: {}, featuredCounts: {} });
  getMyBadges.mockResolvedValue({ awards: [] });
  getBadgeStandings.mockImplementation(async (badgeId, { page }) => ({
    badgeId,
    page,
    hasMore: badgeId === 'ambassador' && page === 1,
    standings: badgeId === 'ambassador' ? [{ playerId, earnedCount: page === 1 ? 3 : 2 }] : [],
  }));
});

afterEach(() => { global.fetch = originalFetch; });

test('loads only the selected patch standings and keeps the full catalog visible', async () => {
  const { container } = renderPage(<VirtualPatches />);
  expect(container.querySelectorAll('.virtual-patches__wall img')).toHaveLength(72);
  const firstPage = await screen.findByRole('table', { name: 'All-time leaderboard' });
  expect(within(firstPage).getByRole('link', { name: user.username }))
    .toHaveAttribute('href', `/profilelookup/${playerId}`);
  expect(within(firstPage).getByText('3')).toBeVisible();
  expect(getMyBadges).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  const secondPage = await screen.findByRole('table', { name: 'All-time leaderboard' });
  expect(within(secondPage).getByText('26')).toBeVisible();
  expect(getBadgeStandings).toHaveBeenLastCalledWith('ambassador', expect.objectContaining({ page: 2 }));

  fireEvent.click(screen.getByRole('button', { name: 'Countdown' }));
  expect(await screen.findByText('No players have earned this patch yet.')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Countdown' })).toHaveFocus();
  expect(getBadgeStandings).toHaveBeenLastCalledWith('countdown', expect.objectContaining({ page: 1 }));

  fireEvent.click(screen.getByRole('button', { name: 'Blackout Protocol' }));
  expect(await screen.findByText('No players have earned this patch yet.')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Blackout Protocol' })).toHaveFocus();
  expect(getBadgeStandings).toHaveBeenLastCalledWith('blackout-protocol', expect.objectContaining({ page: 1 }));
  expect(container.querySelector('.virtual-patches__brief img')).toHaveAttribute('src', '/badges/blackout-protocol.png');

  fireEvent.click(screen.getByRole('button', { name: 'Power Rush' }));
  expect(await screen.findByText('No players have earned this patch yet.')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Power Rush' })).toHaveFocus();
  expect(getBadgeStandings).toHaveBeenLastCalledWith('power-rush', expect.objectContaining({ page: 1 }));
  expect(container.querySelector('.virtual-patches__brief img')).toHaveAttribute('src', '/badges/power-rush.png');
});

function renderWaiverViewer(roles) {
  const waiverUser = { ...user, roles };
  const session = {
    ...firebase,
    onAuthUserListener: (next) => {
      next(waiverUser);
      return () => {};
    },
  };

  return render(
    <MemoryRouter initialEntries={['/virtual-patches']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <FirebaseContext.Provider value={session}>
        <AuthUserContext.Provider value={waiverUser}>
          <HelmetProvider>
            <Redirect />
            <Routes>
              <Route path="/virtual-patches" element={<VirtualPatches />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/dashboard/waiverform" element={<h1>Waiver kiosk</h1>} />
              <Route path="/dashboard" element={<h1>Dashboard</h1>} />
            </Routes>
          </HelmetProvider>
        </AuthUserContext.Provider>
      </FirebaseContext.Provider>
    </MemoryRouter>,
  );
}

test('lets signed-in waiver players browse standings and open membership pricing', async () => {
  global.fetch.mockResolvedValue({ ok: false });
  renderWaiverViewer({ WAIVER: true });

  expect(screen.getByText(/An active USAW membership is required to earn patches/)).toBeVisible();
  expect(await screen.findByRole('table', { name: 'All-time leaderboard' })).toBeVisible();
  expect(getMyBadges).not.toHaveBeenCalled();
  expect(screen.queryByRole('link', { name: 'Manage featured badge' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
  fireEvent.click(screen.getByRole('link', { name: 'See membership pricing' }));
  expect(await screen.findByRole('heading', { name: 'Membership Pricing' })).toBeVisible();
});

test('keeps kiosk accounts on the waiver form', async () => {
  renderWaiverViewer({ WAIVER: true, STATIC: true });

  expect(await screen.findByRole('heading', { name: 'Waiver kiosk' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Virtual Patches' })).not.toBeInTheDocument();
});

test('shows achievement criteria and standings for a public patch', async () => {
  const { container } = renderPage(<VirtualPatches />, { path: '/virtual-patches?badge=buzzer-beater' });

  expect(screen.getByRole('heading', { name: 'Buzzer Beater' })).toBeVisible();
  expect(screen.getByText(/10 seconds or less on the official game clock/)).toBeVisible();
  expect(container.querySelector('.virtual-patches__brief img')).toHaveAttribute('src', '/badges/buzzer-beater.png');
  expect(await screen.findByText('No players have earned this patch yet.')).toBeVisible();
  expect(getBadgeStandings).toHaveBeenLastCalledWith('buzzer-beater', expect.objectContaining({ page: 1 }));
});

test('keeps a signed-out viewer from seeing a secret patch on a direct link', () => {
  const { container } = renderPage(<VirtualPatches />, { path: '/virtual-patches?badge=no-shots-fired' });

  expect(screen.getByRole('heading', { name: 'Secret Achievement 1' })).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Secret Achievement 2' })).toBeVisible();
  expect(screen.queryByText('No Shots Fired')).not.toBeInTheDocument();
  expect(screen.queryByText(/without firing a single BB/)).not.toBeInTheDocument();
  expect(container.querySelector('.virtual-patches__brief img')).toHaveAttribute('src', '/badges/secret-achievement.png');
  expect(getMyBadges).not.toHaveBeenCalled();
  expect(getBadgeStandings).not.toHaveBeenCalled();
});

test('reveals only the secret patch already earned by a signed-in player', async () => {
  getMyBadges.mockResolvedValue({ awards: [{ badgeId: 'no-shots-fired', earnedCount: 2 }] });
  const { container } = renderPage(<VirtualPatches />, { authUser: user });
  const patch = await screen.findByRole('button', { name: /No Shots Fired/ });
  expect(within(patch).getByText('Earned ×2')).toBeVisible();
  expect(screen.getByRole('button', { name: /Secret Achievement 2/ })).toBeVisible();

  fireEvent.click(patch);
  expect(screen.getByRole('heading', { name: 'No Shots Fired' })).toHaveFocus();
  expect(screen.getByText(/without firing a single BB/)).toBeVisible();
  expect(container.querySelector('.virtual-patches__brief img')).toHaveAttribute('src', '/badges/no-shots-fired.png');
  expect(await screen.findByText('No players have earned this patch yet.')).toBeVisible();
  expect(getBadgeStandings).toHaveBeenLastCalledWith('no-shots-fired', expect.objectContaining({ page: 1 }));
});

test('offers the expanded patch collection in the unlocked staff award picker', async () => {
  unlockBadgeStaff.mockResolvedValue({ staffToken: 'test-staff-token', expiresAt: new Date(Date.now() + 60_000).toISOString() });
  renderPage(<AdminBadgeAwards firebase={firebase} players={[]} loading={false} directoryUnavailable={false} />);
  fireEvent.change(screen.getByLabelText('Staff email'), { target: { value: 'staff@example.com' } });
  fireEvent.change(screen.getByLabelText('Staff password'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Unlock badge controls' }));

  const picker = await screen.findByRole('combobox', { name: 'Badge' });
  const patchIds = within(picker).getAllByRole('option').map(option => option.value).filter(Boolean);
  expect(patchIds).toHaveLength(72);
  expect(new Set(patchIds).size).toBe(patchIds.length);
  expect(patchIds).toEqual(expect.arrayContaining([
    'countdown', 'medic', 'blackout-protocol', 'icy-killers',
    'power-rush', 'light-domination', 'six-flag',
    'tactical-potato', 'spawn-tourist', 'bb-confetti', 'tactical-click', 'bush-camo',
    'buzzer-beater', 'return-to-sender', 'second-wind', 'human-decoy', 'no-shots-fired', 'wrong-pocket',
  ]));
  expect(within(picker).getByRole('option', { name: 'Wrong Pocket' })).toHaveValue('wrong-pocket');
  fireEvent.change(picker, { target: { value: 'wrong-pocket' } });
  expect(screen.getByText('Wrong Pocket', { selector: 'strong' })).toBeVisible();
});

test('shows a public featured count without loading private badge records or a leaderboard', async () => {
  getFeaturedBadgeDetails.mockResolvedValue({
    featured: { [playerId]: 'ambassador' },
    featuredCounts: { [playerId]: 4 },
  });
  renderPage(<PlayerProfileView firebase={firebase} user={user} playerId={playerId} />);
  expect(await screen.findByText('×4')).toBeVisible();
  expect(screen.queryByText('All-time leaderboard')).not.toBeInTheDocument();
  expect(getMyBadges).not.toHaveBeenCalled();
});

test('shows the custom public profile name without showing the account name', async () => {
  getPlayerDisplayNames.mockResolvedValue({ [playerId]: 'Field Scout' });
  const member = { ...user, name: 'Jordan Example' };
  renderPage(<PlayerProfileView firebase={firebase} user={member} playerId={playerId} />);

  expect(screen.queryByText(member.name)).not.toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Field Scout' })).toBeVisible();
  expect(screen.queryByText(member.name)).not.toBeInTheDocument();
  expect(screen.queryByText(member.username)).not.toBeInTheDocument();
});

test.each([false, true])('shows the Companion team on a profile with account=%s', async account => {
  let resolveTeam;
  global.fetch.mockImplementationOnce(() => new Promise(resolve => { resolveTeam = resolve; }));
  renderPage(<PlayerProfileView firebase={firebase} user={{ ...user, team: '  ' }} playerId={playerId} account={account} />, {
    path: account ? '/account' : `/profilelookup/${playerId}`,
    authUser: account ? user : null,
  });

  expect(screen.getByText('Checking team…')).toBeVisible();
  expect(screen.queryByText('Unaffiliated')).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  const [url, options] = global.fetch.mock.calls[0];
  expect(new URL(url).href).toBe(`https://usaw-field-companion.pink-bud-3735.chatgpt.site/api/player-team?id=${playerId}`);
  expect(options?.credentials).toBe('omit');
  expect(options?.headers?.Authorization).toBeUndefined();

  await act(async () => resolveTeam(teamResponse(companionTeam)));
  expect(screen.getByRole('link', { name: /Rebels/ })).toHaveAttribute('href', `/teams/${companionTeam.id}?source=companion`);
  expect(screen.queryByText('Unaffiliated')).not.toBeInTheDocument();
});

test('shows an unaffiliated profile only after confirming no Companion team', async () => {
  renderPage(<PlayerProfileView firebase={firebase} user={user} playerId={playerId} />);
  expect(await screen.findByText('Unaffiliated')).toBeVisible();
});

test('reports an unavailable team lookup without labeling the player unaffiliated', async () => {
  global.fetch.mockRejectedValueOnce(new Error('Connection unavailable'));
  renderPage(<PlayerProfileView firebase={firebase} user={user} playerId={playerId} />);
  expect(await screen.findByText(/team unavailable/i)).toBeVisible();
  expect(screen.queryByText('Unaffiliated')).not.toBeInTheDocument();
});

test('keeps the existing website team and link without a Companion lookup', async () => {
  onValue.mockImplementationOnce((_ref, next) => {
    next({ val: () => ({ name: 'Legacy Team' }) });
    return jest.fn();
  });
  getDownloadURL.mockRejectedValueOnce(new Error('No team logo'));
  renderPage(<PlayerProfileView firebase={firebase} user={{ ...user, team: 'legacy-team' }} playerId={playerId} />);

  expect(await screen.findByRole('link', { name: /Legacy Team/ })).toHaveAttribute('href', '/teams/legacy-team');
  expect(onValue).toHaveBeenCalledWith('teams/legacy-team', expect.any(Function), expect.any(Function));
  expect(global.fetch).not.toHaveBeenCalled();
});

test('uses the public display name in patch standings', async () => {
  getPlayerDisplayNames.mockResolvedValue({ [playerId]: 'Field Scout' });
  renderPage(<VirtualPatches />);

  expect(await screen.findByRole('link', { name: 'Field Scout' }))
    .toHaveAttribute('href', `/profilelookup/${playerId}`);
  expect(get).not.toHaveBeenCalled();
});

test('finds a display name on a later standings page without changing its rank', async () => {
  const rankedPlayers = Object.fromEntries(Array.from({ length: 51 }, (_, index) => [
    `ranked-player-${index}`, { name: `Ranked Player ${index}`, points: 100 - index },
  ]));
  rankedPlayers[playerId] = { name: 'Jordan Example', points: 1 };
  onValue.mockImplementation((_ref, next) => {
    next({ val: () => rankedPlayers });
    return () => {};
  });
  getAllPlayerDisplayNames.mockResolvedValue({ [playerId]: 'Field Scout', 'ranked-player-0': 'Range Lead' });
  renderPage(<Leaderboard />, { path: '/leaderboard' });

  const leaders = screen.getByRole('region', { name: 'Field leaders' });
  const standings = screen.getByRole('table', { name: 'All time player standings' });
  expect(await within(leaders).findByText('Range Lead')).toBeVisible();
  expect(within(standings).getByText('Range Lead')).toBeVisible();
  await within(standings).findAllByText('Prestige 0');
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(new URL(global.fetch.mock.calls[0][0]).searchParams.get('ids').split(',')).toHaveLength(50);
  const search = screen.getByRole('searchbox', { name: 'Search player names' });
  expect(screen.queryByText('Field Scout')).not.toBeInTheDocument();
  fireEvent.change(search, { target: { value: 'field scout' } });

  const match = await screen.findByRole('link', { name: /Field Scout/ });
  expect(match).toHaveAttribute('href', `/profilelookup/${playerId}`);
  expect(within(match.closest('tr')).getByText('#52')).toBeVisible();
  expect(await within(match).findByText('Prestige 0')).toBeVisible();
  expect(new URL(global.fetch.mock.calls[1][0]).searchParams.get('ids')).toBe(playerId);
  expect(screen.queryByText('Jordan Example')).not.toBeInTheDocument();
});

test('updates profile rank and Prestige without moving a player on the all-time or monthly standings', async () => {
  const otherPlayerId = 'other-player-123';
  const now = new Date();
  const matchDate = `${now.getFullYear()}-${now.getMonth()}-1`;
  onValue.mockImplementation((_ref, next) => {
    next({ val: () => ({
      [playerId]: { name: user.username, points: 5100, wins: 42, losses: 9, games: { [matchDate]: { wins: 1, losses: 2 } } },
      [otherPlayerId]: { name: 'Range Scout', points: 4500, wins: 39, losses: 5, games: { [matchDate]: { wins: 3, losses: 1 } } },
    }) });
    return () => {};
  });

  renderPage(<Leaderboard />, { path: '/leaderboard', authUser: user });
  const table = within(screen.getByRole('table', { name: 'All time player standings' }));
  const [firstRow, secondRow] = table.getAllByRole('row').slice(1);
  const firstPlayer = within(firstRow);
  expect(firstPlayer.getByText(user.username)).toBeVisible();
  expect(firstPlayer.getByText('General Of The Army')).toBeVisible();
  expect(await firstPlayer.findByText('Prestige 0')).toBeVisible();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenLastCalledWith(
    'https://usaw-field-companion.pink-bud-3735.chatgpt.site/api/player-prestige?ids=other-player-123%2Ctest-player-123',
    expect.objectContaining({ credentials: 'omit', cache: 'no-store' }),
  );

  global.fetch.mockImplementation(url => respondToPrestigeBatch(url, {
    [playerId]: { prestigeCount: 1, cycleStartPoints: 5100 },
  }));
  fireEvent(window, new Event('focus'));

  expect(await firstPlayer.findByText('Prestige 1')).toBeVisible();
  expect(firstPlayer.getByText('Private')).toBeVisible();
  expect(firstRow.querySelector('.usaw-prestige-emblem--bronze')).toBeInTheDocument();
  expect(firstPlayer.getByText('#1')).toBeVisible();
  expect(firstPlayer.getByText('5,100')).toBeVisible();
  expect(firstPlayer.getByText('42')).toHaveClass('field-lb-wins');
  expect(firstPlayer.getByText('9')).toHaveClass('field-lb-losses');
  expect(within(secondRow).getByText('Range Scout')).toBeVisible();

  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Monthly' })); });
  const [, monthlyFirst, monthlySecond] = within(screen.getByRole('table', { name: /player standings$/ })).getAllByRole('row');
  expect(within(monthlyFirst).getByText('Range Scout')).toBeVisible();
  expect(within(monthlyFirst).getByText('33')).toBeVisible();
  expect(within(monthlySecond).getByText(user.username)).toBeVisible();
  expect(within(monthlySecond).getByText('Prestige 1')).toBeVisible();
  expect(within(monthlySecond).getByText('16')).toBeVisible();
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('shows one earned patch with its count and preserves the first award reason', async () => {
  getMyBadges.mockResolvedValue({
    awards: [{
      id: 'award-123',
      badgeId: 'ambassador',
      earnedCount: 3,
      reason: 'First award for sportsmanship.',
      awardedAt: '2026-11-11T21:00:00Z',
    }],
    featuredBadgeId: 'ambassador',
  });
  renderPage(<PlayerProfileView firebase={firebase} user={user} playerId={playerId} account />, {
    path: '/account?section=badges',
  });
  const wall = await screen.findByRole('region', { name: 'Earned badges' });
  expect(within(wall).getByRole('heading', { name: 'Earned badges' })).toHaveFocus();
  expect(within(wall).getByText('×3')).toBeVisible();
  expect(within(wall).getAllByRole('listitem')).toHaveLength(1);
  expect(within(wall).getByText('First award for sportsmanship.')).toBeInTheDocument();
});

test('features an earned badge from the profile shortcut and shows it when the leaderboard is revisited', async () => {
  let featuredBadgeId = null;
  getMyBadges.mockResolvedValue({ awards: [{ badgeId: 'ambassador', earnedCount: 2 }], featuredBadgeId });
  setFeaturedBadge.mockImplementation(async (_, badgeId) => {
    featuredBadgeId = badgeId;
    return { featuredBadgeId };
  });
  onValue.mockImplementation((_ref, next) => {
    next({ val: () => ({ [playerId]: { name: user.username, points: 10 } }) });
    return () => {};
  });
  getFeaturedBadges.mockImplementation(async () => featuredBadgeId ? { [playerId]: featuredBadgeId } : {});

  const board = renderPage(<Leaderboard />, { path: '/leaderboard' });
  const standings = within(screen.getByRole('table', { name: 'All time player standings' }));
  expect(standings.queryByAltText('Featured badge: USAW Ambassador')).not.toBeInTheDocument();
  const profile = renderPage(<PlayerProfileView firebase={firebase} user={user} playerId={playerId} account />, { path: '/account' });
  fireEvent.click(within(profile.container).getByRole('button', { name: 'Choose featured badge' }));
  const selector = await within(profile.container).findByRole('combobox', { name: 'Featured badge' });
  fireEvent.change(selector, { target: { value: 'ambassador' } });
  fireEvent.click(within(profile.container).getByRole('button', { name: 'Save selection' }));
  expect(await within(profile.container).findByText('Featured badge updated.')).toBeVisible();
  expect(within(profile.container).getByRole('button', { name: 'Change featured badge' })).toBeVisible();
  expect(setFeaturedBadge).toHaveBeenCalledWith(firebase, 'ambassador');

  fireEvent(window, new Event('focus'));
  expect(await within(board.container).findByAltText('Featured badge: USAW Ambassador')).toBeVisible();
});

test('the owner can reach badge settings from a public profile without exposing their collection there', async () => {
  renderPage(<PlayerProfileView firebase={firebase} user={user} playerId={playerId} />, {
    path: `/profilelookup/${playerId}`, authUser: user,
  });
  expect(await screen.findByRole('link', { name: 'Manage featured badge' }))
    .toHaveAttribute('href', '/account?section=badges');
  expect(getMyBadges).not.toHaveBeenCalled();
});

test('an expired member can find renewal information and the public patch collection', async () => {
  getMyBadges.mockRejectedValue(Object.assign(new Error('Your USAW membership has expired.'), {
    membershipStatus: 'expired',
  }));
  renderPage(<PlayerProfileView firebase={firebase} user={user} playerId={playerId} account />);
  fireEvent.click(screen.getByRole('button', { name: 'Badges' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your USAW membership has expired.');
  expect(screen.getByRole('link', { name: 'Membership information' })).toHaveAttribute('href', '/membership');
  expect(screen.getByRole('link', { name: 'Explore Virtual Patches' })).toHaveAttribute('href', '/virtual-patches');
});
