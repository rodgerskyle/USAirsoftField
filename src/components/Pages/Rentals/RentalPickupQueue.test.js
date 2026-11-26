import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { requestStaffFieldTool } from '../../constants/fieldStaffApi';
import { walkOnAfterLogin } from '../../constants/groupRentalLink';
import { issueRentalGear } from './utils/rentalGear';
import RentalPickupQueue from './RentalPickupQueue';

jest.mock('../../constants/fieldStaffApi');
jest.mock('./utils/rentalGear', () => ({...jest.requireActual('./utils/rentalGear'),issueRentalGear:jest.fn()}));
jest.mock('./QuickGearDesk',()=>({QuickGearDesk:({form,personKey})=><p>Service {form.participants[personKey].name}</p>}));

const date = '2026-11-26';
const row = {playerId:'guest:'+'a'.repeat(64),displayName:'Riley Bell',date,checkedInAt:'2026-11-26T16:12:00Z',requestedGear:'Mask and vest'};
const proof = {status:'signed',ref:'waiver-record',signedAt:Date.now()-60000,expiresAt:Date.now()+86400000};
const person = {ref:row.playerId,name:row.displayName,date,waiverProof:proof,rentals:[{id:'mask',value:'mask',label:'Mask',number:''},{id:'vest',value:'vest',label:'Vest',number:''}]};
const form = {key:'42',name:'Bell rental',createRequestId:'test-request-42',armoryVersion:1,complete:true,walkOnCheckIn:{date,playerId:row.playerId},participants:[person]};
const props = {firebase:{},uid:'staff-member',isAdmin:false};
const queue = forms => <MemoryRouter><RentalPickupQueue {...props} rentalForms={forms}/></MemoryRouter>;

function fieldDesk({players=[],admitted=[],issued=[]}={}) {
    const desk = {date,players,admitted,issued};
    requestStaffFieldTool.mockImplementation(async (firebase,uid,path,options) => {
        if (path.startsWith('/api/rental-groups?')) return {...desk};
        const body=options.body;
        if (path.startsWith('/api/rental-pickups?')) return {date,players:[row]};
        if (body.action === 'setChoice') return {...body};
        if (body.action !== 'handOut') throw new Error('Unexpected API request.');
        const receipt={...body,handedOutAt:new Date().toISOString()};
        desk.players = desk.players.filter(player=>player.playerId!==body.playerId);
        desk.issued = [...desk.issued,receipt];
        return receipt;
    });
    return desk;
}
beforeEach(()=>{requestStaffFieldTool.mockReset();issueRentalGear.mockReset().mockResolvedValue({});});

it('assigns every number at pickup, binds the signed admission, and sends one receipt for that rental', async()=>{
    fieldDesk({players:[row]}); render(queue([form]));
    expect(await screen.findByText('Mask and vest')).toBeVisible();
    expect(screen.getByRole('link',{name:'Open player rental'})).toHaveAttribute('href',expect.stringContaining('/dashboard/rentalform?view=edit&walkOn='));
    const submit=screen.getByRole('button',{name:'Confirm gear handed to Riley Bell'});
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox',{name:'Mask number, item 1 for Riley Bell'}),{target:{value:'M2'}});
    fireEvent.change(screen.getByRole('textbox',{name:'Vest number, item 2 for Riley Bell'}),{target:{value:'V17'}});
    fireEvent.click(submit);fireEvent.click(submit);
    await screen.findByText(/Riley Bell has their gear/);
    expect(issueRentalGear).toHaveBeenCalledTimes(1);
    expect(issueRentalGear).toHaveBeenCalledWith(props.firebase,form,'0',{'0':'M2','1':'V17'},expect.any(String),expect.objectContaining({playerId:row.playerId,checkedInAt:row.checkedInAt}));
    const writes=requestStaffFieldTool.mock.calls.filter(([, , , opts])=>opts.method==='POST');
    expect(writes.map(([, , ,opts])=>opts.body)).toEqual([{action:'handOut',playerId:row.playerId,date,checkedInAt:row.checkedInAt,formKey:form.key,createRequestId:form.createRequestId}]);
});

it('shows an active verified standalone rental automatically and keeps waivers and arriving parties separate', async()=>{
    fieldDesk();
    const groupId='af8d070a-0f91-4d23-810e-379831eef722';
    const standalone={...form,walkOnCheckIn:undefined,participants:[{...person,name:'Solo renter'}]};
    const party={...standalone,key:'43',checkInGroup:{id:groupId,date},participants:[{...person,name:'Absent guest',groupId,groupEntryId:'entry'}]};
    const expired={...standalone,key:'44',participants:[{...person,name:'Expired waiver',waiverProof:{...proof,expiresAt:Date.now()-1}}]};
    render(queue([standalone,party,expired,{...standalone,key:'45',complete:false}]));
    expect(await screen.findByRole('button',{name:'Confirm gear handed to Solo renter'})).toBeDisabled();
    await waitFor(()=>expect(requestStaffFieldTool).toHaveBeenCalled());
    expect(screen.queryByText('Absent guest')).toBeNull();
    expect(screen.queryByRole('button',{name:'Confirm gear handed to Expired waiver'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:/Waiver review 1/}));
    expect(screen.getByRole('link',{name:'Verify waiver on rental form'})).toHaveAttribute('href','/dashboard/rentalform?view=edit&form=44&instance=test-request-42');
});

it('keeps collected gear available for per-player service and retries a failed check-in sync without issuing again', async()=>{
    fieldDesk({players:[row]});
    const picked={...person,armoryIssuedAt:Date.now(),armoryAdmission:{date,playerId:row.playerId,checkedInAt:row.checkedInAt},rentals:person.rentals.map((unit,i)=>({...unit,number:'R'+i,issuedAt:Date.now(),checked:i===0}))};
    render(queue([{...form,participants:[picked]}]));
    const stage=await screen.findByRole('button',{name:'Picked up 1'});
    fireEvent.click(stage);
    const card=screen.getByRole('article',{name:'Rental for Riley Bell'});
    expect(within(card).getByText('Partially returned')).toBeVisible();
    fireEvent.click(within(card).getByRole('button',{name:'Swap or return gear'}));
    expect(within(card).getByText('Service Riley Bell')).toBeVisible();
    fireEvent.click(await within(card).findByRole('button',{name:'Update check-in'}));
    await screen.findByText(/Riley Bell has their gear/);
    expect(issueRentalGear).not.toHaveBeenCalled();
});

it('holds an unadmitted or changed visit at the armory even if the party was reviewed moments earlier', async()=>{
    const desk=fieldDesk({players:[row]}); render(queue([{...form,participants:[{...person,rentals:[{...person.rentals[0],number:'M2'}]}]}]));
    const submit=await screen.findByRole('button',{name:'Confirm gear handed to Riley Bell'});
    desk.players=[];desk.admitted=[];
    fireEvent.click(submit);
    await waitFor(()=>expect(requestStaffFieldTool.mock.calls.filter(([, ,path])=>path.startsWith('/api/rental-groups'))).toHaveLength(3));
    expect(issueRentalGear).not.toHaveBeenCalled();
    expect(requestStaffFieldTool.mock.calls.filter(([, , ,options])=>options.method==='POST')).toHaveLength(0);
});

it('resumes only a valid pickup link at sign-in',()=>{
    expect(walkOnAfterLogin('?view=pickup',true)).toBe('/admin/rentalform?view=pickup');
    expect(walkOnAfterLogin('?view=pickup',false)).toBe('/dashboard/rentalform?view=pickup');
    expect(walkOnAfterLogin('?view=pickup&return=https://other.site',false)).toBeNull();
    expect(walkOnAfterLogin('?view=edit&form=0&instance=paid-form-123',false)).toBe('/dashboard/rentalform?view=edit&form=0&instance=paid-form-123');
    expect(walkOnAfterLogin('?view=edit&form=0&instance=one&instance=two',true)).toBeNull();
    expect(walkOnAfterLogin('?view=edit&form=0&group=wrong',true)).toBeNull();
});
