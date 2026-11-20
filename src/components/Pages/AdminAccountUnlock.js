import React, { useRef, useState } from 'react';
import { verifySignedInAdminIdentity } from '../constants/officialAdminAccount';

export default function AdminAccountUnlock({ firebase, disabled, setWorking, unlock, onUnlocked }) {
    const [needsVerification, setNeedsVerification] = useState(false);
    const [feedback, setFeedback] = useState('');
    const inFlight = useRef(false);
    const passwordInput = useRef(null);
    const user = firebase?.auth?.currentUser;

    async function submit(verify = false) {
        if (disabled || inFlight.current || !user) return;
        if (verify && !passwordInput.current?.value) { passwordInput.current?.focus(); return; }
        inFlight.current = true;
        setWorking(true);
        setFeedback('');
        try {
            if (verify) {
                const password = passwordInput.current?.value;
                if (passwordInput.current) passwordInput.current.value = '';
                await verifySignedInAdminIdentity(firebase, user, password);
            }
            const result = await unlock();
            if (firebase.auth.currentUser !== user) throw new Error('Your signed-in account changed. Reopen the staff tool.');
            onUnlocked(result);
        } catch (error) {
            if (error.code === 'recent_login_required') {
                setNeedsVerification(true);
                setFeedback('Verify your signed-in account to continue.');
            } else if (String(error.code || '').startsWith('auth/')) {
                setFeedback('Account verification did not finish. Try again with the account shown here.');
            } else setFeedback(error.message || 'Your admin access could not be verified.');
        } finally {
            inFlight.current = false;
            setWorking(false);
        }
    }

    return <div className="staff-account-unlock">
        {user?.email && <p>Signed in as <strong>{user.email}</strong></p>}
        {!needsVerification ? <button type="button" className="btn btn-primary" disabled={disabled || !user} onClick={() => submit()}>
            Use my admin account
        </button> : <>
            <div>
                <label>Account password<input className="form-control" type="password" ref={passwordInput}
                    autoComplete="current-password" disabled={disabled} onKeyDown={event => {
                        if (event.key === 'Enter') { event.preventDefault(); submit(true); }
                    }} /></label>
                <button type="button" className="btn btn-primary" disabled={disabled} onClick={() => submit(true)}>Verify account password</button>
            </div>
        </>}
        {feedback && <p role="alert">{feedback}</p>}
    </div>;
}
