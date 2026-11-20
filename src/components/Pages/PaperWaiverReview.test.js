import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { getDownloadURL, getMetadata } from 'firebase/storage';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';
import PaperWaiverReview from './PaperWaiverReview';

jest.mock('firebase/storage', () => ({ getDownloadURL: jest.fn(), getMetadata: jest.fn() }));
jest.mock('../constants/fieldStaffApi');

it('requires the scan to be opened and the signatures confirmed before submitting the recorded details', async () => {
    getDownloadURL.mockResolvedValue('https://example.test/waiver.pdf');
    getMetadata.mockResolvedValue({ generation: '1234' });
    requestStaffFieldTool.mockResolvedValue({ reviewed: true });
    const ref = { name: 'Test.pdf', fullPath: 'waivers/non-members/Test.pdf' };
    render(<PaperWaiverReview firebase={{}} uid="staff" waiver={{ name: 'Alex Rivera', ref }} />);
    fireEvent.click(screen.getByRole('button', {name: 'Review for check-in'}));
    const link = await screen.findByRole('link', {name: 'Open scanned PDF'});
    const confirmation = screen.getByRole('checkbox');
    expect(confirmation).toBeDisabled();
    fireEvent.click(link);
    fireEvent.change(screen.getByLabelText('Participant date of birth'), {target: {value: '2000-01-01'}});
    fireEvent.change(screen.getByLabelText('Date signed on paper'), {target: {value: '2026-11-19'}});
    expect(screen.getByRole('button', {name:'Confirm for check-in'})).toBeDisabled();
    fireEvent.click(confirmation);
    fireEvent.click(screen.getByRole('button', {name:'Confirm for check-in'}));
    await screen.findByRole('button', {name:'Reviewed for check-in'});
    expect(requestStaffFieldTool).toHaveBeenCalledWith({}, 'staff', '/api/waivers/review-paper', {
        method: 'POST', body: {objectName: ref.fullPath, generation:'1234', name:'Alex Rivera', dob:'2000-01-01',
            signedDate:'2026-11-19', confirmed:true},
    });
});
