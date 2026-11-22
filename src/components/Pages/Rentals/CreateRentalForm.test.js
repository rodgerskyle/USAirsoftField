import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { runTransaction } from 'firebase/database';
import CreateRentalForm from './CreateRentalForm';

jest.mock('../../Firebase', () => ({ withFirebase: Component => Component }));
jest.mock('firebase/database', () => ({ runTransaction: jest.fn() }));
jest.mock('./components/creditcard', () => props => <div>
    {['name', 'number', 'expiry', 'cvc', 'zipcode'].map(field =>
        <input key={field} name={field} aria-label={'Payment ' + field} value={props[field]} onChange={props.handleInputChange} />)}
</div>);
jest.mock('./GroupRentalPicker', () => ({ onAdd }) => {
    const source = { id: 'group-21', name: 'Friday birthday', kind: 'party', date: '2026-11-20' };
    const rows = [
        { id: 'member-entry', playerId: 'memberABC123', displayName: 'Fox' },
        { id: 'guest-entry', displayName: 'Fox' },
    ];
    return <button type="button" onClick={() => onAdd(source, rows)}>Import reviewed members</button>;
});

const equipment = { id: 'mask', value: 'mask', label: 'Mask', stock: 0, max: 6, cost: 5 };

function fixture({ canImportGroup = true, groups = {}, loseFirstReceipt = false, stock = 0, walkOn, verifyWalkOn } = {}) {
    let rentals = { group: groups, options: [{ ...equipment, stock }], unrelated: { active: true } };
    const snapshot = () => ({ child: path => ({ val: () => path.split('/').reduce((value, key) => value?.[key], rentals) }) });
    runTransaction.mockImplementation(async (path, apply, options) => {
        expect(path).toBe('rentals');
        expect(options.applyLocally).toBe(false);
        expect(apply(null)).toBeNull();
        const next = apply(rentals);
        if (next === undefined) return { committed: false, snapshot: snapshot() };
        rentals = next;
        if (loseFirstReceipt) {
            loseFirstReceipt = false;
            throw new Error('Network disconnected');
        }
        return { committed: true, snapshot: snapshot() };
    });
    const open = jest.fn();
    const openDesk = () => render(<CreateRentalForm walkOn={walkOn} verifyWalkOn={verifyWalkOn} firebase={{ rentals: () => 'rentals' }} canImportGroup={canImportGroup}
        uid="staff" onOpenExisting={open} rentalOptions={[equipment]} rentalForms={[]} />);
    return { data: () => rentals, open, openDesk, desk: openDesk() };
}

function reserveAndPay(quantity = 1, scope = screen) {
    const check = scope.getByRole('checkbox', { name: /Mask/ });
    fireEvent.click(check);
    if (quantity === 2) fireEvent.click(check);
    for (const [key, value] of Object.entries({ name: 'Rental desk fixture', number: '4242424242424242', cvc: '123', expiry: '1128', zipcode: '96007' })) {
        fireEvent.change(scope.getByLabelText('Payment ' + key), { target: { value } });
    }
    fireEvent.click(scope.getByRole('button', { name: /Create Rental \(/ }));
}
beforeEach(() => runTransaction.mockReset());

test('a reviewed birthday roster is saved with distinct stable participant IDs and no assigned gear', async () => {
    const old = { name: 'Previous rental', complete: true };
    const { data, open } = fixture({ groups: { 2: old, 7: old } });
    fireEvent.click(screen.getByRole('button', { name: 'Import reviewed members' }));
    expect(screen.getByLabelText('Rental Name', { exact: false })).toHaveValue('Friday birthday');
    expect(screen.getByRole('spinbutton')).toHaveValue(2);
    const review = screen.getByRole('region', { name: 'Imported check-in group' });
    expect(within(review).getAllByDisplayValue('Fox')).toHaveLength(2);
    fireEvent.change(within(review).getByLabelText('Renter 2 name'), { target: { value: '  Fox Junior  ' } });
    expect(runTransaction).not.toHaveBeenCalled();
    reserveAndPay(2);
    fireEvent.click(await screen.findByRole('button', { name: 'Assign rental gear' }));
    const form = data().group[8];
    expect(form.checkInGroup).toEqual({ id: 'group-21', name: 'Friday birthday', kind: 'party', date: '2026-11-20' });
    expect(form.size).toBe(2);
    expect(form.complete).toBe(false);
    expect(form.participants.map(person => [person.name, person.groupEntryId, person.ref, person.rentals])).toEqual([
        ['Fox', 'member-entry', 'memberABC123', []], ['Fox Junior', 'guest-entry', 'group:group-21:guest-entry', []],
    ]);
    expect(form.available).toHaveLength(2);
    expect(new Set(form.available.map(item => item.id)).size).toBe(2);
    expect(data().options[0].stock).toBe(2);
    expect(data().group[7]).toEqual(old);
    expect(data().unrelated.active).toBe(true);
    expect(open).toHaveBeenCalledWith(8, 'group-21');
});

test('a form created by another desk prevents a duplicate reservation and opens its existing numeric key', async () => {
    const { data, open } = fixture({ groups: { 0: { name: 'Existing', checkInGroup: { id: 'group-21' } } } });
    fireEvent.click(screen.getByRole('button', { name: 'Import reviewed members' }));
    reserveAndPay();
    fireEvent.click(await screen.findByRole('button', { name: 'Open existing rental form' }));
    expect(open).toHaveBeenCalledWith('0', 'group-21');
    expect(Object.keys(data().group)).toEqual(['0']);
    expect(data().options[0].stock).toBe(0);
});

test('manual rentals remain available and retrying an uncertain save reserves gear once', async () => {
    const { data } = fixture({ canImportGroup: false, loseFirstReceipt: true });
    expect(screen.queryByRole('button', { name: 'Import reviewed members' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Rental Name', { exact: false }), { target: { value: 'Walk-in' } });
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: 3 } });
    reserveAndPay();
    await screen.findByText('Failed to save the rental form. Please try again.');
    fireEvent.click(screen.getByRole('button', { name: /Create Rental \(/ }));
    await screen.findByText('Success!');
    expect(data().options[0].stock).toBe(1);
    expect(Object.keys(data().group)).toEqual(['0']);
    expect(data().group[0]).toMatchObject({ name: 'Walk-in', size: 3, complete: false });
    expect(data().group[0].participants).toBeUndefined();
    expect(data().group[0].checkInGroup).toBeUndefined();
});

test('a stock change between review and save leaves the entire reservation unapplied', async () => {
    const { data } = fixture({ stock: equipment.max });
    fireEvent.click(screen.getByRole('button', { name: 'Import reviewed members' }));
    reserveAndPay();
    expect(await screen.findByText(/no longer enough Mask available/)).toBeVisible();
    expect(data().group).toEqual({});
    expect(data().options[0].stock).toBe(equipment.max);
});

test('staff can exclude a non-renter without losing the other player or changing the group roster', async () => {
    const { data } = fixture();
    fireEvent.click(screen.getByRole('button', { name: 'Import reviewed members' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include renter 1' }));
    expect(screen.getByLabelText('Renter 1 name')).toBeDisabled();
    expect(screen.getByRole('spinbutton')).toHaveValue(1);
    reserveAndPay();
    await screen.findByText('Success!');
    expect(data().group[0].participants).toEqual([expect.objectContaining({ groupEntryId: 'guest-entry', name: 'Fox' })]);
});


const walkOn = { playerId: 'guest:' + 'a'.repeat(64), date: '2026-11-22', displayName: 'Riley West' };

test('prefills the walk-on and preserves edits and stock when check-in reverification needs a retry', async () => {
    const verifyWalkOn = jest.fn().mockRejectedValueOnce(new Error('Check-in lookup is offline.')).mockResolvedValue(walkOn);
    const { data, open } = fixture({ walkOn, verifyWalkOn });
    expect(screen.getByLabelText('Rental Name', { exact: false })).toHaveValue('Riley West');
    expect(screen.getByRole('spinbutton')).toHaveValue(1);
    expect(screen.getByRole('textbox', { name: 'Participant name' })).toHaveValue('Riley West');
    expect(screen.queryByRole('button', { name: 'Import reviewed members' })).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Participant name' }), { target: { value: '  Riley Weston  ' } });
    reserveAndPay();
    expect(await screen.findByText('Check-in lookup is offline.')).toBeVisible();
    expect(runTransaction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Create Rental \(/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Assign rental gear' }));
    expect(verifyWalkOn).toHaveBeenCalledTimes(2);
    expect(data().group[0]).toMatchObject({
        name: 'Riley West', size: 1, walkOnCheckIn: { playerId: walkOn.playerId, date: walkOn.date },
        participants: [{ name: 'Riley Weston', ref: walkOn.playerId, date: walkOn.date, rentals: [] }],
    });
    expect(open).toHaveBeenCalledWith(0, walkOn.playerId);
});

test('two desks creating a rental for one walk-on on the same day reserve gear only once', async () => {
    const verifyWalkOn = jest.fn().mockResolvedValue(walkOn);
    const { data, desk, openDesk, open } = fixture({ walkOn, verifyWalkOn });
    const first = within(desk.container);
    const second = within(openDesk().container);
    reserveAndPay(1, first);
    reserveAndPay(1, second);
    await first.findByText('Success!');
    fireEvent.click(await second.findByRole('button', { name: 'Open existing rental form' }));
    expect(verifyWalkOn).toHaveBeenCalledTimes(2);
    expect(runTransaction).toHaveBeenCalledTimes(2);
    expect(Object.keys(data().group)).toEqual(['0']);
    expect(data().options[0].stock).toBe(1);
    expect(open).toHaveBeenCalledWith('0', walkOn.playerId);
});
