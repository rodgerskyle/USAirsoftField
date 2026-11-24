import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PartyGuestWaiver, { partyWaiverRoute } from './PartyGuestWaiver';

const token = 'a'.repeat(64);
const form = { name: 'Sample Player', recaptchaToken: 'fixture' };
const reply = (waiverStatus, waiverSubmissionStatus, role = 'guest', kind = 'party') => ({ ok: true, json: async () => ({ role, group: { kind, name: 'Afternoon players',
  entries: [{ id: 'entry', displayName: 'Sample Player', preparation: { waiverStatus, waiverSubmissionStatus } }],
} }) });
const mount = (value = token) => render(<PartyGuestWaiver token={value}>{sign => <button type="button" onClick={() => sign(form)}>Sign fixture waiver</button>}</PartyGuestWaiver>);
const original = global.fetch;
beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { global.fetch = original; });

test('posts only to the current guest endpoint, confirms verified status and returns to the same checklist', async () => {
  fetch.mockResolvedValueOnce(reply('missing', 'none')).mockResolvedValueOnce(reply('signed', 'confirmed'));
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Sign fixture waiver' }));
  await screen.findByText(/Waiver verified/);
  expect(screen.queryByRole('button', { name: 'Sign fixture waiver' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Return to my party checklist' })).toHaveAttribute('href', 'https://www.usairsoftfield.com/group-check-in#guest/' + token);
  expect(fetch).toHaveBeenCalledTimes(2);
  for (const [url, opts] of fetch.mock.calls) {
    expect(url).toBe('https://app.usairsoftfield.com/api/party-readiness');
    expect(opts).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer', headers: { Authorization: 'Party ' + token } });
  }
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ action: 'signWaiver', waiverData: form });
});

test('recovers a lost reply with a status check and never sends a second signed agreement', async () => {
  fetch.mockResolvedValueOnce(reply('missing', 'none')).mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(reply('missing', 'review'));
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Sign fixture waiver' }));
  await screen.findByText(/verification is pending/);
  fireEvent.click(screen.getByRole('button', { name: 'Check waiver status' }));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  expect(screen.queryByRole('button', { name: 'Sign fixture waiver' })).toBeNull();
  expect(fetch.mock.calls.map(([, opts]) => opts.method)).toEqual(['GET', 'POST', 'GET']);
});

test('a malformed or organizer link cannot open a waiver form for a guest', async () => {
  expect(partyWaiverRoute('#group')).toBeNull();
  expect(partyWaiverRoute('#party/not-a-token')).toEqual({ token: '' });
  expect(partyWaiverRoute('#party/' + token)).toEqual({ token });
  const invalid = mount('');
  expect(screen.getByText('Personal waiver link unavailable')).toBeVisible();
  expect(fetch).not.toHaveBeenCalled();
  invalid.unmount();
  fetch.mockResolvedValueOnce(reply('missing', 'none', 'organizer'));
  mount();
  await screen.findByRole('alert');
  expect(screen.queryByText('Sample Player')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Sign fixture waiver' })).toBeNull();
});

test('a regular visit guest can sign the official form and return to their own group checklist', async () => {
  fetch.mockResolvedValueOnce(reply('missing', 'none', 'guest', 'visit'))
    .mockResolvedValueOnce(reply('signed', 'confirmed', 'guest', 'visit'));
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Sign fixture waiver' }));
  await screen.findByText(/Waiver verified/);
  expect(screen.getByRole('link', { name: 'Return to my group checklist' })).toHaveAttribute('href', 'https://www.usairsoftfield.com/group-check-in#guest/' + token);
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ action: 'signWaiver', waiverData: form });
});
