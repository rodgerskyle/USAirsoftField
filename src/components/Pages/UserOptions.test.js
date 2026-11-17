import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { onValue } from 'firebase/database';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';
import { AuthUserContext } from '../session';
import UserOptions from './UserOptions';

jest.mock('firebase/database', () => ({ onValue: jest.fn() }));
jest.mock('firebase/storage', () => ({ getDownloadURL: jest.fn() }));
jest.mock('../constants/fieldStaffApi', () => ({ requestStaffFieldTool: jest.fn() }));
jest.mock('../session', () => ({
    AuthUserContext: jest.requireActual('react').createContext(null),
    withAuthorization: () => Component => Component,
}));

const staff = { uid: 'authorizing-admin-uid', roles: { ADMIN: true } };
const firstId = 'original-player-uid';
const secondId = 'second-player-uid';
const player = { name: 'Jordan Rivera', username: 'JRivera', wins: 1, losses: 0, points: 60, freegames: 0 };
const firebase = { user: uid => uid };

function page(id) {
    return <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <HelmetProvider>
            <AuthUserContext.Provider value={staff}>
                <UserOptions firebase={firebase} router={{ params: { id } }} />
            </AuthUserContext.Provider>
        </HelmetProvider>
    </MemoryRouter>;
}

function openReview() {
    fireEvent.click(screen.getByRole('button', { name: 'Review removal' }));
    return screen.getByRole('group', { name: 'Confirm player account removal' });
}

beforeEach(() => {
    jest.clearAllMocks();
    onValue.mockImplementation((id, receive) => {
        receive({ val: () => id === secondId ? { ...player, name: 'Another Player', username: '' } : player });
        return jest.fn();
    });
});

test('shows the named player and ID, cancels without a request, then confirms with one click', async () => {
    requestStaffFieldTool.mockResolvedValueOnce({ removed: true, playerId: firstId });
    render(page(firstId));
    const review = openReview();
    expect(review).toHaveTextContent('Jordan Rivera (JRivera)');
    expect(review).toHaveTextContent(firstId);
    expect(within(review).queryByRole('textbox')).not.toBeInTheDocument();
    const cancel = within(review).getByRole('button', { name: 'Cancel' });
    expect(cancel).toHaveFocus();
    fireEvent.click(cancel);
    expect(screen.getByRole('button', { name: 'Review removal' })).toHaveFocus();
    expect(requestStaffFieldTool).not.toHaveBeenCalled();

    fireEvent.click(within(openReview()).getByRole('button', { name: 'Confirm removal' }));
    expect(await screen.findByText('This player account was removed.')).toBeInTheDocument();
    expect(requestStaffFieldTool).toHaveBeenCalledTimes(1);
    expect(requestStaffFieldTool).toHaveBeenCalledWith(firebase, staff.uid, '/api/staff-player-accounts', {
        method: 'POST', body: { playerId: firstId, confirmation: firstId }, signal: expect.anything(),
    });
});

test('keeps confirmation locked during removal and allows retry after a failed request', async () => {
    let reject;
    requestStaffFieldTool.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    requestStaffFieldTool.mockResolvedValueOnce({ removed: true, playerId: firstId });
    render(page(firstId));
    const review = within(openReview());
    fireEvent.click(review.getByRole('button', { name: 'Confirm removal' }));
    expect(review.getByRole('button', { name: 'Removing account…' })).toBeDisabled();
    expect(review.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await act(async () => reject(new Error('Unlock staff tools.')));
    expect(await review.findByRole('alert')).toHaveTextContent('Unlock staff tools.');
    fireEvent.click(review.getByRole('button', { name: 'Confirm removal' }));
    expect(await screen.findByText('This player account was removed.')).toBeInTheDocument();
    expect(requestStaffFieldTool).toHaveBeenCalledTimes(2);
});

test('aborts a pending request when opening a different player', async () => {
    let resolve;
    requestStaffFieldTool.mockImplementationOnce(() => new Promise(finish => { resolve = finish; }));
    const { rerender } = render(page(firstId));
    fireEvent.click(within(openReview()).getByRole('button', { name: 'Confirm removal' }));
    const options = requestStaffFieldTool.mock.calls[0][3];
    rerender(page(secondId));
    expect(options.signal.aborted).toBe(true);
    await act(async () => resolve({ removed: true, playerId: firstId }));
    const review = openReview();
    expect(review).toHaveTextContent('Another Player');
    expect(review).toHaveTextContent(secondId);
    expect(screen.queryByText('This player account was removed.')).not.toBeInTheDocument();
});
