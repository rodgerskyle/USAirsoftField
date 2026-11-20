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
const emailService = jest.fn();
const firebase = { auth: { currentUser: staff, onAuthStateChanged: jest.fn() }, user: uid => uid, manageProfile: () => manageProfile, updatePlayerSignInEmail: () => emailService };

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
        firebase.auth.currentUser = staff;
        firebase.auth.onAuthStateChanged.mockImplementation(() => () => {});
        requestStaffFieldTool.mockResolvedValue({ deployed: false });
        onValue.mockImplementation((id, receive) => {
            publish = email => receive({ val: () => ({ ...player, email }) });
            publish(id === secondId ? 'second@example.com' : saved);
            return jest.fn();
        });
        get.mockImplementation(async () => ({ val: () => saved }));
        manageProfile.mockReset();
        emailService.mockReset().mockRejectedValue(Object.assign(new Error('Not Found'), { code: 'functions/not-found' }));
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

    const supported = { data: { operation: 'updatePlayerSignInEmail', version: 1 } };
    const confirmed = { uid: firstId, email: changed, authEmail: changed, profileEmail: changed, verified: true };

    test('uses the dedicated admin service with raw addresses and the selected UID after an authenticated capability check', async () => {
        emailService.mockResolvedValueOnce(supported).mockImplementationOnce(async () => {
            saved = changed; return { data: confirmed };
        });
        render(page(firstId));
        enter(changed);
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        expect(await screen.findByText('Player email updated to ' + changed + '.')).toBeVisible();
        expect(emailService.mock.calls).toEqual([[{action:'capabilities'}], [{uid:firstId,email:changed,expectedEmail:original}]]);
        expect(manageProfile).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
    });

    test.each(['functions/internal', 'functions/not-found', 'functions/unimplemented'])('uses the legacy service only when the independent service confirms absence (%s)', async code => {
        emailService.mockRejectedValueOnce(Object.assign(new Error(code === 'functions/internal' ? 'internal' : 'Not Found'), { code }));
        manageProfile.mockImplementationOnce(async () => { saved = changed; return {data:null}; });
        render(page(firstId));
        enter(changed);
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        expect(await screen.findByText('Player email updated to ' + changed + '.')).toBeVisible();
        expect(emailService.mock.calls).toEqual([[{action:'capabilities'}]]);
        expect(requestStaffFieldTool.mock.calls).toEqual([[firebase, staff.uid, '/api/staff-player-accounts/email-service', {signal: expect.anything()}]]);
        expect(manageProfile).toHaveBeenCalledTimes(1);
    });

    test.each([
        ['deployed', {deployed: true}, 'service is deployed but did not respond'],
        ['unknown', {}, 'deployment could not be confirmed'],
        ['unreachable', null, 'Unable to verify which email service is available'],
    ])('never downgrades when the independent status check is %s', async (_, status, message) => {
        if (status) requestStaffFieldTool.mockResolvedValueOnce(status);
        else requestStaffFieldTool.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        render(page(firstId));
        enter(changed);
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(message);
        expect(emailService.mock.calls).toEqual([[{action:'capabilities'}]]);
        expect(manageProfile).not.toHaveBeenCalled();
        expect(screen.getByLabelText('Player sign-in email')).toHaveValue(changed);
    });

    test.each(['Firebase', 'Companion'])('an account switch during %s discovery cancels any pending email change', async provider => {
        let complete;
        const pending = new Promise(resolve => { complete = resolve; });
        const probe = provider === 'Firebase' ? emailService : requestStaffFieldTool;
        probe.mockReturnValueOnce(pending);
        render(page(firstId));
        enter(changed);
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        await waitFor(() => expect(probe).toHaveBeenCalledTimes(1));
        firebase.auth.currentUser = {uid: 'different-staff-account'};
        await act(async () => {
            firebase.auth.onAuthStateChanged.mock.calls[0][0](firebase.auth.currentUser);
            complete(provider === 'Firebase' ? supported : {deployed: false});
        });
        expect(screen.getByRole('alert')).toHaveTextContent('staff sign-in changed');
        if (provider === 'Companion') expect(requestStaffFieldTool.mock.calls[0][3].signal.aborted).toBe(true);
        expect(emailService.mock.calls).toEqual([[{action:'capabilities'}]]);
        expect(manageProfile).not.toHaveBeenCalled();
    });

    test('preserves a provider permission failure from capability discovery and never invokes the legacy function', async () => {
        emailService.mockRejectedValueOnce(Object.assign(new Error('The account service lacks permission to update official accounts.'), {code:'functions/internal'}));
        render(page(firstId));
        enter(changed);
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Contact the Firebase project owner');
        expect(manageProfile).not.toHaveBeenCalled();
    });

    test('can resume a partial change with the dedicated service, and never retries it through the legacy function', async () => {
        render(page(firstId));
        enter(changed);
        saved = changed;
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('did not confirm the sign-in change');
        expect(manageProfile).not.toHaveBeenCalled();
        emailService.mockResolvedValueOnce(supported).mockResolvedValueOnce({data:confirmed});
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        expect(await screen.findByText('Player email updated to ' + changed + '.')).toBeVisible();
        expect(emailService).toHaveBeenLastCalledWith({uid:firstId,email:changed,expectedEmail:original});
    });

    test('stops at a denied capability check and does not submit any email change', async () => {
        emailService.mockRejectedValueOnce(Object.assign(new Error('denied'), { code: 'functions/permission-denied' }));
        render(page(firstId));
        enter(changed);
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Firebase denied this change');
        expect(get).toHaveBeenCalledTimes(1);
        expect(emailService.mock.calls).toEqual([[{action:'capabilities'}]]);
        expect(manageProfile).not.toHaveBeenCalled();
    });

    test.each([
        { ...confirmed, uid:secondId },
        { ...confirmed, authEmail:original },
        { ...confirmed, profileEmail:original },
        { ...confirmed, verified:false },
    ])('does not trust a partial account receipt or fall back after mutation', async receipt => {
        emailService.mockResolvedValueOnce(supported).mockImplementationOnce(async () => {
            saved = changed; return { data: receipt };
        });
        render(page(firstId));
        enter(changed);
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('did not confirm the sign-in change');
        expect(manageProfile).not.toHaveBeenCalled();
        expect(screen.queryByText(/Player email updated/)).toBeNull();
    });

    test('never retries a dedicated-service mutation through the legacy callable on an internal error', async () => {
        emailService.mockResolvedValueOnce(supported).mockRejectedValueOnce(Object.assign(new Error('internal'), {code:'functions/internal'}));
        render(page(firstId));
        enter(changed);
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Authentication → Users');
        expect(emailService).toHaveBeenCalledTimes(2);
        expect(manageProfile).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
    });

    test.each([true, false])('checks an uncertain save once and retains the draft (profile changed: %s)', async changedInProfile => {
        manageProfile.mockImplementationOnce(async () => {
            if (changedInProfile) { saved = changed; publish(saved); }
            throw Object.assign(new Error('internal'), { code: 'functions/internal' });
        });
        render(page(firstId));
        enter(changed);
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        const error = await screen.findByRole('alert');
        expect(error).toHaveTextContent('Authentication → Users');
        expect(error).toHaveTextContent(firstId);
        if (changedInProfile) expect(error).toHaveTextContent('player profile shows the requested address');
        expect(screen.queryByText(/Player email updated/)).toBeNull();
        expect(screen.getByRole('textbox', { name: 'Player sign-in email' })).toHaveValue(changed);
        expect(get.mock.calls).toEqual([[firstId + '/email'], [firstId + '/email']]);
        expect(manageProfile).toHaveBeenCalledTimes(1);
        expect(update).not.toHaveBeenCalled();
    });

    test('reports a provider error from structured details even when the callable wraps it as internal', async () => {
        manageProfile.mockRejectedValueOnce(Object.assign(new Error('internal'), {
            code: 'functions/internal', details: { code: 'auth/email-already-exists' },
        }));
        render(page(firstId));
        enter(changed);
        fireEvent.click(screen.getByRole('button', { name: 'Save email' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('already used by another account');
        expect(get).toHaveBeenCalledTimes(1);
        expect(update).not.toHaveBeenCalled();
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
