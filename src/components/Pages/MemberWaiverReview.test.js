import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import MemberWaiverReview from './MemberWaiverReview';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';

const listPath = '/api/waivers/member-sync';
const matchPath = '/api/waivers/membership';
const ali = { playerId: 'member-one', name: 'Ali Reed', username: 'ali-one', reason: 'missing' };
const otherAli = { ...ali, playerId: 'member-two', username: 'ali-two', reason: 'review' };
const waiver = { name: 'Alice Reed', ref: 'digital:record-2', signedAt: Date.UTC(2026, 3, 12), source: 'digital' };
const page = (members, extra) => ({ members, nextCursor: null, total: members.length, building: false, ...extra });
const button = name => screen.getByRole('button', { name });
const open = () => fireEvent.click(button('View members needing a waiver match'));
const payload = body => ({ method: 'POST', signal: expect.anything(), body });

async function openMatch(request) {
  render(<MemberWaiverReview request={request} />);
  open();
  fireEvent.click(await screen.findByRole('button', { name: 'Match waiver for Ali Reed (@ali-one)' }));
  fireEvent.click(await screen.findByRole('button', { name: /Alice Reed ·/ }));
}

function verifySigner() {
  fireEvent.click(screen.getByLabelText('I verified this waiver belongs to Ali Reed.'));
}

test('matches the selected account, waits for a confirmed save and reloads the current review list', async () => {
  let finish;
  const request = jest.fn()
    .mockResolvedValueOnce(page([ali, otherAli]))
    .mockResolvedValueOnce({ matches: [waiver] })
    .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValueOnce(page([otherAli]));
  await openMatch(request);
  expect(request).toHaveBeenNthCalledWith(1, listPath, payload({ action: 'list' }));
  expect(request).toHaveBeenNthCalledWith(2, matchPath, payload({ action: 'reviewSearch', memberId: ali.playerId, search: ali.name }));
  expect(screen.getByText('@ali-one')).toBeVisible();
  expect(screen.getByText(/Digital waiver · Signed/)).toBeVisible();
  expect(button('Attach waiver to profile')).toBeDisabled();
  expect(screen.queryByLabelText(/birth/i)).toBeNull();

  verifySigner();
  fireEvent.click(button('Attach waiver to profile'));
  expect(request).toHaveBeenNthCalledWith(3, matchPath, payload({
    action: 'reviewLink', memberId: ali.playerId, ref: waiver.ref, signedAt: waiver.signedAt, confirmed: true,
  }));
  expect(button('Attaching waiver…')).toBeDisabled();
  expect(screen.queryByText(/Signed waiver attached to the profile/)).toBeNull();
  await act(async () => { finish({ check: { status: 'signed', signedAt: waiver.signedAt } }); });
  expect(screen.getByText('Signed waiver attached to the profile for Ali Reed.')).toBeVisible();
  expect(button('Match waiver for Ali Reed (@ali-two)')).toBeVisible();
  expect(screen.queryByText('@ali-one')).toBeNull();
  expect(request).toHaveBeenNthCalledWith(4, listPath, payload({ action: 'list' }));
});

test('keeps failures visible and requires fresh confirmation after selecting a different waiver', async () => {
  const request = jest.fn()
    .mockResolvedValueOnce(page([ali]))
    .mockResolvedValueOnce({ matches: [waiver] })
    .mockResolvedValueOnce({ check: { status: 'missing' } })
    .mockRejectedValueOnce(new Error('This waiver was linked to another member.'))
    .mockResolvedValueOnce({ matches: [{ ...waiver, ref: 'digital:different-record', name: 'Ali Reed' }] });
  await openMatch(request);
  verifySigner();
  fireEvent.click(button('Attach waiver to profile'));
  expect(await screen.findByRole('alert')).toHaveTextContent('could not confirm');
  fireEvent.click(button('Attach waiver to profile'));
  await screen.findByText('This waiver was linked to another member.');
  expect(screen.queryByText(/Signed waiver attached to the profile/)).toBeNull();
  fireEvent.click(button('Choose a different waiver'));
  fireEvent.click(await screen.findByRole('button', { name: /Ali Reed ·/ }));
  expect(button('Attach waiver to profile')).toBeDisabled();
  expect(screen.getByRole('checkbox')).not.toBeChecked();
});

test('supports searching across pages, ignores stale responses and resets on staff account changes', async () => {
  let previous;
  const request = jest.fn()
    .mockResolvedValueOnce(page([ali], { total: 2, nextCursor: 'next' }))
    .mockImplementationOnce(() => new Promise(resolve => { previous = resolve; }))
    .mockResolvedValueOnce(page([otherAli]));
  const { rerender } = render(<MemberWaiverReview request={request} />);
  open();
  fireEvent.click(await screen.findByRole('button', { name: 'Next members' }));
  expect(request).toHaveBeenNthCalledWith(2, listPath, payload({ action: 'list', cursor: 'next' }));
  fireEvent.change(screen.getByLabelText('Find a member on the review list'), { target: { value: '  ali-two  ' } });
  fireEvent.click(button('Search members'));
  await screen.findByText('@ali-two');
  expect(request).toHaveBeenNthCalledWith(3, listPath, payload({ action: 'list', query: 'ali-two' }));
  expect(request.mock.calls[1][1].signal.aborted).toBe(true);
  await act(async () => { previous(page([ali])); });
  expect(screen.queryByText('@ali-one')).toBeNull();
  expect(screen.queryByText('Previous members')).toBeNull();
  rerender(<MemberWaiverReview request={jest.fn()} />);
  expect(screen.queryByText('@ali-two')).toBeNull();
  expect(button('View members needing a waiver match')).toHaveAttribute('aria-expanded', 'false');
});

test('refreshes a building list and retries directory failures', async () => {
  jest.useFakeTimers();
  try {
    const request = jest.fn()
      .mockResolvedValueOnce(page([], { building: true }))
      .mockRejectedValueOnce(new Error('Connection lost'))
      .mockResolvedValueOnce(page([ali]));
    render(<MemberWaiverReview request={request} />);
    open();
    await act(async () => {});
    expect(screen.getByText(/Checking member accounts/)).toBeVisible();
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(screen.getByRole('alert')).toHaveTextContent('Connection lost');
    fireEvent.click(button('Retry member list'));
    await act(async () => {});
    expect(button('Match waiver for Ali Reed (@ali-one)')).toBeVisible();
    await act(async () => { jest.advanceTimersByTime(20000); });
    expect(request).toHaveBeenCalledTimes(3);
  } finally {
    jest.useRealTimers();
  }
});

test('uses the staff authorization token for search and attach, and displays the server conflict message', async () => {
  const previousFetch = global.fetch;
  const account = { uid: 'staff-test', getIdToken: jest.fn().mockResolvedValue('test-only-id-token') };
  const firebase = { auth: { currentUser: account } };
  const request = (path, options) => requestStaffFieldTool(firebase, account.uid, path, options);
  global.fetch = jest.fn(async (url, opts) => {
    const { action, memberId } = JSON.parse(opts.body);
    expect(opts.method).toBe('POST');
    expect(opts.credentials).toBe('omit');
    expect(opts.cache).toBe('no-store');
    expect(opts.headers.Authorization).toBe('Bearer test-only-id-token');
    expect(url).toBe('https://app.usairsoftfield.com' + (action === 'list' ? listPath : matchPath));
    if (action === 'list') return { ok: true, json: async () => page([ali]) };
    expect(memberId).toBe(ali.playerId);
    if (action === 'reviewSearch') return { ok: true, json: async () => ({ matches: [waiver] }) };
    expect(action).toBe('reviewLink');
    return { ok: false, status: 409, json: async () => ({ error: 'The selected signature changed or expired. Search for the waiver again.' }) };
  });
  try {
    await openMatch(request);
    verifySigner();
    fireEvent.click(button('Attach waiver to profile'));
    expect(await screen.findByRole('alert')).toHaveTextContent('The selected signature changed or expired.');
    expect(account.getIdToken).toHaveBeenCalledTimes(3);
    expect(screen.getByText('@ali-one')).toBeVisible();
  } finally {
    global.fetch = previousFetch;
  }
});
