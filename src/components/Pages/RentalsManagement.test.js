import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { onValue } from 'firebase/database';
import AuthUserContext from '../session/context';
import RentalsManagement from './RentalsManagement';

jest.mock('firebase/database', () => ({ onValue: jest.fn() }));
jest.mock('../Firebase', () => ({ withFirebase: component => component }));
jest.mock('../session', () => ({
    withAuthorization: () => component => component,
    AuthUserContext: jest.requireActual('../session/context').default,
}));
jest.mock('../constants/pincode', () => () => null);
jest.mock('./Rentals/RentalOptions', () => () => null);
jest.mock('./Rentals/ReturnForm', () => () => null);
jest.mock('./Rentals/CreateRentalForm', () => ({ initialGroupId, canImportGroup, onOpenExisting }) => (
    <section aria-label="New rental">
        <p>Group {initialGroupId}</p>
        <input aria-label="Draft name" />
        {canImportGroup && <button>Find check-in group</button>}
        <button onClick={() => onOpenExisting(0, initialGroupId)}>Open saved rental</button>
    </section>
));
jest.mock('./Rentals/EditForm', () => ({ initialFormKey, canImportGroup }) => (
    <section aria-label="Edit rental">
        <p>Rental key {initialFormKey}</p>
        {canImportGroup && <button>Find check-in group</button>}
    </section>
));

const groupId = '0ab7a249-acf6-497b-be50-3687ef971746';
const otherGroupId = 'dc28bd3d-de13-4ed4-81ec-028bf2226325';
const staff = { uid: 'rental-staff', roles: { ADMIN: true } };
const snapshot = rows => ({
    exists: () => rows.length > 0,
    forEach: callback => rows.forEach(({ key, ...data }) => callback({ key, val: () => data })),
});

function Location() {
    return <output aria-label="Current query">{useLocation().search}</output>;
}

function open(query, rows = [], user = staff) {
    let publish;
    const unsubscribe = () => {};
    onValue.mockImplementation((ref, callback) => {
        if (ref === 'forms') {
            publish = nextRows => callback(snapshot(nextRows));
            publish(rows);
        } else {
            callback({ exists: () => false });
        }
        return unsubscribe;
    });
    const firebase = {
        rentalGroups: () => 'forms',
        rentalOptions: () => 'options',
        onAuthUserListener: callback => { callback(user); return unsubscribe; },
    };
    render(<AuthUserContext.Provider value={user}>
        <HelmetProvider><MemoryRouter initialEntries={['/admin/rentalform?' + query]}>
            <RentalsManagement firebase={firebase} /><Location />
        </MemoryRouter></HelmetProvider>
    </AuthUserContext.Provider>);
    return nextRows => act(() => publish(nextRows));
}

test('a staff group link reopens its saved rental at Firebase key zero', async () => {
    open('view=new&group=' + groupId, [
        { key: '0', name: 'Birthday party', checkInGroup: { id: groupId } },
        { key: '1', name: 'Other party', checkInGroup: { id: otherGroupId } },
    ]);
    expect(await screen.findByText('Rental key 0')).toBeVisible();
    expect(screen.queryByRole('region', { name: 'New rental' })).toBeNull();
});

test.each(['view=new&', ''])('a new group link seeds the draft with its selected group (%s)', async prefix => {
    open(prefix + 'group=' + groupId, [{ key: '0', name: 'Other group', checkInGroup: { id: otherGroupId } }]);
    expect(await screen.findByText('Group ' + groupId)).toBeVisible();
    await waitFor(() => expect(new URLSearchParams(screen.getByLabelText('Current query').textContent).get('group')).toBe(groupId));
    expect(screen.getByRole('region', { name: 'New rental' })).toBeVisible();
});

test('a background rental update preserves an open draft and staff can explicitly open its saved form', async () => {
    const publish = open('view=new&group=' + groupId);
    const draft = await screen.findByLabelText('Draft name');
    fireEvent.change(draft, { target: { value: 'Walk-on added at the desk' } });
    publish([{ key: '1', name: 'Changed by another desk', checkInGroup: { id: otherGroupId } }]);
    expect(screen.getByLabelText('Draft name')).toHaveValue('Walk-on added at the desk');
    publish([
        { key: '0', name: 'Saved group rental', checkInGroup: { id: groupId } },
        { key: '1', name: 'Changed by another desk', checkInGroup: { id: otherGroupId } },
    ]);
    expect(screen.getByLabelText('Draft name')).toHaveValue('Walk-on added at the desk');
    fireEvent.click(screen.getByRole('button', { name: 'Open saved rental' }));
    expect(await screen.findByText('Rental key 0')).toBeVisible();
});

test('hiding the staff navigation also hides the check-in group picker', async () => {
    open('view=new&group=' + groupId);
    expect(await screen.findByRole('button', { name: 'Find check-in group' })).toBeVisible();
    fireEvent.click(screen.getByTitle('Hide navigation'));
    expect(screen.queryByRole('button', { name: 'Find check-in group' })).toBeNull();
    fireEvent.click(screen.getByTitle('Show navigation'));
    expect(await screen.findByRole('button', { name: 'Find check-in group' })).toBeVisible();
});

test.each([
    [{ WAIVER: 'WAIVER' }, true],
    [{ WAIVER: 'WAIVER', STATIC: 'STATIC' }, false],
])('checks desk roles before offering group lookup for %o', async (roles, allowed) => {
    open('view=new&group=' + groupId, [], { ...staff, roles });
    await screen.findByRole('region', { name: 'New rental' });
    expect(Boolean(screen.queryByRole('button', { name: 'Find check-in group' }))).toBe(allowed);
});
