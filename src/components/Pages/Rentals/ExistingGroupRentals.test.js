import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { get, onValue, query, runTransaction, set, startAfter } from 'firebase/database';
import EditForm from './EditForm';
import ReturnForm from './ReturnForm';
import GroupRentalPicker from './GroupRentalPicker';
import { importRentalParticipants, rentalIdentity } from './utils/openRental';

jest.mock('../../Firebase', () => ({ withFirebase: component => component }));
jest.mock('../../session', () => ({ withAuthorization: () => component => component }));
jest.mock('./GroupRentalPicker', () => jest.fn());
jest.mock('firebase/database', () => ({
    get: jest.fn(), onValue: jest.fn(), runTransaction: jest.fn(), set: jest.fn(),
    query: jest.fn(), ref: jest.fn(), orderByChild: jest.fn(), startAt: jest.fn(), startAfter: jest.fn(), endAt: jest.fn(), limitToFirst: jest.fn(), limitToLast: jest.fn(),
}));

const firebase = { rentals: () => 'rental-desk', auth: { currentUser: { uid: 'staff' } }, rentalGroups: () => 'forms', rentalGroup: key => key, rentalOptions: () => 'options', digitalWaivers: () => 'waivers' };
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
        const groups = { ...others, '0': current };
        const next = transform(key === 'rental-desk' ? { group: groups, options: [{id:'vest',value:'vest',label:'Vest',stock:4,max:20},{id:'mask',value:'mask',label:'Mask',stock:2,max:10}] } : key === 'forms' ? groups : current);
        if (next !== undefined) current = key === 'rental-desk' ? next.group['0'] : key === 'forms' ? next['0'] : next;
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
    current.participants=[{...handEntered,rentals:[{...gear,number:''}]}];
    render(<EditForm {...formProps()} />);
    await screen.findByRole('button', { name: 'Import arrivals' });
    const late = { name: 'Arrival', ref: 'walk-on-late' };
    current = { ...current, participants: [...current.participants, late] };
    const input = screen.getByRole('textbox', { name: 'Vest equipment number' });
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.submit(input.closest('form'));
    await waitFor(() => expect(current.participants[0].rentals[0].number).toBe('12'));
    expect(current.participants[1]).toMatchObject(late);
});

test('an issued legacy number requires a swap and cannot be overwritten as a new assignment', async () => {
    render(<EditForm {...formProps()} />);
    const input=await screen.findByRole('textbox',{name:'Vest equipment number'});
    fireEvent.change(input,{target:{value:'12'}});
    fireEvent.submit(input.closest('form'));
    await screen.findByText(/Use an equipment swap to change an issued number/i);
    expect(current.participants[0].rentals[0].number).toBe('8');
});

test('numbers each issued unit directly and keeps a canceled edit separate', async () => {
    const second = { ...gear, id: 'vest-9', number: '' };
    current.participants = [{ ...handEntered, rentals: [gear, second] }];
    const view = render(<EditForm {...formProps()} />);
    const list = await screen.findByRole('list', { name: 'Equipment for Walk-on' });
    const firstBox = within(list).getByRole('textbox', { name: 'Vest (1 of 2) equipment number' });
    const secondBox = within(list).getByRole('textbox', { name: 'Vest (2 of 2) equipment number' });
    expect(firstBox).toHaveValue('8');
    expect(secondBox).toHaveAttribute('inputmode', 'numeric');
    fireEvent.change(firstBox, { target: { value: '88' } });
    fireEvent.change(secondBox, { target: { value: '0042' } });
    fireEvent.click(within(firstBox.closest('form')).getByRole('button', { name: 'Cancel' }));
    expect(firstBox).toHaveValue('8');
    expect(secondBox).toHaveValue('0042');
    expect(runTransaction).not.toHaveBeenCalled();
    fireEvent.click(within(secondBox.closest('form')).getByRole('button', { name: 'Save number' }));
    await waitFor(() => expect(current.participants[0].rentals).toMatchObject([gear, { ...second, number: '0042' }]));
    view.rerender(<EditForm {...formProps()} />);
    expect(secondBox).toHaveValue('0042');
    expect(within(list).queryByRole('button', { name: 'Save number' })).toBeNull();
});

test('opens a number field for equipment issued through Edit Form and Add Participant', async () => {
    const member = { name: 'Test Driver', username: 'driver', nameLower: 'test driver', usernameLower: 'driver' };
    current.participants = [];
    current.available = [{ id: 'reserve-mask', value: 'mask', label: 'Full face mask' }];
    const desk = { ...firebase, users: () => 'users', user: id => 'users/' + id };
    query.mockImplementation(path => path);
    get.mockImplementation(async path => {
        const result = path === 'users' ? { driver: member } : path === 'users/driver' ? member : null;
        return { exists: () => !!result, val: () => result,
            forEach: visit => Object.entries(result || {}).forEach(([key, row]) => visit({ key, val: () => row })) };
    });
    const view = render(<EditForm {...formProps()} firebase={desk} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add Participant' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Members' }));
    fireEvent.change(await screen.findByPlaceholderText(/Search members by/), { target: { value: 'driver' } });
    fireEvent.click(await screen.findByText('Test Driver'));
    await waitFor(() => expect(current.participants).toHaveLength(1));
    view.rerender(<EditForm {...formProps()} firebase={desk} />);
    const card = (await screen.findByRole('heading', { name: 'Test Driver' })).closest('.participant-card');
    fireEvent.click(within(card).getByRole('button', { name: 'Add Rental' }));
    fireEvent.click(await within(card).findByRole('button', { name: /Full face mask/ }));
    await waitFor(() => expect(current.participants[0].rentals).toHaveLength(1));
    view.rerender(<EditForm {...formProps()} firebase={desk} />);
    const box = within(card).getByRole('textbox', { name: 'Full face mask equipment number' });
    fireEvent.change(box, { target: { value: '007' } });
    fireEvent.click(within(card).getByRole('button', { name: 'Save number' }));
    await waitFor(() => expect(current.participants[0].rentals[0].number).toBe('007'));
    expect(current.participants[0].ref).toBe('driver');
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
    const number = await screen.findByRole('button', { name: 'Return' });
    const late = { name: 'New player', groupId: group.id, groupEntryId: 'two' };
    current = { ...current, participants: [...current.participants, late] };
    fireEvent.click(number);
    fireEvent.click(screen.getByRole('button', {name:'Confirm return'}));
    await waitFor(() => expect(current.participants[0].rentals[0].checked).toBe(true));
    expect(current.participants[0]).toMatchObject({ ref: 'legacy-waiver', note: 'Left-handed', groupId: group.id, groupEntryId: 'one' });
    expect(current.participants[1]).toMatchObject(late);
    view.rerender(<ReturnForm firebase={firebase} rentalForms={[{ key: 'other', name: 'Another form' }, { ...current, key: '0' }]} />);
    expect(screen.getByText('Group: Birthday rental')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Complete Form' }));
    expect(screen.getByRole('heading', { name: 'Complete rental return' })).toBeVisible();
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
    const input = screen.getByRole('textbox', { name: 'Vest equipment number' });
    fireEvent.change(input, { target: { value: '17' } });
    fireEvent.submit(input.closest('form'));
    expect(await screen.findByRole('alert')).toHaveTextContent('rental form changed');
    expect(current.participants[0].rentals[0].number).toBe('8');
    await expect(importRentalParticipants('forms', '0', group, entries, rentalIdentity(selected))).rejects.toThrow('returned or removed');
    expect(current.checkInGroup).toBeUndefined();
    view.rerender(<EditForm {...formProps()} initialFormKey={null} />);
    expect(screen.getByText('This rental form is no longer open.')).toBeVisible();
});


test.each([null, { name: 'Former member', accountRemovedAt: 10 }])('a member removed after a rental search cannot be added', async deletedProfile => {
    const archived = Object.fromEntries(Array.from({ length: 50 }, (_, index) => [`old-${index}`, {
        name: 'Archived member', nameLower: 'member archived', usernameLower: 'memberarchived', accountRemovedAt: 5,
    }]));
    const matching = { existing: { name: 'Former member', nameLower: 'member former', usernameLower: 'memberformer' } };
    startAfter.mockImplementation((value, key) => ({ after: key }));
    query.mockImplementation((path, ...constraints) => path === 'users'
        ? (constraints.some(constraint => constraint?.after) ? 'users/next-page' : 'users/first-page') : path);
    get.mockImplementation(async path => {
        const value = path === 'users/first-page' ? archived : path === 'users/next-page' ? matching :
            path === 'users/existing' ? deletedProfile : null;
        return { exists: () => Boolean(value), val: () => value, forEach: visit =>
            Object.entries(value || {}).forEach(([key, row]) => visit({ key, val: () => row })) };
    });
    const desk = { ...firebase, users: () => 'users', user: uid => `users/${uid}` };
    render(<EditForm {...formProps()} firebase={desk} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add Participant' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Members' }));
    fireEvent.change(await screen.findByPlaceholderText(/Search members by/), { target: { value: 'mem' } });
    const member = await screen.findByText('Former member');
    expect(screen.queryByText('Archived member')).toBeNull();
    fireEvent.click(member);
    expect(await screen.findByText(/This player account was removed/)).toBeVisible();
    expect(runTransaction).not.toHaveBeenCalled();
    expect(current.participants).toEqual([handEntered]);
});

test('saves the selected renter name after another desk reorders duplicate names and numbers gear', async () => {
    const original = { ...handEntered, groupId: group.id, groupEntryId: 'one' };
    const second = { name: original.name, groupId: group.id, groupEntryId: 'two', ref: 'guest:two' };
    current.participants = [original, second];
    render(<EditForm {...formProps()} />);
    const row = (await screen.findAllByRole('heading', { name: original.name }))[0].closest('.participant-card');
    fireEvent.click(within(row).getByRole('button', { name: 'Edit name' }));
    const input = within(row).getByRole('textbox', { name: 'Rental player name' });
    fireEvent.change(input, { target: { value: '  New rental name  ' } });
    const issued = { ...gear, number: '24' };
    current.participants = { 4: second, 7: { ...original, rentals: [issued] } };
    fireEvent.click(within(row).getByRole('button', { name: 'Save name' }));
    await within(row).findByText('Rental name saved.');
    expect(current.participants).toEqual({ 4: second, 7: { ...original, rentals: [issued], name: 'New rental name' } });
    expect(current.transaction).toBe('T100');
});

test('protects a newer rental name and preserves the desk draft after a conflict', async () => {
    render(<EditForm {...formProps()} />);
    const row = (await screen.findByRole('heading', { name: handEntered.name })).closest('.participant-card');
    fireEvent.click(within(row).getByRole('button', { name: 'Edit name' }));
    const input = within(row).getByRole('textbox', { name: 'Rental player name' });
    fireEvent.change(input, { target: { value: 'Draft' } });
    current.participants = [{ ...handEntered, name: 'Other desk' }];
    fireEvent.click(within(row).getByRole('button', { name: 'Save name' }));
    expect(await within(row).findByRole('alert')).toHaveTextContent('Another staff member');
    expect(current.participants[0].name).toBe('Other desk');
    expect(input).toHaveValue('Draft');
});

test('lets staff correct a legacy name-only renter and an unnumbered item stays assigned', async () => {
    const legacy = { name: 'Guest', rentals: [{ ...gear, number: '' }] };
    current.participants = { 3: legacy };
    render(<EditForm {...formProps()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit name' }));
    const input = await screen.findByLabelText('Rental player name');
    fireEvent.change(input, { target: { value: 'Guest One' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await screen.findByText('Rental name saved.');
    expect(current.participants).toEqual({ 3: { ...legacy, name: 'Guest One' } });
});

test('a scanned party member can join their open rental, find their gear card first and return to their exact check-in', async () => {
    current.checkInGroup = group;
    const player = { playerId: 'memberABC123', date: group.date, groupId: group.id, groupEntryId: 'two', displayName: 'Walk-on' };
    const returnToCheckIn = '/admin/field/check-in?player=memberABC123&date=' + group.date;
    const verifyCheckedInPlayer = jest.fn().mockResolvedValue(player);
    const props = () => ({ ...formProps(), checkedInPlayer: player, verifyCheckedInPlayer, returnToCheckIn });
    const view = render(<EditForm {...props()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add checked-in player to this rental' }));
    await waitFor(() => expect(current.participants).toHaveLength(2));
    expect(verifyCheckedInPlayer).toHaveBeenCalledTimes(1);
    expect(current.participants[0]).toEqual(handEntered);
    expect(current.participants[1]).toMatchObject({ ref: player.playerId, groupEntryId: 'two', name: 'Walk-on' });
    view.rerender(<EditForm {...props()} />);
    const selected = (await screen.findByText('Selected at check-in')).closest('.participant-card');
    expect(document.querySelector('.participant-card')).toBe(selected);
    expect(within(selected).getByRole('link', { name: 'Return to this player’s check-in' })).toHaveAttribute('href', returnToCheckIn);
    expect(screen.queryByRole('button', { name: 'Add checked-in player to this rental' })).toBeNull();
});

test('customer kiosk deep links do not expose rental records or staff waiver searches',()=>{
    render(<EditForm {...formProps()} canImportGroup={false}/>);
    expect(screen.getByText(/Unlock the staff rental desk/)).toBeVisible();
    expect(screen.queryByText(current.name)).toBeNull();
    expect(screen.queryByRole('button',{name:'Add Participant'})).toBeNull();
    expect(get).not.toHaveBeenCalled();
});
