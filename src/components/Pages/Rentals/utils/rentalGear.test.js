import { runTransaction } from 'firebase/database';
import { allocateRequestedGear, armoryPeople, changeEquipment, clearRepair, gearRows, heldCount, isArmoryReady, issueRentalGear } from './rentalGear';

jest.mock('firebase/database', () => ({ runTransaction: jest.fn() }));
const firebase = { rentals: () => 'rentals' };
const issued = (id, number) => ({ id, value: 'mask', label: 'Mask', number, checked: false });
let db;
const form = () => ({ ...db.group[0], key: '0' });
beforeEach(() => {
    db = {
        group: {
            0: { createRequestId: 'party-1', name: 'Birthday', participants: {
                a: { ref: 'p1', name: 'Sam', rentals: { mask: issued('a1', '014') } },
                b: { ref: 'p2', name: 'Sam', rentals: [issued('b1', '015')] },
            }, cc: { last4: '0001' } },
            1: { name: 'Private', complete:true, participants: [{ name: 'Sam', rentals: [issued('c1', 'B23')] }] },
        },
        options: { 2: { value: 'mask', stock: 3, max: 6 } },
    };
    runTransaction.mockImplementation(async (path, fn, config) => {
        expect(path).toBe('rentals');
        expect(config.applyLocally).toBe(false);
        expect(fn(null)).toBeNull();
        const next = fn(db);
        db = next;
        return { committed: true, snapshot: { exists: () => true } };
    });
});

test('swaps an issued number, holds the original for inspection and blocks reissue through any open rental', async () => {
    const selected = form();
    const [first] = gearRows(selected);
    await expect(changeEquipment(firebase, selected, [first], 'swap', 'b23', true)).rejects.toThrow('already issued');
    await changeEquipment(firebase, selected, [first], 'swap', '027', true);
    expect(db.group[0].participants.a.rentals.mask.number).toBe('027');
    expect(db.group[0].participants.b.rentals[0].number).toBe('015');
    const option = db.options[2];
    expect(option.stock).toBe(4);
    const [[holdId, hold]] = Object.entries(option.repairHolds);
    expect(hold.number).toBe('014');
    expect(db.group[0].gearHistory[holdId].items[0]).toMatchObject({ from: '014', to: '027' });
    await expect(changeEquipment(firebase, selected, [first], 'return')).rejects.toThrow('changed');
    await expect(changeEquipment(firebase, form(), [gearRows(form())[1]], 'swap', '014')).rejects.toThrow('inspection');
    await clearRepair(firebase, 'mask', holdId);
    expect(db.options[2].stock).toBe(3);
    await expect(clearRepair(firebase, 'mask', holdId)).rejects.toThrow('changed');
    expect(db.group[0].cc).toEqual({last4: '0001'});
});

test('releases only physically returned items and protects reused tag and group counts across partial returns', async () => {
    const displayed = form();
    const [a,b] = gearRows(displayed);
    await changeEquipment(firebase, displayed, [a], 'return');
    expect(db.options[2].stock).toBe(2);
    expect(heldCount(db.group, db.options[2])).toBe(2);
    const snapshot = db;
    await expect(changeEquipment(firebase, displayed, [b,a], 'return')).rejects.toThrow('returned or changed');
    expect(db).toBe(snapshot);
    await changeEquipment(firebase, form(), [b], 'swap', '014', false);
    expect(db.options[2].stock).toBe(2);
    expect(db.group[0].participants.a.rentals.mask).toMatchObject({ number:'014', checked:true, stockReleased:true });
    const other = { ...db.group[1], key:'1' };
    await expect(changeEquipment(firebase, other, gearRows(other), 'assign', '014')).rejects.toThrow('already issued');
    await changeEquipment(firebase, form(), [gearRows(form())[1]], 'return');
    expect(db.options[2].stock).toBe(1);
    expect(db.group[1].participants[0].rentals[0].checked).toBe(false);
    expect(heldCount(db.group, db.options[2])).toBe(1);
});

test('stale reviews cannot swap equipment on a replacement form or overbook a repair hold', async () => {
    const stale = form();
    const rows = gearRows(stale);
    db.options[2].max = 3;
    await expect(changeEquipment(firebase, stale, [rows[0]], 'swap', '020', true)).rejects.toThrow('No spare');
    db.group[0].createRequestId = 'new-form';
    await expect(changeEquipment(firebase, stale, rows, 'return')).rejects.toThrow('changed or closed');
    expect(db.options[2].stock).toBe(3);
});

test('group return preserves archived and unrelated participant records and leaves payment on the open form', async () => {
    const original = db.group[1];
    const reviewed = form();
    const rows = gearRows(reviewed);
    db.group[0].participants.c = { ref:'late', name:'Alex', rentals:[issued('new','207')] };
    db.options[2].stock = 4;
    await changeEquipment(firebase, reviewed, rows, 'return');
    expect(gearRows(form()).filter(row => !row.checked).map(row => row.number)).toEqual(['207']);
    expect(db.options[2].stock).toBe(2);
    expect(db.group[1]).toBe(original);
    expect(db.group[0].cc).toEqual({last4:'0001'});
});

const proof = () => ({status:'signed',ref:'waiver-confirmed',signedAt:Date.now()-60000,expiresAt:Date.now()+86400000});
const visit = {date:'2026-11-28',playerId:'p1',checkedInAt:'2026-11-28T18:00:00Z'};
function active(id='party-1') {
    return {createRequestId:id,armoryVersion:1,complete:true,name:'Weekend',walkOnCheckIn:{date:visit.date,playerId:'p1'},
        participants:{alpha:{ref:'p1',name:'Sam',waiverProof:proof(),rentals:{
            m:{id:id+'-m',value:'mask',label:'Mask'},v:{id:id+'-v',value:'vest',label:'Vest'}
        }}}};
}
function seed() {
    db={group:{0:active()},options:{m:{value:'mask',max:4,stock:1},v:{value:'vest',max:4,stock:1}}};
}
const numbers = {m:'M-012',v:'V-014'};

test('allocates requested units while preserving already-assigned equipment identities and reserved inventory',()=>{
    const mask=issued('mask-id',''),vest={...issued('vest-id',''),value:'vest'};
    const pending=active();
    pending.participants.alpha.requestedItems=[{value:'mask',quantity:1},{value:'vest',quantity:1}];
    pending.participants.alpha.rentals={oldKey:mask};
    pending.available=[vest];
    const allocation=allocateRequestedGear(pending);
    expect(allocation.available).toEqual([]);
    expect(allocation.participants.alpha.rentals.oldKey).toBe(mask);
    expect(Object.values(allocation.participants.alpha.rentals)).toContain(vest);
    expect(pending.available).toEqual([vest]);
    expect(()=>allocateRequestedGear({...pending,available:[]})).toThrow(/Not enough reserved/);
    expect(()=>allocateRequestedGear({participants:[{name:'Sage'}]})).toThrow(/Choose requested gear/);
});

test('person pickup writes every serial, waiver-verified visit, timestamp and one history event atomically',async()=>{
    seed();
    const selected=form();
    expect(isArmoryReady(selected,'alpha')).toBe(true);
    expect(armoryPeople(selected)[0].state).toBe('requested');
    await expect(issueRentalGear(firebase,selected,'alpha',{m:'M-012'})).rejects.toThrow(/every requested/);
    const result=await issueRentalGear(firebase,selected,'alpha',numbers,'issue-original',visit);
    expect(result.issuedAt).toBeGreaterThan(0);
    expect(armoryPeople(form())[0]).toMatchObject({state:'issued',issuedAt:result.issuedAt});
    expect(db.group[0].participants.alpha.armoryAdmission).toEqual(visit);
    expect(gearRows(form()).every(row=>row.physicallyIssued && row.issuedAt===result.issuedAt)).toBe(true);
    expect(db.group[0].gearHistory['issue-original'].items.map(item=>item.to)).toEqual(Object.values(numbers));
    expect(db.options.m.stock).toBe(1);
    const state=db;
    await expect(issueRentalGear(firebase,selected,'alpha',numbers,'issue-original',visit)).resolves.toEqual(result);
    expect(db).toBe(state);
    await expect(issueRentalGear(firebase,selected,'alpha',{...numbers,m:'M-99'},'issue-original',visit)).rejects.toThrow(/different equipment change/);
});

test('rejects duplicate serials and conflicting admission claims across forms with no partial writes',async()=>{
    seed();
    db.group[1]=active('duplicate');
    for(const option of Object.values(db.options))option.stock=2;
    const second={...db.group[1],key:'1'};
    await issueRentalGear(firebase,form(),'alpha',numbers,'first-pickup',visit);
    const after=db;
    await expect(issueRentalGear(firebase,second,'alpha',{m:'M-444',v:'V-444'},'second-pickup',visit)).rejects.toThrow(/already received/);
    expect(db).toBe(after);
    delete db.group[1].walkOnCheckIn;
    db.group[1].participants.alpha.ref='other';
    await expect(issueRentalGear(firebase,{...db.group[1],key:'1'},'alpha',{m:'m-012',v:'V-444'})).rejects.toThrow(/already issued/);
    expect(db.group[1].participants.alpha.rentals.v.number).toBeUndefined();
});

test('expired/changed waiver, stock limit, repair holds or duplicated same-type serials abort the entire handoff',async()=>{
    seed();
    const selected=form();
    db.group[0].participants.alpha.waiverProof={...proof(),expiresAt:Date.now()-1};
    await expect(issueRentalGear(firebase,selected,'alpha',numbers)).rejects.toThrow(/waiver/);
    db.group[0].participants.alpha.waiverProof=proof();
    db.options.m.max=0;
    await expect(issueRentalGear(firebase,selected,'alpha',numbers)).rejects.toThrow(/inventory/);
    db.options.m.max=4;
    db.options.m.repairHolds={h:{number:'m-012'}};
    db.options.m.stock=2;
    await expect(issueRentalGear(firebase,selected,'alpha',numbers)).rejects.toThrow(/inspection/);
    delete db.options.m.repairHolds;
    const person=db.group[0].participants.alpha;
    person.rentals.m2={...person.rentals.m,id:'another'};
    await expect(issueRentalGear(firebase,form(),'alpha',{...numbers,m2:'m-012'})).rejects.toThrow(/entered twice/);
    expect(gearRows(form()).every(row=>!row.number)).toBe(true);
});

test('staged armory numbers cannot be returned as issued; malfunction/return histories and stock survive replay',async()=>{
    seed();
    const selected=form();
    await changeEquipment(firebase,selected,[gearRows(selected)[0]],'assign','M-012');
    expect(gearRows(form())[0].physicallyIssued).toBe(false);
    await expect(changeEquipment(firebase,form(),[gearRows(form())[0]],'return')).rejects.toThrow(/returned or changed/);
    await issueRentalGear(firebase,form(),'alpha',numbers,'handoff',visit);
    const before=form();
    const [mask]=gearRows(before);
    await expect(changeEquipment(firebase,before,[mask],'swap','M-333',true,{})).rejects.toThrow(/malfunction reason/);
    const details={reason:'Cracked shell',operationId:'malfunction'};
    await changeEquipment(firebase,before,[mask],'swap','M-333',true,details);
    await changeEquipment(firebase,before,[mask],'swap','M-333',true,details);
    expect(db.options.m.stock).toBe(2);
    expect(db.options.m.repairHolds.malfunction).toMatchObject({reason:'Cracked shell',number:'M-012'});
    expect(db.group[0].gearHistory.malfunction).toMatchObject({reason:'Cracked shell',items:[{from:'M-012',to:'M-333',id:mask.id}]});
    const beforeReturn=form();
    await changeEquipment(firebase,beforeReturn,[gearRows(beforeReturn)[0]],'return','',false,{operationId:'returnedMask'});
    await changeEquipment(firebase,beforeReturn,[gearRows(beforeReturn)[0]],'return','',false,{operationId:'returnedMask'});
    expect(armoryPeople(form())[0].state).toBe('partial-return');
    expect(db.options.m.stock).toBe(1);
    await changeEquipment(firebase,form(),[gearRows(form())[1]],'return');
    expect(armoryPeople(form())[0].state).toBe('returned');
    expect(gearRows(form()).every(row=>row.checked && row.returnedAt)).toBe(true);
});

test('already-numbered legacy forms can be serviced; handout binds existing numbers to an exact verified admission',async()=>{
    seed();
    delete db.group[0].armoryVersion;
    const person=db.group[0].participants.alpha;
    person.rentals.m.number=numbers.m;
    person.rentals.v.number=numbers.v;
    expect(armoryPeople(form())[0].state).toBe('issued');
    await expect(issueRentalGear(firebase,form(),'alpha',numbers)).rejects.toThrow(/older rental/);
    await expect(issueRentalGear(firebase,form(),'alpha',numbers,'badvisit',{...visit,playerId:'other'})).rejects.toThrow(/does not match/);
    await expect(issueRentalGear(firebase,form(),'alpha',{...numbers,m:'M-421'},'different',visit)).rejects.toThrow(/existing equipment/);
    await expect(issueRentalGear(firebase,form(),'alpha',numbers,'legacy',visit)).resolves.toBeDefined();
});

test('sparse legacy slots match the reviewed owner and unit even when an editor presents compact arrays', async()=>{
    seed();
    const participant=db.group[0].participants.alpha;
    db.group[0].participants={9:{...participant,rentals:{63:participant.rentals.m,82:participant.rentals.v}}};
    const displayed={...form(),participants:[{...participant,rentals:Object.values(participant.rentals)}]};
    await issueRentalGear(firebase,displayed,'0',{'0':numbers.m,'1':numbers.v},'compacted',visit);
    expect(db.group[0].participants[9].rentals[63].number).toBe(numbers.m);
    expect(db.group[0].participants[9].rentals[82].number).toBe(numbers.v);
    expect(Object.keys(db.group[0].participants)).toEqual(['9']);
});

test('a released legacy item cannot release stock again even if its old checked flag is absent',async()=>{
    const item=db.group[0].participants.a.rentals.mask;
    delete item.checked;
    item.stockReleased=true;
    expect(gearRows(form())[0].checked).toBe(true);
    await expect(changeEquipment(firebase,form(),[gearRows(form())[0]],'return')).rejects.toThrow(/returned or changed/);
    expect(db.options[2].stock).toBe(3);
});

test('a server retry rejects a competing assignment without claiming the second serial or modifying its reservation', async()=>{
    seed();
    const original=db;
    const competing={...original,group:{...original.group,b:{
        ...active('b'),participants:[{name:'Other renter',rentals:[{id:'b-mask',value:'mask',number:'M-012',issuedAt:Date.now()}]}]
    }},options:{...original.options,m:{...original.options.m,stock:2}}};
    const selected=form();
    runTransaction.mockImplementation(async (_,update)=>{
        const proposal=update(original);
        expect(proposal.group[0].participants.alpha.rentals.v.number).toBe(numbers.v);
        db=competing;
        update(competing);
        throw new Error('The conflicting handoff should have been rejected.');
    });
    await expect(issueRentalGear(firebase,selected,'alpha',numbers,'parallelDesk',visit)).rejects.toThrow(/already issued/);
    expect(db).toBe(competing);
    expect(db.group[0].participants.alpha.rentals.v.number).toBeUndefined();
    expect(db.armoryHandoffs).toBeUndefined();
});
