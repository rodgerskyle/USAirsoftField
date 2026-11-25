import React, { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { runTransaction } from 'firebase/database';
import { QuickGearDesk } from './QuickGearDesk';

jest.mock('firebase/database', () => ({ runTransaction: jest.fn() }));
jest.mock('../StaffCardScanner', () => ({
    StaffCardScanner: ({ onScan, parseEquipmentTag }) => <button type="button" onClick={() => onScan(parseEquipmentTag('27', 'code_128'))}>Fixture camera</button>,
}));

test('staff can swap a broken unit, then return all remaining gear while the party stays open', async () => {
    const firebase = { rentals: () => 'rentals' };
    const rentals = ['14', '15'].map(number => ({ value: 'mask', label: 'Mask', id: number, number, checked: false }));
    let desk = { group: { 0: {name: 'Birthday', createRequestId: 'demo', participants: [{name:'Avery', ref:'one', rentals}], cc:{ last4:'1234' }} },
        options: [{value:'mask', stock:2, max:4}] };
    function Fixture() {
        const [form, setForm] = useState(desk.group[0]);
        runTransaction.mockImplementation(async (ref, fn) => {
            desk = fn(desk);
            setForm(desk.group[0]);
            return { committed:true };
        });
        return <QuickGearDesk form={{ ...form, key:'0' }} firebase={firebase} />;
    }
    render(<Fixture />);
    const unit = screen.getByText(/Mask #14/).closest('li');
    fireEvent.click(within(unit).getByRole('button', {name:'Swap'}));
    fireEvent.click(screen.getByRole('button', {name:'Fixture camera'}));
    expect(screen.getByLabelText('Replacement equipment number')).toHaveValue('27');
    fireEvent.click(screen.getByRole('button', {name:'Save swap'}));
    expect(await screen.findByText('Mask #14 swapped for #27. Original item held for inspection.')).toBeVisible();
    expect(screen.getByText('2 outstanding · 0 returned')).toBeVisible();
    fireEvent.click(screen.getByRole('button', {name:'Return all 2 outstanding items'}));
    fireEvent.click(screen.getByRole('button', {name:'Confirm return'}));
    expect(await screen.findByText('0 outstanding · 2 returned')).toBeVisible();
    expect(desk.group[0].cc).toEqual({last4:'1234'});
    expect(desk.options[0].stock).toBe(1);
});
