import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { get, runTransaction } from 'firebase/database';
import { requestStaffFieldTool } from '../../constants/fieldStaffApi';
import CreateRentalForm from './CreateRentalForm';
import ReturnForm from './ReturnForm';
import RentalPickupQueue from './RentalPickupQueue';
import RentalActivationMonitor from './RentalActivationMonitor';
import { rentalFieldDay } from './utils/rentalActivation';
import { MemoryRouter } from 'react-router-dom';
import { changeEquipment, gearRows, issueRentalGear } from './utils/rentalGear';

jest.mock('../../Firebase', () => ({ withFirebase: component => component }));
jest.mock('../../constants/fieldStaffApi');
jest.mock('firebase/database', () => ({runTransaction:jest.fn(), get:jest.fn(), child:(_ref,path) => path}));
jest.mock('../StaffCardScanner', () => ({StaffCardScanner:() => null}));
const member = {playerId:'member-example-37', date:rentalFieldDay(), displayName:'Morgan Archer'};
const catalog = {id:'mask',value:'mask',label:'Mask',cost:5,stock:0,max:8};

function rentalDesk() {
    let data = {group:{}, options:[catalog]}, revision = 0;
    const at = ref => ref === 'rentals' ? data : data.group[0];
    const snapshot = ref => ({val:() => at(ref), exists:() => Boolean(at(ref)),
        child:path => ({val:() => path.split('/').reduce((value,key) => value?.[key], at(ref))})});
    // Two concurrent staff initially see the same inventory. RTDB retries the
    // overwritten proposal against the latest committed state.
    runTransaction.mockImplementation(async (ref, update) => {
        expect(['rentals', 'rentals/group/0']).toContain(ref);
        const previousRevision = revision;
        let next = update(at(ref));
        await Promise.resolve();
        if (revision !== previousRevision) next = update(at(ref));
        if (next === undefined) return {committed:false,snapshot:snapshot(ref)};
        data = ref === 'rentals' ? next : {...data,group:{...data.group,0:next}};
        revision++;
        return {committed:true,snapshot:snapshot(ref)};
    });
    const firebase = {rentals:() => 'rentals', rentalGroup:key => 'rentals/group/' + key, auth:{currentUser:{uid:'staff-identifier'}}};
    return {firebase, read:() => data, form:() => ({...data.group[0],key:'0'})};
}

function collectDeposit() {
    const expiry = '11' + String(new Date().getFullYear()+2).slice(-2);
    const values = {'Name On Card':'Fixture renter','Card Number':'4242424242424242','Valid Thru':expiry,'CVC':'123','Billing Zipcode':'96007'};
    for (const [label,value] of Object.entries(values)) {
        fireEvent.change(screen.getByLabelText(label,{exact:false}),{target:{value}});
    }
}

async function createFromCheckIn(desk, waiver) {
    requestStaffFieldTool.mockImplementation(async (_firebase,_uid,path) => {
        if (path !== '/api/rental-waivers') throw Error('Unexpected lookup: ' + path);
        return {proofs:[waiver]};
    });
    const view = render(<CreateRentalForm firebase={desk.firebase} uid="staff-identifier" canImportGroup
        checkedInPlayer={member} verifyCheckedInPlayer={async () => member} rentalOptions={[catalog]} rentalForms={[]} />);
    fireEvent.click(screen.getByRole('checkbox',{name:/Mask/}));
    fireEvent.change(screen.getByLabelText('Receipt / transaction number'),{target:{value:'T-135'}});
    collectDeposit();
    fireEvent.click(screen.getByRole('button',{name:/Create Rental \(/i}));
    await waitFor(() => expect(desk.read().group[0]).toBeDefined());
    view.unmount();
    return desk.form();
}

const confirmedWaiver = () => ({
    status:'signed', ref:'fixture-waiver-37', signedAt:Date.now()-86400000, expiresAt:Date.now()+364*86400000,
});

beforeEach(() => jest.clearAllMocks());

test('a check-in rental becomes active before pickup, and two refs issue, swap and return one unit exactly once', async () => {
    const desk = rentalDesk();
    const form = await createFromCheckIn(desk, confirmedWaiver());
    expect(form.complete).toBe(true);
    expect(form.transaction).toBe('T-135');
    expect(desk.read().options[0].stock).toBe(1);
    const reserved = gearRows(form);
    expect(reserved).toHaveLength(1);
    const unit = reserved[0];
    expect(unit).toMatchObject({name:member.displayName,value:'mask',number:'',checked:false});
    const admission = {...member, checkedInAt:new Date().toISOString()};
    let receipt = null;
    const handoffs = [];
    get.mockResolvedValue({val:() => null});
    requestStaffFieldTool.mockImplementation(async (_firebase,_uid,path,options) => {
        if (path.startsWith('/api/rental-groups?pickup=today')) {
            return {date:member.date,players:receipt ? [] : [admission],admitted:[admission],issued:receipt ? [receipt] : []};
        }
        expect(path).toBe('/api/rental-pickups');
        expect(options.body).toEqual({action:'handOut',playerId:member.playerId,date:member.date,checkedInAt:admission.checkedInAt,
            formKey:'0',createRequestId:form.createRequestId});
        handoffs.push(options.body);
        receipt = {...admission,handedOutAt:new Date().toISOString(),formKey:'0',createRequestId:form.createRequestId};
        return receipt;
    });
    const queue = uid => <MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><RentalPickupQueue firebase={desk.firebase} uid={uid} isAdmin
        rentalForms={[desk.form()]} /></MemoryRouter>;
    const first = render(queue('ref-one')), second = render(queue('ref-two'));
    const refOne = within(first.container), refTwo = within(second.container);
    const issueLabel = 'Confirm gear handed to ' + member.displayName;
    const input = /Mask number, item 1/;
    for (const [ref,number] of [[refOne,'A-017'],[refTwo,'B-028']]) {
        expect(await ref.findByRole('button',{name:issueLabel})).toBeDisabled();
        fireEvent.change(ref.getByLabelText(input),{target:{value:number}});
    }
    fireEvent.click(refOne.getByRole('button',{name:issueLabel}));
    fireEvent.click(refTwo.getByRole('button',{name:issueLabel}));
    await waitFor(() => expect(handoffs).toHaveLength(1));
    const issued = gearRows(desk.form())[0];
    expect(['A-017','B-028']).toContain(issued.number);
    expect(issued.id).toBe(unit.id);
    expect(desk.read().options[0].stock).toBe(1);
    second.unmount();
    first.rerender(queue('ref-one'));
    fireEvent.click(refOne.getByRole('button',{name:/Picked up/}));
    fireEvent.click(await refOne.findByRole('button',{name:'Swap or return gear'}));
    fireEvent.click(refOne.getByRole('button',{name:'Swap'}));
    fireEvent.change(refOne.getByLabelText('Replacement equipment number'),{target:{value:'C-039'}});
    expect(refOne.getByRole('button',{name:'Save swap'})).toBeDisabled();
    fireEvent.change(refOne.getByLabelText(/What is wrong with/),{target:{value:'Strap buckle broken'}});
    fireEvent.click(refOne.getByRole('button',{name:'Save swap'}));
    await waitFor(() => expect(gearRows(desk.form())[0].number).toBe('C-039'));
    const swapped = gearRows(desk.form())[0];
    expect(swapped).toMatchObject({number:'C-039',checked:false,id:unit.id});
    expect(Object.values(desk.read().options[0].repairHolds)).toEqual([expect.objectContaining({number:issued.number})]);
    first.rerender(queue('ref-one'));
    const sameReview = desk.form();
    fireEvent.click(refOne.getByRole('button',{name:'Return'}));
    await act(async () => {
        fireEvent.click(refOne.getByRole('button',{name:'Confirm return'}));
        await expect(changeEquipment(desk.firebase,sameReview,[swapped],'return')).rejects.toThrow();
    });
    await waitFor(() => expect(gearRows(desk.form())[0].checked).toBe(true));
    expect(Object.values(desk.form().gearHistory).filter(event => event.action === 'return')).toHaveLength(1);
    expect(desk.read().options[0].stock).toBe(1);
    first.unmount();

    render(<ReturnForm firebase={desk.firebase} rentalForms={[desk.form()]} initialFormKey="0" />);
    fireEvent.click(screen.getByRole('button',{name:'Complete Form'}));
    await screen.findByLabelText('Email Address');
    fireEvent.click(screen.getByRole('button',{name:'Complete Form'}));
    await waitFor(() => expect(desk.read().group[0]).toBeUndefined());
    const archive = Object.values(desk.read().closedGear);
    expect(archive).toHaveLength(1);
    expect(archive[0]).not.toHaveProperty('cc');
    expect(archive[0].participants[0]).not.toHaveProperty('waiverProof');
    expect(Object.values(archive[0].gearHistory).map(event => event.action).sort()).toEqual(['issue','return','swap']);
    expect(desk.read().options[0].stock).toBe(1);
});

test.each(['missing','expired'])('%s waiver status holds pickup until the current signed waiver is attached', async status => {
    const desk = rentalDesk();
    const form = await createFromCheckIn(desk, {status});
    expect(form.complete).toBe(false);
    await expect(issueRentalGear(desk.firebase,form,'0',{'0':'M-013'})).rejects.toThrow();
    expect(gearRows(desk.form()).some(row => row.number)).toBe(false);
    expect(desk.read().options[0].stock).toBe(1);
    const proof = confirmedWaiver();
    requestStaffFieldTool.mockResolvedValue({proofs:[proof]});
    render(<RentalActivationMonitor forms={[desk.form()]} uid="staff-identifier" firebase={desk.firebase} />);
    await waitFor(() => expect(desk.form().complete).toBe(true),{timeout:3500});
    expect(desk.form().participants[0].waiverProof).toMatchObject(proof);
    expect(gearRows(desk.form())[0]).toMatchObject({number:'', checked:false});
    expect(desk.read().options[0].stock).toBe(1);
});

test('two renters selected from existing waivers keep their own planned equipment at pickup', async () => {
    const desk = rentalDesk();
    const renters = [
        {name:'Avery Bell',ref:'waiver-avery',number:'MASK-101'},
        {name:'Jordan Bell',ref:'waiver-jordan',number:'MASK-102'},
    ];
    requestStaffFieldTool.mockImplementation(async (_firebase,_uid,path,{body}) => {
        expect(path).toBe('/api/rental-waivers');
        if (body.name) {
            return {matches:renters.filter(person => person.name === body.name).map(person => ({...person,signedAt:Date.now()-3600000}))};
        }
        expect(body.renters).toEqual(renters.map(({ref}) => ({kind:'waiver',ref})));
        return {proofs:renters.map(({ref}) => ({...confirmedWaiver(),ref}))};
    });
    render(<CreateRentalForm firebase={desk.firebase} uid="staff-identifier" canImportGroup rentalOptions={[catalog]} rentalForms={[]} />);
    fireEvent.click(screen.getByText('Add a renter from a signed waiver'));
    for (const {name} of renters) {
        fireEvent.change(screen.getByLabelText('Participant name or waiver reference'),{target:{value:name}});
        fireEvent.click(screen.getByRole('button',{name:'Find a signed waiver'}));
        fireEvent.click(await screen.findByRole('button',{name:new RegExp(name)}));
    }
    fireEvent.change(screen.getByLabelText('Rental Name',{exact:false}),{target:{value:'Birthday party fixture'}});
    const mask = screen.getByRole('checkbox',{name:/Mask/});
    fireEvent.click(mask);
    fireEvent.click(mask);
    for (const {name} of renters) {
        fireEvent.change(screen.getByLabelText('Quantity of Mask for ' + name),{target:{value:'1'}});
    }
    fireEvent.change(screen.getByLabelText('Receipt / transaction number'),{target:{value:'GROUP-12'}});
    collectDeposit();
    fireEvent.click(screen.getByRole('button',{name:/Create Rental \(/i}));
    await waitFor(() => expect(desk.form().complete).toBe(true));
    const form = desk.form(), rows = gearRows(form);
    expect(rows.map(row => row.name)).toEqual(renters.map(person => person.name));
    expect(new Set(rows.map(row => row.id)).size).toBe(2);
    await Promise.all(rows.map((row,index) => issueRentalGear(desk.firebase,form,row.personKey,{[row.unitKey]:renters[index].number})));
    expect(gearRows(desk.form()).map(row => [row.name,row.number])).toEqual(renters.map(person => [person.name,person.number]));
    expect(desk.read().options[0].stock).toBe(2);
});

test('a waiver expiring after activation can be renewed before handing over the original reservation', async () => {
    const desk = rentalDesk();
    const initialProof = {...confirmedWaiver(), expiresAt:Date.now()+60000};
    const active = await createFromCheckIn(desk,initialProof);
    expect(active.complete).toBe(true);
    const before = gearRows(active)[0];
    const clock = jest.spyOn(Date,'now').mockReturnValue(initialProof.expiresAt+1000);
    try {
        await expect(issueRentalGear(desk.firebase,active,before.personKey,{[before.unitKey]:'M-03'})).rejects.toThrow();
        const renewal = {...confirmedWaiver(),ref:'waiver-renewal-37'};
        requestStaffFieldTool.mockResolvedValue({proofs:[renewal]});
        render(<RentalActivationMonitor forms={[desk.form()]} uid="staff-identifier" firebase={desk.firebase} />);
        await waitFor(() => expect(desk.form().participants[0].waiverProof.ref).toBe(renewal.ref),{timeout:3500});
        const after = gearRows(desk.form())[0];
        expect(after.id).toBe(before.id);
        await issueRentalGear(desk.firebase,desk.form(),after.personKey,{[after.unitKey]:'M-03'});
        expect(gearRows(desk.form())[0].number).toBe('M-03');
        expect(desk.read().options[0].stock).toBe(1);
    } finally { clock.mockRestore(); }
});
