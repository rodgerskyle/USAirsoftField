import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import PartyChecklistPortal from './PartyChecklistPortal';

const organizer = 'a'.repeat(64), guest = 'b'.repeat(64);
const endpoint = 'https://app.usairsoftfield.com/api/party-readiness';
const fullName = 'Morgan Rivera';
const prep = { waiverStatus: 'missing', rentalIntent: 'unknown', guestToken: guest, waiverSubmissionStatus: 'none', ready: false };
const first = { id: 'guest-1', displayName: fullName, preparation: prep };
const base = { name: 'Afternoon birthday', date: '2026-11-28', entries: [first] };
const summary = { ready: 0, expected: 3, unlisted: 2, rentalsRequested: 0 };
const guestView = (overrides = {}) => ({ role: 'guest', group: { ...base, entries: [{ ...first, preparation: { ...prep, ...overrides } }] } });
const organizerView = (extra = {}) => ({ role: 'organizer', group: { ...base, code: 'afternoon-3', readiness: summary, organizerToken: organizer, canSetExpected: true, ...extra } });
const response = (data, status = 200) => ({ ok: status === 200, status, json: async () => data });
const portal = (role, token) => <PartyChecklistPortal role={role} token={token} />;
const original = global.fetch;
const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const cryptoDescriptor = Object.getOwnPropertyDescriptor(window, 'crypto');
const addId = '00000000-0000-4000-8000-000000000099';

beforeEach(() => {
  global.fetch = jest.fn();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: jest.fn().mockResolvedValue(undefined) } });
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => addId } });
});
afterEach(() => {
  global.fetch = original;
  if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard);
  else delete navigator.clipboard;
  if (cryptoDescriptor) Object.defineProperty(window, 'crypto', cryptoDescriptor);
  else delete window.crypto;
});

test('a guest opens the same website waiver and saves a personal rental decision', async () => {
  fetch.mockResolvedValueOnce(response(guestView())).mockResolvedValueOnce(response(guestView({ rentalIntent: 'requested' })));
  render(portal('guest', guest));
  expect(await screen.findByRole('heading', { name: fullName })).toBeInTheDocument();
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe(endpoint);
  expect(options).toMatchObject({ method: 'GET', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'error', headers: { Authorization: 'Party ' + guest } });
  expect(screen.getByRole('link', { name: 'Complete my waiver' })).toHaveAttribute('href', '/waiver#party/' + guest);
  expect(screen.queryByText('Add guest')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: 'I need rental gear' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save rental choice' }));
  await screen.findByText('Rental choice saved.');
  expect(fetch.mock.calls[1][0]).toBe(endpoint);
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ action: 'setRental', rentalIntent: 'requested' });
  expect(screen.getByRole('radio', { name: 'I need rental gear' })).toBeChecked();
  expect(screen.getByText('Rental gear requested')).toBeInTheDocument();
  expect(document.querySelector('a[href*="app.usairsoftfield.com"]')).toBeNull();
});

test('organizers share website invitations, change headcount, and safely retry adding a guest', async () => {
  const larger = organizerView({ readiness: { ...summary, expected: 4, unlisted: 3 } });
  const second = { ...first, id: 'guest-2', displayName: 'Casey Ball', preparation: { ...prep, guestToken: 'c'.repeat(64) } };
  fetch.mockResolvedValueOnce(response(organizerView())).mockResolvedValueOnce(response(larger))
    .mockResolvedValueOnce(response({ error: 'Could not confirm the update.' }, 503))
    .mockResolvedValueOnce(response(organizerView({ entries: [first, second] })));
  render(portal('organizer', organizer));
  await screen.findByText('0 of 3 ready');
  fireEvent.click(screen.getByRole('button', { name: 'Copy invitation for new guests' }));
  fireEvent.click(screen.getByRole('button', { name: 'Copy guest checklist for ' + fullName }));
  expect(navigator.clipboard.writeText.mock.calls.map(([value]) => value)).toEqual([
    'https://www.usairsoftfield.com/group-check-in#join/afternoon-3', 'https://www.usairsoftfield.com/group-check-in#guest/' + guest,
  ]);
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Expected guests' }), { target: { value: '4' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save expected count' }));
  await screen.findByText('0 of 4 ready');
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ action: 'setExpected', expected: 4 });
  fireEvent.change(screen.getByRole('textbox', { name: /Guest’s full name/ }), { target: { value: second.displayName } });
  fireEvent.click(screen.getByRole('button', { name: 'Add guest' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('textbox', { name: /Guest’s full name/ })).toHaveValue(second.displayName);
  fireEvent.click(screen.getByRole('button', { name: 'Add guest' }));
  await screen.findByRole('heading', { name: second.displayName });
  expect(fetch.mock.calls[2][1].body).toBe(fetch.mock.calls[3][1].body);
  expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ action: 'addGuest', displayName: second.displayName, requestId: addId });
  expect(screen.getByRole('textbox', { name: /Guest’s full name/ })).toHaveValue('');
});

test('expired, wrong-role and over-broad responses never render a private roster on a guest invitation', async () => {
  const extraRoster = { role: 'guest', group: { ...base, entries: [first, { ...first, id: 'other', displayName: 'Private Guest' }] } };
  fetch.mockResolvedValueOnce(response(organizerView())).mockResolvedValueOnce(response(extraRoster))
    .mockResolvedValueOnce(response(guestView({ guestToken: 'e'.repeat(64) })))
    .mockResolvedValueOnce(response(guestView({ waiverStatus: 'signed' })))
    .mockResolvedValueOnce(response({ error: 'This private invitation expired.' }, 410));
  const { rerender } = render(portal('guest', 'invalid'));
  expect(fetch).not.toHaveBeenCalled();
  rerender(portal('guest', guest));
  for (let i = 0; i < 3; i++) {
    await screen.findByText(/This private link does not open/);
    expect(screen.queryByText(fullName)).not.toBeInTheDocument();
    expect(screen.queryByText('Private Guest')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh checklist' }));
  }
  await screen.findByText('Your signed waiver is verified for this visit.');
  expect(screen.queryByRole('link', { name: 'Complete my waiver' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh checklist' }));
  await screen.findByText('This private invitation expired.');
  expect(screen.queryByText(fullName)).not.toBeInTheDocument();
});

test('switching guests aborts the old request and pending signatures are not requested again', async () => {
  let finish;
  fetch.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValueOnce(response(guestView({ waiverSubmissionStatus: 'confirmed' })));
  const { rerender } = render(portal('organizer', organizer));
  const old = fetch.mock.calls[0][1];
  rerender(portal('guest', guest));
  expect(old.signal.aborted).toBe(true);
  await screen.findByText(/Your waiver was submitted/);
  await act(async () => { finish(response(organizerView())); });
  expect(screen.queryByRole('link', { name: 'Complete my waiver' })).not.toBeInTheDocument();
  expect(screen.queryByText('0 of 3 ready')).not.toBeInTheDocument();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
});

test('returning from the waiver refreshes a restored personal checklist', async () => {
  fetch.mockResolvedValueOnce(response(guestView())).mockResolvedValueOnce(response(guestView({ waiverStatus: 'signed' })));
  render(portal('guest', guest));
  await screen.findByRole('link', { name: 'Complete my waiver' });
  const restore = new Event('pageshow');
  Object.defineProperty(restore, 'persisted', { value: true });
  fireEvent(window, restore);
  await screen.findByText('Your signed waiver is verified for this visit.');
  expect(screen.queryByRole('link', { name: 'Complete my waiver' })).not.toBeInTheDocument();
});

test('regular groups support scoped organizer and guest checklists without reservation details', async () => {
  const visit = organizerView({ kind: 'visit', name: 'Sunday players', canSetExpected: false });
  const personal = guestView();
  Object.assign(personal.group, { kind: 'visit', name: 'Sunday players' });
  fetch.mockResolvedValueOnce(response(visit)).mockResolvedValueOnce(response(personal));
  const { rerender } = render(portal('organizer', organizer));
  await screen.findByRole('region', { name: 'Group readiness before arrival' });
  expect(screen.getByRole('heading', { name: 'Group readiness' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Add guest' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Save expected count' })).not.toBeInTheDocument();
  rerender(portal('guest', guest));
  await screen.findByRole('heading', { name: fullName });
  expect(screen.getByRole('heading', { name: 'Your group checklist' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Complete my waiver' })).toHaveAttribute('href', '/waiver#party/' + guest);
  expect(screen.getByRole('button', { name: 'Save rental choice' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Add guest' })).not.toBeInTheDocument();
});

test('organizer sees destination counts for checked-in guests separately from guests still due at the desk', async () => {
  const entries = ['rentals','rentals','briefing','check-in'].map((nextStop, index) => ({
    ...first, id:'entry-' + index, displayName:'Party guest ' + index, nextStop,
  }));
  fetch.mockResolvedValue(response(organizerView({entries})));
  render(portal('organizer', organizer));
  const stops = await screen.findByRole('region', {name:'Next stops'});
  expect(stops).toHaveTextContent('2 guests to rental pickup');
  expect(stops).toHaveTextContent('1 guest to the barracks for briefing');
  expect(screen.getByText('Check in with staff when you arrive.')).toBeInTheDocument();
});
