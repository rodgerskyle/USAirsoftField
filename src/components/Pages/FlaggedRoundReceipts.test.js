import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FlaggedRoundReceipts, requestScoreReceipts } from './FlaggedRoundReceipts';

const first = { playerId: 'memberAlpha01', id: '11111111-1111-4111-8111-111111111111', outcome: 'loss', at: 1800000000000,
    day: '2026-10-18', mode: 'Countdown', side: 'camo', reason: 'I played on Solid.', voided: false };
const second = { ...first, playerId: 'memberBeta02', id: '22222222-2222-4222-8222-222222222222', outcome: 'win', voided: true };
const names = { [first.playerId]: 'River Lane', [second.playerId]: 'Sam Hayes' };
const getPlayerName = uid => names[uid] || '';
const press = async name => act(async () => fireEvent.click(screen.getByRole('button', { name })));

afterEach(() => jest.restoreAllMocks());

test('loads flags on demand, pages without duplicates, and sends the exact selected player report to review', async () => {
    const request = jest.fn().mockResolvedValueOnce({ flags: [first], nextCursor: 'page-2' })
        .mockResolvedValueOnce({ flags: [first, second], nextCursor: null });
    const onReview = jest.fn(), onCorrect = jest.fn();
    render(<FlaggedRoundReceipts request={request} getPlayerName={getPlayerName} onReview={onReview} onCorrect={onCorrect} />);
    expect(request).not.toHaveBeenCalled();
    await press('View flagged receipts');
    fireEvent.click(screen.getByText('Loss · River Lane'));
    expect(screen.getByText('I played on Solid.')).toBeVisible();
    await press('Open player record');
    expect(onReview).toHaveBeenCalledWith(first);
    await press('Review correction');
    expect(onCorrect).toHaveBeenCalledWith(first);
    await press('Load more flags');
    expect(request).toHaveBeenLastCalledWith({ cursor: 'page-2' }, undefined, expect.any(AbortSignal));
    expect(screen.getAllByText('Loss · River Lane')).toHaveLength(1);
    expect(screen.getByText('Win · Sam Hayes')).toBeInTheDocument();
    expect(screen.queryByText('Load more flags')).not.toBeInTheDocument();
});

test.each([[first, 'Keep result and close flag', 'dismiss'], [second, 'Close corrected flag', 'resolve']])(
    'closes the selected flag only after staff confirms', async (flag, button, action) => {
        const confirm = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
        const request = jest.fn().mockResolvedValueOnce({ flags: [flag], nextCursor: null }).mockResolvedValue({ ok: true });
        render(<FlaggedRoundReceipts request={request} getPlayerName={getPlayerName} />);
        await press('View flagged receipts');
        fireEvent.click(screen.getByText(flag.outcome === 'win' ? 'Win · Sam Hayes' : 'Loss · River Lane'));
        await press(button);
        expect(confirm).toHaveBeenCalledWith(expect.stringContaining(getPlayerName(flag.playerId)));
        expect(confirm.mock.calls[0][0]).not.toContain(flag.playerId);
        expect(request).toHaveBeenCalledTimes(1);
        await press(button);
        expect(request).toHaveBeenLastCalledWith(null, { action, playerId: flag.playerId, id: flag.id }, expect.any(AbortSignal));
        expect(screen.getByText('No open receipt flags.')).toBeInTheDocument();
    },
);

test('a failed load keeps refresh available', async () => {
    const request = jest.fn().mockRejectedValueOnce(new Error('Queue is unavailable.')).mockResolvedValue({ flags: [] });
    render(<FlaggedRoundReceipts request={request} getPlayerName={getPlayerName} />);
    await press('View flagged receipts');
    expect(screen.getByRole('alert')).toHaveTextContent('Queue is unavailable.');
    await press('View flagged receipts');
    expect(screen.getByText('No open receipt flags.')).toBeInTheDocument();
});

test('uses the signed-in website bearer and omits cookies on the Companion review endpoint', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const user = { uid: 'staff-player', getIdToken: jest.fn().mockResolvedValue('fake-test-token') };
    const firebase = { auth: { currentUser: user } };
    try {
        const body = { action: 'sync', id: first.id, day: first.day, playerId: first.playerId };
        await requestScoreReceipts(firebase, user.uid, null, body);
        expect(global.fetch).toHaveBeenCalledWith('https://app.usairsoftfield.com/api/staff-round-result-receipts',
            expect.objectContaining({ method: 'POST', credentials: 'omit', body: JSON.stringify(body),
                headers: expect.objectContaining({ Authorization: 'Bearer fake-test-token' }) }));
        firebase.auth.currentUser = null;
        await expect(requestScoreReceipts(firebase, user.uid)).rejects.toThrow(/sign in/i);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    } finally { global.fetch = originalFetch; }
});
