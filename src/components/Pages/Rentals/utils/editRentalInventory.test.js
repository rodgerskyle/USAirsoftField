import { runTransaction } from 'firebase/database';
import { editRentalInventory } from './editRentalInventory';
import { rentalIdentity } from './openRental';

jest.mock('firebase/database', () => ({runTransaction: jest.fn()}));
const rentalsRef = { key: 'rentals' };
const mask = { value:'mask', id:'mask-1', number:'M-4', checked:true };
const vest = { value:'vest', id:'vest-1' };
const participant = { name:'Rebel', rentals:[{ id:'issued-mask', value:'mask', number:'M-1' }] };
const base = {
    group:{ active:{ name:'Party', createRequestId:'request', participants:[participant], available:[mask,vest] } },
    options:{ m:{value:'mask',label:'Mask',max:5,stock:3}, v:{value:'vest',label:'Vest',max:3,stock:1} },
};
const review = { key:'active', identity:rentalIdentity(base.group.active), available:[mask,vest] };
const snapshot = value => ({exists: () => value !== null});
beforeEach(() => runTransaction.mockReset());

it('reserves additional units and releases a removed type in the same write, retaining assigned gear and all unrelated records', async () => {
    let saved;
    const desk = {...base, group: {...base.group, other:{name:'Other rental'}}, other:{preserved:true}};
    runTransaction.mockImplementation(async (ref, update, options) => {
        expect(ref).toBe(rentalsRef);
        expect(options).toEqual({applyLocally:false});
        saved = update(desk);
        return {committed:true,snapshot:snapshot(saved)};
    });
    await editRentalInventory(rentalsRef,review,{mask:2});
    expect(saved.group.active.available[0]).toBe(mask);
    expect(saved.group.active.available).toHaveLength(2);
    expect(saved.group.active.available[1]).toMatchObject({value:'mask',id:expect.any(String)});
    expect(saved.group.active.participants).toBe(desk.group.active.participants);
    expect(saved.group.other).toBe(desk.group.other);
    expect(saved.other).toBe(desk.other);
    expect(saved.options.m.stock).toBe(4);
    expect(saved.options.v.stock).toBe(0);
    expect(base.options.m.stock).toBe(3);
    expect(base.group.active.available[1]).toBe(vest);
});

it('uses the newest stock on a Firebase retry and keeps new item IDs stable', async () => {
    runTransaction.mockImplementation(async (_, update) => {
        expect(update(null)).toBeNull();
        const first = update(base);
        const concurrent = {...base,options:{...base.options,m:{...base.options.m,stock:4}}};
        const next = update(concurrent);
        expect(next.options.m.stock).toBe(5);
        expect(next.group.active.available).toEqual(first.group.active.available);
        return {committed:true,snapshot:snapshot(next)};
    });
    await editRentalInventory(rentalsRef,review,{mask:2,vest:1});
});

it('rejects a concurrent reservation beyond capacity without releasing any other stock', async () => {
    runTransaction.mockImplementation(async (_, update) => {
        expect(update(base).options.v.stock).toBe(0);
        return update({...base,options:{...base.options,m:{...base.options.m,stock:5}}});
    });
    await expect(editRentalInventory(rentalsRef,review,{mask:2})).rejects.toThrow(/not enough available stock/i);
    expect(base.options.v.stock).toBe(1);
});

it.each([
    ['removed type', {...base.group.active, available:[mask]}],
    ['same counts but newly issued item', {...base.group.active, available:[{...mask,id:'other'},vest]}],
    ['same key reused', {...base.group.active, createRequestId:'replacement'}],
    ['returned form', {...base.group.active, returned:true}],
])('rejects a stale inventory review for %s', async (_, changed) => {
    runTransaction.mockImplementation(async (ref, update) => {
        expect(update({...base, group:{active:changed}})).toBeUndefined();
        return {committed:false,snapshot:snapshot(base)};
    });
    await expect(editRentalInventory(rentalsRef,review,{mask:3})).rejects.toThrow(/reopen edit inventory/i);
});

it('keeps legacy bulk reservation quantities and other forms held stock consistent during an inventory edit', async () => {
    const item={value:'mask',id:'catalog-mask',amount:3};
    const form={name:'Older party',available:[item]};
    let desk={group:{old:form,other:{available:[{value:'mask',id:'catalog-mask',amount:2}]}},
        options:{mask:{value:'mask',id:'catalog-mask',max:5,stock:2}}};
    runTransaction.mockImplementation(async (_, update) => {
        desk=update(desk);
        return {committed:true,snapshot:snapshot(desk)};
    });
    await expect(editRentalInventory(rentalsRef,{key:'old',identity:rentalIdentity(form),available:[item]},{mask:4})).rejects.toThrow(/stock/i);
    await editRentalInventory(rentalsRef,{key:'old',identity:rentalIdentity(form),available:[item]},{mask:1});
    expect(desk.group.old.available).toEqual([{...item,amount:1}]);
    expect(desk.group.other.available[0].amount).toBe(2);
    expect(desk.options.mask.stock).toBe(3);
});
