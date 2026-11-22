import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import AdminFieldCheckIn from './AdminFieldCheckIn';
import { StaffCardScanner } from './StaffCardScanner';

jest.mock('./StaffCardScanner', () => ({ StaffCardScanner: jest.fn() }), { virtual: true });

beforeEach(() => { StaffCardScanner.mockReturnValue(null); });

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

test('recent check-ins and search matches show their individual waiver status', async () => {
  const matches = [
    { playerId: 'registered-one', displayName: 'Sam Lee', waiverStatus: 'signed' },
    { playerId: 'registered-two', displayName: 'Sam Lane', waiverStatus: 'missing' },
  ];
  const request = jest.fn().mockResolvedValueOnce(versionedRoster)
    .mockResolvedValueOnce({ date, matches });
  render(<AdminFieldCheckIn request={request} />);
  const roster = await screen.findByRole('list', { name: 'Recent players' });
  expect(within(roster).getByText('Verification pending')).toBeVisible();
  const search = screen.getByRole('search', { name: 'Member search' });
  fireEvent.change(within(search).getByRole('searchbox', { name: 'Member name, ID or card link' }), { target: { value: 'Sam' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search members' }));
  const results = await screen.findByRole('list', { name: 'Matching players' });
  expect(within(results).getByRole('button', { name: /Sam Lee.*Waiver verified/ })).toBeVisible();
  expect(within(results).getByRole('button', { name: /Sam Lane.*Waiver needed/ })).toBeVisible();
});

test('opens staff check-in from a connected member ID, a legacy printed name or an official card link', async () => {
  const playerId = 'Wi23kdJBktOzimVScc29CA728S4k';
  const cardToken = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef';
  const player = {
    playerId, displayName: 'Registered Member', membershipStatus: 'active',
    experienceBand: 'elite', balanceScore: 150, side: null,
    classificationBand: 'a', gamesLogged: 300,
  };
  const request = jest.fn()
    .mockResolvedValueOnce(initialRoster)
    .mockResolvedValue({ ...initialRoster, player });

  render(<AdminFieldCheckIn request={request} />);
  await screen.findByText('2 checked in');
  expect(screen.queryByRole('button', { name: 'Clear players' })).not.toBeInTheDocument();
  const input = screen.getByLabelText('Member name, ID or card link');
  const search = screen.getByRole('button', { name: 'Search members' });

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
  for (const [value, expected] of [
    [']C0FoxRiver', { barcodeValue: 'FoxRiver' }],
    ['https://www.usairsoftfield.com/profilelookup/' + playerId, { playerId }],
  ]) {
    fireEvent.change(input, { target: { value } });
    fireEvent.click(search);
    await screen.findByRole('heading', { name: 'Registered Member' });
    expect(request.mock.calls.at(-1)[1].body).toEqual({ action: 'lookup', includeBalance: true, ...expected });
  }
  const scanner = StaffCardScanner.mock.calls.at(-1)[0];
  expect(scanner.verifyLegacyCards).toBe(true);
  await act(async () => { scanner.onScan({ barcodeValue: 'FoxRiver' }); });
  expect(request.mock.calls.at(-1)[1].body).toEqual({ action: 'lookup', includeBalance: true, barcodeValue: 'FoxRiver' });

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
  const input = screen.getByLabelText('Member name, ID or card link');
  fireEvent.change(input, { target: { value: 'Registered Member' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search members' }));
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
    .mockResolvedValueOnce({ ...versionedRoster, player: { ...guest, displayName: guest.displayName, waiverRef: 'signed-ref' } });
  render(<AdminFieldCheckIn request={request} />);
  await screen.findByText('2 checked in');
  fireEvent.click(screen.getByText('Add a walk-on'));
  fireEvent.change(screen.getByLabelText('Player name or callsign'), { target: { value: 'Field Guest' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(await screen.findByRole('button', { name: 'Check in as Solid' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/Participant.*(name|waiver)/i), { target: { value: 'Jordan' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find a signed waiver' }));
  fireEvent.click(await screen.findByRole('button', { name: /Jordan Smith/ }));
  expect(await screen.findByText('Waiver verified')).toBeVisible();
  expect(request.mock.calls[3][1].body).toMatchObject({ action: 'guestPreview', displayName: guest.displayName, waiverRef: 'signed-ref' });
  expect(screen.getByRole('button', { name: 'Check in as Solid' })).toBeEnabled();
});

const waiverMatch = { ref: 'official-waiver', name: 'Jordan Smith', signedAt: 1700000000000 };

async function chooseWaiver() {
  const input = screen.getByLabelText('Participant name or waiver reference');
  fireEvent.change(input, { target: { value: waiverMatch.name } });
  fireEvent.keyDown(input, { key: 'Enter' });
  fireEvent.click(await screen.findByRole('button', { name: /Jordan Smith ·/ }));
}

test('starts an individual walk-on from a waiver even when no account matches', async () => {
  const pending = { ...guest, displayName: waiverMatch.name, waiverRef: waiverMatch.ref, waiverStatus: 'unavailable' };
  const request = jest.fn().mockResolvedValueOnce(initialRoster)
    .mockResolvedValueOnce({ date, matches: [] })
    .mockResolvedValueOnce({ matches: [waiverMatch] })
    .mockResolvedValueOnce({ date, player: pending })
    .mockResolvedValueOnce({ date, player: { ...pending, waiverStatus: 'signed' } })
    .mockResolvedValueOnce({ date, player: { ...pending, waiverStatus: 'signed', side: 'camo' } });
  render(<AdminFieldCheckIn request={request} />);
  await screen.findByText('2 checked in');
  fireEvent.change(screen.getByLabelText('Member name, ID or card link'), { target: { value: waiverMatch.name } });
  fireEvent.click(screen.getByRole('button', { name: 'Search members' }));
  expect(await screen.findByText(/No matching player/)).toBeVisible();
  const field = screen.getByLabelText('Participant name or waiver reference');
  expect(field).toHaveValue(waiverMatch.name);
  expect(field).toHaveFocus();
  fireEvent.click(await screen.findByRole('button', { name: /Jordan Smith ·/ }));
  const selected = await screen.findByRole('region', { name: waiverMatch.name });
  expect(selected.compareDocumentPosition(screen.getByText('Add a walk-on')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(selected.compareDocumentPosition(screen.getByText('Find an arriving group')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(selected).getByText('Verification pending')).toBeVisible();
  expect(within(selected).getByRole('button', { name: 'Check in as Camo' })).toBeDisabled();
  fireEvent.click(within(selected).getByRole('button', { name: 'Retry waiver check' }));
  expect(await screen.findByText('Waiver verified')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Check in as Camo' }));
  await screen.findByText('Jordan Smith checked in as Camo.');
  expect(request.mock.calls.slice(3).map(([, options]) => options.body)).toEqual([
    { action: 'guestPreview', displayName: waiverMatch.name, waiverRef: waiverMatch.ref },
    { action: 'guestPreview', displayName: waiverMatch.name, waiverRef: waiverMatch.ref },
    expect.objectContaining({ action: 'guestCheckIn', displayName: waiverMatch.name, waiverRef: waiverMatch.ref }),
  ]);
});

test('selected member waiver search uses their registered name and keeps their account', async () => {
  const member = { ...checkedInPlayer, legalName: waiverMatch.name, side: null, waiverStatus: 'missing' };
  const request = jest.fn().mockResolvedValueOnce(initialRoster)
    .mockResolvedValueOnce({ date, player: member }).mockResolvedValueOnce({ matches: [waiverMatch] })
    .mockResolvedValueOnce({ date, player: { ...member, waiverStatus: 'signed', waiverRef: waiverMatch.ref } });
  render(<AdminFieldCheckIn request={request} />);
  await screen.findByText('2 checked in');
  const field = screen.getByLabelText('Member name, ID or card link');
  fireEvent.change(field, { target: { value: member.playerId } });
  fireEvent.click(screen.getByRole('button', { name: 'Search members' }));
  expect(await screen.findByLabelText('Participant name or waiver reference')).toHaveValue(waiverMatch.name);
  expect(screen.queryByRole('button', { name: 'Find a waiver' })).toBeNull();
  await chooseWaiver();
  expect(await screen.findByText('Waiver verified')).toBeVisible();
  expect(request.mock.calls[3][1].body).toEqual({ action: 'lookup', includeBalance: true, playerId: member.playerId, waiverRef: waiverMatch.ref });
  fireEvent.change(field, { target: { value: 'A different player' } });
  expect(screen.queryByRole('heading', { name: member.displayName })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Check in as Camo' })).toBeNull();
});

test.each(['guest', 'active'])('links a checked-in %s in place, refreshing the same attendance ID on conflict', async membershipStatus => {
  const seated = { ...checkedInPlayer, playerId: membershipStatus === 'guest' ? 'guest:legacy' : checkedInPlayer.playerId,
    membershipStatus, waiverStatus: 'missing' };
  const failure = Object.assign(new Error('The attendance record changed.'), { status: 409 });
  const request = jest.fn().mockResolvedValueOnce({ ...versionedRoster, players: [seated] })
    .mockResolvedValueOnce({ ...versionedRoster, player: seated })
    .mockResolvedValueOnce({ matches: [waiverMatch] }).mockRejectedValueOnce(failure)
    .mockResolvedValueOnce({ ...versionedRoster, player: { ...seated, revision: 2 } })
    .mockResolvedValueOnce({ matches: [waiverMatch] })
    .mockResolvedValueOnce({ ...versionedRoster, player: { ...seated, revision: 3, waiverStatus: 'signed' } });
  render(<AdminFieldCheckIn request={request} />);
  fireEvent.click(await screen.findByRole('button', { name: /Registered Member/ }));
  await screen.findByRole('heading', { name: seated.displayName });
  await chooseWaiver();
  expect(await screen.findByRole('alert')).toHaveTextContent('The attendance record changed.');
  expect(request.mock.calls[4][1].body).toEqual({ action: 'lookup', includeBalance: true, playerId: seated.playerId });
  await chooseWaiver();
  expect(await screen.findByText('Waiver linked to ' + seated.displayName + '.')).toBeVisible();
  expect(request.mock.calls[6][1].body).toEqual({ action: 'linkPlayerWaiver', playerId: seated.playerId,
    date, rosterVersion: 'initial', revision: 2, waiverRef: waiverMatch.ref });
  expect(within(screen.getByRole('region', { name: seated.displayName })).getByText('Checked in · Camo')).toBeVisible();
  expect(request.mock.calls.some(([, options]) => ['guestPreview', 'reassign', 'guestCheckIn', 'checkIn'].includes(options.body?.action))).toBe(false);
});

test('edits a checked-in walk-on in place and starts the next player without leaving the desk', async () => {
  const saved = { ...guest, side: 'solid', revision: 3 };
  const renamed = { ...saved, displayName: 'River Fox', revision: 4 };
  const request = jest.fn().mockResolvedValueOnce({ ...versionedRoster, players: [saved] })
    .mockResolvedValueOnce({ ...versionedRoster, player: saved })
    .mockResolvedValueOnce({ ...versionedRoster, players: [renamed], player: renamed });
  render(<AdminFieldCheckIn request={request} />);
  const roster = await screen.findByRole('list', { name: 'Recent players' });
  fireEvent.click(within(roster).getByRole('button', { name: /Field Guest/ }));
  fireEvent.click(await screen.findByText('Edit walk-on name'));
  fireEvent.change(screen.getByLabelText('Walk-on name or callsign'), { target: {value:'River Fox'} });
  fireEvent.click(screen.getByRole('button', { name:'Save walk-on name' }));
  await screen.findByText('Walk-on name saved.');
  expect(request.mock.calls[2][1].body).toEqual({ action:'renameWalkOn', date, playerId:saved.playerId, revision:3, rosterVersion:'initial', displayName:'River Fox' });
  expect(within(roster).getByText('River Fox')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name:'Check in next player' }));
  expect(screen.getByLabelText('Member name, ID or card link')).toHaveFocus();
  expect(screen.queryByRole('region', { name:'River Fox' })).toBeNull();
});
