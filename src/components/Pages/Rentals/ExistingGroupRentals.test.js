import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { get, onValue, runTransaction, set } from 'firebase/database';
import EditForm from './EditForm';
import ReturnForm from './ReturnForm';
import GroupRentalPicker from './GroupRentalPicker';
import { importRentalParticipants, rentalIdentity } from './utils/openRental';

jest.mock('../../Firebase', () => ({ withFirebase: component => component }));
jest.mock('../../session', () => ({ withAuthorization: () => component => component }));
jest.mock('./GroupRentalPicker', () => jest.fn());
jest.mock('firebase/database', () => ({
    get: jest.fn(), onValue: jest.fn(), runTransaction: jest.fn(), set: jest.fn(),
    query: jest.fn(), ref: jest.fn(), orderByChild: jest.fn(), startAt: jest.fn(), endAt: jest.fn(), limitToLast: jest.fn(),
}));

const firebase = { auth: { currentUser: { uid: 'staff' } }, rentalGroups: () => 'forms', rentalGroup: key => key, rentalOptions: () => 'options', digitalWaivers: () => 'waivers' };
const group = { id: 'party', name: 'Birthday', date: '2026-11-20', kind: 'party' };
const entries = [{ id: 'one', displayName: 'Rebel' }, { id: 'two', displayName: 'Rebel' }];
const gear = { label: 'Vest', value: 'vest', id: 'vest-8', number: '8', checked: false };
const handEntered = { name: 'Walk-on', ref: 'legacy-waiver', note: 'Left-handed', rentals: [gear] };
let current;
let others;
const formProps = () => ({ initialFormKey: '0', initialGroupId: group.id, uid: 'staff', canImportGroup: true, firebase, rentalForms: [{ ...current, key: '0' }] });

beforeEach(() => {
    jest.clearAllMocks();
    others = {};
    current = { name: 'Birthday rental', transaction: 'T100', complete: true, cc: { last4: '1234' }, size: 2, participants: [handEntered] };
    get.mockResolvedValue({ exists: () => false, val: () => null });
    onValue.mockImplementation(() => () => {});
    runTransaction.mockImplementation(async (key, transform) => {
        const next = transform(key === 'forms' ? { ...others, '0': current } : current);
        if (next !== undefined) current = key === 'forms' ? next['0'] : next;
        return { committed: next !== undefined, snapshot: { val: () => current } };
    });
    GroupRentalPicker.mockImplementation(({ onAdd }) => <button onClick={() => onAdd(group, entries)}>Import arrivals</button>);
});

test('reopens the linked rental by key, imports later arrivals and retains issued gear and the original transaction', async () => {
    const view = render(<EditForm {...formProps()} />);
    const add = await screen.findByRole('button', { name: 'Import arrivals' });
    fireEvent.click(add);
    await waitFor(() => expect(current.participants).toHaveLength(3));
    expect(current).toMatchObject({ checkInGroup: group, cc: { last4: '1234' }, size: 3, transaction: 'T100', complete: true });
    expect(current.participants[0]).toEqual(handEntered);
    expect(current.participants.slice(1).map(person => person.groupEntryId)).toEqual(['one', 'two']);
    view.rerender(<EditForm {...formProps()} />);
    expect(screen.getAllByRole('heading', { name: 'Rebel' })).toHaveLength(2);
    expect(GroupRentalPicker.mock.calls.at(-1)[0]).toMatchObject({ linkedGroupId: group.id, uid: 'staff' });
    fireEvent.click(add);
    await waitFor(() => expect(runTransaction).toHaveBeenCalledTimes(2));
    expect(current.participants).toHaveLength(3);
    expect(current.participants[0].rentals).toEqual([gear]);

    view.rerender(<EditForm {...formProps()} rentalForms={[]} />);
    expect(screen.getByText('This rental form is no longer open.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Import arrivals' })).toBeNull();
});

test('keeps current stock assignments when a second desk adds a renter during equipment numbering', async () => {
    render(<EditForm {...formProps()} />);
    await screen.findByRole('button', { name: 'Import arrivals' });
    const late = { name: 'Arrival', ref: 'walk-on-late' };
    current = { ...current, participants: [...current.participants, late] };
    fireEvent.click(screen.getByText('8'));
    const input = screen.getByPlaceholderText('Rental #');
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.submit(input.closest('form'));
    await waitFor(() => expect(current.participants[0].rentals[0].number).toBe('12'));
    expect(current.participants[1]).toMatchObject(late);
});

test('issues one available item to the selected group participant alongside a handwritten renter', async () => {
    current.available = [{ id: 'reserve-vest', value: 'vest', label: 'Vest' }];
    await importRentalParticipants('forms', '0', group, [entries[0]]);
    onValue.mockImplementation((ref, callback) => {
        callback({ exists: () => true, val: () => [{ value: 'vest', stock: 1 }] });
        return () => {};
    });
    render(<EditForm {...formProps()} />);
    const heading = await screen.findByRole('heading', { name: 'Rebel' });
    const renter = within(heading.closest('.participant-card'));
    fireEvent.click(renter.getByRole('button', { name: 'Add Rental' }));
    fireEvent.click(await renter.findByRole('button', { name: /Vest/ }));
    await waitFor(() => expect(current.available).toEqual([]));
    expect(set).not.toHaveBeenCalled();
    expect(runTransaction.mock.calls.map(call => call[0])).toEqual(['forms', '0']);
    expect(current.participants[0]).toMatchObject(handEntered);
    expect(current.participants[1]).toMatchObject({ groupEntryId: 'one', rentals: [{ label: 'Vest', number: '', checked: false }] });
});

test('stages names on a pending rental and enables issuing gear after activation', async () => {
    current.complete = false;
    await importRentalParticipants('forms', '0', group, [entries[0]]);
    const view = render(<EditForm {...formProps()} />);
    const row = (await screen.findByRole('heading', { name: 'Rebel' })).closest('.participant-card');
    expect(within(row).getByRole('button', { name: 'Add Rental' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Activate Form' })).toBeVisible();
    current.complete = true;
    view.rerender(<EditForm {...formProps()} />);
    expect(within(row).getByRole('button', { name: 'Add Rental' })).toBeEnabled();
});

test('a return check preserves imported identity, manual fields and arrivals added at another desk', async () => {
    current = { ...current, participants: [{ ...handEntered, groupId: group.id, groupEntryId: 'one' }] };
    const view = render(<ReturnForm firebase={firebase} rentalForms={[{ ...current, key: '0' }]} />);
    fireEvent.click(within(screen.getByText(current.name).closest('li')).getByRole('button'));
    const number = await screen.findByRole('button', { name: '8' });
    const late = { name: 'New player', groupId: group.id, groupEntryId: 'two' };
    current = { ...current, participants: [...current.participants, late] };
    fireEvent.click(number);
    await waitFor(() => expect(current.participants[0].rentals[0].checked).toBe(true));
    expect(current.participants[0]).toMatchObject({ ref: 'legacy-waiver', note: 'Left-handed', groupId: group.id, groupEntryId: 'one' });
    expect(current.participants[1]).toMatchObject(late);
    view.rerender(<ReturnForm firebase={firebase} rentalForms={[{ key: 'other', name: 'Another form' }, { ...current, key: '0' }]} />);
    expect(screen.getByText('Group: Birthday rental')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Complete Form' }));
    expect(screen.getByRole('textbox', { name: 'Email Address' })).toBeVisible();
});

test('rejects imports for a different linked group or a returned or deleted record', async () => {
    others = { second: { name: 'Another open rental', checkInGroup: group } };
    await expect(importRentalParticipants('forms', '0', group, entries)).rejects.toThrow('another open rental form');
    others = {};
    current.checkInGroup = { ...group, id: 'different' };
    await expect(importRentalParticipants('forms', '0', group, entries)).rejects.toThrow('another group');
    current = { ...current, returned: true };
    await expect(importRentalParticipants('forms', '0', group, entries)).rejects.toThrow('returned');
    current = null;
    await expect(importRentalParticipants('forms', '0', group, entries)).rejects.toThrow('returned');
    expect(current).toBeNull();
});

test('a reused key cannot replace a linked deep-link target, and staff may explicitly select another form after Back', async () => {
    current = { ...current, checkInGroup: group, createRequestId: 'request-one' };
    const open = formProps();
    const view = render(<EditForm {...open} initialLinkedGroupId={group.id} />);
    expect(await screen.findByRole('button', { name: 'Import arrivals' })).toBeVisible();
    current = { ...current, name: 'Second rental', checkInGroup: { ...group, id: 'group-two' }, createRequestId: 'request-two' };
    view.rerender(<EditForm {...formProps()} initialLinkedGroupId={group.id} initialFormKey={null} />);
    expect(screen.getByText('This rental form is no longer open.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Import arrivals' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Forms' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Form' }));
    expect(await screen.findByRole('heading', { name: 'Editing: Second rental' })).toBeVisible();
});

test('protects an older manually selected form against a reused key during a pending gear write or import', async () => {
    const selected = { ...current };
    const view = render(<EditForm {...formProps()} initialFormKey={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Form' }));
    await screen.findByRole('button', { name: 'Import arrivals' });
    current = { ...current, createRequestId: 'new-record', name: 'Replacement' };
    fireEvent.click(screen.getByText('8'));
    const input = screen.getByPlaceholderText('Rental #');
    fireEvent.change(input, { target: { value: '17' } });
    fireEvent.submit(input.closest('form'));
    expect(await screen.findByRole('alert')).toHaveTextContent('rental form changed');
    expect(current.participants[0].rentals[0].number).toBe('8');
    await expect(importRentalParticipants('forms', '0', group, entries, rentalIdentity(selected))).rejects.toThrow('returned or removed');
    expect(current.checkInGroup).toBeUndefined();
    view.rerender(<EditForm {...formProps()} initialFormKey={null} />);
    expect(screen.getByText('This rental form is no longer open.')).toBeVisible();
});
