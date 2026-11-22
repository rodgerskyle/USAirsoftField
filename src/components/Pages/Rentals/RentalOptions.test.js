import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { set } from 'firebase/database';
import RentalOptions from './RentalOptions';

jest.mock('../../Firebase', () => ({ withFirebase: Component => Component }));
jest.mock('../../session', () => ({ withAuthorization: () => Component => Component }));
jest.mock('firebase/database', () => ({ set: jest.fn() }));

test('keeps inventory edits local until save and identifies the equipment and result', async () => {
    const options = [{ value: 'mask', label: 'Mask', stock: 3, max: 12 }];
    const firebase = { onAuthUserListener: callback => { callback({ roles: { ADMIN: true } }); return () => {}; }, rentalOptions: () => 'inventory' };
    set.mockResolvedValueOnce();
    render(<RentalOptions firebase={firebase} rentalOptions={options} />);
    const capacity = screen.getByRole('spinbutton', { name: 'Maximum for Mask' });
    fireEvent.change(capacity, { target: { value: '14' } });
    expect(options[0].max).toBe(12);
    expect(set).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /reset/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('status')).toHaveTextContent('updated');
    expect(set).toHaveBeenCalledWith('inventory', [{ value: 'mask', label: 'Mask', stock: 3, max: 14 }]);

    set.mockRejectedValueOnce(new Error('Offline'));
    fireEvent.change(capacity, { target: { value: '16' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed');
    expect(screen.queryByRole('status')).toBeNull();
});
