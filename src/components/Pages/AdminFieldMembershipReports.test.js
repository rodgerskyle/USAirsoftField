import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminFieldMembership from './AdminFieldMembership';
import AdminFieldReports from './AdminFieldReports';

jest.mock('./StaffCardScanner', () => ({
  StaffCardScanner: ({ disabled, onScan }) => (
    <>
      <button type="button" disabled={disabled} onClick={() => onScan({ cardToken: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef' })}>
        Scan with camera
      </button>
      <button type="button" disabled={disabled} onClick={() => onScan({ barcodeValue: 'jordanrivera' })}>
        Scan a legacy barcode
      </button>
    </>
  ),
}));

const playerId = 'Wi23kdJBktOzimVScc29CA728S4k';
const secondPlayerId = 'AnotherMemberEvenWhenNameMatches';
const cardToken = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef';
const endpoint = '/api/member-card/verify?staff=1';
const lookupEndpoint = '/api/game-day-check-in';
const expiredMember = {
  status: 'expired', playerId, displayName: 'USAW Member', renewal: '11-14-2026',
  checkedAt: '2026-11-16T19:00:00.000Z',
};

function enterLookup(value) {
  const input = screen.getByLabelText('Player name, ID, or card link');
  fireEvent.change(input, { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify membership' }));
  return input;
}

function verification(body) {
  return [endpoint, { method: 'POST', body, signal: expect.anything() }];
}

function nameSearch(query) {
  return [lookupEndpoint, { method: 'POST', body: { action: 'lookup', query, includeWaiverBan: true }, signal: expect.anything() }];
}

it('reads a connected Code 128 scanner and shows the official expiration date', async () => {
  const request = jest.fn().mockResolvedValue(expiredMember);
  render(<AdminFieldMembership request={request} />);
  const input = enterLookup(']C1' + playerId);
  await screen.findByText('Expired membership');
  expect(screen.getByText('Nov 14, 2026')).toBeTruthy();
  expect(screen.getByText(playerId)).toBeTruthy();
  expect(request).toHaveBeenCalledWith(...verification({ playerId }));
  expect(document.activeElement).toBe(input);
});

it('verifies official card links and camera QR scans using the QR token', async () => {
  const request = jest.fn().mockResolvedValue({ ...expiredMember, status: 'active', renewal: 'N/A' });
  render(<AdminFieldMembership request={request} />);
  enterLookup('https://app.usairsoftfield.com/#verify/' + cardToken);
  await screen.findByText('No expiration date');
  expect(request).toHaveBeenNthCalledWith(1, ...verification({ token: cardToken }));

  fireEvent.click(screen.getByRole('button', { name: 'Scan with camera' }));
  await screen.findByText('Active membership');
  expect(request).toHaveBeenNthCalledWith(2, ...verification({ token: cardToken }));
});

it('resolves a USAW profile QR link by its exact ID without falling back to name search', async () => {
  const request = jest.fn().mockRejectedValueOnce(Object.assign(new Error('No profile match'), { status: 404 }));
  render(<AdminFieldMembership request={request} />);
  enterLookup('https://www.usairsoftfield.com/profilelookup/' + playerId);
  await screen.findByText('Record not found');
  expect(request).toHaveBeenCalledWith(...verification({ playerId }));
  expect(request).toHaveBeenCalledTimes(1);
});

it('rejects unrelated profile links before making a verification or lookup request', () => {
  const request = jest.fn();
  render(<AdminFieldMembership request={request} />);
  enterLookup('https://other.example/profilelookup/' + playerId);
  expect(screen.getByRole('alert')).toHaveTextContent('Scan a USAW card');
  expect(request).not.toHaveBeenCalled();
});

it('tries the exact ID before finding candidates for a scanned compact name', async () => {
  const request = jest.fn()
    .mockRejectedValueOnce(Object.assign(new Error('No ID match'), { status: 404 }))
    .mockResolvedValueOnce({ matches: [{ playerId, displayName: 'Jordan Rivera', waiverBanStatus: 'clear' }] })
    .mockResolvedValueOnce({ ...expiredMember, displayName: 'Jordan Rivera', waiverBanStatus: 'clear' });
  render(<AdminFieldMembership request={request} />);
  fireEvent.click(screen.getByRole('button', { name: 'Scan a legacy barcode' }));
  const choice = await screen.findByRole('button', { name: /Jordan Rivera/ });
  expect(request).toHaveBeenNthCalledWith(1, ...verification({ playerId: 'jordanrivera' }));
  expect(request).toHaveBeenNthCalledWith(2, ...nameSearch('jordanrivera'));
  expect(request).toHaveBeenCalledTimes(2);
  fireEvent.click(choice);
  await screen.findByText('Expired membership');
  expect(request).toHaveBeenNthCalledWith(3, ...verification({ playerId }));
});

it('looks up a short compact name directly when a connected scanner includes an AIM prefix', async () => {
  const request = jest.fn().mockResolvedValueOnce({ matches: [] });
  render(<AdminFieldMembership request={request} />);
  enterLookup(']C1ab');
  await screen.findByText('No matching players. Try another name or enter a player ID.');
  expect(request).toHaveBeenCalledWith(...nameSearch('ab'));
  expect(request).toHaveBeenCalledTimes(1);
});

it('handles unprefixed raw QR tokens only after an exact player ID misses', async () => {
  const request = jest.fn()
    .mockRejectedValueOnce(Object.assign(new Error('Not found'), { status: 404 }))
    .mockResolvedValueOnce(expiredMember);
  render(<AdminFieldMembership request={request} />);
  enterLookup(cardToken);
  await screen.findByText('Expired membership');
  expect(request).toHaveBeenNthCalledWith(1, ...verification({ playerId: cardToken }));
  expect(request).toHaveBeenNthCalledWith(2, ...verification({ token: cardToken }));
});

it('clears the prior result and keeps an authorization failure visible', async () => {
  const request = jest.fn().mockResolvedValueOnce(expiredMember)
    .mockRejectedValueOnce(Object.assign(new Error('Unlock field tools.'), { status: 403 }));
  render(<AdminFieldMembership request={request} />);
  enterLookup(playerId);
  await screen.findByText('Expired membership');
  enterLookup(cardToken);
  const error = await screen.findByRole('alert');
  expect(error.textContent).toBe('Unlock field tools.');
  expect(screen.queryByText('Expired membership')).toBeNull();
  expect(request).toHaveBeenCalledTimes(2);
});

it('shows players with the same name separately and verifies only the selected player', async () => {
  const displayName = 'Jordan Rivera';
  const request = jest.fn()
    .mockResolvedValueOnce({ matches: [
      { playerId, displayName, waiverBanStatus: 'exact-name' },
      { playerId: secondPlayerId, displayName, waiverBanStatus: 'possible-name' },
    ] })
    .mockResolvedValueOnce({ ...expiredMember, playerId: secondPlayerId, displayName, waiverBanStatus: 'possible-name' });
  render(<AdminFieldMembership request={request} />);
  enterLookup('Jordan Ri');

  const heading = await screen.findByRole('heading', { name: 'Matching players' });
  expect(heading).toHaveFocus();
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenNthCalledWith(1, ...nameSearch('Jordan Ri'));
  expect(screen.getByRole('button', { name: new RegExp(`${displayName}.*${playerId}`) }))
    .toHaveTextContent('Exact name match on the waiver ban list');
  expect(screen.getByRole('button', { name: new RegExp(`${displayName}.*${secondPlayerId}`) }))
    .toHaveTextContent('Possible waiver ban match');
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`${displayName}.*${secondPlayerId}`) }));
  await screen.findByText('Expired membership');
  expect(screen.getByText('Possible waiver ban match')).toBeInTheDocument();
  expect(screen.getByText('Confirm the player’s identity in Waiver Search.')).toBeInTheDocument();
  expect(request).toHaveBeenNthCalledWith(2, ...verification({ playerId: secondPlayerId }));
  expect(screen.queryByRole('heading', { name: 'Matching players' })).not.toBeInTheDocument();
});

it('searches for a one-word name when a manually entered ID-like value has no exact match', async () => {
  const displayName = 'LongCallsign';
  const request = jest.fn()
    .mockRejectedValueOnce(Object.assign(new Error('No ID match'), { status: 404 }))
    .mockResolvedValueOnce({ matches: [{ playerId, displayName }] });
  render(<AdminFieldMembership request={request} />);
  enterLookup(displayName);
  await screen.findByRole('button', { name: new RegExp(displayName) });
  expect(request).toHaveBeenNthCalledWith(1, ...verification({ playerId: displayName }));
  expect(request).toHaveBeenNthCalledWith(2, ...nameSearch(displayName));
  expect(request).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Waiver ban check unavailable')).toBeInTheDocument();
  expect(screen.queryByText('Active membership')).not.toBeInTheDocument();
});

it('shows that a name search returned no matches without verifying a player', async () => {
  const request = jest.fn().mockResolvedValueOnce({ matches: [] });
  render(<AdminFieldMembership request={request} />);
  const input = enterLookup('Unknown Name');
  await screen.findByText('No matching players. Try another name or enter a player ID.');
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith(...nameSearch('Unknown Name'));
  expect(input).toHaveValue('Unknown Name');
  expect(input).toHaveFocus();
});

it.each([
  ['exact-name', 'Exact name match on the waiver ban list', true],
  ['clear', 'No waiver ban match', false],
  ['unavailable', 'Waiver ban check unavailable', false],
  [undefined, 'Waiver ban check unavailable', false],
])('shows the waiver ban check separately from active membership when the status is %s', async (waiverBanStatus, label, flagged) => {
  const request = jest.fn().mockResolvedValue({ ...expiredMember, status: 'active', waiverBanStatus });
  render(<AdminFieldMembership request={request} />);
  enterLookup(playerId);
  await screen.findByText('Active membership');
  expect(screen.getByText(label)).toBeInTheDocument();
  const followup = screen.queryByText('Confirm the player’s identity in Waiver Search.');
  if (flagged) expect(followup).toBeInTheDocument();
  else expect(followup).not.toBeInTheDocument();
});

const report = {
  id: '63b7f5f4-218d-482b-86a6-d8660e39d91e', teamName: 'USAW Test Team',
  messageId: '81b902fe-9aa5-4aa3-8fc1-bd485bcc9511', reason: 'spam',
  senderName: 'Sender Example', reporterName: 'Reporter Example',
  text: '<b>Reported message</b>', note: 'Please review.', messageAvailable: true,
};

it('removes the reported message through the shared moderation tool and refreshes its list', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  const siblings = [report, { ...report, id: '6a8b3f7e-3833-4d80-9c1a-b7e5d31246fc', text: 'Another report for the same message' }];
  const request = jest.fn().mockResolvedValueOnce({ reports: siblings })
    .mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ reports: [] });
  try {
    render(<AdminFieldReports request={request} />);
    await screen.findByText('<b>Reported message</b>');
    const remove = screen.getAllByRole('button', { name: 'Remove message' })[0];
    fireEvent.click(remove);
    expect(request).toHaveBeenCalledTimes(1);
    fireEvent.click(remove);
    await screen.findByText('No pending reports.');
    expect(screen.getByText('Message removed from the team chat.')).toBeTruthy();
    expect(request).toHaveBeenNthCalledWith(2, '/api/teams', {
      method: 'POST', body: { action: 'moderateReport', reportId: report.id, decision: 'remove' }, signal: expect.anything(),
    });
    expect(request).toHaveBeenNthCalledWith(3, '/api/teams?action=moderation', { signal: expect.anything() });
  } finally {
    confirm.mockRestore();
  }
});

it('refreshes the queue after another staff member resolves a report first', async () => {
  const request = jest.fn().mockResolvedValueOnce({ reports: [report] })
    .mockRejectedValueOnce(Object.assign(new Error('Already reviewed'), { status: 409 }))
    .mockResolvedValueOnce({ reports: [] });
  render(<AdminFieldReports request={request} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Dismiss report' }));
  await screen.findByText('Another staff member already reviewed this report.');
  await waitFor(() => expect(screen.queryByText('USAW Test Team')).toBeNull());
  expect(request).toHaveBeenNthCalledWith(2, '/api/teams', {
    method: 'POST', body: { action: 'moderateReport', reportId: report.id, decision: 'dismiss' }, signal: expect.anything(),
  });
});
