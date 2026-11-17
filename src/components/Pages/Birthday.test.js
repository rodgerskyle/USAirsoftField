import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { webcrypto } from 'crypto';
import { TextEncoder } from 'util';
import { onValue, runTransaction } from 'firebase/database';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';
import Birthday from './Birthday';

jest.mock('../Firebase', () => ({ withFirebase: Component => Component }));
jest.mock('../session', () => ({ withAuthorization: () => Component => Component }));
jest.mock('firebase/database', () => ({ onValue: jest.fn(), runTransaction: jest.fn() }));
jest.mock('../constants/fieldStaffApi', () => ({ requestStaffFieldTool: jest.fn() }));
// Use the real editor and save flows with explicit slot/event selections.
jest.mock('react-big-calendar', () => ({
  Views: { MONTH: 'month' },
  momentLocalizer: () => ({}),
  Calendar: ({ events, onSelectSlot, onSelectEvent }) => <>
    <button type="button" onClick={() => onSelectSlot({ start: new Date('2026-12-05T20:00:00.000Z'), end: new Date('2026-12-06T00:00:00.000Z') })}>Select game-day slot</button>
    {events.map(event => <button type="button" key={event.index} onClick={() => onSelectEvent(event)}>{event.title}</button>)}
  </>,
}));

const ref = {};
const staff = { auth: { currentUser: { uid: 'fixture-staff' } }, calendar: () => ref };
const clone = value => JSON.parse(JSON.stringify(value));
const openPage = () => render(<HelmetProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Birthday firebase={staff} /></MemoryRouter></HelmetProvider>);
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
  fireEvent.change(screen.getByLabelText('Group Name'), { target: { value: 'Updated party' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  const retry = await screen.findByRole('button', { name: 'Retry group update' });
  expect(records[4]).toMatchObject({ title: 'Updated party', staffOnly: 'fixture', bookingId: booking.bookingId });
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
