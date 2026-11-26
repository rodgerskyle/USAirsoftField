import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
