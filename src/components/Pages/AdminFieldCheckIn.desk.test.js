import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminFieldCheckIn from './AdminFieldCheckIn';
import { StaffCardScanner } from './StaffCardScanner';
import { sendDeskReceipt } from './DeskWaiverReceipt';
import { webcrypto, createHash } from 'crypto';
import { TextEncoder } from 'util';

jest.mock('./StaffCardScanner', () => ({ StaffCardScanner: jest.fn(() => null) }));
jest.mock('./MemberWaiverSync', () => () => null);
jest.mock('./StaffGroupLookup', () => () => null);
const day='2026-11-20', stamp=day+'T20:35:00Z';
const board={ date:day,rosterVersion:'initial',players:[],counts:{total:0,camo:0,solid:0} };
const member={playerId:'member-fixture-001',displayName:'Raven',membershipStatus:'active',side:null,waiverStatus:'signed'};
const guest={playerId:'guest:waiting',displayName:'Falcon',membershipStatus:'guest',side:null,waiverStatus:'missing',experienceBand:'unrated'};
const link='https://www.usairsoftfield.com/waiver#desk/'+'a'.repeat(64);
const uuid='6f495c1c-d8c0-4b4d-a944-14dc573856bf';
beforeEach(() => {
  StaffCardScanner.mockReturnValue(null);
  Object.defineProperty(window,'crypto',{configurable:true,value:{randomUUID:()=>uuid,subtle:webcrypto.subtle}});
});
const lastScan = () => StaffCardScanner.mock.calls.at(-1)[0];

test('after side confirmation the camera immediately accepts the next card and reports original time on a rescan',async()=>{
  let saved=null, admissions=0;
  const request=async (path,{body}={})=>{
    if(path.includes('?waiting'))return {waiting:[]};
    if(!body)return board;
    if(body.action==='lookup')return {...board,player:saved||member};
    expect(body).toMatchObject({action:'checkIn',rapid:true,side:'solid',playerId:member.playerId});
    admissions++;
    saved={...member,side:'solid',checkedInAt:stamp};
    return {...board,player:saved,outcome:'checked-in'};
  };
  render(<AdminFieldCheckIn request={request}/>);
  await act(async()=>{lastScan().onScan({playerId:member.playerId});});
  expect(lastScan().paused).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Back to search'}));
  expect(lastScan().paused).toBe(false);
  expect(screen.getByLabelText('Member name, ID or card link')).toHaveFocus();
  expect(admissions).toBe(0);
  await act(async()=>{lastScan().onScan({playerId:member.playerId});});
  fireEvent.click(await screen.findByRole('button',{name:'Check in as Blue / Solid'}));
  await screen.findByText(/Next stop · Barracks for briefing. Ready for the next card/);
  expect(lastScan().paused).toBe(false);
  await act(async()=>{lastScan().onScan({playerId:member.playerId});});
  await screen.findByText(/Raven already checked in · Blue \/ Solid at 12:35 PM/);
  expect(screen.queryByRole('button',{name:/Move to/})).toBeNull();
  expect(admissions).toBe(1);
});

test('a walk-on can leave the desk with a private QR and staff must resume their verified visit and choose a team',async()=>{
  let hold,admissions=0;
  const request=async(path,{body}={})=>{
    if(path.includes('?waiting'))return {waiting:hold?[hold]:[]};
    if(!body)return board;
    if(body.action==='guestPreview')return {...board,player:{...guest,...(body.waiverRef && {waiverRef:body.waiverRef,waiverStatus:'signed'})}};
    if(body.action==='pauseDesk'){
      expect(body).toMatchObject({holdId:uuid,displayName:'Falcon',needsRental:false});
      hold={id:uuid,playerId:null,displayName:'Falcon',experienceBand:'unrated',waiverStatus:'missing',waiverUrl:link};
      return {id:uuid};
    }
    expect(body).toMatchObject({action:'guestCheckIn',holdId:uuid,waiverRef:'canon-proof'});
    admissions++;hold=null;
    return {...board,player:{...guest,side:'camo',waiverStatus:'signed',checkedInAt:stamp},outcome:'checked-in'};
  };
  render(<AdminFieldCheckIn request={request}/>);
  fireEvent.click(screen.getByText('Add a walk-on'));
  fireEvent.change(screen.getByLabelText('Player name or callsign'),{target:{value:'Falcon'}});
  fireEvent.click(screen.getByRole('button',{name:'Continue'}));
  fireEvent.click(await screen.findByRole('button',{name:'Finish later'}));
  expect(await screen.findByRole('img',{name:'Waiver QR code for Falcon'})).toBeTruthy();
  expect(screen.getByRole('link',{name:'Open this player’s waiver'})).toHaveAttribute('href',link);
  hold={...hold,waiverStatus:'signed',waiverRef:'canon-proof'};
  fireEvent.click(screen.getByRole('button',{name:'Refresh waiting list'}));
  fireEvent.click(await screen.findByRole('button',{name:'Finish check-in'}));
  await screen.findByRole('heading',{name:'Falcon'});
  expect(admissions).toBe(0);
  fireEvent.click(screen.getByRole('button',{name:'Check in as Camo'}));
  await waitFor(()=>expect(admissions).toBe(1));
  await screen.findByText('Finish later · 0');
});

test('field waiver receipt gives the private ticket only a canonical signature digest and participant name',async()=>{
  const originalFetch=global.fetch;
  global.TextEncoder=TextEncoder;
  global.fetch=jest.fn().mockResolvedValue({ok:true});
  try {
    const form={name:'Sam   Taylor',additionalFields:{dob:'1990-01-02'},participantSignature:'data:image/png;base64,AA'};
    await sendDeskReceipt('a'.repeat(64),form);
    const [url,options]=global.fetch.mock.calls[0];
    const expected=createHash('sha256').update(JSON.stringify(['sam taylor','1990-01-02',form.participantSignature])).digest('hex');
    expect(url).toBe('https://app.usairsoftfield.com/api/waivers/desk-receipt');
    expect(options).toMatchObject({credentials:'omit',referrerPolicy:'no-referrer',headers:{Authorization:'Desk '+'a'.repeat(64)}});
    expect(JSON.parse(options.body)).toEqual({name:form.name,claim:'signature_'+expected});
  } finally {global.fetch=originalFetch;}
});
