import { armoryQueries, armoryQueue, mergeAdmissionPages } from './armoryQueue';

const date='2026-11-26', stamped=Date.parse('2026-11-26T18:00:00Z');
const groupId='af8d070a-0f91-4d23-810e-379831eef722';
const make = (key, extra={}) => ({key,complete:true,armoryVersion:1,name:'Rental '+key,participants:{
    p:{name:'Riley',ref:'member-id-12345',groupId,groupEntryId:'e1',date,
        waiverProof:{status:'signed',ref:'proof',signedAt:Date.now()-500,expiresAt:Date.now()+100000},
        rentals:{u1:{label:'Mask',number:'A2'}}}},...extra});
const admission={date,playerId:'member-id-12345',groupId,groupEntryId:'e1',checkedInAt:'2026-11-26T17:30:00Z'};
const desk={date,players:[],admitted:[],issued:[]};

it('moves a paid party through scheduled, awaiting check-in and pickup by exact arrival identity',()=>{
    const form=make('9',{checkInGroup:{id:groupId,date}});
    expect(armoryQueue([form],{...desk,date:'2026-11-25'}).cards[0].stage).toBe('scheduled');
    expect(armoryQueue([form],desk).cards[0].stage).toBe('arrival');
    expect(armoryQueue([form],{...desk,admitted:[admission]}).cards[0].stage).toBe('waiting');
    const wrong={...admission,groupId:'other',playerId:'collision',displayName:'Riley'};
    expect(armoryQueue([form],{...desk,players:[wrong]}).cards[0].stage).toBe('arrival');
});

it('shows only physically returned items for the field day after closure, using return time across midnight',()=>{
    const receipt=make('9',{receiptId:'closed-9',closedAt:stamped});
    receipt.participants.p.rentals={today:{id:'a',label:'Mask',number:'R5',issuedAt:stamped,returnedAt:stamped+60,checked:true},
        yesterday:{id:'b',label:'Vest',number:'R6',issuedAt:stamped-86400000,returnedAt:stamped-86400000,checked:true},
        planned:{id:'c',label:'Unused reservation',checked:false}};
    const old=make('10',{armoryVersion:undefined,receiptId:'closed-10'});
    old.participants.p.rentals={old:{label:'Older checked item',checked:true,number:'M2'}};
    const {cards}=armoryQueue([],desk,[receipt,old]);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({stage:'returned',archived:true,person:{rows:[{label:'Mask',number:'R5'}]}});
});

it('scopes lookups to known active group or player IDs and merges overlapping pages exactly once',()=>{
    const forms=Array.from({length:45},(_,index)=> make(String(index),{participants:[],playerCheckIn:{playerId:'member-number-'+index,date}}));
    forms.push(make('old',{playerCheckIn:{playerId:'should-not-be-queried',date:'2026-11-24'},participants:[]}));
    const routes=armoryQueries(forms,date);
    expect(routes).toHaveLength(2);
    expect(routes[0].split('&')).toHaveLength(41);
    expect(routes.join(' ')).not.toContain('should-not-be-queried');
    const stored=mergeAdmissionPages([{...desk,players:[admission]},{...desk,players:[admission],admitted:[admission]}]);
    expect(stored.players).toEqual([admission]);
    expect(stored.admitted).toEqual([admission]);
    expect(()=>mergeAdmissionPages([desk,{...desk,date:'2026-11-27'}])).toThrow();
});
