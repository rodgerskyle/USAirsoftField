import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import BattleBadgeShowcase from './BattleBadgeShowcase';
import { requestPlayerExperience } from '../constants/playerExperience';

jest.mock('../constants/playerExperience', () => ({ requestPlayerExperience: jest.fn() }));

const empty = { totalAwards: 0, colorBadgeCount: 0, towerOfPower: false, silverStars: 0, goldStars: 0 };
const decorated = { totalAwards: 30, colorBadgeCount: 8, towerOfPower: true, silverStars: 1, goldStars: 1 };

beforeEach(() => requestPlayerExperience.mockReset());

test('shows the physical badges in order and displays both star patches and counts', async () => {
  requestPlayerExperience.mockResolvedValue({ progress: decorated });
  render(<BattleBadgeShowcase playerId="field-member" />);
  const region = screen.getByRole('region', { name: 'US Airsoft World Battle Badges' });
  expect(await within(region).findByText('30 MVP days')).toBeVisible();
  const rack = within(region).getByRole('list', { name: 'Earned Battle Badges and stars' });
  const badges = within(rack).getAllByRole('listitem');
  expect(badges.map(item => item.querySelector('img').getAttribute('src').split('#')[1])).toEqual([
    'red', 'orange', 'black', 'yellow', 'blue', 'green', 'gray', 'gold-thread', 'tower-of-power', 'silver-star', 'gold-star',
  ]);
  expect(within(rack).getByText('Tower of Power')).toBeVisible();
  expect(within(rack).getByText('1 Silver Star')).toBeVisible();
  expect(within(rack).getByText('1 Gold Star')).toBeVisible();
});

test('ignores a late response after switching profiles', async () => {
  let finish;
  requestPlayerExperience.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValueOnce({ progress: empty });
  const profile = render(<BattleBadgeShowcase playerId="first-player" />);
  const [firstPath, signal] = requestPlayerExperience.mock.calls[0];
  expect(firstPath).toBe('/api/battle-badges?playerId=first-player');
  profile.rerender(<BattleBadgeShowcase playerId="other-player" />);
  expect(signal.aborted).toBe(true);
  expect(await screen.findByText('No Battle Badges earned yet.')).toBeVisible();
  await act(async () => finish({ progress: decorated }));
  expect(screen.queryByRole('list')).toBeNull();
});

test('retries an unavailable record and shows one earned badge', async () => {
  requestPlayerExperience.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
    progress: { ...empty, totalAwards: 1, colorBadgeCount: 1 },
  });
  render(<BattleBadgeShowcase playerId="field-member" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('1 MVP day')).toBeVisible();
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});
