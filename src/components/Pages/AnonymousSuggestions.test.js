import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import AnonymousSuggestions from './AnonymousSuggestions';

const originalFetch = global.fetch;
const originalCrypto = window.crypto;
const reply = data => ({ ok: true, json: async () => data });
const firstId = '4e7fb352-741c-41db-aa65-262140cc8e08';
const secondId = '4554d3bf-e6b4-4a55-bf69-809d80b45680';
let randomId;

function renderSuggestions() {
  return render(<HelmetProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AnonymousSuggestions />
  </MemoryRouter></HelmetProvider>);
}

beforeEach(() => {
  global.fetch = jest.fn();
  randomId = jest.fn().mockReturnValueOnce(firstId).mockReturnValue(secondId);
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: randomId } });
});
afterEach(() => {
  global.fetch = originalFetch;
  Object.defineProperty(window, 'crypto', { configurable: true, value: originalCrypto });
});

test('public suggestion submission omits account credentials and does not ask for an identity', async () => {
  global.fetch.mockResolvedValue(reply({ ok: true }));
  renderSuggestions();
  expect(screen.queryByRole('textbox', { name: /name|email/i })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Your suggestion'), { target: { value: 'Please add more covered staging tables.' } });
  fireEvent.change(screen.getByLabelText('What is your suggestion about?'), { target: { value: 'field' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send suggestion' }));
  expect(await screen.findByText('Your suggestion is in the staff inbox.')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith('https://app.usairsoftfield.com/api/suggestions', expect.objectContaining({
    method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: firstId, category: 'field', message: 'Please add more covered staging tables.', website: '' }),
  }));
  fireEvent.click(screen.getByRole('button', { name: 'Send another suggestion' }));
  expect(screen.getByLabelText('Your suggestion')).toHaveValue('');
});

test('an uncertain save retries the same request and uses a new request for edited content', async () => {
  global.fetch.mockRejectedValue(new Error('Network error'));
  renderSuggestions();
  const message = screen.getByLabelText('Your suggestion');
  fireEvent.change(message, { target: { value: 'Try more objective rounds.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send suggestion' }));
  await screen.findByRole('alert');
  expect(message).toHaveValue('Try more objective rounds.');
  fireEvent.click(screen.getByRole('button', { name: 'Send suggestion' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Send suggestion' })).toBeEnabled());
  expect(global.fetch.mock.calls[0][1].body).toBe(global.fetch.mock.calls[1][1].body);
  fireEvent.change(message, { target: { value: 'Try more objective rounds in The Hive.' } });
  global.fetch.mockResolvedValue(reply({ ok: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Send suggestion' }));
  await screen.findByText('Your suggestion is in the staff inbox.');
  expect(JSON.parse(global.fetch.mock.calls[2][1].body)).toEqual(expect.objectContaining({
    requestId: secondId, message: 'Try more objective rounds in The Hive.',
  }));
});
