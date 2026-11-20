import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { runTransaction } from 'firebase/database';
import ReturnForm from './ReturnForm';

jest.mock('../../Firebase', () => ({withFirebase: Component => Component}));
jest.mock('firebase/database', () => ({runTransaction: jest.fn()}));

const option = {id: 'equipment-1', value: 'mask', label: 'Mask', max: 10};
const held = number => ({value: 'mask', id: 'unit-' + number, label: 'Mask'});
const active = {
    name: 'Birthday group', createRequestId: 'attendance-a', size: 2, complete: true,
    available: [held(1)], transaction: 'RCPT-A', cc: {number: '4242 4242 4242 4242'},
    participants: [{name: 'Sam', groupEntryId: 'sam', rentals: [{...held(2), number: 'R2', checked: true}]}],
};
const other = {name: 'Other group', size: 2, complete: false, available: [held('B'), held('C')]};

function setup({preview = active, saved = preview, stock = 4, emailFails = false} = {}) {
    let data = {group: {0: saved, 3: other}, options: {4: {...option, stock}, 9: {value: 'vest', stock: 4}}, untouched: 'kept'};
    const sendReceipt = jest.fn(async () => {
        expect(data.group[0]).toBeUndefined();
        if (emailFails) throw new Error('Mail offline');
    });
    const form = {...preview, key:'0'};
    runTransaction.mockImplementation(async (path, fn, options) => {
        expect(path).toBe('rentals');
        expect(options.applyLocally).toBe(false);
        expect(fn(null)).toBeNull();
        const next = fn(data);
        if (next === undefined) return {committed: false};
        data = next;
        return {committed:true};
    });
    render(<ReturnForm firebase={{rentals: () => 'rentals', sendReceipt: () => sendReceipt}}
        rentalForms={[form]} />);
    return {data: () => data, sendReceipt};
}
async function returnForm(email) {
    fireEvent.click(screen.getByRole('button', {name: /Return rental for /}));
    fireEvent.click(screen.getByRole('button', {name: 'Complete Form'}));
    const field = await screen.findByLabelText('Email Address');
    if (email) fireEvent.change(field, {target: {value: email}});
    fireEvent.click(screen.getByRole('button', {name:'Complete Form'}));
}
beforeEach(() => runTransaction.mockReset());
afterEach(() => jest.restoreAllMocks());

test('return uses the current reservation, preserves other groups and stock, and sends the receipt only after committing', async () => {
    const saved = {...active, available:[held(1), held(3)]};
    const {data, sendReceipt} = setup({saved, stock: 6});
    await returnForm('fixture@example.com');
    expect(await screen.findByText('Rental return completed. Receipt sent.')).toBeVisible();
    expect(data().options[4].stock).toBe(3);
    expect(data().group).toEqual({3:other});
    expect(data().options[9].stock).toBe(4);
    expect(data().untouched).toBe('kept');
    expect(sendReceipt).toHaveBeenCalledWith({name: active.name, receipt: 'RCPT-A', last4:'4242',email:'fixture@example.com'});

    // Stale desk still displays the removed row. A retry cannot release it twice.
    await returnForm();
    expect(await screen.findByText(/already closed/)).toBeVisible();
    expect(data().options[4].stock).toBe(3);
    expect(sendReceipt).toHaveBeenCalledTimes(1);
});

test('a stale reused key protects the new rental and sends no receipt', async () => {
    const replacement = {...active, createRequestId:'replacement'};
    const {data, sendReceipt} = setup({saved:replacement});
    await returnForm('fixture@example.com');
    expect(await screen.findByText(/already closed/)).toBeVisible();
    expect(data().options[4].stock).toBe(4);
    expect(data().group[0]).toEqual(replacement);
    expect(sendReceipt).not.toHaveBeenCalled();
});

test('rechecks outstanding numbered gear against the transaction before closing', async () => {
    const saved = {...active, participants:[{name:'Sam', rentals:[{...held(2), number:'R2', checked:false}]}]};
    const {data} = setup({saved});
    await returnForm();
    expect(await screen.findByText('Check all rental numbers before completing the return.')).toBeVisible();
    expect(data().group[0]).toEqual(saved);
    expect(data().options[4].stock).toBe(4);
});

test('discard releases a legacy aggregated reservation without consuming other open holds', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const preview = {name:'Legacy group', size:3, complete:false, available:[{...option, amount:'3'}]};
    const {data, sendReceipt} = setup({preview, stock:4});
    const button = screen.getByRole('button', {name: /Discard rental reservation/});
    fireEvent.click(button);
    expect(runTransaction).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(await screen.findByText('Rental form discarded.')).toBeVisible();
    expect(data().group).toEqual({3:other});
    expect(data().options[4].stock).toBe(2);
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(sendReceipt).not.toHaveBeenCalled();
});

test('discarding an empty damaged form preserves the full inventory', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const {data} = setup({preview:{}});
    fireEvent.click(screen.getByRole('button', {name:'Discard damaged rental form'}));
    expect(await screen.findByText('Rental form discarded.')).toBeVisible();
    expect(data().group).toEqual({3:other});
    expect(data().options[4].stock).toBe(4);
});

test('receipt failure reports the saved return without another inventory write', async () => {
    const {data, sendReceipt} = setup({emailFails:true});
    await returnForm('fixture@example.com');
    expect(await screen.findByText('Rental return completed. Receipt delivery could not be confirmed.')).toBeVisible();
    expect(sendReceipt).toHaveBeenCalledTimes(1);
    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(data().group).toEqual({3:other});
});
