import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { get, onValue } from 'firebase/database';
import { getDownloadURL } from 'firebase/storage';
import { FirebaseContext } from '../Firebase';
import { AuthUserContext } from '../session';
import {
  BADGE_CATALOG, getBadgeStandings, getFeaturedBadges, getFeaturedBadgeDetails, getMyBadges, getStaffBadgeCounts,
  getStaffBadgeGrantHistory, revokePlayerBadgeGrant, setFeaturedBadge, staffBattleBadgeDay, unlockBadgeStaff,
} from '../constants/playerBadges';
import { getAllPlayerDisplayNames, getPlayerDisplayNames } from '../constants/playerDisplayNames';
import { PATCH_DIFFICULTIES } from '../constants/patchDifficulty';
import * as scoreHistory from '../constants/scoreHistory';
import Redirect from '../constants/redirect';
import AdminBadgeAwards from './AdminBadgeAwards';
import Pricing from './Pricing';
import VirtualPatches from './VirtualPatches';
import PlayerProfileView from './PlayerProfileView';
import Leaderboard from './leaderboard';

jest.mock('../constants/playerExperience', () => {
  const actual = jest.requireActual('../constants/playerExperience');
  return {
    ...actual,
    requestPlayerExperience: (path, signal) => path.startsWith('/api/battle-badges?')
      ? Promise.resolve({ progress: { totalAwards: 0, colorBadgeCount: 0, towerOfPower: false, silverStars: 0, goldStars: 0 } })
      : actual.requestPlayerExperience(path, signal),
  };
});

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
  getStaffBadgeCounts: jest.fn(),
  getStaffBadgeGrantHistory: jest.fn(),
  revokePlayerBadgeGrant: jest.fn(),
  setFeaturedBadge: jest.fn(),
  staffBattleBadgeDay: jest.fn(),
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
  const tileTitle = name => screen.getByText(name, { selector: '.virtual-patches__tile strong' });
  expect(container.querySelectorAll('.virtual-patches__wall img')).toHaveLength(BADGE_CATALOG.length);
  const difficultyFilter = screen.getByLabelText('Prestige difficulty');
  expect(difficultyFilter).toHaveDisplayValue('All difficulty levels');
  const walls = screen.getAllByRole('region', { name: /^Factor \d/ });
  expect(walls).toHaveLength(PATCH_DIFFICULTIES.length);
  PATCH_DIFFICULTIES.forEach(({ factor, name }, index) => {
    const wall = walls[index];
    const expected = BADGE_CATALOG.filter(patch => patch.difficultyFactor === factor);
    expect(wall).toHaveAccessibleName(`Factor ${factor} · ${name}`);
    expect(within(wall).getAllByRole('button')).toHaveLength(expected.length);
    const displayedArt = [...wall.querySelectorAll('.virtual-patches__tile img')].map(img => img.getAttribute('src'));
    expect(displayedArt).toEqual(expected.map(patch => patch.artUrl));
  });
  const firstPage = await screen.findByRole('table', { name: 'All-time leaderboard' });
  expect(within(firstPage).getByRole('link', { name: user.username }))
    .toHaveAttribute('href', `/profilelookup/${playerId}`);
  expect(within(firstPage).getByText('3')).toBeVisible();
  expect(getMyBadges).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  const secondPage = await screen.findByRole('table', { name: 'All-time leaderboard' });
  expect(within(secondPage).getByText('26')).toBeVisible();
  expect(getBadgeStandings).toHaveBeenLastCalledWith('ambassador', expect.objectContaining({ page: 2 }));

  fireEvent.click(tileTitle('Countdown').closest('button'));
  expect(await screen.findByText('No players have earned this patch yet.')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Countdown' })).toHaveFocus();
  expect(getBadgeStandings).toHaveBeenLastCalledWith('countdown', expect.objectContaining({ page: 1 }));

  fireEvent.click(tileTitle('Blackout Protocol').closest('button'));
  expect(await screen.findByText('No players have earned this patch yet.')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Blackout Protocol' })).toHaveFocus();
  expect(getBadgeStandings).toHaveBeenLastCalledWith('blackout-protocol', expect.objectContaining({ page: 1 }));
  expect(container.querySelector('.virtual-patches__brief img')).toHaveAttribute('src', '/badges/blackout-protocol.png');

  fireEvent.click(tileTitle('Power Rush').closest('button'));
  expect(await screen.findByText('No players have earned this patch yet.')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Power Rush' })).toHaveFocus();
  expect(getBadgeStandings).toHaveBeenLastCalledWith('power-rush', expect.objectContaining({ page: 1 }));
  expect(container.querySelector('.virtual-patches__brief img')).toHaveAttribute('src', '/badges/power-rush.png');
  for (const [name, id] of [['Ninja Warrior 25', 'ninja-warrior-25'], ['Ninja Warrior 50', 'ninja-warrior-50'], ['Bayonet 100', 'bayonet-100']]) {
    fireEvent.click(tileTitle(name).closest('button'));
    expect(await screen.findByText('No players have earned this patch yet.')).toBeVisible();
    expect(getBadgeStandings).toHaveBeenLastCalledWith(id, expect.objectContaining({ page: 1 }));
    expect(container.querySelector('.virtual-patches__brief img')).toHaveAttribute('src', `/badges/${id}.png`);
  }
  fireEvent.change(difficultyFilter, { target: { value: '2' } });
  const specialistWall = screen.getByRole('region', { name: 'Factor 2 · Specialist' });
  expect(specialistWall).toContainElement(tileTitle('Blackout Protocol'));
  expect(screen.getAllByRole('region', { name: /^Factor \d/ })).toEqual([specialistWall]);
  expect(screen.queryByText('Countdown', { selector: '.virtual-patches__tile strong' })).not.toBeInTheDocument();
  fireEvent.change(difficultyFilter, { target: { value: '' } });
  expect(screen.getAllByRole('region', { name: /^Factor \d/ })).toHaveLength(PATCH_DIFFICULTIES.length);
});

test('shows the overall patch totals and ranks to signed-out players with separate pagination', async () => {
  global.fetch.mockImplementation(async url => {
    const page = Number(new URL(url).searchParams.get('page'));
    return { ok: true, json: async () => ({
      page, hasMore: page === 1,
      standings: page === 1
        ? [{ playerId, name: 'Patch Hunter', rank: 1, totalPatches: 42 }]
        : [{ playerId: 'another-player-42', name: null, rank: 25, totalPatches: 10 }],
    }) };
  });
  renderPage(<VirtualPatches />, { path: '/virtual-patches?badge=countdown' });

  expect(await screen.findByText('No players have earned this patch yet.')).toBeVisible();
  expect(global.fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('link', { name: 'Overall patch leaderboard' }));

  const table = await screen.findByRole('table', { name: 'Overall patch leaderboard' });
  expect(screen.getByRole('heading', { name: 'Overall patch leaderboard' })).toHaveFocus();
  expect(within(table).getByRole('columnheader', { name: 'Total patches' })).toBeVisible();
  expect(within(table).getByText('42')).toBeVisible();
  expect(within(table).getByRole('link', { name: 'Patch Hunter' })).toHaveAttribute('href', `/profilelookup/${playerId}`);
  expect(screen.getByText('All-time totals include repeat awards.')).toBeVisible();
  expect(getBadgeStandings).toHaveBeenCalledTimes(1);
  expect(getMyBadges).not.toHaveBeenCalled();
  const [firstUrl, firstOptions] = global.fetch.mock.calls[0];
  expect(firstUrl.href).toBe('https://app.usairsoftfield.com/api/patch-leaderboard?page=1');
  expect(firstOptions.credentials).toBe('omit');
  expect(firstOptions.headers.Authorization).toBeUndefined();

  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  const secondPage = await screen.findByRole('table', { name: 'Overall patch leaderboard' });
  expect(within(secondPage).getByRole('link', { name: 'USAW player' })).toBeVisible();
  expect(within(secondPage).getByText('25')).toBeVisible();
  expect(global.fetch.mock.calls[1][0].searchParams.get('page')).toBe('2');

  fireEvent.click(screen.getByRole('link', { name: 'Patch collection' }));
  expect(screen.getByRole('heading', { name: 'Countdown' })).toHaveFocus();
  expect(await screen.findByText('No players have earned this patch yet.')).toBeVisible();
});

test('opens the overall patch leaderboard directly and allows retrying the public request', async () => {
  global.fetch.mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ page: 1, hasMore: false, standings: [] }) });
  renderPage(<VirtualPatches />, { path: '/virtual-patches?view=leaderboard', authUser: user });

  expect(await screen.findByRole('alert')).toHaveTextContent('Patch standings are temporarily unavailable.');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('No patches have been earned yet.')).toBeVisible();
  expect(getBadgeStandings).not.toHaveBeenCalled();
  expect(getMyBadges).not.toHaveBeenCalled();
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

test.each([
  ['badge=no-shots-fired', 'no-shots-fired', 'No Shots Fired', /without firing a single BB/],
  ['secret=1', 'no-shots-fired', 'No Shots Fired', /without firing a single BB/],
  ['badge=wrong-pocket', 'wrong-pocket', 'Wrong Pocket', /pull out a snack by mistake/],
  ['secret=2', 'wrong-pocket', 'Wrong Pocket', /pull out a snack by mistake/],
  ['badge=pocket-bbs', 'pocket-bbs', 'Pocket BBs', /Either a referee or the player you eliminated can report it to staff/],
])('shows the public artwork, criteria and standings at %s without signing in', async (query, id, name, condition) => {
  const { container } = renderPage(<VirtualPatches />, { path: `/virtual-patches?${query}` });
  expect(screen.getByRole('heading', { name })).toHaveFocus();
  expect(screen.getByText(condition)).toBeVisible();
  const tile = screen.getByRole('button', { name, exact: true });
  expect(tile.querySelector('img')).toHaveAttribute('src', `/badges/${id}.png`);
  expect(container.querySelector('.virtual-patches__brief img')).toHaveAttribute('src', `/badges/${id}.png`);
  expect(await screen.findByText('No players have earned this patch yet.')).toBeVisible();
  expect(getBadgeStandings).toHaveBeenLastCalledWith(id, expect.objectContaining({ page: 1 }));
  expect(getMyBadges).not.toHaveBeenCalled();
});

test('old links to retired patches show the active collection and skip retired standings', async () => {
  renderPage(<VirtualPatches />, { path: '/virtual-patches?badge=team-death-match' });
  expect(await screen.findByRole('table', { name: 'All-time leaderboard' })).toBeVisible();
  expect(getBadgeStandings).toHaveBeenCalledWith('ambassador', expect.anything());
  for (const retired of ['First Game', 'Team Death Match', 'BB Confetti', 'Tactical Click']) {
    expect(screen.queryByRole('button', { name: retired })).not.toBeInTheDocument();
  }
});

test('retains award counts for the existing badge IDs and keeps Pocket BBs separate', async () => {
  getMyBadges.mockResolvedValue({ awards: [
    { badgeId: 'no-shots-fired', earnedCount: 2 }, { badgeId: 'wrong-pocket', earnedCount: 3 },
  ] });
  renderPage(<VirtualPatches />, { authUser: user });
  const specialistWall = screen.getByRole('region', { name: 'Factor 2 · Specialist' });
  expect(await screen.findByRole('button', { name: /No Shots Fired Earned ×2/ })).toBeVisible();
  expect(within(specialistWall).getByRole('button', { name: /Wrong Pocket Earned ×3/ })).toBeVisible();
  const newPatch = within(specialistWall).getByRole('button', { name: /Pocket BBs Not yet earned/ });
  fireEvent.click(newPatch);
  expect(screen.getByRole('heading', { name: 'Pocket BBs' })).toHaveFocus();
  expect(await screen.findByText('No players have earned this patch yet.')).toBeVisible();
  expect(getBadgeStandings).toHaveBeenLastCalledWith('pocket-bbs', expect.objectContaining({ page: 1 }));
});

test('offers the expanded patch collection in the unlocked staff award picker', async () => {
  unlockBadgeStaff.mockResolvedValue({ staffToken: 'test-staff-token', expiresAt: new Date(Date.now() + 60_000).toISOString() });
  renderPage(<AdminBadgeAwards firebase={firebase} players={[]} loading={false} directoryUnavailable={false} />);
  fireEvent.change(screen.getByLabelText('Staff email'), { target: { value: 'staff@example.com' } });
  fireEvent.change(screen.getByLabelText('Staff password'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Unlock badge controls' }));

  const picker = await screen.findByRole('combobox', { name: 'Badge' });
  const modes = within(picker).getByRole('group', { name: 'Game modes' });
  const otherPatches = within(picker).getByRole('group', { name: 'Other patches' });
  const names = within(modes).getAllByRole('option').map(option => option.textContent);
  expect(names).toHaveLength(53);
  expect(names).toEqual([...names].sort(new Intl.Collator('en', { numeric: true, sensitivity: 'base' }).compare));
  expect(names.slice(0, 3)).toEqual(['3 Bomb', '3 Flag', 'Amoeba']);
  expect(names[names.length - 1]).toBe('Zombie Attack');
  expect(within(modes).getByRole('option', { name: 'Ring the Bell' })).toHaveValue('ring-the-bell');
  expect(within(otherPatches).getByRole('option', { name: 'Pocket BBs' })).toHaveValue('pocket-bbs');
  expect(picker).toHaveValue('');
  const patchIds = within(picker).getAllByRole('option').map(option => option.value).filter(Boolean);
  expect(patchIds).toHaveLength(69);
  for (const milestone of ['ninja-warrior-25', 'ninja-warrior-50', 'bayonet-100']) {
    expect(patchIds).not.toContain(milestone);
  }
  for (const retired of ['first-game', 'team-death-match', 'bb-confetti', 'tactical-click']) {
    expect(patchIds).not.toContain(retired);
  }
  expect(new Set(patchIds).size).toBe(patchIds.length);
  expect(patchIds).toEqual(expect.arrayContaining([
    'countdown', 'medic', 'blackout-protocol', 'icy-killers',
    'power-rush', 'light-domination', 'six-flag',
    'tactical-potato', 'spawn-tourist', 'bush-camo',
    'buzzer-beater', 'return-to-sender', 'second-wind', 'human-decoy', 'no-shots-fired', 'wrong-pocket', 'pocket-bbs',
  ]));
  expect(within(picker).getByRole('option', { name: 'Wrong Pocket' })).toHaveValue('wrong-pocket');
  fireEvent.change(picker, { target: { value: 'pocket-bbs' } });
  expect(screen.getByText('Pocket BBs', { selector: 'strong' })).toBeVisible();
});

test('badge awards uses the selected member for MVP and reconciles another staff desk’s daily award', async () => {
  const date = '2026-11-20';
  jest.spyOn(scoreHistory, 'newScoreId')
    .mockReturnValueOnce('9e97166f-69f5-4e82-8047-0018778f8b88')
    .mockReturnValueOnce('6caec3dd-d95f-421c-bb45-681e72097db9');
  const member = { ...user, name: 'Morgan Lane' };
  unlockBadgeStaff.mockResolvedValue({ staffToken: 'staff-token', expiresAt: new Date(Date.now() + 60_000).toISOString() });
  getStaffBadgeCounts.mockResolvedValue({ counts: {} });
  const game = { id:'shared', title:'Capture the Flag', startsAt:date+'T19:00:00Z' };
  const games = [game];
  const recipient = { id: 'recorded', gameId:game.id, playerId: 'another-player', playerName: 'Sam Hayes', side: 'solid' };
  const extra = { id: 'extra', playerId, playerName: member.name, side: 'camo', overrideQuantity: 20 };
  const concurrent = { ...extra, id: 'newer', playerName: 'Another player', overrideQuantity: 5 };
  staffBattleBadgeDay.mockResolvedValueOnce({ date, games, nextGameNumber:1, awards: [] })
    .mockRejectedValueOnce(Object.assign(new Error('Today’s MVP was already awarded.'), { status: 409 }))
    .mockResolvedValueOnce({ date, games, nextGameNumber:1, awards: [recipient], overrides: [] })
    .mockRejectedValueOnce(Object.assign(new Error('Network unavailable.'), { status: 503 }))
    .mockResolvedValueOnce({ date, games, nextGameNumber:1, awards: [recipient], overrides: [extra] })
    .mockResolvedValueOnce({ date, games, nextGameNumber:1, awards: [recipient], overrides: [concurrent] });
  renderPage(<AdminBadgeAwards firebase={firebase} players={[member]} loading={false} directoryUnavailable={false} />,
    { authUser: { uid: 'field-admin', roles: { ADMIN: true } } });
  fireEvent.change(screen.getByLabelText('Staff email'), { target: { value: 'staff@example.com' } });
  fireEvent.change(screen.getByLabelText('Staff password'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Unlock badge controls' }));
  fireEvent.change(await screen.findByRole('searchbox', { name: 'Find a player' }), { target: { value: member.name } });
  fireEvent.click(screen.getByRole('button', { name: /Morgan Lane/ }));
  const desk = within(screen.getByRole('region', { name: 'US Airsoft World Battle Badges' }));
  fireEvent.click(desk.getByRole('button', { name: 'Manage game MVPs' }));
  fireEvent.change(await desk.findByLabelText('MVP team'), { target: { value: 'camo' } });
  fireEvent.click(desk.getByRole('button', { name: 'Award game MVP' }));
  expect(await desk.findByText('Sam Hayes')).toBeVisible();
  expect(desk.queryByRole('button', { name: 'Award game MVP' })).toBeNull();
  fireEvent.change(desk.getByLabelText('Number of Battle Badges'), { target: { value: '20' } });
  fireEvent.click(desk.getByRole('button', { name: 'Grant extra Battle Badges' }));
  expect(await desk.findByRole('alert')).toHaveTextContent('Override could not be confirmed. Network unavailable.');
  expect(desk.getByLabelText('Number of Battle Badges')).toHaveValue(20);
  fireEvent.click(desk.getByRole('button', { name: 'Grant extra Battle Badges' }));
  expect(await desk.findByText('Override applied successfully.')).toBeVisible();
  expect(staffBattleBadgeDay.mock.calls[4][2].body).toEqual(staffBattleBadgeDay.mock.calls[3][2].body);
  expect(desk.queryByText('Camo · 20 extra')).toBeNull();
  expect(desk.queryByRole('button', { name: 'Clear override log' })).toBeNull();
  expect(desk.getByLabelText('Number of Battle Badges')).toHaveValue(1);
  fireEvent.click(desk.getByRole('button', { name: 'Show override log' }));
  expect(desk.getByText('Camo · 20 extra')).toBeVisible();
  const confirm = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  try {
    const clear = desk.getByRole('button', { name: 'Clear override log' });
    fireEvent.click(clear);
    expect(staffBattleBadgeDay).toHaveBeenCalledTimes(5);
    fireEvent.click(clear);
    expect(await desk.findByText('Override log cleared. Awarded badges were kept.')).toBeVisible();
    expect(staffBattleBadgeDay.mock.calls[5][2].body).toEqual({ action: 'clearOverrideLog', date, throughId: extra.id });
    expect(desk.queryByText('Camo · 20 extra')).toBeNull();
    expect(desk.getByText('Camo · 5 extra')).toBeVisible();
    fireEvent.click(desk.getByRole('button', { name: 'Hide override log' }));
    expect(desk.queryByText('Camo · 5 extra')).toBeNull();
  } finally { confirm.mockRestore(); }
  expect(desk.getByText('Sam Hayes')).toBeVisible();
  expect(staffBattleBadgeDay.mock.calls[3][2].body).toMatchObject({ action: 'override', quantity: 20, playerId, date, side: 'camo' });
  expect(staffBattleBadgeDay.mock.calls[1][2].body).toMatchObject({ action: 'award', playerId, date, side: 'camo' });
});

test.each([null, user, { uid: playerId, roles: { ADMIN: 'false' } }])('hides the Battle Badge desk without an admin role', account => {
  renderPage(<AdminBadgeAwards firebase={firebase} players={[user]} loading={false} directoryUnavailable={false} />,
    { authUser: account });
  expect(screen.queryByText('US Airsoft World Battle Badges')).toBeNull();
  expect(screen.queryByRole('button', { name: /override|MVP/i })).toBeNull();
  expect(staffBattleBadgeDay).not.toHaveBeenCalled();
});

test.each([
  ['countdown', 'Countdown', 'Badge'],
  ['tactical-click', 'Tactical Click', 'Previously awarded retired badge'],
])('removes only the explicitly confirmed %s award', async (badgeId, name, label) => {
  unlockBadgeStaff.mockResolvedValue({ staffToken: 'test-staff-token', expiresAt: new Date(Date.now() + 60_000).toISOString() });
  getStaffBadgeCounts.mockResolvedValue({ counts: { [badgeId]: 2 } });
  getStaffBadgeGrantHistory.mockResolvedValue({ grants: [
    { id: 'new-grant', awardedAt: '2026-01-03T21:30:00.000Z' },
    { id: 'first-grant', awardedAt: '2026-01-01T20:15:00.000Z' },
  ], nextCursor: null });
  revokePlayerBadgeGrant.mockResolvedValue({ revoked: true, award: { earnedCount: 1 } });
  const confirm = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  try {
    renderPage(<AdminBadgeAwards firebase={firebase} players={[user]} loading={false} directoryUnavailable={false} />);
    fireEvent.change(screen.getByLabelText('Staff email'), { target: { value: 'staff@example.com' } });
    fireEvent.change(screen.getByLabelText('Staff password'), { target: { value: 'test-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock badge controls' }));

    fireEvent.change(await screen.findByRole('searchbox', { name: 'Find a player' }), { target: { value: user.username } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(user.username) }));
    fireEvent.change(await screen.findByRole('combobox', { name: label }), { target: { value: badgeId } });
    if (label !== 'Badge') {
      expect(screen.queryByRole('button', { name: /Grant (again|badge)/ })).not.toBeInTheDocument();
      expect(within(screen.getByRole('combobox', { name: 'Badge' })).queryByDisplayValue(badgeId)).not.toBeInTheDocument();
    }
    fireEvent.click(await screen.findByRole('button', { name: 'Review awards to remove' }));

    const history = screen.getByRole('region', { name: 'Award history' });
    const oldGrant = (await within(history).findByText(/Jan 1, 2026/)).closest('li');
    const remove = within(oldGrant).getByRole('button', { name: 'Remove award' });
    fireEvent.click(remove);
    expect(revokePlayerBadgeGrant).not.toHaveBeenCalled();
    fireEvent.click(remove);
    expect(revokePlayerBadgeGrant).toHaveBeenCalledTimes(1);
    expect(revokePlayerBadgeGrant).toHaveBeenCalledWith(firebase, {
      playerId, badgeId, grantId: 'first-grant',
    }, 'test-staff-token');
    expect(await screen.findByText(`One ${name} award removed from Patch Hunter. 1 remaining.`)).toBeVisible();
    expect(within(history).queryByText(/Jan 1, 2026/)).not.toBeInTheDocument();
    expect(within(history).getByText(/Jan 3, 2026/)).toBeVisible();
    expect(screen.getByText('Earned 1 time')).toBeVisible();
  } finally {
    confirm.mockRestore();
  }
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

test.each([false, true])('shows the registered name beneath the display name on a profile with account=%s', async account => {
  getPlayerDisplayNames.mockResolvedValue({ [playerId]: 'Field Scout' });
  const member = { ...user, name: ' Jordan Example ' };
  renderPage(<PlayerProfileView firebase={firebase} user={member} playerId={playerId} account={account} />, {
    path: account ? '/account' : `/profilelookup/${playerId}`,
    authUser: account ? member : null,
  });

  const heading = await screen.findByRole('heading', { name: 'Field Scout' });
  expect(heading.nextElementSibling).toBe(screen.getByText('Jordan Example'));
  expect(heading.nextElementSibling).toBeVisible();
  expect(within(heading.closest('header')).getByRole('region', { name: 'US Airsoft World Battle Badges' })).toBeVisible();
  expect(screen.queryByText(member.username)).not.toBeInTheDocument();
});

test.each([
  [' JORDAN  EXAMPLE ', 'Jordan Example', 'JORDAN EXAMPLE'],
  ['Field Scout', '  ', 'Field Scout'],
  ['Field Scout', 'private@example.org', 'Field Scout'],
  ['private@example.org', 'Jordan Example', 'Jordan Example'],
  [null, null, 'USAW player'],
])('uses one profile name when username=%s and registered name=%s', async (username, name, heading) => {
  renderPage(<PlayerProfileView firebase={firebase} user={{ ...user, username, name }} playerId={playerId} />);
  await screen.findByText('Unaffiliated');
  const title = screen.getByRole('heading', { name: heading });
  expect(title.parentElement.querySelector('.player-profile__real-name')).toBeNull();
  expect(screen.queryByText('private@example.org')).not.toBeInTheDocument();
});

test('keeps the registered name beneath the legacy username if the display-name service is unavailable', async () => {
  getPlayerDisplayNames.mockRejectedValue(new Error('Unavailable'));
  renderPage(<PlayerProfileView firebase={firebase} user={{ ...user, name: 'Jordan Example' }} playerId={playerId} />);
  await screen.findByText('Unaffiliated');
  const heading = screen.getByRole('heading', { name: user.username });
  expect(heading.nextElementSibling).toBe(screen.getByText('Jordan Example'));
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
  const table = within(await screen.findByRole('table', { name: 'All time player standings' }));
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
  expect(firstPlayer.getByText('General Of The Army')).toBeVisible();
  expect(firstPlayer.getByText('I', { selector: '.usaw-prestige-emblem > span' })).toBeInTheDocument();
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
  getMyBadges.mockResolvedValue({ awards: [{ badgeId: 'pocket-bbs', earnedCount: 2 }], featuredBadgeId });
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
  expect(standings.queryByAltText('Featured badge: Pocket BBs')).not.toBeInTheDocument();
  const profile = renderPage(<PlayerProfileView firebase={firebase} user={user} playerId={playerId} account />, { path: '/account' });
  fireEvent.click(within(profile.container).getByRole('button', { name: 'Choose featured badge' }));
  const selector = await within(profile.container).findByRole('combobox', { name: 'Featured badge' });
  fireEvent.change(selector, { target: { value: 'pocket-bbs' } });
  fireEvent.click(within(profile.container).getByRole('button', { name: 'Save selection' }));
  expect(await within(profile.container).findByText('Featured badge updated.')).toBeVisible();
  expect(within(profile.container).getByRole('button', { name: 'Change featured badge' })).toBeVisible();
  expect(setFeaturedBadge).toHaveBeenCalledWith(firebase, 'pocket-bbs');

  fireEvent(window, new Event('focus'));
  const featured = await within(board.container).findByAltText('Featured badge: Pocket BBs');
  expect(featured).toBeVisible();
  expect(featured).toHaveAttribute('src', '/badges/thumbs/pocket-bbs.png');
  expect(featured).toHaveAttribute('srcset', '/badges/thumbs/pocket-bbs.png 72w, /badges/pocket-bbs.png 256w');
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
