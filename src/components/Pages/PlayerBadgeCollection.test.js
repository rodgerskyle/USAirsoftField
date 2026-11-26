import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getFeaturedBadgeDetails, RETIRED_BADGES, setFeaturedBadge } from '../constants/playerBadges';
import PlayerBadgeCollection from './PlayerBadgeCollection';

test('retains earlier awards on the player record and allows only current earned patches to be featured', () => {
  const onFeature = jest.fn();
  const awards = [
    ...RETIRED_BADGES.map(badge => ({ badgeId: badge.id, earnedCount: 3, reason: 'An earlier award.' })),
    { badgeId: 'wrong-pocket', earnedCount: 1 }, { badgeId: 'unrecognized-id', earnedCount: 2 },
  ];
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <PlayerBadgeCollection awards={awards} featuredBadgeId="first-game" onFeature={onFeature} />
  </MemoryRouter>);
  const chooser = screen.getByLabelText('Featured badge');
  expect(chooser).toHaveValue('');
  expect(within(chooser).getAllByRole('option').map(option => option.value)).toEqual(['', 'wrong-pocket']);
  expect(screen.getAllByText('Retired patch')).toHaveLength(4);
  for (const badge of RETIRED_BADGES) expect(screen.getByText(badge.description)).toBeInTheDocument();
  expect(screen.queryByText('An earlier award.')).not.toBeInTheDocument();
  expect(screen.getAllByText('×3')).toHaveLength(4);
  expect(screen.getAllByRole('listitem')).toHaveLength(5);
  expect(screen.queryByText('Featured', { exact: true })).toBeNull();
  fireEvent.change(chooser, { target: { value: 'wrong-pocket' } });
  fireEvent.click(screen.getByText('Save selection'));
  expect(onFeature).toHaveBeenCalledWith('wrong-pocket');
});

test('suppresses an old featured selection returned by the service and rejects new retired selections', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({
    featured: { 'player-previous': 'bb-confetti', 'player-current': 'wrong-pocket' },
    featuredCounts: { 'player-previous': 4, 'player-current': 2 },
  }) }));
  try {
    await expect(getFeaturedBadgeDetails(['player-previous', 'player-current'])).resolves.toEqual({
      featured: { 'player-current': 'wrong-pocket' }, featuredCounts: { 'player-current': 2 },
    });
    for (const badge of RETIRED_BADGES) {
      await expect(setFeaturedBadge(null, badge.id)).rejects.toThrow('current collection');
    }
    expect(global.fetch).toHaveBeenCalledTimes(1);
  } finally {
    global.fetch = originalFetch;
  }
});
