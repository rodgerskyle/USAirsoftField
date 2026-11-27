import { runTransaction, update } from 'firebase/database';
import { clearReviewedReturns, matchesArmorySearch, returnMarkers } from './returnedBoard';
import { armoryQueue } from './armoryQueue';

jest.mock('firebase/database', () => ({child:(_root, path) => path, runTransaction:jest.fn(), update:jest.fn()}));
const day = '2026-11-26';
const now = Date.parse('2026-11-27T07:45:00Z'); // 11:45 pm Pacific.
const desk = {date:day,players:[],admitted:[],issued:[]};
const form = {key:'0',createRequestId:'demo-booking',name:'Field party',complete:true,participants:[
    {name:'Ref test',rentals:[{value:'mask',id:'issued-unit-1',number:'032',checked:true,issuedAt:now-5000,returnedAt:now,gearOperation:'return-1'}]},
]};
const card = (source=form) => armoryQueue([source],desk).cards[0];
const firebase = {rentals:() => 'rentals'};

it('binds clear to the physical return across closure and reordering, and keeps new returns and other forms visible', async () => {
    const confirmed = card();
    const keys = returnMarkers(confirmed, day);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^2026-11-26\/[0-9a-f-]{36}$/);
    const rearranged = {...form,participants:[null,form.participants[0]]};
    const archived = {...rearranged,receiptId:form.createRequestId,closedAt:now+1000};
    expect(returnMarkers(armoryQueue([],desk,[archived]).cards[0],day)).toEqual(keys);
    const replacement = {...confirmed,person:{...confirmed.person,rows:confirmed.person.rows.map(row => ({...row,returnedAt:now+1}))}};
    expect(returnMarkers(replacement,day)).not.toEqual(keys);
    expect(returnMarkers(card({...form,createRequestId:'next-booking'}),day)).not.toEqual(keys);
    expect(returnMarkers({...confirmed,syncRequired:true},day)).toEqual([]);
    expect(returnMarkers({...confirmed,conflict:true},day)).toEqual([]);
    await clearReviewedReturns(firebase,[confirmed],day);
    expect(update).toHaveBeenCalledWith('returnListClears',{[keys[0]]:true});
    expect(runTransaction).not.toHaveBeenCalled();
    const tomorrow = {...desk,date:'2026-11-27'};
    expect(armoryQueue([form],tomorrow).cards).toEqual([]);
    const partial = {...form,participants:[{...form.participants[0],rentals:[...form.participants[0].rentals,
        {number:'090',value:'vest',issuedAt:now-5000}]}]};
    expect(armoryQueue([partial],tomorrow).cards[0].stage).toBe('out');
    expect(matchesArmorySearch({...confirmed,person:{...confirmed.person,rows:[{number:'R5',previousNumbers:[{number:'OLD-X'}]}]}},'old-x')).toBe(true);
});

it('gives an open legacy rental its own permanent identity before dismissing undated gear', async () => {
    const legacy = {...form,createRequestId:undefined,participants:[{name:'Legacy',rentals:[{number:'R09',checked:true}]}]};
    let current = legacy;
    runTransaction.mockImplementation(async (ref,apply) => {
        expect(ref).toBe('group/0');
        current = apply(current);
        return {committed:Boolean(current),snapshot:{val:()=>current}};
    });
    await clearReviewedReturns(firebase,[card(legacy)],day);
    expect({...current,returnListId:undefined}).toEqual({...legacy,returnListId:undefined});
    const keys=returnMarkers(card(current),day);
    expect(keys[0]).toMatch(/^undated\//);
    expect(update).toHaveBeenLastCalledWith('returnListClears',{[keys[0]]:true});
    expect(returnMarkers(card({...legacy,returnListId:'different-id'}),day)).not.toEqual(keys);
});

it('aborts a legacy clear if the gear has changed before its missing rental ID can be assigned', async () => {
    const source = {...form,createRequestId:undefined};
    runTransaction.mockImplementation(async (_ref,apply) => ({
        committed:Boolean(apply({...source,participants:[]})),snapshot:{val:()=>null},
    }));
    update.mockClear();
    await expect(clearReviewedReturns(firebase,[card(source)],day)).rejects.toThrow('rental changed');
    expect(update).not.toHaveBeenCalled();
});
