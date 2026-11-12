import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { get, onValue, push, remove, set } from 'firebase/database';
import { FirebaseContext } from '../Firebase';
import Schedule from './Schedule';

jest.mock('../Firebase', () => {
    const context = jest.requireActual('../Firebase/context');
    return { FirebaseContext: context.default, withFirebase: context.withFirebase };
});
jest.mock('firebase/database', () => ({
    child: (reference, path) => `${reference}/${path}`,
    get: jest.fn(),
    onValue: jest.fn(),
    push: jest.fn(),
    remove: jest.fn(),
    runTransaction: jest.fn(),
    set: jest.fn(),
}));
jest.mock('../constants/useFieldResources', () => () => ({ resources: null }));

const event = { id: 'spring-event', date: '2099-02-07', name: 'Spring game day', time: '9 AM', additional: 'Check in at the store.' };
const calendarUrl = 'https://usaw-field-companion.pink-bud-3735.chatgpt.site/api/field-calendar';
const authUser = uid => ({ uid, getIdToken: jest.fn().mockResolvedValue(`${uid}-token`) });
const reply = body => Promise.resolve({ ok: true, json: async () => body });

function renderSchedule(user) {
    let onAuth;
    const auth = {
        currentUser: null,
        onAuthStateChanged: callback => {
            onAuth = callback;
            return jest.fn();
        },
    };
    const firebase = { auth, user: uid => `users/${uid}`, schedule: () => 'schedule', scheduleEvent: id => `schedule/${id}` };
    render(<FirebaseContext.Provider value={firebase}><HelmetProvider><Schedule /></HelmetProvider></FirebaseContext.Provider>);
    function switchAccount(next) {
        auth.currentUser = next;
        act(() => { onAuth(next); });
    }
    switchAccount(user);
    return { switchAccount };
}

beforeEach(() => {
    jest.clearAllMocks();
    get.mockImplementation(async path => ({ val: () => path.startsWith('users/admin/') || null }));
    onValue.mockImplementation((_, next) => {
        next({ val: () => ({ [event.id]: event }) });
        return jest.fn();
    });
    global.fetch = jest.fn((_, { method }) => method === 'POST'
        ? reply({ published: true, count: 1 })
        : reply({ scheduleStatus: 'current', events: [event] }));
});

test('shows the shared upcoming event to an ordinary player and opens the exact field date', async () => {
    get.mockRejectedValueOnce(new Error('No profile record'));
    onValue.mockImplementationOnce((_, next, denied) => {
        denied(new Error('Permission denied'));
        return jest.fn();
    });
    renderSchedule(authUser('player'));
    const upcoming = await screen.findByRole('button', { name: /Feb 7, 2099.*Spring game day/i });
    expect(onValue).toHaveBeenCalledWith('schedule', expect.any(Function), expect.any(Function));
    expect(global.fetch).toHaveBeenCalledWith(calendarUrl, expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer player-token' }),
    }));
    expect(screen.queryByRole('button', { name: 'Publish existing game days' })).not.toBeInTheDocument();
    fireEvent.click(upcoming);
    expect(screen.getByText('February 7, 2099')).toBeInTheDocument();
    expect(screen.getByText(event.additional)).toBeInTheDocument();
});

test('preserves existing live Firebase reads for players with calendar access', async () => {
    renderSchedule(authUser('player'));
    expect(await screen.findByRole('button', { name: /Spring game day/ })).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    const newEvent = { ...event, name: 'Updated game day' };
    act(() => onValue.mock.calls[0][1]({ val: () => ({ [event.id]: newEvent }) }));
    expect(screen.getByRole('button', { name: /Updated game day/ })).toBeInTheDocument();
});

test('publishes the existing schedule on staff entry and again after a game day is saved', async () => {
    push.mockReturnValue('schedule/new-event');
    set.mockResolvedValue(undefined);
    const { switchAccount } = renderSchedule(authUser('admin'));
    await waitFor(() => expect(global.fetch.mock.calls.filter(([, request]) => request.method === 'POST')).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: 'Add field event' }));
    fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'New game day' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save event' }));
    expect(await screen.findByText('Event saved and published.')).toBeInTheDocument();
    expect(set).toHaveBeenCalledWith('schedule/new-event', expect.objectContaining({ name: 'New game day' }));
    expect(global.fetch.mock.calls.filter(([, request]) => request.method === 'POST')).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalledWith(calendarUrl, expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }),
    }));
    switchAccount(authUser('player'));
    expect(await screen.findByRole('button', { name: /Spring game day/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish existing game days' })).not.toBeInTheDocument();
});

test('shows staff a retry action if a Firebase delete succeeds and publication fails', async () => {
    remove.mockResolvedValue(undefined);
    renderSchedule(authUser('admin'));
    await waitFor(() => expect(global.fetch.mock.calls.filter(([, request]) => request.method === 'POST')).toHaveLength(1));
    global.fetch.mockRejectedValueOnce(new Error('Publication failed'));
    fireEvent.click(screen.getByRole('button', { name: /Spring game day/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Show remove controls' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Spring game day' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Event removed. Player calendars could not be refreshed.');
    expect(remove).toHaveBeenCalledWith('schedule/spring-event');
    fireEvent.click(screen.getByRole('button', { name: 'Publish existing game days' }));
    expect(await screen.findByText('Player calendars are up to date.')).toBeInTheDocument();
});
