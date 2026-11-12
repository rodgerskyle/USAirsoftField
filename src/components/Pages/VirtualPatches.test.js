import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { get } from 'firebase/database';
import { FirebaseContext } from '../Firebase';
import { AuthUserContext } from '../session';
import { getBadgeStandings, getFeaturedBadgeDetails, getMyBadges } from '../constants/playerBadges';
import VirtualPatches from './VirtualPatches';
import PlayerProfileView from './PlayerProfileView';

jest.mock('../Firebase', () => {
  const context = jest.requireActual('../Firebase/context');
  return { FirebaseContext: context.default, withFirebase: context.withFirebase };
});
jest.mock('firebase/database', () => ({
  child: (ref, field) => `${ref}/${field}`,
  get: jest.fn(),
}));
jest.mock('firebase/storage', () => ({ getDownloadURL: jest.fn() }));
jest.mock('../constants/playerBadges', () => ({
  ...jest.requireActual('../constants/playerBadges'),
  getBadgeStandings: jest.fn(),
  getFeaturedBadgeDetails: jest.fn(),
  getMyBadges: jest.fn(),
}));

const playerId = 'test-player-123';
const firebase = { user: id => `users/${id}` };
const user = { uid: playerId, username: 'Patch Hunter', roles: {} };

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
  get.mockResolvedValue({ val: () => user.username });
  getBadgeStandings.mockImplementation(async (badgeId, { page }) => ({
    badgeId,
    page,
    hasMore: badgeId === 'ambassador' && page === 1,
    standings: badgeId === 'ambassador' ? [{ playerId, earnedCount: page === 1 ? 3 : 2 }] : [],
  }));
});

test('loads only the selected patch standings and keeps the full catalog visible', async () => {
  const { container } = renderPage(<VirtualPatches />);
  expect(container.querySelectorAll('.virtual-patches__wall img')).toHaveLength(14);
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
  renderPage(<PlayerProfileView firebase={firebase} user={user} playerId={playerId} account />);
  fireEvent.click(screen.getByRole('button', { name: 'Badges' }));
  const wall = await screen.findByRole('region', { name: 'Earned badges' });
  expect(within(wall).getByText('×3')).toBeVisible();
  expect(within(wall).getAllByRole('listitem')).toHaveLength(1);
  expect(within(wall).getByText('First award for sportsmanship.')).toBeInTheDocument();
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
