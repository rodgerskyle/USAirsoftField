import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { webcrypto } from 'crypto';
import { TextEncoder } from 'util';
import { onValue, runTransaction } from 'firebase/database';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';
import Birthday from './Birthday';
import AuthUserContext from '../session/context';

jest.mock('../Firebase', () => ({ withFirebase: Component => Component }));
jest.mock('../session', () => ({ withAuthorization: () => Component => Component }));
jest.mock('firebase/database', () => ({ onValue: jest.fn(), runTransaction: jest.fn() }));
jest.mock('../constants/fieldStaffApi', () => ({ ...jest.requireActual('../constants/fieldStaffApi'), requestStaffFieldTool: jest.fn() }));
// Use the real editor and save flows with explicit slot/event selections.
jest.mock('react-big-calendar', () => ({
  Views: { MONTH: 'month' },
  momentLocalizer: () => ({}),
  Calendar: ({ events, onSelectSlot, onSelectEvent, titleAccessor }) => <>
    <button type="button" onClick={() => onSelectSlot({ start: new Date('2026-12-05T20:00:00.000Z'), end: new Date('2026-12-06T00:00:00.000Z') })}>Select game-day slot</button>
    {events.map(event => <button type="button" key={event.index} title={titleAccessor(event)} onClick={() => onSelectEvent(event)}>{event.title}</button>)}
  </>,
}));

const ref = {};
const staff = { auth: { currentUser: { uid: 'fixture-staff' } }, calendar: () => ref };
const clone = value => JSON.parse(JSON.stringify(value));
const openPage = (actor = null) => render(<AuthUserContext.Provider value={actor}><HelmetProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Birthday firebase={staff} /></MemoryRouter></HelmetProvider></AuthUserContext.Provider>);
let records;
let listener;
let loseAck;

beforeAll(() => {
  Object.defineProperty(global, 'TextEncoder', { value: TextEncoder, configurable: true });
  Object.defineProperty(global, 'crypto', { value: webcrypto, configurable: true });
});

beforeEach(() => {
  records = {};
  loseAck = false;
  jest.clearAllMocks();
  onValue.mockImplementation((location, callback) => {
    expect(location).toBe(ref);
    listener = () => callback({ val: () => clone(records) });
    listener();
    return () => {};
  });
  runTransaction.mockImplementation(async (_, update) => {
    const next = update(clone(records));
    if (next === undefined) return { committed: false };
    records = next;
    listener();
    if (loseAck) {
      loseAck = false;
      throw new Error('Connection interrupted.');
    }
    return { committed: true };
  });
  requestStaffFieldTool.mockResolvedValue({});
});

test('starts a booking from a date and saves the selected start and end times', async () => {
  openPage();
  fireEvent.change(await screen.findByLabelText('Booking date'), { target: { value: '2026-12-12' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add booking' }));
  fireEvent.change(screen.getByLabelText('Group Name'), { target: { value: 'Saturday party' } });
  expect(screen.getByLabelText('Party type')).toHaveValue('airsoft');
  fireEvent.change(screen.getByLabelText('Party type'), { target: { value: 'nerf' } });
  const start = within(screen.getByRole('group', { name: 'Start time' }));
  const end = within(screen.getByRole('group', { name: 'End time' }));
  fireEvent.change(start.getByLabelText('Hour'), { target: { value: '13' } });
  fireEvent.change(start.getByLabelText('Minutes'), { target: { value: '20' } });
  fireEvent.change(end.getByLabelText('Hour'), { target: { value: '15' } });
  fireEvent.change(end.getByLabelText('Minutes'), { target: { value: '40' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  const [booking] = Object.values(records);
  expect(booking.partyType).toBe('nerf');
  expect(screen.getByRole('button', { name: 'Saturday party' })).toHaveAttribute('title', 'Nerf · Saturday party');
  fireEvent.click(screen.getByRole('button', { name: 'Saturday party' }));
  expect(screen.getByLabelText('Party type')).toHaveValue('nerf');
  fireEvent.change(screen.getByLabelText('Party type'), { target: { value: 'airsoft' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(records[0].bookingId).toBe(booking.bookingId);
  expect(records[0].partyType).toBe('airsoft');
  expect(screen.getByRole('button', { name: 'Saturday party' })).toHaveAttribute('title', 'Airsoft · Saturday party');
  expect(new Date(booking.start)).toEqual(new Date(2026, 11, 12, 13, 20));
  expect(new Date(booking.end)).toEqual(new Date(2026, 11, 12, 15, 40));
});

test('retrying create after a lost acknowledgment keeps the original reservation', async () => {
  openPage();
  fireEvent.click(await screen.findByRole('button', { name: 'Select game-day slot' }));
  fireEvent.change(screen.getByLabelText('Group Name'), { target: { value: 'Fixture birthday' } });
  loseAck = true;
  fireEvent.click(screen.getByRole('button', { name: 'Create' }));
  expect(await screen.findByText('Connection interrupted.')).toBeInTheDocument();
  const saved = clone(records);
  expect(Object.values(saved)).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Create' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(records).toEqual(saved);
  expect(requestStaffFieldTool).not.toHaveBeenCalled();
});

test('edits the selected saved booking, retries group refresh alone, and rejects stale later edits', async () => {
  const booking = { bookingId: 'a'.repeat(64), title: 'November party', size: 12, start: '2026-11-21T18:00:00.000Z', end: '2026-11-21T20:00:00.000Z', staffOnly: 'fixture' };
  records = { 4: booking, 9: { ...booking, bookingId: 'b'.repeat(64), title: 'Other group' } };
  requestStaffFieldTool.mockRejectedValueOnce(new Error('Offline'));
  openPage();
  fireEvent.click(await screen.findByRole('button', { name: 'November party' }));
  expect(screen.getByLabelText('Party type')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Group Name'), { target: { value: 'Updated party' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  const retry = await screen.findByRole('button', { name: 'Retry group update' });
  expect(records[4]).toMatchObject({ title: 'Updated party', staffOnly: 'fixture', bookingId: booking.bookingId });
  expect(records[4]).not.toHaveProperty('partyType');
  expect(records[9].title).toBe('Other group');
  const writes = runTransaction.mock.calls.length;
  fireEvent.click(retry);
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Retry group update' })).toBeNull());
  expect(requestStaffFieldTool).toHaveBeenCalledTimes(2);
  expect(requestStaffFieldTool.mock.calls[1]).toEqual([staff, 'fixture-staff', '/api/check-in-groups', { method: 'POST', body: { action: 'refreshPartyCalendar', bookingId: booking.bookingId } }]);
  expect(runTransaction).toHaveBeenCalledTimes(writes);

  fireEvent.click(screen.getByRole('button', { name: 'Updated party' }));
  act(() => {
    records = { ...records, 4: { ...records[4], staffOnly: 'concurrent fixture' } };
    listener();
  });
  fireEvent.change(screen.getByLabelText('Group Name'), { target: { value: 'Stale edit' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  expect(await screen.findByText(/reopen it on the calendar/i)).toBeVisible();
  expect(records[4].title).toBe('Updated party');
  expect(records[4].staffOnly).toBe('concurrent fixture');
  expect(requestStaffFieldTool).toHaveBeenCalledTimes(2);
});


test('staff can create and copy a code immediately after saving, reopen it, and never see the old code after a reservation changes', async () => {
  let group = null;
  requestStaffFieldTool.mockImplementation(async (_firebase, _uid, path, options) => {
    expect(path.startsWith('/api/party-check-in')).toBe(true);
    if (options.method === 'POST') {
      expect(options.body.action).toBe('create');
      group = { id: 'group-id', name: 'Party group', date: options.body.date, code: 'Group123456789AZ' };
    }
    return { group };
  });
  openPage({ uid: 'fixture-staff', roles: { ADMIN: true } });
  fireEvent.click(await screen.findByRole('button', { name: 'Select game-day slot' }));
  fireEvent.change(screen.getByLabelText('Group Name'), { target: { value: 'Fixture birthday' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create' }));
  expect(await screen.findByRole('heading', { name: 'Party saved' })).toBeVisible();
  fireEvent.click(await screen.findByRole('button', { name: 'Create group code' }));
  expect(await screen.findByLabelText('Group code')).toHaveValue('Group123456789AZ');
  fireEvent.click(screen.getByRole('button', { name: 'Fixture birthday' }));
  expect(await screen.findByLabelText('Group code')).toHaveValue('Group123456789AZ');
  expect(screen.queryByRole('heading', { name: 'Party saved' })).toBeNull();
  act(() => { records = { 4: { ...records[0], title: 'Rescheduled fixture' } }; listener(); });
  expect(screen.queryByLabelText('Group code')).toBeNull();
  expect(screen.getByText(/reopen it on the calendar to manage its group code/i)).toBeVisible();
});
