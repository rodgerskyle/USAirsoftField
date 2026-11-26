import { runTransaction } from 'firebase/database';
import { verifyRentalWaivers } from './rentalWaiverProof';
import { activateReadyRental, activateVerifiedRental, depositErrors, readRentalProofs, rentalDraftProblem, rentalFieldDay, canUpgradeRental } from './rentalActivation';

jest.mock('firebase/database',()=>({runTransaction:jest.fn()}));
jest.mock('./rentalWaiverProof',()=>({verifyRentalWaivers:jest.fn()}));

const now = Date.now();
const proof = ref => ({status:'signed',ref,signedAt:now-60000,expiresAt:now+40*86400000});
const player = (name,ref) => ({name,ref,isDigital:true,requestedItems:[{value:'mask',quantity:1}]});
const base = () => ({key:'A',name:'Birthday',size:2,playDate:rentalFieldDay(),armoryVersion:1,complete:false,transaction:'Paid-100',
    cc:{name:'Fixture',number:'4242 4242 4242 4242',expiry:'12/28',cvc:'123',zipcode:'96007'},
    participants:{2:player('Sandy','one'),9:player('Alex','two')},
    available:[{id:'m-1',value:'mask',label:'Mask',number:'',checked:false},{id:'m-2',value:'mask',label:'Mask',number:'',checked:false}]});

beforeEach(()=>jest.clearAllMocks());

test('one payment and distinct current waivers activate all exact reserved units once before either tag exists',async()=>{
    const form=base();
    verifyRentalWaivers.mockResolvedValue([proof('one'),proof('two')]);
    const review=await readRentalProofs({},'staff',form);
    const active=activateVerifiedRental(form,review,now);
    expect(active.activatedAt).toBe(now);
    expect(active.available).toEqual([]);
    expect(Object.entries(active.participants).map(([key,p])=>[key,p.waiverProof.ref,p.rentals[0].id,p.rentals[0].number]))
        .toEqual([['2','one','m-1',''],['9','two','m-2','']]);
    expect(activateVerifiedRental(active,review,now+1)).toBe(active);
    expect(form.participants[2]).not.toHaveProperty('waiverProof');
    expect(activateVerifiedRental({...form,participants:{...form.participants,9:player('Changed','three')}},review,now).complete).toBe(false);
});

test('missing, duplicate, expired and premature proofs cannot activate a form or alter stock',async()=>{
    for (const bad of [{status:'missing'},{status:'unavailable'},proof('one'),{...proof('two'),expiresAt:now},{...proof('two'),signedAt:now+10000}]) {
        const form=base(); verifyRentalWaivers.mockResolvedValueOnce([proof('one'),bad]);
        const review=await readRentalProofs({},'staff',form);
        expect(activateVerifiedRental(form,review,now)).toBe(form);
    }
    const form=base();
    verifyRentalWaivers.mockResolvedValue([proof('one'),proof('one')]);
    expect(await activateReadyRental({rentalGroup:()=>1},'staff',form)).toMatch(/own signed waiver/);
    expect(runTransaction).not.toHaveBeenCalled();
});

test('prebooked events require proof through the visit; incomplete receipt, card, roster, or allocation stay pending',async()=>{
    const form=base(); form.checkInGroup={id:'g',date:rentalFieldDay(new Date(now+60*86400000))};
    verifyRentalWaivers.mockResolvedValue([proof('one'),proof('two')]);
    expect(await activateReadyRental({rentalGroup:()=>1},'staff',form)).toMatch(/expires before/);
    expect(rentalDraftProblem({...form,size:3})).toMatch(/each participant/);
    expect(rentalDraftProblem({...form,transaction:' '})).toMatch(/receipt/);
    expect(rentalDraftProblem({...form,available:[form.available[0]]})).toMatch(/Not enough/);
    expect(depositErrors({...form.cc,name:' ',cvc:'9'})).toMatchObject({nameError:expect.any(String),cvcError:expect.any(String)});
    expect(runTransaction).not.toHaveBeenCalled();
});

test('new arrivals on an active form can become ready without changing the original handoff or activation time',async()=>{
    const form=base();
    const old={name:'Sandy',ref:'one',armoryIssuedAt:now-4000,waiverProof:proof('one'),rentals:[{id:'m-1',value:'mask',number:'100'}]};
    form.complete=true; form.activatedAt=now-8000; form.participants[2]=old; form.available=form.available.slice(1);
    verifyRentalWaivers.mockResolvedValue([proof('two')]);
    const updated=activateVerifiedRental(form,await readRentalProofs({},'staff',form),now);
    expect(updated.activatedAt).toBe(form.activatedAt);
    expect(updated.participants[2]).toBe(old);
    expect(updated.participants[9].waiverProof.ref).toBe('two');
    const legacy = {...form,armoryVersion:null};
    expect(canUpgradeRental(legacy)).toBe(false);
});

test('only a verified, still-unissued legacy form can opt into armory handoff',async()=>{
    const form={...base(),complete:true,armoryVersion:null};
    let current=form;
    verifyRentalWaivers.mockResolvedValue([proof('one'),proof('two')]);
    runTransaction.mockImplementation(async (_,apply)=>{
        const next=apply(current);
        if (next) current=next;
        return {committed:!!next,snapshot:{val:()=>current}};
    });
    expect(await activateReadyRental({rentalGroup:()=>1},'staff',form,{upgrade:true})).toBe('');
    expect(current.armoryVersion).toBe(1);
    expect(current.participants[9].rentals[0].id).toBe('m-2');
});
