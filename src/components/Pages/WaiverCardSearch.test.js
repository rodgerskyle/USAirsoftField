import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import WaiverCardSearch from './WaiverCardSearch';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';

jest.mock('../constants/fieldStaffApi');
jest.mock('./StaffCardScanner', () => ({
    StaffCardScanner: ({ onScan }) => <button onClick={() => onScan({ playerId: 'Player12345' })}>Scan</button>,
}));

function Lookup() {
    const [name, setName] = useState('Previous Player');
    return <WaiverCardSearch firebase={{}} uid="staff" value={name} onChange={setName} />;
}

it('searches with only the registered name and clears a previous result after a failed scan', async () => {
    requestStaffFieldTool.mockResolvedValueOnce({ name: 'Jordan Rivera', displayName: 'Viper', playerId: 'Player12345' })
        .mockResolvedValueOnce({ displayName: 'Viper', playerId: 'Player12345' });
    render(<Lookup />);
    fireEvent.click(screen.getByText('Scan'));
    await screen.findByDisplayValue('Jordan Rivera');
    expect(requestStaffFieldTool).toHaveBeenCalledWith(expect.anything(), 'staff', '/api/member-card/waiver-name',
        { body: { playerId: 'Player12345' }, method: 'POST', signal: expect.anything() });
    fireEvent.click(screen.getByText('Scan'));
    await screen.findByRole('alert');
    expect(screen.getByRole('searchbox')).toHaveValue('');
});
