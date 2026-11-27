import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { runTransaction } from 'firebase/database';
import RentalOptions from './RentalOptions';

jest.mock('../../Firebase', () => ({ withFirebase: Component => Component }));
jest.mock('../../session', () => ({ withAuthorization: () => Component => Component }));
jest.mock('firebase/database', () => ({ runTransaction: jest.fn() }));

test('keeps inventory edits local until save and identifies the equipment and result', async () => {
    const options = [{ value: 'mask', label: 'Mask', stock: 3, max: 12 }];
    const firebase = { onAuthUserListener: callback => { callback({ roles: { ADMIN: true } }); return () => {}; }, rentalOptions: () => 'inventory' };
    let saved;
    runTransaction.mockImplementationOnce(async (path, fn) => {
        saved = fn([{ ...options[0], stock: 4, repairHolds: { tag: { number: '14' } } }]);
        return { committed: true, snapshot: { exists: () => true } };
    });
    render(<RentalOptions firebase={firebase} rentalOptions={options} />);
    const capacity = screen.getByRole('spinbutton', { name: 'Maximum for Mask' });
    fireEvent.change(capacity, { target: { value: '14' } });
    expect(options[0].max).toBe(12);
    expect(runTransaction).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /reset/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('status')).toHaveTextContent('updated');
    expect(saved).toEqual([{ ...options[0], stock: 4, max: 14, repairHolds: { tag: { number: '14' } } }]);

    runTransaction.mockRejectedValueOnce(new Error('Offline'));
    fireEvent.change(capacity, { target: { value: '16' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed');
    expect(screen.queryByRole('status')).toBeNull();
});

test('an inspection hold shows the malfunction and the number to pull', () => {
    const options = [{ value:'mask', label:'Mask', stock:1, max:12, repairHolds:{inspection:{number:'M-14',reason:'Missing buckle'}}}];
    const firebase = { onAuthUserListener: callback => { callback({roles:{ADMIN:true}}); return () => {}; } };
    render(<RentalOptions firebase={firebase} rentalOptions={options} />);
    expect(screen.getByRole('region', {name:'Items awaiting inspection'})).toHaveTextContent('Mask #M-14 · Missing buckle');
});

test('shows numeric availability for legacy strings and allows configuring one missing limit at a time', async () => {
    const options = {
        mask: { value: 'mask', label: 'Mask', stock: '2', max: '12' },
        vest: { value: 'vest', label: 'Vest', stock: '1' },
        sling: { value: 'sling', label: 'Sling' },
    };
    const firebase = { onAuthUserListener: callback => { callback({ roles: { ADMIN: true } }); return () => {}; }, rentalOptions: () => 'inventory' };
    let saved;
    runTransaction.mockImplementationOnce(async (path, change) => {
        saved = change(options);
        return { committed: true, snapshot: { exists: () => true } };
    });
    render(<RentalOptions firebase={firebase} rentalOptions={options} />);
    expect(within(screen.getByRole('row', { name: /Mask/ })).getByRole('cell', { name: '10' })).toBeVisible();
    expect(screen.getByRole('row', { name: /Vest/ })).toHaveTextContent('Set maximum');
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Maximum for Vest' }), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('status')).toHaveTextContent('updated');
    expect(saved).toEqual({ ...options, vest: { ...options.vest, max: 3 } });
});

test('the superuser recount recovers stranded stock while preserving reservations and repairs even with an unconfigured category', async () => {
    const options = {
        mask: { id: 'catalog-mask', value: 'mask', label: 'Mask', stock: '12', max: '12', repairHolds: { h: { number: 'B4' } } },
        vest: { value: 'vest', label: 'Vest', stock: 0 },
    };
    const unit = { value: 'mask' };
    const desk = { options, group: {
        open: { available: [{ ...unit, id: 'catalog-mask', amount: '2' }], participants: [{ rentals: [unit, { ...unit, stockReleased: true }] }] },
        closed: { returned: true, available: [unit] },
    } };
    const firebase = { onAuthUserListener: callback => { callback({ roles: { ADMIN: true, SUPER: true } }); return () => {}; }, rentals: () => 'rentals' };
    let saved;
    runTransaction.mockImplementationOnce(async (path, recount) => {
        expect(path).toBe('rentals');
        saved = recount(desk);
        return { committed: true, snapshot: { exists: () => true } };
    });
    render(<RentalOptions firebase={firebase} rentalOptions={options} />);
    fireEvent.click(screen.getByRole('button', { name: 'Recount reserved equipment' }));
    expect(await screen.findByRole('status')).toHaveTextContent('recounted');
    expect(saved).toEqual({ ...desk, options: { ...options, mask: { ...options.mask, stock: 4 } } });
});
