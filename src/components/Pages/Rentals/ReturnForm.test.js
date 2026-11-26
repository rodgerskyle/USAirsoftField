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
    const release = screen.queryByRole('checkbox', {name:/Release unissued reservations/});
    if (release) {
        expect(screen.getByRole('button', {name:'Complete Form'})).toBeDisabled();
        fireEvent.click(release);
    }
    fireEvent.click(screen.getByRole('button', {name:'Complete Form'}));
}
beforeEach(() => runTransaction.mockReset());
afterEach(() => jest.restoreAllMocks());

test('return uses the current reservation, preserves other groups and stock, and sends the receipt only after committing', async () => {
    const saved = {...active, available:[held(1), held(3)]};
    const {data, sendReceipt} = setup({preview:saved, saved, stock: 6});
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


test('keeps the form and all stock when unissued reservations change after staff review', async () => {
    const saved = {...active, available:[held(1), held(3)]};
    const {data,sendReceipt} = setup({saved, stock:6});
    await returnForm('fixture@example.com');
    expect(await screen.findByText(/unissued reservations changed/)).toBeVisible();
    expect(data().group[0]).toEqual(saved);
    expect(data().options[4].stock).toBe(6);
    expect(data().closedGear).toBeUndefined();
    expect(sendReceipt).not.toHaveBeenCalled();
});

test('closes a mixed rental once, preserves a dated equipment receipt and excludes waiver and card data', async () => {
    const at = Date.parse('2026-11-20T09:01:00Z');
    const returned = Date.parse('2026-11-22T09:10:00Z');
    const paidVisit = {playerId:'member-one', date:'2026-11-20', checkedInAt:'2026-11-20T09:00:00.000Z'};
    const history = {broken:{action:'swap',needsRepair:true,reason:'Broken buckle',at,items:[{name:'Sam',value:'mask',label:'Mask',from:'Q1',to:'Q2'}]}};
    const preview = {...active, armoryVersion:1, gearHistory:{broken:{...history.broken,signature:'private-waiver'}},
        checkInGroup:{id:'group',date:'2026-11-20',private:'omit'}, walkOnCheckIn:paidVisit, available:[],
        participants:{p:{name:'Sam',ref:'member-one',isMember:true,date:'2024-09-16T17:45:00Z',armoryIssuedAt:at,armoryAdmission:{...paidVisit,secret:'omit'},
            waiverProof:{ref:'private-waiver'}, contact:'private phone', groupId:'group',groupEntryId:'entry',
            rentals:{one:{...held(2),number:'Q2',checked:true,stockReleased:true,issuedAt:at,returnedAt:returned},
                two:{...held(3),number:'Q3',checked:false}}},paper:{name:'Guest',date:'2023-05-17',isDigital:true,ref:'private-waiver'}}};
    const {data}=setup({preview,stock:3});
    await returnForm();
    expect(await screen.findByText('Rental return completed.')).toBeVisible();
    expect(data().options[4].stock).toBe(2);
    const receipt=data().closedGear[preview.createRequestId];
    expect(receipt).toMatchObject({formKey:'0',createRequestId:preview.createRequestId,armoryVersion:1,
        checkInGroup:{id:'group',date:'2026-11-20'},walkOnCheckIn:{playerId:'member-one',date:'2026-11-20'},
        gearHistory:history,participants:{p:{name:'Sam',ref:'member-one',armoryAdmission:paidVisit,armoryIssuedAt:at,
            rentals:{one:{number:'Q2',issuedAt:at,returnedAt:returned},two:{number:'Q3',checked:false}}}}});
    expect(JSON.stringify(receipt)).not.toMatch(/RCPT-A|4242|private|omit|waiverProof/);
    expect(data().closedGearByDay).toEqual({'2026-11-20':{[preview.createRequestId]:'0'},'2026-11-22':{[preview.createRequestId]:'0'}});
});

test('a damaged legacy form with issued equipment opens for return and cannot be discarded', () => {
    setup({preview:{name:'Historical visit',participants:[{name:'Sam',rentals:[{value:'mask',number:'7'}]}]}});
    expect(screen.queryByRole('button',{name:/discard/i})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Return rental for Historical visit'}));
    expect(screen.getByText('1 picked up · 0 awaiting pickup · 0 returned')).toBeVisible();
    fireEvent.click(screen.getByRole('button',{name:'Complete Form'}));
    expect(screen.getByText('Return the equipment still with players before closing this form.')).toBeVisible();
});


test('indexes actual legacy returns by Pacific return day without dating historical checkmarks', async () => {
    const preview={name:'Old rental', complete:true, transaction:'receipt', size:2, participants:{a:{
        name:'Avery', rentals:[
            {value:'mask', number:'M12', checked:true, returnedAt:Date.parse('2025-04-16T01:00:00Z'), stockReleased:true},
            {value:'mask', number:'M13', checked:true},
        ],
    }}};
    const {data}=setup({preview,stock:3});
    await returnForm();
    expect(await screen.findByText('Rental return completed.')).toBeVisible();
    const [[id,record]]=Object.entries(data().closedGear);
    expect(record).toMatchObject({receiptId:id,formKey:'0'});
    expect(record.createRequestId).toBeUndefined();
    expect(data().closedGearByDay).toEqual({'2025-04-15':{[id]:'0'}});
});
