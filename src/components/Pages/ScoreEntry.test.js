import React from 'react';
import { webcrypto } from 'crypto';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { onValue } from 'firebase/database';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FirebaseContext } from '../Firebase';
import { getAllPlayerDisplayNames } from '../constants/playerDisplayNames';
import { readScannedMemberCard, verifyScannedMemberCard } from '../constants/scoreCards';
import { recordPlayerResult } from '../constants/scoreRecording';
import { AuthUserContext } from '../session';
import EnterLosses from './enterlosses';
import EnterWins from './enterwins';

jest.mock('../Firebase', () => {
    const context = jest.requireActual('../Firebase/context');
    return { FirebaseContext: context.default, withFirebase: context.withFirebase };
});
jest.mock('firebase/database', () => ({ onValue: jest.fn() }));
jest.mock('../constants/playerDisplayNames', () => ({ getAllPlayerDisplayNames: jest.fn() }));
jest.mock('../constants/scoreCards', () => ({
    readScannedMemberCard: jest.fn(),
    verifyScannedMemberCard: jest.fn(),
}));
jest.mock('../constants/scoreRecording', () => ({
    ...jest.requireActual('../constants/scoreRecording'),
    recordPlayerResult: jest.fn(),
}));

const admin = { uid: 'field-admin', roles: { ADMIN: true } };
const member = { uid: 'regular-member', roles: {} };
const firstId = 'scorePlayerAlpha123';
const secondId = 'scorePlayerBeta456';
const thirdId = 'scorePlayerCharlie789';
const fourthId = 'scorePlayerDelta321';
const players = {
    [firstId]: { name: 'River Lane', username: 'RivCard', wins: 2, losses: 1, points: 23 },
    [secondId]: { name: 'Sam Hayes', username: 'HayesBlue', wins: 3, losses: 2, points: 36 },
    [thirdId]: { name: 'Sam Hayes', username: 'HayesGold', wins: 1, losses: 2, points: 16 },
    [fourthId]: { name: 'Sky Cameron', wins: 1, losses: 0, points: 10 },
    waiverOnly123: { name: 'Waiver Only', username: 'WaiverCard', roles: { WAIVER: true } },
    invalidRecord123: null,
};

function renderScore(path = '/admin/enterwins', cachedUser = admin) {
    let onAuthChange;
    let onSignedOut;
    const stopAuth = jest.fn();
    const firebase = {
        auth: { currentUser: { uid: admin.uid } },
        users: () => 'players',
        onAuthUserListener: (success, fallback) => {
            onAuthChange = success;
            onSignedOut = fallback;
            return stopAuth;
        },
    };
    const rendered = render(
        <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <FirebaseContext.Provider value={firebase}>
                <AuthUserContext.Provider value={cachedUser}>
                    <HelmetProvider>
                        <Routes>
                            <Route path="/admin/enterwins" element={<EnterWins />} />
                            <Route path="/admin/enterlosses" element={<EnterLosses />} />
                            <Route path="/login" element={<h1>Sign in</h1>} />
                        </Routes>
                    </HelmetProvider>
                </AuthUserContext.Provider>
            </FirebaseContext.Provider>
        </MemoryRouter>,
    );
    return {
        ...rendered,
        firebase,
        verify: async user => act(async () => { user ? onAuthChange(user) : onSignedOut(); }),
    };
}

const scanField = () => screen.getByRole('textbox', { name: 'Scan a card or find a player' });

let stopDirectory;
const previousCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto });
});
afterAll(() => {
    if (previousCrypto) Object.defineProperty(globalThis, 'crypto', previousCrypto);
    else delete globalThis.crypto;
});
beforeEach(() => {
    jest.resetAllMocks();
    stopDirectory = jest.fn();
    onValue.mockImplementation((_ref, next) => {
        next({ val: () => players });
        return stopDirectory;
    });
    getAllPlayerDisplayNames.mockResolvedValue({});
    readScannedMemberCard.mockReturnValue(null);
    recordPlayerResult.mockResolvedValue({ wins: 3, losses: 1, points: 33, freegames: 0 });
});

test.each([
    ['/admin/enterwins', null],
    ['/admin/enterlosses', member],
])('verifies access to %s before subscribing to member records', async (path, verifiedUser) => {
    const page = renderScore(path);
    expect(screen.queryByRole('textbox', { name: 'Scan a card or find a player' })).not.toBeInTheDocument();
    expect(onValue).not.toHaveBeenCalled();
    await page.verify(verifiedUser);
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(onValue).not.toHaveBeenCalled();
    expect(recordPlayerResult).not.toHaveBeenCalled();
});

test('records a keyboard card scan through the native form and refocuses the cleared input', async () => {
    const page = renderScore();
    await page.verify(admin);
    const input = scanField();
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveAttribute('autocorrect', 'off');
    expect(input).toHaveAttribute('autocapitalize', 'none');
    expect(input).toHaveAttribute('spellcheck', 'false');
    expect(screen.getByRole('button', { name: 'Record win' })).toHaveAttribute('type', 'submit');
    // Deliver a scanner value straight into the native field before React sees it.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, `]C0${firstId}`);
    fireEvent.submit(input.form);

    expect(await screen.findByText('Win recorded for River Lane.')).toBeInTheDocument();
    expect(recordPlayerResult.mock.calls[0].slice(0, 3)).toEqual([page.firebase, firstId, 'win']);
    expect(recordPlayerResult.mock.calls[0][4]).toMatch(/^[\da-f-]{36}$/i);
    expect(recordPlayerResult).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    page.unmount();
    expect(stopDirectory).toHaveBeenCalledTimes(1);
});

test.each([
    [firstId, firstId, 'River Lane', null],
    ['  sky  cameron  ', fourthId, 'Sky Cameron', /Sky Cameron/],
    ['Range Scout', secondId, 'Sam Hayes', /Range Scout/],
])('records a loss using manual lookup %s', async (query, uid, name, choice) => {
    getAllPlayerDisplayNames.mockResolvedValue({ [secondId]: 'Range Scout' });
    const page = renderScore('/admin/enterlosses');
    await page.verify(admin);
    expect(screen.getByRole('heading', { name: 'Enter Losses' })).toBeInTheDocument();

    fireEvent.change(scanField(), { target: { value: query } });
    fireEvent.click(screen.getByRole('button', { name: 'Record loss' }));
    if (choice) {
        expect(recordPlayerResult).not.toHaveBeenCalled();
        fireEvent.click(await screen.findByRole('button', { name: choice }));
    }

    expect(await screen.findByText(`Loss recorded for ${name}.`)).toBeInTheDocument();
    expect(recordPlayerResult.mock.calls[0].slice(0, 3)).toEqual([page.firebase, uid, 'loss']);
    expect(recordPlayerResult).toHaveBeenCalledTimes(1);
});

test.each([
    ['Sam Hayes', /HayesGold/, thirdId, /HayesBlue/],
    ['River', /RivCard/, firstId, null],
])('requires a player choice for duplicate or partial names such as %s', async (query, label, uid, alternate) => {
    const page = renderScore();
    await page.verify(admin);
    fireEvent.change(scanField(), { target: { value: query } });
    fireEvent.click(screen.getByRole('button', { name: 'Record win' }));

    const choice = await screen.findByRole('button', { name: label });
    if (alternate) expect(screen.getByRole('button', { name: alternate })).toBeInTheDocument();
    expect(recordPlayerResult).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(choice); });

    expect(recordPlayerResult.mock.calls[0].slice(0, 3)).toEqual([page.firebase, uid, 'win']);
    expect(recordPlayerResult).toHaveBeenCalledTimes(1);
});

test('records the verified player from a digital card scan', async () => {
    const token = 'sample-scanned-card-token';
    readScannedMemberCard.mockReturnValue(token);
    verifyScannedMemberCard.mockResolvedValue(secondId);
    const page = renderScore('/admin/enterlosses');
    await page.verify(admin);

    fireEvent.change(scanField(), { target: { value: 'scanned digital card' } });
    fireEvent.submit(scanField().form);

    expect(await screen.findByText('Loss recorded for Sam Hayes.')).toBeInTheDocument();
    expect(verifyScannedMemberCard).toHaveBeenCalledWith(page.firebase, token, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(recordPlayerResult.mock.calls[0].slice(0, 3)).toEqual([page.firebase, secondId, 'loss']);
});

test('does not write for an expired digital card', async () => {
    readScannedMemberCard.mockReturnValue('expired-scanned-card-token');
    verifyScannedMemberCard.mockRejectedValue(new Error('This membership card has expired.'));
    const page = renderScore();
    await page.verify(admin);

    fireEvent.change(scanField(), { target: { value: 'expired digital card' } });
    fireEvent.submit(scanField().form);

    expect(await screen.findByText('This membership card has expired.')).toBeInTheDocument();
    expect(recordPlayerResult).not.toHaveBeenCalled();
});

test('blocks a duplicate submit while saving and reports a failed write without claiming success', async () => {
    let rejectWrite;
    recordPlayerResult.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectWrite = reject; }));
    const page = renderScore();
    await page.verify(admin);
    const input = scanField();
    fireEvent.change(input, { target: { value: firstId } });

    act(() => {
        fireEvent.submit(input.form);
        fireEvent.submit(input.form);
    });
    expect(recordPlayerResult).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Win recorded for River Lane.')).not.toBeInTheDocument();

    await act(async () => { rejectWrite(new Error('Could not save this win. Try again.')); });
    expect(await screen.findByText('Could not save this win. Try again.')).toBeInTheDocument();
    expect(screen.queryByText('Win recorded for River Lane.')).not.toBeInTheDocument();
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: `]C0${firstId}` } });
    fireEvent.submit(input.form);
    expect(await screen.findByText('Win recorded for River Lane.')).toBeInTheDocument();
    expect(recordPlayerResult).toHaveBeenCalledTimes(2);
    expect(recordPlayerResult.mock.calls[1].slice(3)).toEqual(recordPlayerResult.mock.calls[0].slice(3));
});

test('ignores an immediate second scan of the same card after a successful write', async () => {
    const page = renderScore();
    await page.verify(admin);
    const input = scanField();
    fireEvent.change(input, { target: { value: firstId } });
    fireEvent.submit(input.form);
    expect(await screen.findByText('Win recorded for River Lane.')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: firstId } });
    fireEvent.submit(input.form);
    expect(await screen.findByText('Repeat scan ignored for River Lane. Scan the next card.')).toBeInTheDocument();
    expect(recordPlayerResult).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
});

test('preserves a pending player retry through another score and reopening Score Entry', async () => {
    recordPlayerResult.mockRejectedValueOnce(new Error('The result could not be confirmed.'));
    let page = renderScore();
    await page.verify(admin);
    fireEvent.change(scanField(), { target: { value: firstId } });
    fireEvent.submit(scanField().form);
    expect(await screen.findByText('The result could not be confirmed.')).toBeInTheDocument();
    const pendingKey = `usaw-score-pending-v1:${admin.uid}:win:${firstId}`;
    const attempt = JSON.parse(sessionStorage.getItem(pendingKey));
    expect(attempt.id).toBe(recordPlayerResult.mock.calls[0][4]);

    fireEvent.change(scanField(), { target: { value: secondId } });
    fireEvent.submit(scanField().form);
    expect(await screen.findByText('Win recorded for Sam Hayes.')).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem(pendingKey))).toEqual(attempt);
    page.unmount();

    page = renderScore();
    await page.verify(admin);
    fireEvent.change(scanField(), { target: { value: firstId } });
    fireEvent.submit(scanField().form);
    expect(await screen.findByText('Win recorded for River Lane.')).toBeInTheDocument();
    expect(recordPlayerResult.mock.calls[2].slice(3)).toEqual(recordPlayerResult.mock.calls[0].slice(3));
    expect(sessionStorage.getItem(pendingKey)).toBeNull();
});
