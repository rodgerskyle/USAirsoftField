import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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
  waiverStatus: 'signed', playerId: 'guest:field', displayName: 'Field Guest', membershipStatus: 'guest', side: null,
  experienceBand: 'unrated', assignedExperienceBand: null, balanceScore: 100,
  classificationBand: 'unrated', assignedClassificationBand: null, gamesLogged: 0,
  canSetExperience: true, experienceOptions: estimates,
};
const checkedInPlayer = {
  playerId: 'RegisteredMember1', displayName: 'Registered Member', membershipStatus: 'active',
  experienceBand: 'elite', balanceScore: 150, side: 'camo', revision: 1,
  classificationBand: 'a', gamesLogged: 300,
};
const versionedRoster = { ...initialRoster, rosterVersion: 'initial', players: [checkedInPlayer] };
const emptyTierCounts = { a: 0, b: 0, c: 0, d: 0, unrated: 0 };
const emptyStrength = { elite: 0, veteran: 0, regular: 0, limited: 0, unrated: 0, strength: 0 };
const clearedRoster = {
  date, rosterVersion: 'after-reset', counts: { camo: 0, solid: 0, total: 0 }, players: [], clearedCount: 2,
  balance: { camo: emptyStrength, solid: emptyStrength },
  classifications: { camo: emptyTierCounts, solid: emptyTierCounts },
};

test('uses a walk-on team balance estimate while their classification stays Unrated', async () => {
  const saved = { ...guest, side: 'solid', experienceBand: 'veteran', balanceScore: 125, revision: 1 };
  const withGuest = {
    ...initialRoster,
    rosterVersion: 'initial',
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
    .mockResolvedValueOnce(versionedRoster)
    .mockResolvedValueOnce({ ...versionedRoster, player: guest })
    .mockResolvedValueOnce({ ...withGuest, players: [saved], player: saved, outcome: 'checked-in' })
    .mockResolvedValueOnce({ ...versionedRoster, players: [{ ...saved, side: 'camo' }], player: { ...saved, side: 'camo', revision: 2 }, outcome: 'reassigned' });

  render(<AdminFieldCheckIn request={request} />);
  await screen.findByText('2 checked in');
  fireEvent.click(screen.getByText('Add a walk-on'));
  fireEvent.change(screen.getByLabelText('Player name or callsign'), { target: { value: 'Field Guest' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

  const assessment = await screen.findByLabelText('Team balance estimate');
  expect(request.mock.calls[1][1].body).toEqual({ action: 'guestPreview', displayName: 'Field Guest' });
  expect(screen.getByText('0 games logged')).toBeTruthy();
  fireEvent.change(assessment, { target: { value: 'veteran' } });
  expect(screen.getByText('Suggested side · Solid · closer estimated strength')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Check in as Solid' }));
  await screen.findByText('Field Guest checked in as Solid.');
  expect(request.mock.calls[2][1].body).toEqual({
    action: 'guestCheckIn', date, side: 'solid', displayName: 'Field Guest', experienceBand: 'veteran', rosterVersion: 'initial',
  });
  expect(within(screen.getByRole('list', { name: 'Recent players' })).getByText('Walk-on · Unrated')).toBeTruthy();
  expect(screen.getByRole('progressbar', { name: 'Solid estimated strength share' })).toHaveValue(60);

  fireEvent.click(screen.getByRole('button', { name: 'Move to Camo' }));
  await screen.findByText('Field Guest moved to Camo.');
  expect(request.mock.calls[3][1].body).toEqual({
    action: 'reassign', date, side: 'camo', playerId: guest.playerId, revision: 1, experienceBand: 'veteran', rosterVersion: 'initial',
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
  expect(screen.queryByRole('button', { name: 'Clear players' })).not.toBeInTheDocument();
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

test('requires confirmation to clear players and restores focus when cancelled', async () => {
  const request = jest.fn().mockResolvedValueOnce(versionedRoster);
  render(<AdminFieldCheckIn request={request} />);

  const trigger = await screen.findByRole('button', { name: 'Clear players' });
  fireEvent.click(trigger);
  const confirmation = screen.getByRole('region', { name: 'Clear today’s check-ins?' });
  expect(confirmation).toHaveAccessibleDescription(/every Camo and Solid check-in for today/);
  const cancel = within(confirmation).getByRole('button', { name: 'Cancel' });
  expect(cancel).toHaveFocus();
  expect(request).toHaveBeenCalledTimes(1);

  fireEvent.click(cancel);
  expect(screen.queryByRole('region', { name: 'Clear today’s check-ins?' })).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(screen.getByText('2 checked in')).toBeInTheDocument();
  expect(request).toHaveBeenCalledTimes(1);
});

test('clears both sides and the current lookup without letting an older refresh restore players', async () => {
  let finishRefresh;
  const pendingRefresh = new Promise(resolve => { finishRefresh = resolve; });
  const request = jest.fn()
    .mockResolvedValueOnce(versionedRoster)
    .mockResolvedValueOnce({ ...versionedRoster, player: checkedInPlayer })
    .mockReturnValueOnce(pendingRefresh)
    .mockResolvedValueOnce(clearedRoster);
  render(<AdminFieldCheckIn request={request} />);

  const trigger = await screen.findByRole('button', { name: 'Clear players' });
  const input = screen.getByLabelText('Player name, ID or card link');
  fireEvent.change(input, { target: { value: 'Registered Member' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find player' }));
  await screen.findByRole('heading', { name: checkedInPlayer.displayName });
  fireEvent.click(screen.getByText('Add a walk-on'));
  const walkOn = screen.getByLabelText('Player name or callsign');
  fireEvent.change(walkOn, { target: { value: 'A draft walk-on' } });
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('button', { name: 'Clear check-ins' }));

  await screen.findByText('Cleared 2 check-ins for today.');
  expect(request.mock.calls[3][1].body).toEqual({ action: 'clearPlayers', date, rosterVersion: 'initial' });
  await act(async () => { finishRefresh(versionedRoster); });

  expect(screen.getByText('No players have checked in today.')).toBeInTheDocument();
  expect(screen.getByText('0 checked in')).toBeInTheDocument();
  expect(screen.getAllByText('0 players')).toHaveLength(2);
  expect(screen.getAllByRole('definition').map(definition => definition.textContent)).toEqual(Array(10).fill('0'));
  expect(screen.queryByText(checkedInPlayer.displayName)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Clear players' })).not.toBeInTheDocument();
  expect(input).toHaveValue('');
  expect(walkOn).toHaveValue('');
  expect(input).toHaveFocus();
});

test('shows the current roster after a stale clear and requires a new confirmation', async () => {
  const newPlayer = { ...checkedInPlayer, playerId: 'RegisteredMember2', displayName: 'New Check-in', side: 'solid' };
  const currentRoster = { ...versionedRoster, rosterVersion: 'other-reset', players: [newPlayer] };
  const failure = Object.assign(new Error('Another device cleared the roster.'), { status: 409, data: currentRoster });
  const request = jest.fn()
    .mockResolvedValueOnce(versionedRoster)
    .mockRejectedValueOnce(failure)
    .mockResolvedValueOnce(clearedRoster);
  render(<AdminFieldCheckIn request={request} />);

  fireEvent.click(await screen.findByRole('button', { name: 'Clear players' }));
  fireEvent.click(screen.getByRole('button', { name: 'Clear check-ins' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Another device cleared the roster.');
  expect(screen.getByText(newPlayer.displayName)).toBeInTheDocument();
  expect(screen.queryByText(checkedInPlayer.displayName)).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Clear today’s check-ins?' })).not.toBeInTheDocument();
  expect(request).toHaveBeenCalledTimes(2);

  fireEvent.click(screen.getByRole('button', { name: 'Clear players' }));
  fireEvent.click(screen.getByRole('button', { name: 'Clear check-ins' }));
  await screen.findByText('0 checked in');
  expect(request.mock.calls[2][1].body).toEqual({ action: 'clearPlayers', date, rosterVersion: 'other-reset' });
});

test('loads the current board when a reset races a lookup', async () => {
  const failure = Object.assign(new Error('The roster was cleared. Look up the player again.'), {
    status: 409, data: clearedRoster,
  });
  const request = jest.fn().mockResolvedValueOnce(versionedRoster).mockRejectedValueOnce(failure);
  render(<AdminFieldCheckIn request={request} />);
  await screen.findByText(checkedInPlayer.displayName);

  fireEvent.click(screen.getByRole('button', { name: new RegExp(checkedInPlayer.displayName) }));
  expect(await screen.findByRole('alert')).toHaveTextContent('The roster was cleared. Look up the player again.');
  expect(screen.getByText('0 checked in')).toBeInTheDocument();
  expect(screen.queryByText(checkedInPlayer.displayName)).not.toBeInTheDocument();
});

test('checks the selected signed waiver before staff can admit a walk-on', async () => {
  const request = jest.fn().mockResolvedValueOnce(versionedRoster)
    .mockResolvedValueOnce({ ...versionedRoster, player: { ...guest, waiverStatus: 'missing' } })
    .mockResolvedValueOnce({ matches: [{ ref: 'signed-ref', name: 'Jordan Smith', signedAt: Date.now() }] })
    .mockResolvedValueOnce({ ...versionedRoster, player: { ...guest, displayName: 'Jordan Smith', waiverRef: 'signed-ref' } });
  render(<AdminFieldCheckIn request={request} />);
  await screen.findByText('2 checked in');
  fireEvent.click(screen.getByText('Add a walk-on'));
  fireEvent.change(screen.getByLabelText('Player name or callsign'), { target: { value: 'Field Guest' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(await screen.findByRole('button', { name: 'Check in as Solid' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/Participant.*(name|waiver)/i), { target: { value: 'Jordan' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find a signed waiver' }));
  fireEvent.click(await screen.findByRole('button', { name: /Jordan Smith/ }));
  expect(await screen.findByText('Signed waiver verified.')).toBeVisible();
  expect(request.mock.calls[3][1].body).toMatchObject({ action: 'guestPreview', displayName: 'Jordan Smith', waiverRef: 'signed-ref' });
  expect(screen.getByRole('button', { name: 'Check in as Solid' })).toBeEnabled();
});
