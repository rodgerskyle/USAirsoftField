import { runTransaction } from 'firebase/database';
import { changeEquipment, clearRepair, gearRows, heldCount } from './rentalGear';

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
