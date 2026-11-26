import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import GameDayServiceTimes from './GameDayServiceTimes';

const noObservation = { samples: 0, meanMs: null, unpaired: 0 };
const sample = {
  scanToCheckIn: { samples: 2, meanMs: 75000, unpaired: 1 },
  partyToRental: noObservation, endToBriefing: noObservation,
};

test('staff open the timing report on demand and see measured samples and incomplete check-ins', async () => {
  const request = jest.fn(async path => ({ date: new URL(path,'https://app.usairsoftfield.com').searchParams.get('date'), serviceTimes: sample }));
  render(<GameDayServiceTimes request={request} />);
  const section = screen.getByText('Game-day service times').closest('details');
  expect(request).not.toHaveBeenCalled();
  section.open = true;
  fireEvent(section, new Event('toggle'));
  expect(await screen.findByText('1 min 15 sec')).toBeInTheDocument();
  const scan = within(screen.getByText('First scan to check-in').parentElement);
  expect(scan.getByText('2 completed check-ins')).toBeInTheDocument();
  expect(scan.getByText('1 without a recorded finish')).toBeInTheDocument();
  const party = within(screen.getByText('Party arrival to last rental handout').parentElement);
  expect(party.getByText('No average yet')).toBeInTheDocument();
  expect(party.getByText('0 completed parties')).toBeInTheDocument();
  expect(party.queryByText(/without a recorded finish/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Field date (Pacific)'), { target: { value: '2024-04-14' } });
  await waitFor(() => expect(request).toHaveBeenCalledWith('/api/staff-game-timing?date=2024-04-14', expect.objectContaining({ signal: expect.anything() })));
});
