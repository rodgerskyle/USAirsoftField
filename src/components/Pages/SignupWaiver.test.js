import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { onValue, set, update } from 'firebase/database';
import { uploadBytes } from 'firebase/storage';
import { FirebaseContext } from '../Firebase';
import { AuthUserContext } from '../session';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';
import Signup from './Signup';

jest.mock('../Firebase', () => {
    const context = jest.requireActual('../Firebase/context');
    return { FirebaseContext: context.default, withFirebase: context.withFirebase };
});
jest.mock('../constants/fieldStaffApi');
jest.mock('firebase/app', () => ({ initializeApp: jest.fn() }));
jest.mock('firebase/auth', () => ({ getAuth: jest.fn(), createUserWithEmailAndPassword: jest.fn(), signOut: () => Promise.resolve() }));
jest.mock('firebase/database', () => ({ onValue: jest.fn(), set: jest.fn(), update: jest.fn(), get: jest.fn() }));
jest.mock('firebase/storage', () => ({ uploadBytes: jest.fn() }));
jest.mock('@react-pdf/renderer', () => ({ pdf: jest.fn() }));
jest.mock('./SignedWaiver', () => () => null);
jest.mock('react-signature-canvas', () => () => null);

test('new member reuses a birth-date matched receipt and retries a failed link on the same account', async () => {
    const authUser = { uid: 'desk', roles: { ADMIN: true } };
    const firebase = { auth: { currentUser: authUser }, uid: () => 'desk', users: () => 'users',
        user: uid => 'users/' + uid, emailList: email => 'emails/' + email,
        onAuthUserListener: callback => { callback(authUser); return () => {}; } };
    onValue.mockImplementation((ref, callback) => { callback({ val: () => ({ desk: authUser }) }); return () => {}; });
    const row = { ref: 'recent-waiver', signedAt: Date.now() - 5000 };
    requestStaffFieldTool.mockResolvedValueOnce({ matches: [row] }).mockRejectedValueOnce(new Error('Temporary outage'))
        .mockResolvedValueOnce({ check: { status: 'signed', signedAt: row.signedAt } });
    createUserWithEmailAndPassword.mockResolvedValue({ user: { uid: 'new-member' } });
    set.mockResolvedValue();
    update.mockResolvedValue();
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FirebaseContext.Provider value={firebase}>
        <AuthUserContext.Provider value={authUser}><HelmetProvider><Signup /></HelmetProvider></AuthUserContext.Provider>
    </FirebaseContext.Provider></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Casey' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByLabelText('Participant date of birth'), { target: { value: '2001-04-02' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find signed waiver' }));
    fireEvent.click(await screen.findByRole('button', { name: /Continue with waiver signed/ }));
    fireEvent.change(screen.getByPlaceholderText('Email Address'), { target: { value: 'casey@example.org' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'SignupPass123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'SignupPass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Temporary outage');
    expect(update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));
    expect(await screen.findByText('Successful Member Registration.')).toBeInTheDocument();
    expect(createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
    expect(requestStaffFieldTool.mock.calls[2][3].body).toEqual({ action: 'link', memberId: 'new-member', dob: '2001-04-02', ...row });
    expect(update).toHaveBeenCalledWith('users/new-member', { renewal: expect.any(String) });
    expect(uploadBytes).not.toHaveBeenCalled();
});
