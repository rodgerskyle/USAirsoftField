import React, { useState, useRef } from 'react';
import '../../../App.css';
import { withFirebase } from '../../Firebase';
import { Avatar, List, ListItem, ListItemAvatar, ListItemText, TextField, Typography, Button, IconButton, Paper, CircularProgress, Snackbar } from '@mui/material';
import { Contacts, AssignmentTurnedIn, ArrowBack, VerifiedUser, Warning, Delete } from '@mui/icons-material';
import MuiAlert from '@mui/lab/Alert';
import logo from '../../../assets/usairsoft-small-logo.png';
import { runTransaction } from 'firebase/database';
import EmptyState from './components/EmptyState';
import { GearScan, QuickGearDesk } from './QuickGearDesk';
import { gearRows, reservationCounts } from './utils/rentalGear';
import { matchesRental, rentalIdentity, rentalParticipants, rentalRows } from './utils/openRental';

const Alert = React.forwardRef((props, ref) => (
    <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
));

async function closeRental(firebase, key, expected, discard) {
    let receipt;
    let reason;
    const result = await runTransaction(firebase.rentals(), rentals => {
        receipt = null;
        reason = '';
        // Null on a cold client still needs a compare against the server.
        if (rentals === null) return null;
        const form = rentals.group?.[key];
        if (!matchesRental(form, expected)) {
            reason = 'This rental form changed or was already closed. Reopen the rental desk.';
            return undefined;
        }
        const assigned = rentalParticipants(form.participants).flatMap(person => person.rentals);
        if (discard && form.size != null && (form.complete || assigned.some(item => item.number))) {
            reason = 'This rental has been issued. Open it to check the equipment before returning it.';
            return undefined;
        }
        if (!discard && assigned.some(item => item.number && item.checked !== true)) {
            reason = 'Check all rental numbers before completing the return.';
            return undefined;
        }

        const groups = { ...rentals.group };
        delete groups[key];
        const options = { ...rentals.options };
        const catalog = rentalRows(options);
        const byValue = new Map();
        for (const option of catalog) {
            if (typeof option.value === 'string' && option.value) {
                // A duplicated catalog value is ambiguous for older form rows.
                byValue.set(option.value, byValue.has(option.value) ? null : option);
            }
        }
        const release = reservationCounts(form, byValue);
        if (release.size) {
            const otherHolds = new Map();
            for (const other of rentalRows(groups)) {
                if (other.returned) continue;
                for (const [value, count] of reservationCounts(other, byValue)) {
                    otherHolds.set(value, (otherHolds.get(value) || 0) + count);
                }
            }
            for (const [index, option] of Object.entries(options)) {
                const count = option && release.get(option.value);
                if (!count) continue;
                const stock = Number(option.stock) || 0;
                // Historical inventory can be undercounted. Never release units
                // held by another form or inflate stock while closing this one.
                const heldElsewhere = (otherHolds.get(option.value) || 0) + rentalRows(option.repairHolds).length;
                const released = Math.min(count, Math.max(0, stock - heldElsewhere));
                if (released) options[index] = { ...option, stock: stock - released };
            }
        }
        receipt = { name: form.name || '', receipt: form.transaction || '',
            last4: String(form.cc?.number || '').replace(/\D/g, '').slice(-4) || null };
        return { ...rentals, group: groups, ...(release.size && { options }) };
    }, { applyLocally: false });
    if (!result.committed || !receipt) throw new Error(reason || 'The rental form could not be closed. Refresh the rental desk.');
    return receipt;
}

const ReturnForm = (props) => {
    const { firebase, rentalForms } = props;
    const [selection, setSelection] = useState(() => {
        const form = rentalForms.find(form => props.initialFormKey != null && String(form.key) === String(props.initialFormKey));
        return form ? { key: form.key, identity: rentalIdentity(form) } : null;
    });
    const [query, setQuery] = useState('');
    const [numberFilter, setNumberFilter] = useState('');
    const index = rentalForms.findIndex(form => form.key === selection?.key && matchesRental(form, selection?.identity));
    const submitting = useRef(false);
    const [error, setError] = useState(null);
    const [complete, setComplete] = useState(false);
    const [email, setEmail] = useState('');
    const [success, setSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleFormSelect = (selectedIndex) => {
        setComplete(false);
        setEmail('');
        const matched = gearRows(rentalForms[selectedIndex]).some(row => row.number && row.number.toLowerCase() === query.trim().toLowerCase());
        setNumberFilter(matched ? query.trim() : '');
        setSelection({ key: rentalForms[selectedIndex].key, identity: rentalIdentity(rentalForms[selectedIndex]) });
    };

    const finish = async (form, discard) => {
        if (!form || submitting.current) return;
        if (discard && !window.confirm('Discard this rental form and release its reserved equipment?')) return;
        submitting.current = true;
        setLoading(true);
        setError(null);
        setSuccess(false);
        try {
            const receipt = await closeRental(firebase, form.key, discard ? rentalIdentity(form) : selection.identity, discard);
            setSelection(null);
            setComplete(false);
            setEmail('');
            const saved = discard ? 'Rental form discarded.' : 'Rental return completed.';
            let message = saved;
            if (!discard && email.trim()) {
                setSuccessMessage(saved + ' Sending receipt…');
                setSuccess(true);
                try {
                    await firebase.sendReceipt()({ ...receipt, email: email.trim() });
                    message = saved + ' Receipt sent.';
                } catch {
                    message = saved + ' Receipt delivery could not be confirmed.';
                }
            }
            setSuccessMessage(message);
            setSuccess(true);
        } catch (failure) {
            setError(failure.message || 'Unable to close the rental. Refresh the rental desk.');
            setComplete(false);
        } finally {
            submitting.current = false;
            setLoading(false);
        }
    };

    const handleValidateAndComplete = () => {
        const allChecked = gearRows(rentalForms[index]).every(row => !row.number || row.checked);
        if (!allChecked) {
            setError('Please check all rental numbers before completing');
            return;
        }

        setComplete(true);
    };

    // Main render for form list
    const term = query.trim().toLowerCase();
    const filteredForms = rentalForms.filter(form => !term || String(form.name || '').toLowerCase().includes(term) ||
        gearRows(form).some(row => row.name.toLowerCase().includes(term) || row.number.toLowerCase() === term));
    const renderFormList = () => (
        <div className="rental-return-container">
            <h2 className="section-header">Rental swaps &amp; returns</h2>
            <div className="rental-form-search"><label>Find group, renter, or equipment number
                <input className="form-control" autoComplete="off" value={query} onChange={event => setQuery(event.target.value)} /></label>
                <GearScan onScan={setQuery} />
            </div>
            {term && !filteredForms.length && <p role="status">No matching open rentals.</p>}
            {rentalForms?.length > 0 ? (
                <Paper elevation={3} className="return-rental-forms-list">
                    <List>
                        {filteredForms.map(form => (
                            <RentalFormListItem
                                key={form.key}
                                form={form}
                                onSelect={() => handleFormSelect(rentalForms.indexOf(form))}
                                onDelete={() => finish(form, true)}
                            />
                        ))}
                    </List>
                </Paper>
            ) : (
                <EmptyState />
            )}
        </div>
    );

    // Individual form list item
    const RentalFormListItem = ({ form, onSelect, onDelete }) => {
        // if (!form.complete && form.size) return null;

        if (form.size == null) {
            return (
                <ListItem className="corrupted-form-item">
                    <ListItemAvatar>
                        <Avatar className="warning-avatar">
                            <Warning />
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                        primary={form.name}
                        secondary="Corrupted Rental Form, please delete"
                    />
                    <IconButton aria-label="Discard damaged rental form" disabled={loading} onClick={onDelete} color="error">
                        <Delete />
                    </IconButton>
                </ListItem>
            );
        }

        return (
            <ListItem className="rental-form-item">
                <ListItemAvatar>
                    <Avatar className="form-avatar">
                        <Contacts />
                    </Avatar>
                </ListItemAvatar>
                <ListItemText
                    primary={form.name}
                    secondary={`${form.size} Participants`}
                />
                {!form.complete && !rentalParticipants(form.participants).some(person => person.rentals.some(item => item.number)) &&
                    <IconButton aria-label={'Discard rental reservation for ' + form.name} disabled={loading} onClick={onDelete} color="error">
                        <Delete />
                    </IconButton>}
                <IconButton aria-label={'Return rental for ' + form.name} disabled={loading} onClick={onSelect} color="primary">
                    <AssignmentTurnedIn />
                </IconButton>
            </ListItem>
        );
    };

    // Form completion view
    const renderCompletion = () => (
        <Paper elevation={3} className="completion-container">
            <Typography variant="h4" className="completion-title">
                Complete rental return
            </Typography>
            <Typography variant="body1" className="completion-text">
                Enter an email to send a receipt (optional).
            </Typography>
            <TextField
                fullWidth
                variant="outlined"
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="email-input"
            />
            <Button
                variant="contained"
                color="primary"
                onClick={() => finish(rentalForms[index], false)}
                className="complete-button"
                disabled={loading}
            >
                {loading ? <CircularProgress size={32} color="inherit" /> : 'Complete Form'}
            </Button>
            <img src={logo} alt="US Airsoft logo" className="company-logo" />
        </Paper>
    );

    // Return form details view
    const renderReturnFormDetails = () => (
        <div className="return-form-details">
            <div className="header-actions">
                <Button
                    variant="outlined"
                    startIcon={<ArrowBack />}
                    onClick={() => setSelection(null)}
                >
                    Back
                </Button>
                <Typography variant="h6" color="text.primary">
                    Transaction #{rentalForms[index]?.transaction}
                </Typography>
            </div>

            <Paper elevation={3} className="rentals-table-container">
                <Typography variant="h6" className="group-name">
                    Group: {rentalForms[index]?.name}
                </Typography>
                <QuickGearDesk key={JSON.stringify(selection)} form={rentalForms[index]} firebase={firebase} initialTag={numberFilter} />
                <Button variant="contained" color="primary" endIcon={<VerifiedUser />} onClick={handleValidateAndComplete}>
                    Complete Form
                </Button>
            </Paper>
        </div>
    );

    return (
        <div className="return-form-root">
            <>
                {index === -1 ? (
                    renderFormList()
                ) : complete ? (
                    renderCompletion()
                ) : (
                    renderReturnFormDetails()
                )}
                <Snackbar
                    open={!!error || success}
                    autoHideDuration={6000}
                    onClose={() => {
                        setError(null);
                        setSuccess(false);
                    }}
                >
                    <Alert
                        severity={error ? "error" : "success"}
                        onClose={() => {
                            setError(null);
                            setSuccess(false);
                        }}
                    >
                        {error || successMessage}
                    </Alert>
                </Snackbar>
            </>
        </div>
    );
};

export default withFirebase(ReturnForm);
