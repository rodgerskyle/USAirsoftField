import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { todayAtField } from '../constants/gameDayRecap';
import { GameDayRecapNotificationSettings, PlayerGameDayRecap } from './PlayerGameDayRecap';

const playerId = 'official-player';
const origin = 'https://app.usairsoftfield.com';
const originalFetch = global.fetch;
const response = data => ({ ok: true, json: async () => data });

function renderForPlayer(Component) {
  const firebase = { auth: { currentUser: { uid: playerId, getIdToken: async () => 'verified-token' } } };
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Component firebase={firebase} playerId={playerId} />
  </MemoryRouter>);
}

beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; });

test('loads a private recap manually and renders recorded score, patches, Prestige, and next game day', async () => {
  global.fetch.mockResolvedValue(response({
    availableDates: ['2026-07-11'],
    nextGameDay: { date: '2026-07-12', name: 'Open Play', time: '9:00 AM' },
    recap: {
      date: '2026-07-11', checkedIn: true, pointsEarned: 75, wins: 3, losses: 1,
      patches: [{ id: 'countdown', name: 'Countdown', count: 2 }],
      prestige: { progress: { nextPrestige: 2, points: { earned: 300, required: 500 }, patches: [] } },
    },
  }));
  renderForPlayer(PlayerGameDayRecap);
  expect(global.fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'View recap' }));
  expect(await screen.findByText('July 11, 2026', { selector: 'time' })).toBeInTheDocument();
  expect(screen.getByText('Checked in')).toBeInTheDocument();
  expect(screen.getByText('75', { selector: 'dd' })).toBeInTheDocument();
  expect(screen.getByText('Countdown')).toBeInTheDocument();
  expect(screen.getByText('×2')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Current progress toward Prestige 2' })).toBeInTheDocument();
  expect(screen.getByText('July 12, 2026', { selector: 'time' })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(`${origin}/api/game-day-recap`, expect.objectContaining({
    headers: expect.objectContaining({ Authorization: 'Bearer verified-token' }), credentials: 'omit', cache: 'no-store',
  }));
});

test('shows Pacific close time when a selected day is still open', async () => {
  global.fetch.mockResolvedValueOnce(response({ recap: null, availableDates: [] })).mockResolvedValueOnce(response({
    recap: null, availableDates: [], availableAt: '2026-07-12T00:00:00.000Z',
  }));
  renderForPlayer(PlayerGameDayRecap);
  fireEvent.click(screen.getByRole('button', { name: 'View recap' }));
  fireEvent.change(await screen.findByLabelText('Recap date'), { target: { value: todayAtField() } });
  expect(await screen.findByText(/Game-day recaps open after July 11.*5:00 PM PDT/)).toHaveAttribute('role', 'status');
  expect(global.fetch).toHaveBeenLastCalledWith(`${origin}/api/game-day-recap?date=${todayAtField()}`, expect.any(Object));
});

test('disables account notifications, with separate actions for manual recap and device setup', async () => {
  global.fetch.mockResolvedValueOnce(response({ enabled: true, configured: true }))
    .mockResolvedValueOnce(response({ enabled: false, configured: true }));
  renderForPlayer(GameDayRecapNotificationSettings);
  const toggle = await screen.findByRole('switch', { name: 'Send recap notifications' });
  expect(toggle).toBeChecked();
  fireEvent.click(toggle);
  await waitFor(() => expect(toggle).not.toBeChecked());
  expect(global.fetch).toHaveBeenLastCalledWith(`${origin}/api/game-day-recap/notifications`, expect.objectContaining({
    method: 'POST', body: JSON.stringify({ action: 'settings', enabled: false }),
    headers: expect.objectContaining({ Authorization: 'Bearer verified-token' }),
  }));
  expect(screen.getByRole('link', { name: 'Player Hub' })).toHaveAttribute('href', '/player-hub');
  expect(screen.getByRole('link', { name: 'Set up alerts on this device in Companion' }))
    .toHaveAttribute('href', `${origin}/#profile/recap-notifications`);
});
