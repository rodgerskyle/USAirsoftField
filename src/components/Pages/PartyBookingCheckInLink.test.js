import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { webcrypto } from 'crypto';
import { TextEncoder } from 'util';
import AuthUserContext from '../session/context';
import PartyBookingCheckInLink from './PartyBookingCheckInLink';

const booking = { title: 'Fixture family', size: '12', start: '2026-12-06T00:00:00Z', end: '2026-12-06T02:00:00Z', receipt: 'PRIVATE FIXTURE' };
const linked = { id: 'group', name: 'Fixture group', date: '2026-12-05', code: 'Abcdef123456_X-y' };
const staff = { uid: 'calendar-fixture', getIdToken: () => Promise.resolve('fixture-token') };
const firebase = { auth: { currentUser: staff } };
const response = (data, status = 200) => ({ ok: status === 200, status, json: async () => data });
const view = (role, record = booking) => <AuthUserContext.Provider value={{ uid: staff.uid, roles: { [role]: true } }}><PartyBookingCheckInLink firebase={firebase} booking={record} /></AuthUserContext.Provider>;
const originalFetch = global.fetch;
let properties;
beforeAll(() => {
  properties = ['crypto', 'TextEncoder'].map(name => [name, Object.getOwnPropertyDescriptor(window, name)]);
  Object.defineProperty(window, 'crypto', { configurable: true, value: webcrypto });
  Object.defineProperty(window, 'TextEncoder', { configurable: true, value: TextEncoder });
});
beforeEach(() => { global.fetch = jest.fn(); });
afterAll(() => {
  global.fetch = originalFetch;
  for (const [name, descriptor] of properties) {
    if (descriptor) Object.defineProperty(window, name, descriptor);
    else delete window[name];
  }
});

test('finds a legacy booking by Pacific date, links an organizer code, and displays the copyable code in the booking', async () => {
  fetch.mockResolvedValueOnce(response({ group: null })).mockResolvedValueOnce(response({ group: linked }));
  render(view('ADMIN'));
  const codeBox = await screen.findByLabelText('Organizer’s group code');
  const link = screen.getByRole('link', { name: /Open group check-in/ });
  expect(link).toHaveAttribute('target', '_blank');
  expect(link.getAttribute('href')).toMatch(/^\/admin\/field\/check-in\?partyDate=2026-12-05&booking=[a-f0-9]{64}#arriving-group$/);
  const [url, request] = fetch.mock.calls[0];
  expect(url).toMatch(/^https:\/\/app.usairsoftfield.com\/api\/party-check-in\?date=2026-12-05&partyKey=[a-f0-9]{64}$/);
  expect(request).toMatchObject({ method: 'GET', credentials: 'omit', headers: { Authorization: 'Bearer fixture-token' } });
  fireEvent.change(codeBox, { target: { value: linked.code } });
  fireEvent.click(screen.getByRole('button', { name: 'Link existing group' }));
  expect(await screen.findByLabelText('Group code')).toHaveAttribute('readonly');
  expect(screen.getByRole('link', { name: 'Open rental form' })).toHaveAttribute('href', '/admin/rentalform?view=new&group=group');
  expect(screen.getByRole('link', { name: /Manage this group/ })).toHaveAttribute('href', '/admin/field/groups?group=group');
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ date: linked.date, partyKey: new URL(url).searchParams.get('partyKey'), action: 'link', code: linked.code });
  expect(screen.getByText(linked.name)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
  await waitFor(() => expect(screen.getByLabelText('Group code')).toHaveFocus());
  expect(screen.getByLabelText('Group code').selectionEnd).toBe(16);
});

test('calendar-only staff create a code, recover an uncertain save, and see a moved group flagged for review', async () => {
  fetch.mockResolvedValueOnce(response({ group: null })).mockResolvedValueOnce(response({ error: 'Connection interrupted' }, 503))
    .mockResolvedValueOnce(response({ needsReview: true, group: { ...linked, code: 'raptors-12', date: '2026-12-04' } }));
  render(view('WAIVER'));
  fireEvent.change(await screen.findByLabelText('Public group name (optional)'), { target: { value: 'Raptors' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create group code' }));
  expect(await screen.findByText('Connection interrupted')).toBeVisible();
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ date: linked.date, action: 'create', name: 'Raptors' });
  fireEvent.click(screen.getByRole('button', { name: 'Refresh group status' }));
  expect(await screen.findByLabelText('Group code')).toHaveValue('raptors-12');
  expect(screen.getByText(/reservation changed/i)).toBeVisible();
  expect(screen.queryByRole('link')).toBeNull();
});

test('ignores a late response after selecting another party or losing the calendar role', async () => {
  let first;
  fetch.mockImplementationOnce(() => new Promise(resolve => { first = resolve; })).mockResolvedValueOnce(response({ group: null }));
  const { rerender } = render(view('ADMIN'));
  await waitFor(() => expect(first).toBeDefined());
  rerender(view('ADMIN', { ...booking, title: 'Another party' }));
  await screen.findByRole('button', { name: 'Create group code' });
  await act(async () => { first(response({ group: linked })); });
  expect(screen.queryByDisplayValue(linked.code)).toBeNull();
  rerender(view('MEMBER'));
  expect(screen.queryByRole('region', { name: 'Party group check-in' })).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(2);
});


test('routes confirmed waiver staff to their rental desk and omits booking and participant details', async () => {
  fetch.mockResolvedValueOnce(response({ group: linked }));
  render(view('WAIVER'));
  const rental = await screen.findByRole('link', { name: 'Open rental form' });
  expect(rental).toHaveAttribute('href', '/dashboard/rentalform?view=new&group=group');
  expect(rental).toHaveAttribute('rel', 'noopener noreferrer');
});

test('calendar staff can copy a separate private organizer checklist for a confirmed linked reservation', async () => {
  const organizerToken = 'c'.repeat(64);
  fetch.mockResolvedValueOnce(response({group:{...linked, organizerToken, readiness:{ready:8,expected:10,unlisted:1,rentalsRequested:4}}}));
  render(view('WAIVER'));
  expect(await screen.findByText('8 of 10 ready')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Copy organizer link'}));
  expect(await screen.findByLabelText('Copy this private link')).toHaveValue('https://app.usairsoftfield.com/#group-check-in/organizer/' + organizerToken);
  expect(screen.queryByRole('button',{name:/Copy guest checklist/})).toBeNull();
});
