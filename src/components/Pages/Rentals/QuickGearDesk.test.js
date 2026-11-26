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
    expect(screen.getByRole('button', {name:'Save swap'})).toBeDisabled();
    fireEvent.change(screen.getByLabelText('What is wrong with Mask #14?'), {target:{value:'Strap buckle broke'}});
    fireEvent.click(screen.getByRole('button', {name:'Save swap'}));
    expect(await screen.findByText('Mask #14 swapped for #27. Original item held for inspection.')).toBeVisible();
    expect(screen.getByText('2 picked up · 0 awaiting pickup · 0 returned')).toBeVisible();
    fireEvent.click(screen.getByRole('button', {name:'Return all 2 outstanding items'}));
    fireEvent.click(screen.getByRole('button', {name:'Confirm return'}));
    expect(await screen.findByText('0 picked up · 0 awaiting pickup · 2 returned')).toBeVisible();
    expect(desk.group[0].cc).toEqual({last4:'1234'});
    expect(desk.options[0].stock).toBe(1);
    expect(Object.values(desk.options[0].repairHolds)[0]).toMatchObject({number:'14', reason:'Strap buckle broke'});
    fireEvent.click(screen.getByText('Equipment history'));
    expect(screen.getByText(/sent for inspection.*Strap buckle broke/)).toBeVisible();
});

test('a single-renter view only offers swaps and returns for that player’s collected items', () => {
    const unit = (id, issued, checked=false) => ({
        id, value:'mask', label:'Mask', number:id, ...(issued && {issuedAt:1700000000000}), checked,
    });
    const form = {key:'0', complete:true, armoryVersion:1, participants:{
        first:{name:'Avery', rentals:[unit('A1',true),unit('A2',false),unit('A3',true,true)]},
        second:{name:'Toby', rentals:[unit('T4',true)]},
    }, gearHistory:{other:{action:'return',at:1,items:[{name:'Toby',label:'Mask',from:'T4'}]}}};
    render(<QuickGearDesk form={form} firebase={{}} personKey="first" />);
    expect(screen.getByText('1 picked up · 1 awaiting pickup · 1 returned')).toBeVisible();
    expect(screen.getAllByRole('button', {name:'Swap'})).toHaveLength(1);
    expect(screen.getAllByRole('button', {name:'Return'})).toHaveLength(1);
    expect(within(screen.getByText('Awaiting pickup').closest('li')).queryByRole('button')).toBeNull();
    expect(within(screen.getByText('Returned').closest('li')).queryByRole('button')).toBeNull();
    expect(screen.queryByText(/Toby|T4|Equipment history|Return all/)).toBeNull();
});
