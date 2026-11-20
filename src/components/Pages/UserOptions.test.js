import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { get, onValue, update } from 'firebase/database';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';
import { AuthUserContext } from '../session';
import UserOptions from './UserOptions';

jest.mock('firebase/database', () => ({ get: jest.fn(), onValue: jest.fn(), update: jest.fn() }));
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
const manageProfile = jest.fn();
const firebase = { user: uid => uid, manageProfile: () => manageProfile };

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

describe('Find Player > More Info email edits', () => {
    const original = 'jordan@example.com';
    const changed = 'jordan.new@example.com';
    let saved;
    let publish;

    beforeEach(() => {
        saved = original;
        onValue.mockImplementation((id, receive) => {
            publish = email => receive({ val: () => ({ ...player, email }) });
            publish(id === secondId ? 'second@example.com' : saved);
            return jest.fn();
        });
        get.mockImplementation(async () => ({ val: () => saved }));
        manageProfile.mockReset();
        update.mockResolvedValue(undefined);
    });

    function enter(value) {
        fireEvent.change(screen.getByRole('textbox', { name: 'Player sign-in email' }), { target: { value } });
    }

    test('saves the selected UID, verifies the returned profile and preserves unrelated unsaved edits', async () => {
        manageProfile.mockImplementationOnce(async () => {
            saved = changed;
            publish(saved);
            return { data: null };
        });
        render(page(firstId));
        fireEvent.change(screen.getByLabelText('Name:'), { target: { value: 'Unsaved player name' } });
        enter('  ' + changed + '  ');
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        expect(await screen.findByText('Player email updated to ' + changed + '.')).toBeVisible();
        expect(get.mock.calls).toEqual([[firstId + '/email'], [firstId + '/email']]);
        expect(manageProfile).toHaveBeenCalledWith({
            choice: 'emailAdmin', uid: firstId, email: 'jordan%2Enew@example%2Ecom', old_email: 'jordan@example%2Ecom',
        });
        expect(update).not.toHaveBeenCalled();
        expect(screen.getByLabelText('Name:')).toHaveValue('Unsaved player name');
        expect(screen.getByLabelText('Player sign-in email')).toHaveValue(changed);
        expect(screen.getByRole('button', { name: 'Save email' })).toBeDisabled();
    });

    test('validates the draft, retains it after a duplicate, and allows a corrected retry', async () => {
        manageProfile.mockRejectedValueOnce(Object.assign(new Error('EMAIL_EXISTS'), { code: 'functions/already-exists' }))
            .mockImplementationOnce(async () => { saved = changed; return { data: { success: true } }; });
        render(page(firstId));
        enter('bad-email');
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid player email');
        expect(manageProfile).not.toHaveBeenCalled();
        enter('used@example.com');
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('already used by another account');
        expect(screen.getByLabelText('Player sign-in email')).toHaveValue('used@example.com');
        enter(changed);
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        expect(await screen.findByText('Player email updated to ' + changed + '.')).toBeVisible();
    });

    test('general Update saves other changes only after confirming the email update', async () => {
        manageProfile.mockResolvedValueOnce({ data: {} }).mockImplementationOnce(async () => {
            saved = changed; return { data: {} };
        });
        render(page(firstId));
        fireEvent.change(screen.getByLabelText('Name:'), { target: { value: 'Rebel' } });
        enter(changed);
        fireEvent.click(screen.getByRole('button', { name: 'Update' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('has not confirmed');
        expect(screen.queryByText(/Successfully updated/)).toBeNull();
        expect(update).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Update' }));
        expect(await screen.findByText('Successfully updated Rebel')).toBeVisible();
        expect(update).toHaveBeenCalledWith(firstId, { name: 'Rebel', nameLower: 'rebel' });
    });

    test('detects changed source email and locks both save controls against concurrent requests', async () => {
        let finish;
        manageProfile.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        render(page(firstId));
        enter(changed);
        saved = 'someone.changed@example.com';
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('saved email changed');
        expect(manageProfile).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
        expect(screen.getByLabelText('Player sign-in email')).toHaveValue(saved);
        enter(changed);
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        await waitFor(() => expect(manageProfile).toHaveBeenCalledTimes(1));
        expect(screen.getByRole('button', { name: 'Save email' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Update' })).toBeDisabled();
        await act(async () => { saved = changed; finish({ data: { success: true } }); });
        expect(screen.getByText('Player email updated to ' + changed + '.')).toBeVisible();
    });

    test('a late result from the previous player leaves the newly opened account alone', async () => {
        let finish;
        manageProfile.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        const { rerender } = render(page(firstId));
        enter(changed);
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        await waitFor(() => expect(manageProfile).toHaveBeenCalledTimes(1));
        rerender(page(secondId));
        await act(async () => finish({ data: { success: true } }));
        expect(screen.getByLabelText('Player sign-in email')).toHaveValue('second@example.com');
        expect(screen.queryByText(/Player email updated/)).toBeNull();
        expect(update).not.toHaveBeenCalled();
    });
});
