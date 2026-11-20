import React, { useState, useEffect, useRef } from 'react';
import '../../../App.css';
import { withFirebase } from '../../Firebase';
import { Avatar, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, TextField, Typography, Button, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableFooter, TableHead, TableRow, CircularProgress, Snackbar, Chip } from '@mui/material';
import { Contacts, AssignmentTurnedIn, ArrowBack, VerifiedUser, Warning, Delete, CheckCircle } from '@mui/icons-material';
import MuiAlert from '@mui/lab/Alert';
import logo from '../../../assets/usairsoft-small-logo.png';
import { runTransaction } from 'firebase/database';
import EmptyState from './components/EmptyState';
import { changeOpenRental, matchesRental, rentalIdentity, rentalParticipants, rentalRows } from './utils/openRental';

const Alert = React.forwardRef((props, ref) => (
    <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
));

const RentalRow = ({ rental, onCheckNumber, formKey }) => {
    return (
        <TableRow>
            <TableCell>{rental.label}</TableCell>
            <TableCell>
                <div className="rental-numbers">
                    {rental.numbers?.map((number, idx) => (
                        <Chip
                            key={idx}
                            label={number}
                            color={rental.checkedStates[number] ? "success" : "default"}
                            onClick={() => onCheckNumber(rental.value, number, !rental.checkedStates[number], formKey)}
                            icon={rental.checkedStates[number] ? <CheckCircle /> : undefined}
                            className="rental-number-chip"
                        />
                    )) || 'N/A'}
                </div>
            </TableCell>
            <TableCell align="right">
                {rental.numbers?.length > 0 && (
                    <Typography variant="body2" color="textSecondary" className="rental-check-count">
                        {Object.values(rental.checkedStates).filter(Boolean).length} / {rental.numbers.length} checked
                    </Typography>
                )}
            </TableCell>
        </TableRow>
    );
};

// Current forms reserve one item per row. Older forms kept an unassigned
// quantity in a single catalog row with the catalog option's own ID.
function reservationCounts(form, optionsByValue) {
    const counts = new Map();
    function add(item, unassigned) {
        const option = optionsByValue.get(item.value);
        if (!option) return;
        const amount = Number(item.amount);
        const bulk = unassigned && !form.createRequestId && (!item.id || item.id === option.id) &&
            Number.isSafeInteger(amount) && amount > 0;
        counts.set(item.value, (counts.get(item.value) || 0) + (bulk ? amount : 1));
    }
    rentalRows(form.available).forEach(item => add(item, true));
    rentalParticipants(form.participants).forEach(person => person.rentals.forEach(item => add(item, false)));
    return counts;
}

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
                const heldElsewhere = otherHolds.get(option.value) || 0;
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
    const [selection, setSelection] = useState(null);
    const index = rentalForms.findIndex(form => form.key === selection?.key && matchesRental(form, selection?.identity));
    const [combinedList, setCombinedList] = useState([]);
    const submitting = useRef(false);
    const [error, setError] = useState(null);
    const [complete, setComplete] = useState(false);
    const [email, setEmail] = useState('');
    const [success, setSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (index !== -1) {
            const selectedForm = rentalForms[index];
            const combined = [];
            rentalParticipants(selectedForm.participants).forEach(participant => {
                participant.rentals && participant?.rentals?.forEach(rental => {
                    const existingRental = combined.find(r => r.value === rental.value);
                    if (existingRental) {
                        if (rental.number) {
                            existingRental.numbers.push(rental.number);
                            existingRental.checkedStates[rental.number] = rental.checked || false;
                        }
                    } else {
                        combined.push({
                            ...rental,
                            numbers: rental.number ? [rental.number] : [],
                            checkedStates: rental.number ? { [rental.number]: rental.checked || false } : {}
                        });
                    }
                });
            });
            setCombinedList(combined);
        }
    }, [index, rentalForms]);

    const handleFormSelect = (selectedIndex) => {
        setComplete(false);
        setEmail('');
        setCombinedList([]);
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

    const handleCheckRentalNumber = async (rentalValue, number, isChecked, formKey) => {
        try {
            await changeOpenRental(firebase.rentalGroup(formKey), current => {
                let found = false;
                const participants = rentalParticipants(current.participants).map(participant => {
                    if (!Array.isArray(participant.rentals)) return participant;
                    return { ...participant, rentals: participant.rentals.map(rental => {
                        if (rental.value !== rentalValue || rental.number !== number) return rental;
                        found = true;
                        return { ...rental, checked: isChecked };
                    }) };
                });
                return found ? { ...current, participants } : undefined;
            }, selection.identity);
        } catch (error) {
            console.error('Error updating rental check status:', error);
            setError('Failed to update rental check status');
        }
    };

    const handleValidateAndComplete = () => {
        // Check if all rentals in combinedList have been checked
        const allChecked = combinedList.every(rental => {
            // Check if all numbers for this rental are checked
            return rental.numbers.every(number => {
                return rental.checkedStates[number] === true;
            });
        });

        if (!allChecked) {
            setError('Please check all rental numbers before completing');
            return;
        }

        setComplete(true);
    };

    // Main render for form list
    const RentalFormList = () => (
        <div className="rental-return-container">
            <h2 className="section-header">Return Rental Forms</h2>
            {rentalForms?.length > 0 ? (
                <Paper elevation={3} className="return-rental-forms-list">
                    <List>
                        {rentalForms.map((form, i) => (
                            <RentalFormListItem
                                key={form.key}
                                form={form}
                                index={i}
                                onSelect={() => handleFormSelect(i)}
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
    const RentalFormListItem = ({ form, index, onSelect, onDelete }) => {
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
    const ReturnFormDetails = () => (
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
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Rental</TableCell>
                                <TableCell>Numbers Rented Out</TableCell>
                                <TableCell align="right">Checked</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {combinedList?.map((row, i) => (
                                <RentalRow
                                    key={i}
                                    rental={row}
                                    onCheckNumber={handleCheckRentalNumber}
                                    formKey={rentalForms[index]?.key}
                                />
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={3} align="right">
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        endIcon={<VerifiedUser />}
                                        onClick={handleValidateAndComplete}
                                    >
                                        Complete Form
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </TableContainer>
            </Paper>
        </div>
    );

    return (
        <div className="return-form-root">
            <>
                {index === -1 ? (
                    <RentalFormList />
                ) : complete ? (
                    renderCompletion()
                ) : (
                    <ReturnFormDetails />
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
