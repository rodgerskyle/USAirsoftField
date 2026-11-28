import { runTransaction } from 'firebase/database';
import { assertEmptyRentalCatalog, openRentalStock, rentalCatalogHistory, restoreRentalCatalog } from './restoreRentalCatalog';

jest.mock('firebase/database', () => ({ runTransaction: jest.fn() }));

const firebase = { rentals: () => 'rentals' };
const mask = { id: 'original-mask', value: 'mask', label: 'Face Mask', cost: '35.50', max: '12' };
let server;

beforeEach(() => {
    server = null;
    runTransaction.mockReset().mockImplementation(async (ref, transform) => {
        const next = transform(server);
        if (next !== undefined) server = next;
        return { committed: next !== undefined };
    });
});

test('initializes a genuinely new desk with confirmed replacement value and quantity including zero', async () => {
    await restoreRentalCatalog(firebase, [mask, { value: 'vest', label: 'Vest', cost: 0, max: 0 }]);
    expect(server.options).toEqual([{ ...mask, cost: 35.5, max: 12, stock: 0 },
        { id: 'vest', value: 'vest', label: 'Vest', cost: 0, max: 0, stock: 0 }]);
    expect(runTransaction).toHaveBeenCalledWith('rentals', expect.any(Function), { applyLocally: false });
    const saved = server;
    await expect(restoreRentalCatalog(firebase, [mask])).rejects.toThrow(/already data/);
    expect(server).toBe(saved);
});

test.each([false, 0, '', 'damaged', { broken: false }, [null]])('leaves a malformed nonempty catalog intact (%p)', value => {
    expect(() => assertEmptyRentalCatalog({ options: value })).toThrow(/already data/);
});

test('a concurrent restore discovered after a cold cache aborts rather than replacing a winner’s stock', async () => {
    const winner = { options: { mask: { ...mask, stock: 3 } }, other: { stable: true } };
    runTransaction.mockImplementationOnce(async (ref, update) => {
        expect(update(null).options[0].stock).toBe(0);
        expect(update(winner)).toBeUndefined();
        return { committed: false };
    });
    await expect(restoreRentalCatalog(firebase, [mask])).rejects.toThrow(/already data/);
    expect(winner.options.mask.stock).toBe(3);
});

test('retries against latest reservations, preserving typed IDs, all other data, and legacy aggregate quantities', async () => {
    const open = {
        available: { a: { value: 'mask', id: mask.id, amount: 3, label: 'Old mask name' } },
        participants: { '4': { name: 'not catalog data', rentals: { b: { value: 'mask', checked: true }, c: { value: 'mask', stockReleased: true } } } },
    };
    const latest = {
        group: { old: open, current: { createRequestId: 'newer', available: [{ value: 'mask', id: 'unique-id', amount: 8 }] },
            gone: { returned: true, available: [{ value: 'missing-now' }] } },
        closedGear: { first: { keep: true } }, returnListClears: { marker: { keep: true } }
    };
    runTransaction.mockImplementationOnce(async (_, transform) => {
        expect(transform(null).options[0].stock).toBe(0);
        server = transform(latest);
        return { committed: true };
    });
    await restoreRentalCatalog(firebase, [mask]);
    expect(server).toEqual({ ...latest, options: [{ ...mask, cost: 35.5, max: 12, stock: 5 }] });
    expect(server.group).toBe(latest.group);
});

test('open equipment cannot be dropped or silently mapped from a numeric to a text equipment type', async () => {
    server = { group: { active: { participants: [{ rentals: [{ value: 7, label: 'Legacy mask' }] }] } } };
    const original = server;
    for (const value of ['7','mask']) {
        await expect(restoreRentalCatalog(firebase, [{ ...mask, value }])).rejects.toThrow(/Include the original equipment type for Legacy mask/);
        expect(server).toBe(original);
    }
    await expect(restoreRentalCatalog(firebase, [{ ...mask, value: 7, max: 0 }])).rejects.toThrow(/1 reserved/);
    expect(server).toBe(original);
    await restoreRentalCatalog(firebase, [{ ...mask, value: 7 }]);
    expect(server.options[0]).toMatchObject({ value: 7, stock: 1 });
});

test('metadata suggestions expose only catalog fields and keep historic prices blank when they conflict', async () => {
    server = { group: { old: { name: 'private visit', cc: { private: 'only on the original rental' },
        available: [{ id: 'legacy-mask', value: 'mask', label: 'Mask', amount: 3, max: 100, cost: 10, cc: 'private' }],
        participants: [{ name: 'private name', rentals: [{ id: 'unit', value: 'mask', cost: 20, private: 'value' }] }]
    } } };
    const history = rentalCatalogHistory(server.group);
    expect(history).toEqual([{ value: 'mask', label: 'Mask', id: 'legacy-mask', stock: 4, required: true }]);
    await restoreRentalCatalog(firebase, [{ ...history[0], cost: 25, max: 6 }]);
    expect(server.options).toEqual([{ value: 'mask', label: 'Mask', id: 'legacy-mask', cost: 25, max: 6, stock: 4 }]);
});

test('competing legacy aggregate IDs need a known catalog ID to prevent undercounting', async () => {
    const group = { active: { available: [{ value: 'mask', id: 'a', amount: 2 }, { value: 'mask', id: 'b', amount: 3 }] } };
    server = { group };
    const [suggestion] = rentalCatalogHistory(group);
    expect(suggestion.ambiguousId).toBe(true);
    await expect(restoreRentalCatalog(firebase, [{...suggestion, cost: 5, max: 6}])).rejects.toThrow(/original catalog ID/);
    expect(server).toEqual({ group });
    const [identified] = rentalCatalogHistory(group, [{ value: 'mask', id: 'b' }]);
    expect(identified).toMatchObject({ id: 'b', stock: 4 });
    await restoreRentalCatalog(firebase, [{ ...identified, cost: 5, max: 6 }]);
    expect(server.options[0].stock).toBe(4);
});

test('a supplied ID that matches none of the legacy quantity rows cannot silently reduce the reservation', async () => {
    const group = { open: { available: [{ value: 'mask', id: 'historic-mask', amount: 5 }] } };
    server = { group };
    await expect(restoreRentalCatalog(firebase, [mask])).rejects.toThrow(/original catalog ID/);
    expect(server).toEqual({ group });
    await restoreRentalCatalog(firebase, [{ ...mask, id: 'historic-mask' }]);
    expect(server.options[0].stock).toBe(5);
});

test('rejects invalid costs, quantities and ambiguous equipment names used as keys', async () => {
    for (const change of [{ cost: '' }, { cost: '1.238' }, { cost: -2 }, { max: '' }, { max: 1.2 }, { value: '__proto__' }]) {
        await expect(restoreRentalCatalog(firebase, [{ ...mask, ...change }])).rejects.toThrow();
    }
    await expect(restoreRentalCatalog(firebase, [{...mask, value: '8'}, {...mask, id: 'other', value: 8}])).rejects.toThrow(/unique catalog value/);
    expect(server).toBeNull();
});

test('saved repair holds count as in-use alongside open rentals', () => {
    const group = { form: { available: [{ value: 'mask' }] } };
    expect(openRentalStock(group, [{ ...mask, repairHolds: { hold: { number: 'M-9' } } }]).get('mask')).toBe(2);
});
