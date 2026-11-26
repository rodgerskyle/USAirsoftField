import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { requestStaffFieldTool } from '../../constants/fieldStaffApi';
import { walkOnAfterLogin } from '../../constants/groupRentalLink';
import RentalPickupQueue from './RentalPickupQueue';

jest.mock('../../constants/fieldStaffApi');

const row = {
    playerId: 'guest:' + 'a'.repeat(64), displayName: 'Riley Bell', date: '2026-11-26',
    checkedInAt: '2026-11-26T16:12:00Z', requestedGear: 'Mask and vest',
};
const form = {
    key: '42', complete: true, walkOnCheckIn: {date: row.date, playerId: row.playerId},
    participants: [{ref: row.playerId, date: row.date, rentals: [{label:'Mask', number:'M2'}, {label:'Vest', number:17}]}],
};
const props = {firebase: {}, uid: 'staff-user', isAdmin: false};
const queue = forms => <MemoryRouter><RentalPickupQueue {...props} rentalForms={forms} /></MemoryRouter>;

beforeEach(() => requestStaffFieldTool.mockReset());

it('confirms a numbered walk-on handoff once and gives the next destination', async () => {
    requestStaffFieldTool.mockResolvedValueOnce({players:[row]})
        .mockResolvedValueOnce({...row, handedOutAt:'2026-11-26T16:18:00Z'}).mockResolvedValue({players:[]});
    render(queue([form]));
    expect(await screen.findByText('Mask and vest')).toBeInTheDocument();
    expect(screen.getByText(/Mask #M2, Vest #17/)).toBeInTheDocument();
    expect(screen.getByRole('link', {name:'Open player rental'})).toHaveAttribute('href',expect.stringContaining('/dashboard/rentalform?view=new&walkOn='));
    const button=screen.getByRole('button', {name:'Confirm gear handed to Riley Bell'});
    fireEvent.click(button);
    fireEvent.click(button);
    await screen.findByText(/Riley Bell has their gear/);
    await screen.findByText('No checked-in players are waiting for gear.');
    const posts=requestStaffFieldTool.mock.calls.filter(([, , , options]) => options.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(posts[0][2]).toBe('/api/rental-pickups');
    expect(posts[0][3].body).toEqual({action:'handOut', date:row.date, playerId:row.playerId, checkedInAt:row.checkedInAt, formKey:form.key});
});

it('opens the arrived party selection and holds confirmation until all gear is numbered', async () => {
    const group={ groupId:'af8d070a-0f91-4d23-810e-379831eef722', groupEntryId:'entry-1', groupName:'Birthday party' };
    requestStaffFieldTool.mockResolvedValue({players:[{...row,...group}]});
    const formWithMissingNumber={...form,checkInGroup:{id:group.groupId,date:row.date},participants:[{
        ...group, rentals:[{label:'Mask',number:'M2'},{label:'Vest',number:''}],
    }]};
    render(queue([formWithMissingNumber]));
    expect(await screen.findByText('Birthday party')).toBeInTheDocument();
    expect(screen.getByRole('link', {name:'Open party rental'})).toHaveAttribute('href',
        '/dashboard/rentalform?view=new&group='+group.groupId+'&pickup=arrived');
    expect(screen.queryByRole('button',{name:/Confirm gear/})).toBeNull();
});

it('resumes only a valid pickup link at sign-in for either rental role', () => {
    expect(walkOnAfterLogin('?view=pickup', true)).toBe('/admin/rentalform?view=pickup');
    expect(walkOnAfterLogin('?view=pickup', false)).toBe('/dashboard/rentalform?view=pickup');
    expect(walkOnAfterLogin('?view=pickup&return=https://other.site', false)).toBeNull();
});

it('records a changed choice for the selected admission before sending the walk-on to pickup', async () => {
    requestStaffFieldTool.mockResolvedValueOnce({players:[]})
        .mockResolvedValueOnce({date:row.date, players:[row]})
        .mockResolvedValueOnce({...row, needsGear:true})
        .mockResolvedValue({players:[row]});
    render(queue([]));
    await screen.findByText('No checked-in players are waiting for gear.');
    fireEvent.click(screen.getByText('Change a checked-in player’s gear choice'));
    fireEvent.change(screen.getByLabelText('Checked-in player name'), {target:{value:'Riley'}});
    fireEvent.click(screen.getByRole('button', {name:'Find checked-in player'}));
    fireEvent.click(await screen.findByRole('button', {name:'Needs rental gear'}));
    await screen.findByText('Riley Bell is on the pickup list.');
    expect(requestStaffFieldTool.mock.calls[2][3].body).toEqual({
        action:'setChoice', date:row.date, playerId:row.playerId, checkedInAt:row.checkedInAt, needsGear:true,
    });
    await screen.findByRole('link', {name:'Open player rental'});
});
