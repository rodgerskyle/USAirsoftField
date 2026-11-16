import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import AdminFieldCheckIn from './AdminFieldCheckIn';

jest.mock('./StaffCardScanner', () => ({ StaffCardScanner: () => null }), { virtual: true });

const date = '2026-11-16';
const estimates = { unrated: 100, limited: 95, regular: 108, veteran: 125, elite: 155 };
const initialRoster = {
  date, counts: { camo: 1, solid: 1, total: 2 },
  balance: {
    camo: { elite: 1, veteran: 0, regular: 0, limited: 0, unrated: 0, strength: 155 },
    solid: { elite: 0, veteran: 0, regular: 1, limited: 0, unrated: 0, strength: 108 },
  },
  classifications: {
    camo: { a: 1, b: 0, c: 0, d: 0, unrated: 0 },
    solid: { a: 0, b: 0, c: 1, d: 0, unrated: 0 },
  },
  players: [],
};
const guest = {
  playerId: 'guest:field', displayName: 'Field Guest', membershipStatus: 'guest', side: null,
  experienceBand: 'unrated', assignedExperienceBand: null, balanceScore: 100,
  classificationBand: 'unrated', assignedClassificationBand: null, gamesLogged: 0,
  canSetExperience: true, experienceOptions: estimates,
};

test('uses a walk-on team balance estimate while their classification stays Unrated', async () => {
  const saved = { ...guest, side: 'solid', experienceBand: 'veteran', balanceScore: 125, revision: 1 };
  const withGuest = {
    ...initialRoster,
    counts: { camo: 1, solid: 2, total: 3 },
    balance: {
      ...initialRoster.balance,
      solid: { ...initialRoster.balance.solid, veteran: 1, strength: 233 },
    },
    classifications: {
      ...initialRoster.classifications,
      solid: { ...initialRoster.classifications.solid, unrated: 1 },
    },
  };
  const request = jest.fn()
    .mockResolvedValueOnce(initialRoster)
    .mockResolvedValueOnce({ ...initialRoster, player: guest })
    .mockResolvedValueOnce({ ...withGuest, players: [saved], player: saved, outcome: 'checked-in' })
    .mockResolvedValueOnce({ ...initialRoster, players: [{ ...saved, side: 'camo' }], player: { ...saved, side: 'camo', revision: 2 }, outcome: 'reassigned' });

  render(<AdminFieldCheckIn request={request} />);
  await screen.findByText('2 checked in');
  fireEvent.click(screen.getByText('Add a walk-on'));
  fireEvent.change(screen.getByLabelText('Walk-on name or callsign'), { target: { value: 'Field Guest' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

  const assessment = await screen.findByLabelText('Team balance estimate');
  expect(request.mock.calls[1][1].body).toEqual({ action: 'guestPreview', displayName: 'Field Guest' });
  expect(screen.getByText('0 games logged')).toBeTruthy();
  fireEvent.change(assessment, { target: { value: 'veteran' } });
  expect(screen.getByText('Suggested side · Solid · closer estimated strength')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Check in as Solid' }));
  await screen.findByText('Field Guest checked in as Solid.');
  expect(request.mock.calls[2][1].body).toEqual({
    action: 'guestCheckIn', date, side: 'solid', displayName: 'Field Guest', experienceBand: 'veteran',
  });
  expect(within(screen.getByRole('list', { name: 'Recent players' })).getByText('Walk-on · Unrated')).toBeTruthy();
  expect(screen.getByRole('progressbar', { name: 'Solid estimated strength share' })).toHaveValue(60);

  fireEvent.click(screen.getByRole('button', { name: 'Move to Camo' }));
  await screen.findByText('Field Guest moved to Camo.');
  expect(request.mock.calls[3][1].body).toEqual({
    action: 'reassign', date, side: 'camo', playerId: guest.playerId, revision: 1, experienceBand: 'veteran',
  });
});

test('resolves a connected scanner Code 128 or an official card link on the website', async () => {
  const playerId = 'Wi23kdJBktOzimVScc29CA728S4k';
  const cardToken = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef';
  const player = {
    playerId, displayName: 'Registered Member', membershipStatus: 'active',
    experienceBand: 'elite', balanceScore: 150, side: null,
    classificationBand: 'a', gamesLogged: 300,
  };
  const request = jest.fn()
    .mockResolvedValueOnce(initialRoster)
    .mockResolvedValueOnce({ ...initialRoster, player })
    .mockResolvedValueOnce({ ...initialRoster, player });

  render(<AdminFieldCheckIn request={request} />);
  await screen.findByText('2 checked in');
  const input = screen.getByLabelText('Player name, ID or card link');
  const search = screen.getByRole('button', { name: 'Find player' });

  fireEvent.change(input, { target: { value: ']C0' + playerId } });
  fireEvent.click(search);
  const selection = (await screen.findByRole('heading', { name: 'Registered Member' })).closest('section');
  expect(within(selection).getByText('A Tier')).toBeTruthy();
  expect(within(selection).getByText('300 games logged')).toBeTruthy();
  expect(within(selection).getByText('Suggested side · Solid · spreads A Tier players')).toBeTruthy();
  expect(request.mock.calls[1][1].body).toEqual({ action: 'lookup', includeBalance: true, playerId });

  fireEvent.change(input, { target: { value: 'https://app.usairsoftfield.com/#verify/' + cardToken } });
  fireEvent.click(search);
  await screen.findByRole('heading', { name: 'Registered Member' });
  expect(request.mock.calls[2][1].body).toEqual({ action: 'lookup', includeBalance: true, cardToken });
});

test('shows the five official tier ranges and leaves an unverified prior check-in out of those counts', async () => {
  const priorCheckIn = {
    playerId: 'PreviousMember', displayName: 'Previous Member', membershipStatus: 'active', side: 'camo',
    experienceBand: 'elite', balanceScore: 155, classificationBand: null, gamesLogged: null,
  };
  const request = jest.fn().mockResolvedValue({
    ...initialRoster,
    classifications: {
      ...initialRoster.classifications,
      camo: { a: 0, b: 0, c: 0, d: 0, unrated: 0 },
    },
    players: [priorCheckIn],
  });
  render(<AdminFieldCheckIn request={request} />);
  await screen.findByText('1 player without a verified tier');

  const camo = screen.getByRole('heading', { name: 'Camo' }).closest('section');
  expect(within(camo).getAllByRole('term').map(term => term.textContent))
    .toEqual(['A Tier', 'B Tier', 'C Tier', 'D Tier', 'Unrated']);
  expect(within(camo).getAllByRole('definition').map(definition => definition.textContent))
    .toEqual(['0', '0', '0', '0', '0']);
  fireEvent.click(screen.getByText('How team balance works'));
  expect(screen.getByText(/Unrated has 0 logged games/)).toHaveTextContent(
    'D Tier covers 1–99, C Tier 100–199, B Tier 200–299, and A Tier 300 or more.',
  );
  expect(screen.getByText('Membership active · Classification unavailable')).toBeTruthy();
});
