import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { getDownloadURL, getMetadata } from 'firebase/storage';
import { onValue } from 'firebase/database';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';
import { loadWaiverSearchIndex } from '../utils/waiverArchiveSearch';
import { AuthUserContext } from '../session';
import WaiverLookup from './waiverlookup';

jest.mock('firebase/storage', () => ({ getDownloadURL: jest.fn(), getMetadata: jest.fn() }));
jest.mock('firebase/database', () => ({
    onValue: jest.fn(), query: jest.fn(), orderByChild: jest.fn(), startAt: jest.fn(), limitToLast: jest.fn(),
}));
jest.mock('../Firebase', () => ({ withFirebase: Component => Component }));
jest.mock('../session', () => ({
    AuthUserContext: jest.requireActual('react').createContext(null), withAuthorization: () => Component => Component,
}));
jest.mock('../utils/waiverArchiveSearch');
jest.mock('../constants/fieldStaffApi');
jest.mock('./StaffCardScanner', () => ({ StaffCardScanner: () => null }));
jest.mock('@react-pdf/renderer', () => ({ pdf: jest.fn() }));

it('opens a retained PDF by the old account ID and never offers a check-in link for it', async () => {
    const user = { uid:'admin-one', roles: { ADMIN:true } };
    const firebase = { auth: { currentUser:user }, membersWaivers: jest.fn(file => ({ fullPath:'waivers/members/' + file })),
        bannedNames: () => 'bans', digitalWaivers: () => 'digital' };
    const createdAt = Date.now() - 1000;
    const member = { memberId:'OldMember123', name:'Sample Rider', generation:'132', createdAt };
    onValue.mockReturnValue(() => {});
    requestStaffFieldTool.mockResolvedValue({ matches:[member] });
    loadWaiverSearchIndex.mockResolvedValue([]);
    getDownloadURL.mockResolvedValue('https://example.test/original.pdf');
    getMetadata.mockResolvedValue({generation:'132',timeCreated:new Date(createdAt).toISOString()});
    const location = {replace:jest.fn()};
    const tab = {location,close:jest.fn()};
    const open = jest.spyOn(window,'open').mockImplementation(() => tab);
    try {
        render(<MemoryRouter future={{ v7_startTransition:true,v7_relativeSplatPath:true }}><HelmetProvider>
            <AuthUserContext.Provider value={user}><WaiverLookup firebase={firebase} /></AuthUserContext.Provider>
        </HelmetProvider></MemoryRouter>);
        fireEvent.change(screen.getByRole('searchbox'),{target:{value:'Rider'}});
        await screen.findByText('Retained member waiver');
        expect(screen.queryByText('Review for check-in')).toBeNull();
        expect(screen.queryByText('Waiver reference')).toBeNull();
        expect(firebase.membersWaivers).toHaveBeenCalledWith('OldMember123.pdf');
        fireEvent.click(screen.getByRole('button',{name:'Open'}));
        await waitFor(() => expect(location.replace).toHaveBeenCalledWith('https://example.test/original.pdf'));
        getMetadata.mockResolvedValue({generation:'133',timeCreated:new Date(createdAt).toISOString()});
        fireEvent.click(screen.getByRole('button',{name:'Open'}));
        await screen.findByText(/This member waiver could not be opened/);
        expect(tab.close).toHaveBeenCalled();
        expect(location.replace).toHaveBeenCalledTimes(1);
    } finally { open.mockRestore(); }
});
