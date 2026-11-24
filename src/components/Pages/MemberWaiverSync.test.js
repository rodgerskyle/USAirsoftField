import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';
import MemberWaiverSync from './MemberWaiverSync';

const path = '/api/waivers/member-sync';
const startedAt = Date.parse('2026-05-01T16:00:00Z');
const running = { startedAt, status: 'running', phase: 'matching', active: 5, processed: 1, linked: 1 };
const completed = { ...running, status: 'complete', processed: 5, linked: 2, verified: 1, review: 1, missing: 1 };
const response = sync => ({ ok: true, json: async () => ({ sync, retryAfterMs: 400 }) });
const previousFetch = global.fetch;

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  global.fetch = previousFetch;
  jest.useRealTimers();
});

function tick(milliseconds) {
  return act(async () => { jest.advanceTimersByTime(milliseconds); });
}

test('opens check-in with an authenticated status read, advances to completion and restarts the displayed sweep on demand', async () => {
  const getIdToken = jest.fn().mockResolvedValue('staff-id-token');
  const firebase = { auth: { currentUser: { uid: 'field-admin', getIdToken } } };
  global.fetch = jest.fn().mockResolvedValueOnce(response(running))
    .mockResolvedValueOnce(response(completed)).mockResolvedValueOnce(response(completed));
  const request = (endpoint, options) => requestStaffFieldTool(firebase, 'field-admin', endpoint, options);
  render(<MemberWaiverSync request={request} />);
  await tick(0);
  fireEvent.click(screen.getByText('Active member waiver matching'));
  expect(screen.getByRole('status')).toHaveTextContent('Attaching matching waivers');
  await tick(399);
  expect(fetch).toHaveBeenCalledTimes(1);
  await tick(1);
  expect(screen.getByRole('status')).toHaveTextContent('Waiver matching complete');
  expect(screen.getByText(/5 of 5 active members checked/)).toHaveTextContent('2 newly linked · 1 already verified · 1 need review · 1 without a match');
  await tick(60000);
  expect(fetch).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
  await tick(0);
  expect(fetch.mock.calls.map(([, options]) => [options.method, options.body && JSON.parse(options.body)])).toEqual([
    ['GET', undefined], ['POST', { action: 'step' }], ['POST', { action: 'restart', startedAt }],
  ]);
  expect(getIdToken).toHaveBeenCalledTimes(3);
  for (const [url, options] of fetch.mock.calls) {
    expect(url).toBe('https://app.usairsoftfield.com' + path);
    expect(options.credentials).toBe('omit');
    expect(options.headers.Authorization).toBe('Bearer staff-id-token');
  }
});

test('pauses on a failed step and resumes from stored progress without restarting the sweep', async () => {
  const request = jest.fn().mockResolvedValueOnce({ sync: running })
    .mockRejectedValueOnce(new Error('Field connection lost.')).mockResolvedValueOnce({ sync: completed });
  render(<MemberWaiverSync request={request} />);
  await tick(0);
  fireEvent.click(screen.getByText('Active member waiver matching'));
  await tick(1000);
  expect(screen.getByRole('status')).toHaveTextContent('Waiver matching paused');
  expect(screen.getByRole('alert')).toHaveTextContent('Field connection lost.');
  expect(screen.getByText(/1 of 5 active members checked/)).toBeInTheDocument();
  await tick(60000);
  expect(request).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Resume matching' }));
  await tick(0);
  expect(request).toHaveBeenLastCalledWith(path, { signal: expect.anything() });
  expect(screen.getByRole('status')).toHaveTextContent('Waiver matching complete');
});

test('has one active step across rerenders and ignores a late response after leaving check-in', async () => {
  let finishStep;
  const request = jest.fn().mockResolvedValueOnce({ sync: running })
    .mockImplementationOnce(() => new Promise(resolve => { finishStep = resolve; }));
  const { rerender, unmount } = render(<MemberWaiverSync request={request} />);
  await tick(0);
  await tick(1000);
  rerender(<MemberWaiverSync request={request} />);
  await tick(60000);
  expect(request).toHaveBeenCalledTimes(2);
  const { signal } = request.mock.calls[1][1];
  unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => { finishStep({ sync: running }); });
  await tick(60000);
  expect(request).toHaveBeenCalledTimes(2);
});

test('clears a scheduled step when staff leave check-in before it starts', async () => {
  const request = jest.fn().mockResolvedValue({ sync: running, retryAfterMs: 3000 });
  const { unmount } = render(<MemberWaiverSync request={request} />);
  await tick(0);
  unmount();
  await tick(60000);
  expect(request).toHaveBeenCalledTimes(1);
});


test('shows account discovery and waiver indexing counts and advances without delay when the service is ready', async () => {
  const request = jest.fn().mockResolvedValueOnce({ sync: { status: 'running', phase: 'accounts', scanned: 24, active: 8 } })
    .mockResolvedValueOnce({ sync: { status: 'running', phase: 'waivers', waiversScanned: 17 } })
    .mockResolvedValueOnce({ sync: completed });
  render(<MemberWaiverSync request={request} />);
  await tick(0);
  fireEvent.click(screen.getByText('Active member waiver matching'));
  expect(screen.getByText('24 accounts checked · 8 active members found')).toBeVisible();
  await tick(0);
  expect(screen.getByText('17 waiver records checked')).toBeVisible();
  await tick(0);
  expect(screen.getByRole('status')).toHaveTextContent('Waiver matching complete');
});
