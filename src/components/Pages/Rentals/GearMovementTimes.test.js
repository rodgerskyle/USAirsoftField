import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ArmoryPlayer } from './ArmoryPlayer';
import { QuickGearDesk } from './QuickGearDesk';
import { GearMovementTimes, GearTime } from './GearMovementTimes';

jest.mock('../StaffCardScanner', () => ({StaffCardScanner: () => null}));

const first = Date.parse('2026-11-01T08:15:00Z');
const swap = Date.parse('2026-11-01T09:15:00Z');
const last = Date.parse('2026-11-02T07:55:00Z');

test('a closed player card displays each actual serial’s issue and return in field time, including a DST transition', () => {
    const row = { unitKey: 'one', label: 'Mask', number: 'M22', checked: true, physicallyIssued: true,
        pickedUpAt: swap, returnedAt: last, previousNumbers: [{number: 'M11', pickedUpAt: first, returnedAt: swap}] };
    render(<MemoryRouter><ArmoryPlayer card={{ form: {}, person: {rows: [row]}, archived: true,
        name: 'Renter', group: 'Birthday', stage: 'returned' }} /></MemoryRouter>);
    const card = within(screen.getByRole('article', {name:'Rental for Renter'}));
    const line = card.getByText('#M22').closest('li');
    const current = line.querySelector('.gear-movement-dates');
    expect(within(current).getByText(/Nov 1, 2026.*1:15 AM PST/)).toHaveAttribute('datetime', new Date(swap).toISOString());
    expect(within(current).getByText(/Nov 1, 2026.*11:55 PM PST/)).toHaveAttribute('datetime', new Date(last).toISOString());
    fireEvent.click(card.getByText('Replaced gear (1)'));
    const old = within(card.getByText('#M11').parentElement);
    expect(old.getByText(/Nov 1, 2026.*1:15 AM PDT/)).toHaveAttribute('datetime', new Date(first).toISOString());
    expect(old.getByText(/Nov 1, 2026.*1:15 AM PST/)).toHaveAttribute('datetime', new Date(swap).toISOString());
});

test('unissued reservations have no dates, and legacy missing timestamps are explicit', () => {
    const {container,rerender} = render(<GearMovementTimes row={{number:'12'}} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<GearMovementTimes row={{number:'12',physicallyIssued:true}} />);
    expect(screen.getByText('Time not recorded')).toBeVisible();
    expect(screen.queryByText('Return time')).toBeNull();
    rerender(<GearMovementTimes row={{number:'12',checked:true}} />);
    expect(screen.getAllByText('Time not recorded')).toHaveLength(2);
    expect(container.querySelector('time')).toBeNull();
    rerender(<GearTime value={Number.MAX_SAFE_INTEGER} />);
    expect(container).toHaveTextContent('Time not recorded');
});


test('scanning a replaced number shows its return and the replacement pickup without offering to return the current item', () => {
    const form = {key:'k',armoryVersion:1,complete:true,participants:{p:{name:'Lee',rentals:{slot:{
        id:'mask-id',value:'mask',label:'Mask',number:'N112',issuedAt:first,
    }}}},gearHistory:{
        i:{action:'issue',at:first,items:[{id:'mask-id',value:'mask',personKey:'p',unitKey:'slot',from:'',to:'N11'}]},
        s:{action:'swap',at:swap,items:[{id:'mask-id',value:'mask',personKey:'p',unitKey:'slot',from:'N11',to:'N112'}]},
    }};
    render(<QuickGearDesk form={form} firebase={{}} personKey="p" />);
    const search = screen.getByRole('textbox',{name:'Find a renter or equipment number'});
    fireEvent.change(search,{target:{value:'N11'}});
    const old = screen.getByText('#N11');
    expect(old.closest('details')).toHaveAttribute('open');
    expect(old).toBeVisible();
    expect(within(old.parentElement).getByText(/1:15 AM PST/)).toHaveAttribute('datetime',new Date(swap).toISOString());
    expect(screen.queryByRole('button',{name:'Return'})).toBeNull();
    fireEvent.change(search,{target:{value:'N112'}});
    expect(screen.getByRole('button',{name:'Return'})).toBeVisible();
});
