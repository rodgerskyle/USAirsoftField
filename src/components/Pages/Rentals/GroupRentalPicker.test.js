import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import GroupRentalPicker from './GroupRentalPicker';
import { mergeRentalRoster } from './utils/groupRentalRoster';
import { requestStaffFieldTool } from '../../constants/fieldStaffApi';

jest.mock('../../constants/fieldStaffApi');

const firebase = {};
const team = { id: 'team', name: 'Rebels', kind: 'visit', date: '2026-11-20', memberCount: 1 };
const party = { id: 'party', name: 'Rebels', kind: 'party', date: '2026-11-21', memberCount: 2, entries: [
    { id: 'guest', displayName: 'Gray Wolf' }, { id: 'member', displayName: 'Raven', playerId: 'member-id' },
] };
const props = { firebase, uid: 'staff-user' };

beforeEach(() => requestStaffFieldTool.mockReset());

it('searches by invite code, distinguishes same-name events, and adds just the reviewed selection without submitting its host form', async () => {
    const add = jest.fn();
    const submit = jest.fn(event => event.preventDefault());
    requestStaffFieldTool.mockResolvedValueOnce({ groups: [team, party], page: 1, totalPages: 1 }).mockResolvedValueOnce({ group: party });
    render(<form onSubmit={submit}><label>Rental draft<input defaultValue="Private detail" /></label>
        <GroupRentalPicker {...props} onAdd={add} /></form>);
    const query = screen.getByLabelText('Group name or invite code');
    fireEvent.change(query, { target: { value: 'rebels-2' } });
    fireEvent.keyDown(query, { key: 'Enter' });
    const match = await screen.findByRole('button', { name: /Rebels Birthday \/ private event.*2026-11-21/ });
    expect(screen.getByRole('button', { name: /Rebels Check-in group.*2026-11-20/ })).toBeTruthy();
    fireEvent.click(match);
    const member = await screen.findByLabelText('Raven');
    expect(member).toBeChecked();
    expect(screen.getByLabelText('Gray Wolf')).toBeChecked();
    fireEvent.click(member);
    fireEvent.click(screen.getByRole('button', { name: 'Add selected players (1)' }));
    await screen.findByText('1 player added to the rental form.');
    expect(add).toHaveBeenCalledWith(party, [party.entries[0]]);
    expect(screen.getByRole('button', { name: 'Add selected players (0)' })).toBeDisabled();
    expect(screen.getByDisplayValue('Private detail')).toBeTruthy();
    expect(submit).not.toHaveBeenCalled();
    expect(requestStaffFieldTool.mock.calls.map(([, , url, options]) => [url, Object.keys(options)])).toEqual([
        ['/api/rental-groups?page=1&q=rebels-2', ['signal']], ['/api/rental-groups?id=party', ['signal']],
    ]);
});

it('opens a linked roster, excludes players already on the form, and can refresh to add a late arrival', async () => {
    const add = jest.fn();
    const later = {id:'later',displayName:'Night Owl'};
    const original = mergeRentalRoster([], party, party.entries);
    function ExistingRental() {
        const [participants, setParticipants] = useState(original);
        return <GroupRentalPicker {...props} initialGroupId="other" linkedGroupId={party.id} existingEntries={participants}
            onAdd={(group, entries) => {add(entries);setParticipants(prev => mergeRentalRoster(prev, group, entries));}} />;
    }
    requestStaffFieldTool.mockResolvedValueOnce({group: party})
        .mockResolvedValueOnce({group: {...party,entries:[...party.entries,later]}});
    render(<ExistingRental />);
    await screen.findByText('All players are already on this form.');
    expect(screen.queryByRole('button', {name:'Find groups'})).toBeNull();
    expect(screen.getByLabelText(/Raven Already on form/)).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name:'Refresh roster' }));
    expect(await screen.findByLabelText('Night Owl')).toBeChecked();
    fireEvent.click(screen.getByRole('button', {name:'Add selected players (1)'}));
    await screen.findByText('All players are already on this form.');
    expect(add).toHaveBeenCalledWith([later]);
    expect(requestStaffFieldTool.mock.calls.every(([, , url]) => url.endsWith('?id=party'))).toBe(true);
});

it('supports empty groups, request errors and a retry on a deep-linked roster', async () => {
    const add = jest.fn();
    requestStaffFieldTool.mockRejectedValueOnce(new Error('Sign in again.'))
        .mockResolvedValueOnce({group:{...party,entries:[]}});
    render(<GroupRentalPicker {...props} initialGroupId={party.id} onAdd={add} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in again.');
    fireEvent.click(screen.getByRole('button', {name:'Retry linked roster'}));
    expect(await screen.findByText('This group has no players yet.')).toBeTruthy();
    expect(add).not.toHaveBeenCalled();
});

it('keeps the roster available when importing fails, and prevents double submission', async () => {
    let fail;
    const add = jest.fn(() => new Promise((resolve, reject) => {fail = reject;}));
    requestStaffFieldTool.mockResolvedValueOnce({group:party});
    render(<GroupRentalPicker {...props} initialGroupId={party.id} onAdd={add} />);
    const button = await screen.findByRole('button', {name:'Add selected players (2)'});
    fireEvent.click(button);
    fireEvent.click(button);
    expect(add).toHaveBeenCalledTimes(1);
    fail(new Error('Rental form changed.'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Rental form changed.'));
    expect(within(screen.getByRole('group', {name:'Players to add'})).getByLabelText('Raven')).toBeChecked();
    expect(screen.getByRole('button', {name:'Add selected players (2)'})).toBeEnabled();
});

it('keeps the original search and visit date while paging through group results', async () => {
    requestStaffFieldTool.mockResolvedValueOnce({groups:[team], page:1, totalPages:2})
        .mockResolvedValueOnce({groups:[party], page:2, totalPages:2});
    render(<GroupRentalPicker {...props} onAdd={jest.fn()} />);
    fireEvent.change(screen.getByLabelText('Group name or invite code'), {target:{value:'Rebels'}});
    fireEvent.change(screen.getByLabelText(/Visit date/), {target:{value:'2026-11-21'}});
    fireEvent.click(screen.getByRole('button', {name:'Find groups'}));
    fireEvent.click(await screen.findByRole('button', {name:'More groups'}));
    expect(await screen.findByText('Page 2 of 2')).toBeTruthy();
    expect(requestStaffFieldTool.mock.calls[1][2]).toBe('/api/rental-groups?page=2&q=Rebels&date=2026-11-21');
    expect(screen.getByRole('button', {name:'More groups'})).toBeDisabled();
});

it('prefills the draft on a direct group link without submitting a rental or requesting a second search', async () => {
    const prefill = jest.fn();
    const add = jest.fn();
    requestStaffFieldTool.mockResolvedValueOnce({ group: party });
    render(<GroupRentalPicker {...props} initialGroupId={party.id} onPrefill={prefill} onAdd={add} />);
    await waitFor(() => expect(prefill).toHaveBeenCalledWith(party, party.entries));
    expect(requestStaffFieldTool).toHaveBeenCalledTimes(1);
    expect(add).not.toHaveBeenCalled();
});

it('uses party rental requests to select renters while keeping other guests available', async () => {
    const group = { ...party, entries: party.entries.map((entry, i) => ({ ...entry, rentalIntent: i ? 'bringing' : 'requested' })) };
    const add = jest.fn();
    requestStaffFieldTool.mockResolvedValue({ group });
    render(<GroupRentalPicker {...props} linkedGroupId={group.id} onAdd={add} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Select players who requested rentals' }));
    expect(screen.getByLabelText(/Bringing own gear/)).not.toBeChecked();
    expect(screen.getByLabelText(/Rental requested/)).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Add selected players (1)' }));
    await waitFor(() => expect(add).toHaveBeenCalledWith(group, [group.entries[0]]));
});
