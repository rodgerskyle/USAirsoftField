import { runTransaction } from 'firebase/database';
import { readRentalCatalogBackup, restoreRentalCatalogBackup } from './rentalCatalogBackup';

jest.mock('firebase/database', () => ({ runTransaction: jest.fn() }));

const firebase = { rentals: () => 'rentals' };
const read = data => readRentalCatalogBackup(new File([JSON.stringify(data)], 'rentals.json', { type: 'application/json' }));
const mask = { id: 'r2', value: 'Mask', label: 'Full Face Mask', cost: '29.99', stock: '3', max: '10', amount: '', number: '', checked: false,
    repairHolds: { first: { number: 'M2', at: 999, reason: 'Broken strap' } } };
const vest = { value: 8, label: 'Vest', cost: 85, stock: 2 };
const catalog = { oldMask: mask, oldVest: vest };

beforeEach(() => runTransaction.mockReset());

test.each([['options only',catalog],['rental subtree',{options:catalog,group:{private:'omitted'}}],
    ['database root',{rentals:{options:catalog,closedGear:{private:'omitted'}},players:{private:'omitted'}}]])(
    'previews just equipment fields from %s and retains the original keys, values and repair holds', async (_, doc) => {
        const prepared = await read(doc);
        expect(prepared).toEqual({ options: catalog, count: 2, labels: ['Full Face Mask','Vest'], repairHoldCount: 1 });
        expect(runTransaction).not.toHaveBeenCalled();
    }
);

test('preserves sparse array indices, including a catalog whose only type is literally named options', async () => {
    const sparse = [null, mask, null, vest];
    expect((await read(sparse)).options).toEqual(sparse);
    expect((await read({options:mask})).options).toEqual({options:mask});
});

test('accepts a BOM-prefixed JSON file and explains the fallback for gzip files on older iPads', async () => {
    const file = { name:'backup.json', text:() => Promise.resolve('\uFEFF' + JSON.stringify(catalog)) };
    expect((await readRentalCatalogBackup(file)).count).toBe(2);
    await expect(readRentalCatalogBackup({name:'backup.json.gzip'})).rejects.toThrow(/unzip/i);
    await expect(readRentalCatalogBackup({name:'backup.json',text:async () => '{'})).rejects.toThrow(/valid JSON/);
});

test.each([
    [{}, 'no rental equipment'],
    [{rentals:{group:{}}}, 'does not contain'],
    [{rentals:{group:{}},options:catalog}, 'does not contain'],
    [{x:{...mask,cc:{private:'unrelated'}}}, 'unsupported'],
    [{x:{...mask,repairHolds:{a:{number:'M4',private:'unrelated'}}}}, 'repair hold'],
    [[{...mask,value:'__proto__'}], 'unsupported'],
    [[{...mask,max:-1}], 'unsupported'],
    [[{...mask,stock:false}], 'unsupported'],
    [[{...mask,value:8},vest], 'duplicate'],
    [[mask,{...vest,id:'r2'}], 'repeated equipment IDs'],
    [JSON.parse('{"__proto__":{"value":"mask","max":10}}'), 'unsupported'],
    [{ 'bad.key': mask }, 'unsupported'],
])('refuses an unreadable or ambiguous catalog before any write (%#)', async (doc, message) => {
    await expect(read(doc)).rejects.toThrow(message);
    expect(runTransaction).not.toHaveBeenCalled();
});

test('compares a cold cache on the server and uses the higher of recorded stock and all current reservations including repairs', async () => {
    const prepared = await read([null, mask, vest]);
    const desk = { group: { a: { available: [{ value:'Mask', id:'r2', amount:'4' }],
        participants:[{ rentals:[{value:8, stockReleased:true}] }] } }, closedGear:{old:{private:'current'}},
        returnListClears:{today:{a:true}}, newSibling:{preserved:true} };
    let committed;
    runTransaction.mockImplementationOnce(async (ref, change, flags) => {
        expect(ref).toBe('rentals');
        expect(flags).toEqual({applyLocally:false});
        expect(change(null)).toEqual({options:[null,mask,vest]});
        committed = change(desk);
        return {committed:true};
    });
    expect(await restoreRentalCatalogBackup(firebase, prepared)).toBe(2);
    expect(committed).toEqual({...desk, options:[null,{...mask,stock:5},vest]});
    expect(prepared.options[1]).toEqual(mask);
});

test.each([[{some:{garbled:true}}],[[null,mask]],['invalid']])(
    'an existing catalog or unexpected nonempty data aborts restoration on a concurrent retry', async options => {
        runTransaction.mockImplementationOnce(async (_,change) => { change(null); expect(change({options})).toBeUndefined(); return {committed:false}; });
        await expect(restoreRentalCatalogBackup(firebase, await read(catalog))).rejects.toThrow(/already data/i);
    }
);

test('an active type missing from an older backup aborts the restore while retaining all siblings', async () => {
    const current={group:{a:{available:[{value:'New type',label:'New type'}]}}};
    runTransaction.mockImplementationOnce(async (_,change) => ({committed:change(current) !== undefined}));
    await expect(restoreRentalCatalogBackup(firebase,await read(catalog))).rejects.toThrow(/New type/);
    expect(current.options).toBeUndefined();
});

test('reports an uncommitted write and never restores from an invalidated preview', async () => {
    const prepared = await read(catalog);
    runTransaction.mockResolvedValueOnce({committed:false});
    await expect(restoreRentalCatalogBackup(firebase,prepared)).rejects.toThrow(/changed/);
    prepared.options.oldMask.transaction = {private:'no'};
    await expect(restoreRentalCatalogBackup(firebase,prepared)).rejects.toThrow(/unsupported/);
    expect(runTransaction).toHaveBeenCalledTimes(1);
});
