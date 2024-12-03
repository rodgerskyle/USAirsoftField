import React, { Component, useState, useEffect } from 'react';
import '../../../App.css';
import { withFirebase } from '../../Firebase';
import { Avatar, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, TextField, Typography, Button, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableFooter, TableHead, TableRow, CircularProgress, Snackbar, Chip } from '@mui/material';
import { Contacts, AssignmentTurnedIn, ArrowBack, VerifiedUser, Warning, Delete, CheckCircle } from '@mui/icons-material';
import MuiAlert from '@mui/lab/Alert';
import logo from '../../../assets/usairsoft-small-logo.png';
import { onValue, set, update, remove, get } from 'firebase/database';
import EmptyState from './components/EmptyState';

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
                    <Typography variant="body2" color="textSecondary">
                        {Object.values(rental.checkedStates).filter(Boolean).length} / {rental.numbers.length} checked
                    </Typography>
                )}
            </TableCell>
        </TableRow>
    );
};

const ReturnForm = (props) => {
    const { firebase, rentalForms } = props;
    const [index, setIndex] = useState(-1);
    const [combinedList, setCombinedList] = useState([]);
    const [optionsList, setOptionsList] = useState([]);
    const [optionsObject, setOptionsObject] = useState({});
    const [error, setError] = useState(null);
    const [complete, setComplete] = useState(false);
    const [email, setEmail] = useState('');
    const [success, setSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [checkedRentals, setCheckedRentals] = useState({});
    const [loading, setLoading] = useState(false);

    const handleFormSelect = (selectedIndex) => {
        setIndex(selectedIndex);
        const selectedForm = rentalForms[selectedIndex];

        // Process the rental items for the selected form
        if (selectedForm?.participants) {
            const combined = [];
            selectedForm.participants.forEach(participant => {
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
    };

    const handleFormDelete = async (selectedIndex) => {
        try {
            const form = props.rentalForms[selectedIndex];
            await remove(firebase.rentalGroup(form.key));
            setSuccessMessage('Form deleted successfully');
            setSuccess(true);
        } catch (err) {
            setError('Failed to delete form');
            console.error(err);
        }
    };

    const handleFormComplete = async () => {
        try {
            setLoading(true);
            const form = props.rentalForms[index];

            // Return rentals back to stock
            await returnRentalsToStock(form);

            // Base update data
            const updateData = {
                returned: true
            };

            // Only add email if provided
            if (email) {
                updateData.returnEmail = email;

                // Send receipt email if email provided
                const sendReceipt = firebase.sendReceipt();
                await sendReceipt({
                    email,
                    name: form.name,
                    receipt: form.transaction,
                    last4: form.cc?.number ? form.cc.number.slice(-4) : null
                });
            }

            // Delete the form
            await remove(firebase.rentalGroup(form.key));

            // Set appropriate success message
            const successMsg = form.name
                ? `Group ${form.name} was successfully removed.`
                : 'Corrupted form was successfully removed.';

            setSuccessMessage(successMsg);
            setSuccess(true);

            // Reset form state
            setTimeout(() => {
                setIndex(-1);
                setComplete(false);
                setEmail('');
            }, 2000);

        } catch (err) {
            setError('Failed to complete form');
            console.error(err);
        }
    };

    // Helper function to return rentals to stock
    const returnRentalsToStock = async (form) => {
        try {
            // Get current rental options
            const optionsSnapshot = await get(firebase.rentalOptions());
            const options = optionsSnapshot.val();

            // Convert array to object with indices as keys
            const optionsObject = options.reduce((acc, option, index) => {
                acc[index] = option;
                return acc;
            }, {});

            // Process each participant's rentals
            form.participants?.forEach(participant => {
                participant?.rentals?.forEach(rental => {
                    // Find the matching option in the array by id
                    const optionIndex = options.findIndex(option => option.value === rental.value);

                    if (optionIndex !== -1) {
                        // Initialize stock if it doesn't exist
                        if (typeof optionsObject[optionIndex].stock !== 'number') {
                            optionsObject[optionIndex].stock = 0;
                        }

                        // Decrease the stock count when returning
                        optionsObject[optionIndex].stock = optionsObject[optionIndex].stock - 1;
                        if (optionsObject[optionIndex].stock < 0) {
                            optionsObject[optionIndex].stock = 0;
                        }
                    }
                });
            });

            // Process available rentals
            const availableRentals = form.available;
            availableRentals.forEach(rental => {
                const optionIndex = options.findIndex(option => option.value === rental.value);
                if (optionIndex !== -1) {
                    optionsObject[optionIndex].stock = optionsObject[optionIndex].stock - 1;

                    if (optionsObject[optionIndex].stock < 0) {
                        optionsObject[optionIndex].stock = 0;
                    }
                }
            });

            // Update rental options with new stock values
            await update(firebase.rentalOptions(), optionsObject);
        } catch (error) {
            console.error('Error returning rentals to stock:', error);
            throw error;
        }
    };

    const handleCheckRentalNumber = async (rentalValue, number, isChecked, formKey) => {
        try {
            const form = rentalForms[index];
            const updatedParticipants = form.participants.map(participant => {
                const updatedRentals = participant.rentals?.map(rental => {
                    if (rental.value === rentalValue && rental.number === number) {
                        return {
                            ...rental,
                            checked: isChecked
                        };
                    }
                    return {
                        ...rental,
                        checked: rental.checked
                    };
                });

                return {
                    name: participant.name,
                    rentals: updatedRentals,
                    ref: participant.ref
                };
            });

            // Update database
            await update(firebase.rentalGroup(formKey), {
                participants: updatedParticipants
            });

            // Update combined list state
            setCombinedList(prev => prev.map(rental => {
                if (rental.value === rentalValue) {
                    return {
                        ...rental,
                        checkedStates: {
                            ...rental.checkedStates,
                            [number]: isChecked
                        }
                    };
                }
                return rental;
            }));

            // Update checked rentals state
            setCheckedRentals(prev => ({
                ...prev,
                [rentalValue]: {
                    ...prev[rentalValue],
                    [number]: isChecked
                }
            }));

        } catch (error) {
            console.error('Error updating rental check status:', error);
            setError('Failed to update rental check status');
        }
    };

    const handleValidateAndComplete = () => {
        // Check if all rentals in combinedList have been checked
        console.log('Combined List:', combinedList);
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
                                key={i}
                                form={form}
                                index={i}
                                onSelect={() => handleFormSelect(i)}
                                onDelete={() => handleFormDelete(i)}
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
                            <Warning color="error" />
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                        primary={form.name}
                        secondary="Corrupted Rental Form, please delete"
                    />
                    <IconButton onClick={onDelete} color="error">
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
                <IconButton onClick={onSelect} color="primary">
                    <AssignmentTurnedIn />
                </IconButton>
            </ListItem>
        );
    };

    // Form completion view
    const CompletionView = () => (
        <Paper elevation={3} className="completion-container">
            <Typography variant="h4" className="completion-title">
                Rental Form Completed
            </Typography>
            <Typography variant="body1" className="completion-text">
                Please enter customer's email for receipt
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
                onClick={handleFormComplete}
                className="complete-button"
                disabled={loading}
            >
                {loading ? <CircularProgress size={32} style={{ color: '#fff' }} /> : 'Complete Form'}
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
                    onClick={() => setIndex(-1)}
                >
                    Back
                </Button>
                <Typography variant="h6" color={'#fff'}>
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
                    <CompletionView />
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