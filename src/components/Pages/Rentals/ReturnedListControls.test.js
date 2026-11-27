import React from 'react';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { onValue, update } from 'firebase/database';
import { MemoryRouter } from 'react-router-dom';
import { requestStaffFieldTool } from '../../constants/fieldStaffApi';
import RentalPickupQueue from './RentalPickupQueue';

jest.mock('firebase/database', () => ({child:(_root, path) => path, get:jest.fn(), onValue:jest.fn(), update:jest.fn()}));
jest.mock('../../constants/fieldStaffApi');
const date = '2026-11-26', at = Date.parse(date+'T20:00:00Z');
const firebase = {rentals:()=>'rentals'};
const rental = (key, name, time=at) => ({key,createRequestId:'booking-'+key,name:'Party '+key,complete:true,
    participants:[{name,rentals:[{id:'item-'+key,value:'mask',number:'M'+key,checked:true,issuedAt:at-60000,returnedAt:time,gearOperation:'return-'+key}]}]});
const renderDesk = (uid, forms) => <MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}>
    <RentalPickupQueue firebase={firebase} uid={uid} rentalForms={forms} />
</MemoryRouter>;

function service() {
    const values = new Map();
    const listeners = new Map();
    const denied = new Set();
    requestStaffFieldTool.mockResolvedValue({date,admitted:[],players:[],issued:[]});
    onValue.mockImplementation((path, callback, failed) => {
        if (denied.has(path)) { failed(); return () => {}; }
        if (!listeners.has(path)) listeners.set(path,new Set());
        listeners.get(path).add(callback);
        callback({val:()=>values.get(path)});
        return () => listeners.get(path).delete(callback);
    });
    update.mockImplementation(async (path, fields) => {
        expect(path).toBe('returnListClears');
        const changed = new Set();
        for (const [sub, value] of Object.entries(fields)) {
            const [day,id] = sub.split('/');
            const bucket = path+'/'+day;
            values.set(bucket, {...values.get(bucket),[id]:value});
            changed.add(bucket);
        }
        changed.forEach(key => listeners.get(key)?.forEach(fn => fn({val:()=>values.get(key)})));
    });
    return {values,denied};
}
beforeEach(() => jest.clearAllMocks());

test('staff confirm the observed complete returns across devices and keep late returns and history', async () => {
    service();
    const forms = [rental('first','Alpha'), rental('second','Bravo')];
    const first = render(renderDesk('ref1',forms)), second = render(renderDesk('ref2',forms));
    const one = within(first.container), two = within(second.container);
    for (const desk of [one,two]) fireEvent.click(await desk.findByRole('button',{name:'Returned 2'}));
    fireEvent.click(one.getByRole('button',{name:'Clear returned list'}));
    fireEvent.click(one.getByRole('button',{name:'Cancel'}));
    expect(update).not.toHaveBeenCalled();
    fireEvent.click(one.getByRole('button',{name:'Clear returned list'}));
    const late = [...forms, rental('third','Charlie',at+1000)];
    first.rerender(renderDesk('ref1',late)); second.rerender(renderDesk('ref2',late));
    await act(async()=>{fireEvent.click(one.getByRole('button',{name:'Confirm clear'}));});
    for (const desk of [one,two]) {
        expect(desk.getByRole('button',{name:'Returned 1'})).toBeVisible();
        expect(desk.getByRole('article',{name:'Rental for Charlie'})).toBeVisible();
        expect(desk.queryByRole('article',{name:'Rental for Alpha'})).toBeNull();
    }
    fireEvent.click(two.getByRole('button',{name:'Show cleared returns (2)'}));
    expect(two.getByRole('article',{name:'Rental for Alpha'})).toBeVisible();
    expect(two.getByRole('article',{name:'Rental for Bravo'})).toBeVisible();
    first.unmount(); second.unmount();
    const third = within(render(renderDesk('ref3',late)).container);
    fireEvent.click(await third.findByRole('button',{name:'Returned 1'}));
    expect(third.getByRole('button',{name:'Show cleared returns (2)'})).toBeVisible();
});

test('a filtered clear affects only the matching completed renters and can be retried after a write fails', async () => {
    service();
    const view = within(render(renderDesk('ref',[rental('1','Echo'),rental('2','Foxtrot')])).container);
    fireEvent.click(await view.findByRole('button',{name:'Returned 2'}));
    fireEvent.change(view.getByRole('searchbox'),{target:{value:'Echo'}});
    fireEvent.click(view.getByRole('button',{name:'Clear matching returns'}));
    update.mockRejectedValueOnce(new Error('Unable to save now'));
    await act(async()=>{fireEvent.click(view.getByRole('button',{name:'Confirm clear'}));});
    expect(view.getByRole('alert')).toHaveTextContent('Unable to save now');
    expect(view.getByRole('article',{name:'Rental for Echo'})).toBeVisible();
    await act(async()=>{fireEvent.click(view.getByRole('button',{name:'Confirm clear'}));});
    fireEvent.change(view.getByRole('searchbox'),{target:{value:''}});
    expect(view.getByRole('article',{name:'Rental for Foxtrot'})).toBeVisible();
});

test('a failed undated marker read keeps its error until staff refresh', async () => {
    const db = service();
    db.denied.add('returnListClears/undated');
    const view = within(render(renderDesk('ref',[rental('old','Older',null)])).container);
    fireEvent.click(await view.findByRole('button',{name:'Returned 1'}));
    expect(view.getByRole('alert')).toHaveTextContent('Could not load the shared Returned list');
    expect(view.getByRole('button',{name:'Clear returned list'})).toBeDisabled();
    db.denied.clear();
    fireEvent.click(view.getByRole('button',{name:'Refresh pickups'}));
    await waitFor(()=>expect(view.getByRole('button',{name:'Clear returned list'})).toBeEnabled());
});
