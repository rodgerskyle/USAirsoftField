import React from 'react';
import { webcrypto } from 'crypto';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { onValue } from 'firebase/database';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FirebaseContext } from '../Firebase';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';
import { getAllPlayerDisplayNames } from '../constants/playerDisplayNames';
import { readScannedMemberCard, verifyScannedMemberCard } from '../constants/scoreCards';
import { checkScoreOperation, loadPlayerScoreHistory, recordPlayerResult, voidPlayerResult } from '../constants/scoreRecording';
import { AuthUserContext } from '../session';
import EnterLosses from './enterlosses';
import EnterWins from './enterwins';
import ScoreEntry from './ScoreEntry';
import { StaffCardScanner } from './StaffCardScanner';

// The scanner's native camera/decoder integration has its own StaffCardScanner tests.
jest.mock('./StaffCardScanner', () => ({ StaffCardScanner: jest.fn() }));
jest.mock('../Firebase', () => {
    const context = jest.requireActual('../Firebase/context');
    return { FirebaseContext: context.default, withFirebase: context.withFirebase };
});
jest.mock('firebase/database', () => ({ onValue: jest.fn() }));
jest.mock('../constants/fieldStaffApi', () => ({ requestStaffFieldTool: jest.fn() }));
jest.mock('../constants/playerDisplayNames', () => ({ getAllPlayerDisplayNames: jest.fn() }));
jest.mock('../constants/scoreCards', () => ({
    ...jest.requireActual('../constants/scoreCards'),
    readScannedMemberCard: jest.fn(),
    verifyScannedMemberCard: jest.fn(),
}));
jest.mock('../constants/scoreRecording', () => ({
    ...jest.requireActual('../constants/scoreRecording'),
    checkScoreOperation: jest.fn(),
    loadPlayerScoreHistory: jest.fn(),
    recordPlayerResult: jest.fn(),
    voidPlayerResult: jest.fn(),
}));

let admin;
let deskNumber = 0;
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

function renderScore(path = '/admin/scores', cachedUser = admin) {
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
                            <Route path="/admin/scores" element={<ScoreEntry />} />
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
    sessionStorage.clear();
    admin = { uid: `field-admin-${++deskNumber}`, roles: { ADMIN: true } };
    StaffCardScanner.mockReturnValue(null);
    stopDirectory = jest.fn();
    onValue.mockImplementation((_ref, next) => {
        next({ val: () => players });
        return stopDirectory;
    });
    getAllPlayerDisplayNames.mockResolvedValue({});
    readScannedMemberCard.mockReturnValue(null);
    recordPlayerResult.mockResolvedValue({ replayed: false });
    loadPlayerScoreHistory.mockResolvedValue({ history: [] });
    requestStaffFieldTool.mockResolvedValue({ ok: true });
});

async function scan(value) {
    const input = scanField();
    fireEvent.change(input, { target: { value } });
    await act(async () => { fireEvent.submit(input.form); });
}

const modeField = () => screen.getByRole('combobox', { name: 'Game mode' });
const teamField = () => screen.getByRole('combobox', { name: /player.s team/i });
const recordButton = outcome => screen.getByRole('button', { name: `Record ${outcome}` });

function selectRound(side = 'camo') {
    fireEvent.change(modeField(), { target: { value: 'Countdown' } });
    fireEvent.change(teamField(), { target: { value: side } });
}

async function record(outcome) {
    await act(async () => { fireEvent.click(recordButton(outcome)); });
}

test.each([
    ['/admin/enterwins', null],
    ['/admin/enterlosses', member],
    ['/admin/scores', member],
])('verifies access to %s before subscribing to member records', async (path, verifiedUser) => {
    const page = renderScore(path);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(onValue).not.toHaveBeenCalled();
    await page.verify(verifiedUser);
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(onValue).not.toHaveBeenCalled();
    expect(recordPlayerResult).not.toHaveBeenCalled();
});

test.each(['/admin/enterwins', '/admin/enterlosses'])('preserves staff bookmarks to %s and offers both outcomes', async path => {
    const page = renderScore(path);
    await page.verify(admin);
    await scan(firstId);
    expect(screen.getByRole('heading', { name: /wins and losses/i })).toBeInTheDocument();
    expect(recordButton('win')).toBeDisabled();
    expect(recordButton('loss')).toBeDisabled();
    const firstAction = screen.getAllByRole('button', { name: /^record (win|loss)$/i })[0];
    expect(firstAction).toHaveTextContent(path.endsWith('enterlosses') ? 'Record loss' : 'Record win');
    expect(recordPlayerResult).not.toHaveBeenCalled();
});

test('reads a hardware scan before React receives input and requires the player, mode, team and an explicit result', async () => {
    const page = renderScore();
    await page.verify(admin);
    const input = scanField();
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveAttribute('autocorrect', 'off');
    expect(input).toHaveAttribute('autocapitalize', 'none');
    expect(input).toHaveAttribute('spellcheck', 'false');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, `]C0${firstId}`);
    await act(async () => { fireEvent.submit(input.form); });
    expect(recordButton('win')).toBeDisabled();
    fireEvent.change(modeField(), { target: { value: 'Countdown' } });
    expect(recordButton('win')).toBeDisabled();
    fireEvent.change(teamField(), { target: { value: 'solid' } });
    expect(recordPlayerResult).not.toHaveBeenCalled();
    await record('win');
    expect(recordPlayerResult).toHaveBeenCalledWith(page.firebase, firstId, 'win', expect.any(Date),
        expect.stringMatching(/^[\da-f-]{36}$/i), { mode: 'Countdown', side: 'solid' });
    expect(recordPlayerResult).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Win recorded for River Lane.')).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(modeField()).toHaveValue('Countdown');
    expect(teamField()).toHaveValue('solid');

    // The other team's players can be entered from the same screen and round.
    fireEvent.change(teamField(), { target: { value: 'camo' } });
    await scan(secondId);
    await record('loss');
    expect(recordPlayerResult).toHaveBeenLastCalledWith(page.firebase, secondId, 'loss', expect.any(Date),
        expect.any(String), { mode: 'Countdown', side: 'camo' });
    page.unmount();
    expect(stopDirectory).toHaveBeenCalledTimes(1);
});

test.each([
    ['  sky  cameron  ', fourthId, /Sky Cameron/, null],
    ['Range Scout', secondId, /Range Scout/, null],
    ['Sam Hayes', thirdId, /HayesGold/, /HayesBlue/],
    ['River', firstId, /RivCard/, null],
    [']C0LaneRiver', firstId, /RivCard/, null],
])('staff can confirm a matching identity for %s', async (query, uid, label, alternate) => {
    getAllPlayerDisplayNames.mockResolvedValue({ [secondId]: 'Range Scout' });
    const page = renderScore();
    await page.verify(admin);
    selectRound();
    await scan(query);
    if (alternate) expect(screen.getByRole('button', { name: alternate })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(recordPlayerResult).not.toHaveBeenCalled();
    await record('loss');
    expect(recordPlayerResult).toHaveBeenCalledWith(page.firebase, uid, 'loss', expect.any(Date), expect.any(String),
        { mode: 'Countdown', side: 'camo' });
    expect(recordPlayerResult).toHaveBeenCalledTimes(1);
});

test('checks digital cards and only records confirmed members', async () => {
    const token = 'sample-scanned-card-token';
    readScannedMemberCard.mockReturnValue(token);
    verifyScannedMemberCard.mockRejectedValueOnce(new Error('This membership card has expired.')).mockResolvedValue(secondId);
    const page = renderScore();
    await page.verify(admin);
    selectRound('solid');
    await scan('expired digital card');
    expect(screen.getByText('This membership card has expired.')).toBeInTheDocument();
    expect(recordPlayerResult).not.toHaveBeenCalled();
    await scan('scanned digital card');
    expect(verifyScannedMemberCard).toHaveBeenCalledWith(page.firebase, token, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    await record('loss');
    expect(recordPlayerResult).toHaveBeenCalledWith(page.firebase, secondId, 'loss', expect.any(Date), expect.any(String),
        { mode: 'Countdown', side: 'solid' });
});

test('keeps a confirmed player protected after clearing entries and only awards again for a new round', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    try {
        const page = renderScore();
        await page.verify(admin);
        selectRound('solid');
        await scan(firstId);
        await record('win');
        fireEvent.click(screen.getByRole('button', { name: 'Clear entries' }));
        expect(screen.queryByText('Win recorded for River Lane.')).not.toBeInTheDocument();
        expect(voidPlayerResult).not.toHaveBeenCalled();
        await scan(firstId);
        expect(recordButton('win')).toBeDisabled();
        expect(recordButton('loss')).toBeDisabled();
        expect(recordPlayerResult).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: /start new round/i }));
        selectRound();
        await scan(firstId);
        await record('loss');
        expect(recordPlayerResult).toHaveBeenCalledTimes(2);
        expect(recordPlayerResult.mock.calls[1][4]).not.toEqual(recordPlayerResult.mock.calls[0][4]);
        expect(recordPlayerResult.mock.calls[1][5]).toEqual({ mode: 'Countdown', side: 'camo' });
    } finally { confirm.mockRestore(); }
});

test('a pending write keeps its original submission after clear and reload and cannot double-submit', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    let reject;
    recordPlayerResult.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
    checkScoreOperation.mockResolvedValue({ confirmed: false, eventId: null });
    try {
        let page = renderScore();
        await page.verify(admin);
        selectRound('solid');
        await scan(firstId);
        const win = recordButton('win');
        act(() => { fireEvent.click(win); fireEvent.click(win); });
        expect(recordPlayerResult).toHaveBeenCalledTimes(1);
        await act(async () => { reject(Object.assign(new Error('Network timeout.'), { retryable: true })); });
        expect(screen.queryByText('Win recorded for River Lane.')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Clear entries' }));
        expect(voidPlayerResult).not.toHaveBeenCalled();
        page.unmount();

        page = renderScore();
        await page.verify(admin);
        await scan(firstId);
        // Once the retry is visible, simulate the live directory going offline.
        act(() => { onValue.mock.calls[1][2](); });
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /check saved status/i })); });
        expect(checkScoreOperation).toHaveBeenCalled();
        expect(recordPlayerResult).toHaveBeenCalledTimes(1);
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /retry same submission/i })); });
        expect(recordPlayerResult).toHaveBeenCalledTimes(2);
        const original = recordPlayerResult.mock.calls[0];
        expect(recordPlayerResult.mock.calls[1].slice(1)).toEqual(original.slice(1));
        expect(original[5]).toEqual({ mode: 'Countdown', side: 'solid' });
        expect(screen.getByText('Win recorded for River Lane.')).toBeInTheDocument();
    } finally { confirm.mockRestore(); }
});

test('a recovered result waits for the registered name without displaying a player ID or alias', async () => {
    sessionStorage.setItem('usaw-score-pending-v1:' + admin.uid + ':loss:' + firstId,
        JSON.stringify({ id: webcrypto.randomUUID(), at: Date.now() }));
    let publish;
    onValue.mockImplementationOnce((_ref, next) => { publish = next; return stopDirectory; });
    checkScoreOperation.mockResolvedValue({ confirmed: true });
    const page = renderScore();
    await page.verify(admin);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /check saved status/i })); });

    const recent = screen.getByText('Recent results').closest('.card');
    expect(recent).toHaveTextContent('Loss recorded · Player name unavailable.');
    expect(recent).not.toHaveTextContent(firstId);
    act(() => { publish({ val: () => ({ [firstId]: { ...players[firstId], name: firstId } }) }); });
    expect(recent).toHaveTextContent('Player name unavailable.');
    expect(recent).not.toHaveTextContent(firstId);
    expect(recent).not.toHaveTextContent(players[firstId].username);

    act(() => { publish({ val: () => players }); });
    expect(recent).toHaveTextContent('Loss recorded for River Lane.');
    expect(recordPlayerResult).not.toHaveBeenCalled();
});

test('a server-confirmed pending entry completes using a read-only check', async () => {
    const eventId = 'fe7ad277-83e1-458c-84d9-eaecbc3d900a';
    recordPlayerResult.mockRejectedValueOnce(new Error('Acknowledgment timed out.'));
    checkScoreOperation.mockResolvedValue({ confirmed: true, eventId, day: '2026-10-18' });
    const page = renderScore();
    await page.verify(admin);
    selectRound('solid');
    await scan(firstId);
    await record('loss');
    expect(checkScoreOperation).toHaveBeenCalledWith(page.firebase, firstId, expect.objectContaining({
        uid: firstId, outcome: 'loss', side: 'solid', mode: 'Countdown', id: recordPlayerResult.mock.calls[0][4],
    }));
    expect(screen.getByText('Loss recorded for River Lane.')).toBeInTheDocument();
    expect(requestStaffFieldTool).toHaveBeenCalledWith(page.firebase, admin.uid, '/api/staff-round-result-receipts', {
        method: 'POST', body: { action: 'sync', playerId: firstId, id: eventId, day: '2026-10-18' }, signal: expect.any(AbortSignal),
    });
    await scan(firstId);
    expect(recordButton('win')).toBeDisabled();
    expect(recordPlayerResult).toHaveBeenCalledTimes(1);
});

test('the camera can select the legacy name barcode or a signed digital card before scoring', async () => {
    const page = renderScore();
    await page.verify(admin);
    const scanner = () => StaffCardScanner.mock.calls[StaffCardScanner.mock.calls.length - 1][0];
    expect(scanner().verifyLegacyCards).toBe(true);
    await act(async () => { scanner().onScan({ barcodeValue: 'LaneRiver' }); });
    fireEvent.click(screen.getByRole('button', { name: /River Lane/ }));
    expect(screen.getByRole('region', { name: 'Selected player' })).toHaveTextContent(firstId);
    verifyScannedMemberCard.mockResolvedValue(secondId);
    await act(async () => { scanner().onScan({ cardToken: 'verified-card-token' }); });
    expect(verifyScannedMemberCard).toHaveBeenCalledWith(page.firebase, 'verified-card-token', expect.any(Object));
    expect(screen.getByRole('region', { name: 'Selected player' })).toHaveTextContent(secondId);
    expect(recordPlayerResult).not.toHaveBeenCalled();
});

test('a correction to one of two wins on the same day requires separate confirmation and targets the selected receipt', async () => {
    const day = '2026-10-18';
    const events = [
        { id: 'b20bb158-4a61-4104-9df4-8e3cf6caeeae', outcome: 'win', mode: 'Battle Flag', side: 'solid', at: Date.parse('2026-11-18T20:50:00Z') },
        { id: '880cd6a7-62d1-4460-87da-0e9e38e42715', outcome: 'win', mode: 'Countdown', side: 'camo', at: Date.parse('2026-11-18T20:10:00Z') },
    ];
    loadPlayerScoreHistory.mockResolvedValue({ history: [{ day, date: '2026-11-18', wins: 2, losses: 0, events }] });
    voidPlayerResult.mockResolvedValue({ eventId: events[1].id });
    const page = renderScore();
    await page.verify(admin);
    await scan(firstId);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Review results' })); });
    const history = within(screen.getByRole('list', { name: /dated results/i }));
    expect(history.getByText(/Battle Flag/)).toBeInTheDocument();
    expect(history.getByText(/Countdown/)).toBeInTheDocument();
    fireEvent.click(history.getAllByRole('button', { name: 'Remove this win' })[1]);
    expect(voidPlayerResult).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Remove win' })); });
    expect(voidPlayerResult).toHaveBeenCalledWith(page.firebase, firstId, expect.objectContaining({
        day, expectedCount: 2, targetEventId: events[1].id, result: 'win', operationId: expect.any(String),
    }));
    expect(screen.getByText('Win removed for River Lane.')).toBeInTheDocument();
    expect(requestStaffFieldTool).toHaveBeenCalledTimes(1);
    expect(requestStaffFieldTool).toHaveBeenCalledWith(page.firebase, admin.uid, '/api/staff-round-result-receipts', {
        method: 'POST', body: { action: 'sync', playerId: firstId, id: events[1].id, day }, signal: expect.any(AbortSignal),
    });
    expect(recordPlayerResult).not.toHaveBeenCalled();
});

test('confirmed website scores request an immediate Companion receipt without holding the desk open', async () => {
    const eventId = 'c2461ef1-01b5-4794-971c-4e05f2e3752f';
    let finishReceipt;
    requestStaffFieldTool.mockImplementationOnce(() => new Promise((_resolve, reject) => { finishReceipt = reject; }));
    recordPlayerResult.mockResolvedValue({ eventId, day: '2026-10-18' });
    const page = renderScore();
    await page.verify(admin);
    selectRound('solid');
    await scan(firstId);
    await record('win');
    expect(requestStaffFieldTool).toHaveBeenCalledWith(page.firebase, admin.uid, '/api/staff-round-result-receipts', {
        method: 'POST', body: { action: 'sync', playerId: firstId, id: eventId, day: '2026-10-18' }, signal: expect.any(AbortSignal),
    });
    expect(screen.getByText('Win recorded for River Lane.')).toBeInTheDocument();
    await scan(secondId);
    expect(recordButton('loss')).toBeEnabled();
    await act(async () => { finishReceipt(new Error('Receipt service temporarily unavailable')); });
    expect(recordPlayerResult).toHaveBeenCalledTimes(1);
    expect(checkScoreOperation).not.toHaveBeenCalled();
    expect(screen.getByText('Win recorded for River Lane.')).toBeInTheDocument();
});

test('keeps a player from receiving a receipt for an unconfirmed score', async () => {
    recordPlayerResult.mockRejectedValueOnce(new Error('Waiting on Firebase'));
    checkScoreOperation.mockResolvedValue({ confirmed: false, eventId: null });
    const page = renderScore();
    await page.verify(admin);
    selectRound();
    await scan(firstId);
    await record('loss');
    expect(checkScoreOperation).toHaveBeenCalledTimes(1);
    expect(requestStaffFieldTool).not.toHaveBeenCalled();
});

test.each(['open', 'dismissed'])('rechecks a player report currently marked %s before correcting its receipt', async flagStatus => {
    const flag = { playerId: firstId, displayName: 'River Lane', reason: 'I played on the other side.',
        id: 'c2461ef1-01b5-4794-971c-4e05f2e3752f', day: '2026-10-18', outcome: 'loss',
        at: Date.parse('2026-11-18T20:10:00Z'), mode: 'Countdown', side: 'solid', flagStatus: 'open', voided: false };
    requestStaffFieldTool.mockResolvedValueOnce({ flags: [flag], nextCursor: null })
        .mockResolvedValueOnce({ flag: { ...flag, flagStatus } });
    loadPlayerScoreHistory.mockResolvedValue({ history: [{ day: flag.day, date: '2026-11-18', wins: 0, losses: 1, events: [flag] }] });
    voidPlayerResult.mockResolvedValue({ eventId: flag.id, day: flag.day });
    const page = renderScore();
    await page.verify(admin);
    const click = name => act(async () => { fireEvent.click(screen.getByRole('button', { name })); });
    await click('View flagged receipts');
    fireEvent.click(screen.getByText('Loss · River Lane'));
    await click('Review correction');
    expect(voidPlayerResult).not.toHaveBeenCalled();
    await click('Remove loss');
    const calls = requestStaffFieldTool.mock.calls;
    expect(calls[1][2]).toBe('/api/staff-round-result-receipts?id=' + flag.id + '&playerId=' + flag.playerId);
    if (flagStatus === 'dismissed') {
        expect(voidPlayerResult).not.toHaveBeenCalled();
        expect(calls).toHaveLength(2);
        return;
    }
    expect(voidPlayerResult).toHaveBeenCalledWith(page.firebase, firstId, expect.objectContaining({ targetEventId: flag.id, result: 'loss' }));
    expect(calls.slice(2).map(call => call[3].body)).toEqual([
        { action: 'sync', id: flag.id, playerId: firstId, day: flag.day },
        { action: 'resolve', id: flag.id, playerId: firstId },
    ]);
    expect(screen.getByText('No open receipt flags.')).toBeInTheDocument();
});
