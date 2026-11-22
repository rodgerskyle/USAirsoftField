import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { get, onValue, update } from 'firebase/database';
import FreeGames from './freegames';

jest.mock('../Firebase', () => ({ withFirebase: Component => Component }));
jest.mock('../session', () => ({ withAuthorization: () => Component => Component }));
jest.mock('firebase/database', () => ({ get: jest.fn(), onValue: jest.fn(), update: jest.fn() }));

test('finds players by name and keeps redemption attached to the chosen player when the directory changes', async () => {
    const alex = { name: 'Alex Lane', username: 'hawk', freegames: 2 };
    const sam = { name: 'Sam Lane', username: 'owl', freegames: 1 };
    let refresh;
    const stop = jest.fn();
    onValue.mockImplementation((_, receive) => {
        refresh = players => act(() => receive({ val: () => players }));
        receive({ val: () => ({ alex, sam }) });
        return stop;
    });
    get.mockResolvedValue({ exists: () => true, val: () => sam });
    update.mockResolvedValue();
    const { unmount } = render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><HelmetProvider>
            <FreeGames firebase={{ users: () => 'users', user: uid => uid }} />
        </HelmetProvider></MemoryRouter>
    );
    const search = screen.getByRole('searchbox', { name: /search by name or username/i });
    fireEvent.change(search, { target: { value: 'Sam Lane' } });
    fireEvent.click(screen.getByRole('button', { name: 'Redeem one game' }));
    refresh({ sam, alex });
    expect(screen.getByRole('group', { name: 'Redeem for Sam Lane' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm redemption' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith('sam', { freegames: 0 }));
    fireEvent.change(search, { target: { value: 'unknown' } });
    expect(screen.getByRole('status')).toHaveTextContent('No players with free games match');
    unmount();
    expect(stop).toHaveBeenCalled();
});
