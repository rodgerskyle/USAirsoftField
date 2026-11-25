import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RoundParticipation, PlayerRoundCard } from './RoundParticipation';
import { requestMyRound } from '../constants/fieldStaffApi';

const originalFetch = global.fetch;
const date = '2026-11-25';
const round = { id: 'round-2', title: 'Battle Flag' };
const adult = { playerId: 'member-parent-fixture', displayName: 'River', side: 'camo', revision: 4, sittingOut: false, buddyId: null };
const child = { playerId: 'guest-child-fixture', displayName: 'Brook', side: 'solid', revision: 2, sittingOut: false, buddyId: null };
const staffView = { date, round, players: [adult, child], counts: { total: 2, camo: 1, solid: 1 }, checkedInTotal: 2 };
const self = { date, round, player: { side: 'solid', revision: 2, sittingOut: false, buddyName: 'River' } };
function response(data, status = 200) { return { ok: status === 200, status, json: async () => data }; }
afterEach(() => { global.fetch = originalFetch; });

test('staff can keep a checked-in walk-on with a member using both revisions and explicitly choose the buddy’s side', async () => {
  const paired = { ...staffView, players: [
    { ...adult, revision: 5, side: 'solid', buddyId: child.playerId, buddyName: child.displayName },
    { ...child, revision: 3, buddyId: adult.playerId, buddyName: adult.displayName },
  ] };
  const request = jest.fn().mockResolvedValueOnce(staffView).mockResolvedValueOnce(paired).mockResolvedValueOnce(staffView);
  const saved = jest.fn();
  render(<RoundParticipation request={request} playerId={adult.playerId} onSaved={saved} />);
  fireEvent.click(await screen.findByText('Keep my Battle Buddy with me'));
  fireEvent.change(screen.getByLabelText('Battle Buddy'), { target: { value: child.playerId } });
  fireEvent.click(screen.getByRole('button', { name: 'Pair both on Solid' }));
  await screen.findByText('Battle Buddies paired on Solid.');
  expect(request.mock.calls[0][0]).toBe('/api/round-roster?staff=1');
  expect(request.mock.calls[1][1].body).toEqual({ action: 'pair', date, playerId: adult.playerId, buddyId: child.playerId, revision: 4, buddyRevision: 2 });
  expect(saved).toHaveBeenCalledWith(paired);
  fireEvent.click(screen.getByRole('button', { name: 'Unpair Battle Buddies' }));
  await screen.findByText('Battle Buddy pair removed.');
  expect(request.mock.calls[2][1].body).toEqual({ action: 'unpair', date, playerId: adult.playerId, buddyId: child.playerId, revision: 5 });
});

test('stale round responses refresh the controls without silently sitting someone out of the next game', async () => {
  const next = { ...staffView, round: { id: 'round-3', title: 'Next round' } };
  const request = jest.fn().mockResolvedValueOnce(staffView)
    .mockRejectedValueOnce(new Error('This round changed.')).mockResolvedValueOnce(next);
  render(<RoundParticipation request={request} playerId={adult.playerId} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sit out this round' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('This round changed');
  expect(screen.getByText('Next round')).toBeVisible();
  expect(request.mock.calls[1][1].body).toEqual({ action: 'availability', date, gameId: round.id, playerId: adult.playerId, revision: adult.revision, sittingOut: true });
  expect(request.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
});

test('member round card operates only on the signed-in player, supports a return and retains the day check-in', async () => {
  const user = { uid: 'self-member', getIdToken: jest.fn().mockResolvedValue('fixture-token') };
  const firebase = { auth: { currentUser: user } };
  const out = { ...self, player: { ...self.player, sittingOut: true, revision: 3 } };
  global.fetch = jest.fn().mockResolvedValueOnce(response(self)).mockResolvedValueOnce(response(out)).mockResolvedValueOnce(response(self));
  render(<PlayerRoundCard uid={user.uid} firebase={firebase} />);
  expect(global.fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'View round status & Battle Buddy' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Sit out this round' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Back in this round' }));
  await screen.findByText('Back in this round.');
  expect(screen.getByText(/Your Battle Buddy today is River/)).toBeVisible();
  expect(screen.queryByText('Unpair Battle Buddies')).toBeNull();
  expect(global.fetch.mock.calls[0][0]).toBe('https://app.usairsoftfield.com/api/round-roster');
  expect(global.fetch.mock.calls[0][1]).toMatchObject({ credentials: 'omit', headers: { Authorization: 'Bearer fixture-token' } });
  expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({ action: 'availability', date, gameId: round.id, revision: 2, sittingOut: true });
  expect(JSON.parse(global.fetch.mock.calls[2][1].body)).toEqual({ action: 'availability', date, gameId: round.id, revision: 3, sittingOut: false });
});

test('self lookup drops a stale identity before contacting the service and signed-out sessions cannot access it', async () => {
  let release;
  const alice = { uid: 'alice-fixture', getIdToken: () => new Promise(resolve => { release = resolve; }) };
  const firebase = { auth: { currentUser: alice } };
  global.fetch = jest.fn();
  const lookup = requestMyRound(firebase, alice.uid);
  firebase.auth.currentUser = null;
  await act(async () => { release('discarded'); await expect(lookup).rejects.toThrow(/Sign in/); });
  await expect(requestMyRound(firebase, alice.uid)).rejects.toThrow(/Sign in/);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('without an eligible game a player stays checked in and cannot accidentally sit out a later round', async () => {
  const request = jest.fn().mockResolvedValue({ ...self, round: null });
  render(<RoundParticipation request={request} />);
  await waitFor(() => expect(screen.getByText('No round selected')).toBeVisible());
  expect(screen.queryByRole('button', { name: /Sit out this round/ })).toBeNull();
});
