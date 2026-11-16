import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminFieldMembership from './AdminFieldMembership';
import AdminFieldReports from './AdminFieldReports';

jest.mock('./StaffCardScanner', () => ({
  StaffCardScanner: ({ disabled, onScan }) => (
    <button type="button" disabled={disabled} onClick={() => onScan({ cardToken: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef' })}>
      Scan with camera
    </button>
  ),
}));

const playerId = 'Wi23kdJBktOzimVScc29CA728S4k';
const cardToken = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef';
const endpoint = '/api/member-card/verify?staff=1';
const expiredMember = {
  status: 'expired', playerId, displayName: 'USAW Member', renewal: '11-14-2026',
  checkedAt: '2026-11-16T19:00:00.000Z',
};

function enterCard(value) {
  const input = screen.getByLabelText('Scan or enter a membership card');
  fireEvent.change(input, { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify membership' }));
  return input;
}

function verification(body) {
  return [endpoint, { method: 'POST', body, signal: expect.anything() }];
}

it('reads a connected Code 128 scanner and shows the official expiration date', async () => {
  const request = jest.fn().mockResolvedValue(expiredMember);
  render(<AdminFieldMembership request={request} />);
  const input = enterCard(']C1' + playerId);
  await screen.findByText('Expired membership');
  expect(screen.getByText('Nov 14, 2026')).toBeTruthy();
  expect(screen.getByText(playerId)).toBeTruthy();
  expect(request).toHaveBeenCalledWith(...verification({ playerId }));
  expect(document.activeElement).toBe(input);
});

it('verifies official card links and camera QR scans using the QR token', async () => {
  const request = jest.fn().mockResolvedValue({ ...expiredMember, status: 'active', renewal: 'N/A' });
  render(<AdminFieldMembership request={request} />);
  enterCard('https://app.usairsoftfield.com/#verify/' + cardToken);
  await screen.findByText('No expiration date');
  expect(request).toHaveBeenNthCalledWith(1, ...verification({ token: cardToken }));

  fireEvent.click(screen.getByRole('button', { name: 'Scan with camera' }));
  await screen.findByText('Active membership');
  expect(request).toHaveBeenNthCalledWith(2, ...verification({ token: cardToken }));
});

it('handles unprefixed raw QR tokens only after an exact player ID misses', async () => {
  const request = jest.fn()
    .mockRejectedValueOnce(Object.assign(new Error('Not found'), { status: 404 }))
    .mockResolvedValueOnce(expiredMember);
  render(<AdminFieldMembership request={request} />);
  enterCard(cardToken);
  await screen.findByText('Expired membership');
  expect(request).toHaveBeenNthCalledWith(1, ...verification({ playerId: cardToken }));
  expect(request).toHaveBeenNthCalledWith(2, ...verification({ token: cardToken }));
});

it('clears the prior result and keeps an authorization failure visible', async () => {
  const request = jest.fn().mockResolvedValueOnce(expiredMember)
    .mockRejectedValueOnce(Object.assign(new Error('Unlock field tools.'), { status: 403 }));
  render(<AdminFieldMembership request={request} />);
  enterCard(playerId);
  await screen.findByText('Expired membership');
  enterCard(cardToken);
  const error = await screen.findByRole('alert');
  expect(error.textContent).toBe('Unlock field tools.');
  expect(screen.queryByText('Expired membership')).toBeNull();
  expect(request).toHaveBeenCalledTimes(2);
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
