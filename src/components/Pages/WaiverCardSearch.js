import React, { useEffect, useRef, useState } from 'react';
import { Form } from 'react-bootstrap';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';
import { StaffCardScanner } from './StaffCardScanner';

export default function WaiverCardSearch({ firebase, uid, value, onChange }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const pending = useRef(null);

    useEffect(() => () => {
        pending.current?.abort();
        pending.current = null;
    }, []);

    async function scan(card) {
        if (pending.current) return;
        const operation = new AbortController();
        pending.current = operation;
        setBusy(true);
        setError('');
        onChange('');
        try {
            const { name } = await requestStaffFieldTool(firebase, uid, '/api/member-card/waiver-name', {
                method: 'POST', body: card, signal: operation.signal,
            });
            if (typeof name !== 'string' || !name.trim()) throw new Error('Enter the player’s registered name manually.');
            if (pending.current === operation) onChange(name.trim());
        } catch (failure) {
            if (pending.current === operation) {
                setError(failure.status ? failure.message : 'The card could not be checked. Try again or enter the registered name.');
            }
        } finally {
            if (pending.current === operation) {
                pending.current = null;
                setBusy(false);
            }
        }
    }

    return (
        <>
            <label className="usa-waiver-search-label">
                Search waivers by name
                <Form.Control type="search" placeholder="Player’s registered name"
                    value={value} readOnly={busy} onChange={event => { setError(''); onChange(event.target.value); }}
                    className="usa-waiver-search" />
            </label>
            <StaffCardScanner disabled={busy} verifyLegacyCards onScan={scan}
                manualFallback="Enter the player’s registered name." />
            {busy && <p role="status">Looking up the registered name…</p>}
            {error && <p className="text-danger" role="alert">{error}</p>}
        </>
    );
}
