import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DisplayNameForm from './DisplayNameForm';

const playerId = 'display-player-123';

function reply(body, ok = true) {
  return { ok, json: async () => body };
}

test('saves an alias with the signed-in token, surfaces a server rejection, and restores the default', async () => {
  const previousFetch = global.fetch;
  const request = jest.fn()
    .mockResolvedValueOnce(reply({ names: {}, nextCursor: null }))
    .mockResolvedValueOnce(reply({ displayName: 'Field Scout' }))
    .mockResolvedValueOnce(reply({ error: 'Choose a display name without profanity.' }, false))
    .mockResolvedValueOnce(reply({ displayName: null }));
  global.fetch = request;

  try {
    const getIdToken = jest.fn().mockResolvedValue('signed-in-token');
    const firebase = { auth: { currentUser: { uid: playerId, getIdToken } } };
    render(<DisplayNameForm firebase={firebase} playerId={playerId} />);
    const field = await screen.findByPlaceholderText('Choose a display name');
    expect(request.mock.calls[0][0].searchParams.get('playerIds')).toBe(playerId);

    fireEvent.change(field, { target: { value: 'Field Scout' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save display name' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Display name saved.');
    expect(request.mock.calls[1][1]).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer signed-in-token' },
      body: JSON.stringify({ displayName: 'Field Scout' }),
    });

    fireEvent.change(field, { target: { value: 'Rejected alias' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save display name' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a display name without profanity.');

    fireEvent.click(screen.getByRole('button', { name: 'Use default name' }));
    expect(await screen.findByRole('status')).toHaveTextContent('now use your default name');
    expect(request.mock.calls[3][1].body).toBe(JSON.stringify({ displayName: null }));
    expect(field).toHaveValue('');
  } finally {
    global.fetch = previousFetch;
  }
});
