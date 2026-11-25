import React, { Component } from 'react';
import { Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap/';
import { TextField, Collapse } from '@mui/material';
import MUIButton from '@mui/material/Button';
import { VerifiedUser } from '@mui/icons-material';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/lab/Alert';
import { withFirebase } from '../../Firebase';
import { AuthUserContext, withAuthorization } from '../../session';
import PaymentForm from './components/creditcard';
import * as ROLES from '../../constants/roles';
import { runTransaction } from 'firebase/database';
import GroupRentalPicker from './GroupRentalPicker';
import { playerRentalMatch } from './utils/checkInRenter';
import { mergeRentalRoster, rentalGroupSource } from './utils/groupRentalRoster';
import {
    formatCreditCardNumber,
    formatCVC,
    formatExpirationDate,
} from "../../constants/formatcard";
import { styled } from '@mui/material/styles';
import { FormControlLabel } from '@mui/material';
import './rentals.css';
import {
    FormControl,
    FormGroup,
    Checkbox,
    Typography,
    Paper
} from '@mui/material';
import { v4 as uuid } from 'uuid';
import { IconButton } from '@mui/material';
import { Remove, Add } from '@mui/icons-material';
import { CheckCircle } from '@mui/icons-material';

const INITIAL_STATE = {
    search: "",
    showAddParticipant: false,
    participants: [],
    rentals: [],
    participantsRentals: [],
    rentalIndex: "",
    rentalsError: null,
    index: "",
    newForm: null,
    createdIndex: "",
    //Create form info
    rentalName: '',
    numParticipants: '',
    showComplete: false,
    checked: false,
    //Create form errors
    cvcError: null,
    expiryError: null,
    nameError: null,
    numberError: null,
    zipcodeError: null,
    rentalnameError: null,
    numparticipantsError: null,
    //Credit card stuff to hold for renting
    cvc: '',
    expiry: '',
    name: '',
    number: '',
    zipcode: '',
    addingParticipant: false,
    submitting: false,
    checkInGroup: null,
    excludedEntries: [],
    clearedInitialGroup: false,
    existingRental: null,
};

const StyledToggle = styled(FormControlLabel)({
    marginLeft: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: '4px 12px',
    borderRadius: '20px',
    '& .MuiFormControlLabel-label': {
        color: 'var(--usaw-light-ink, #fff)',
        fontSize: '0.9rem',
        marginLeft: '8px'
    },
    '& .MuiSwitch-root': {
        '& .MuiSwitch-track': {
            backgroundColor: '#666'
        },
        '& .MuiSwitch-thumb': {
            backgroundColor: '#fff'
        }
    }
});

class RentalReservationError extends Error {}

// Form keys are numeric on existing desks. Allocate a key and reserve the
// inventory together so competing creates retry against the updated stock.
async function saveRentalForm(firebase, form, reservations, player) {
    const rentalRef = firebase.rentals();
    let existing;
    let key;
    let problem;
    const result = await runTransaction(rentalRef, current => {
        // A cold RTDB cache can call this with null before comparing against
        // the server. A null proposal performs that comparison without
        // creating inventory or resurrecting records if the desk is empty.
        if (current === null) return null;
        const groups = current.group || {};
        existing = Object.entries(groups).find(([, row]) => row?.createRequestId === form.createRequestId ||
            (!row?.returned && ((form.checkInGroup && row?.checkInGroup?.id === form.checkInGroup.id) ||
                playerRentalMatch(row, player))));
        if (existing) return undefined;
        const options = { ...current?.options };
        const available = [];
        for (const { optionId, itemIds } of reservations) {
            const optionEntry = Object.entries(options).find(([, option]) => option && String(option.id) === optionId);
            if (!optionEntry) {
                problem = 'A selected equipment option is no longer available. Review your equipment and try again.';
                return undefined;
            }
            const [index, option] = optionEntry;
            const stock = Number(option.stock || 0);
            if (!Number.isFinite(stock) || (option.max != null && stock + itemIds.length > Number(option.max))) {
                problem = 'There is no longer enough ' + option.label + ' available. Adjust the quantity and try again.';
                return undefined;
            }
            options[index] = { ...option, stock: stock + itemIds.length };
            // Service holds describe the catalog, not an individual reservation.
            const unit = { ...option };
            delete unit.repairHolds;
            available.push(...itemIds.map(id => ({ ...unit, id })));
        }
        const indexes = Object.keys(groups).filter(id => /^(0|[1-9]\d*)$/.test(id)).map(Number);
        key = indexes.reduce((largest, value) => Math.max(largest, value), -1) + 1;
        if (!Number.isSafeInteger(key)) {
            problem = 'Unable to allocate a rental form number.';
            return undefined;
        }
        return { ...current, options, group: { ...groups, [key]: { ...form, available } } };
    }, { applyLocally: false });
    if (result.committed && key !== undefined && result.snapshot.child('group/' + key + '/createRequestId').val() === form.createRequestId) return { key };
    if (existing) return { key: existing[0], duplicate: existing[1].createRequestId !== form.createRequestId };
    throw new RentalReservationError(problem || 'The form could not be saved. Try again.');
}

class CreateRentalForm extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            waivers: [],
            rentalForms: [],
            members: null,
            ...INITIAL_STATE,
            ...(props.checkedInPlayer && {
                rentalName: props.checkedInPlayer.groupName || props.checkedInPlayer.displayName,
                numParticipants: 1,
                participants: [{
                    ref: props.checkedInPlayer.playerId, name: props.checkedInPlayer.displayName, date: props.checkedInPlayer.date, rentals: [],
                    ...(props.checkedInPlayer.groupId && { groupId: props.checkedInPlayer.groupId, groupEntryId: props.checkedInPlayer.groupEntryId }),
                }],
            }),
            selectedRentals: {},
            rentalQuantities: {},
            totalPrice: 0,
            success: false,
            successMessage: ''
        };
    }

    importRoster = (group, entries) => {
        if (!this.props.canImportGroup || this.saving) return false;
        const existing = this.props.rentalForms?.find(row => !row.returned && row.checkInGroup?.id === group.id);
        if (existing) {
            this.setState({ existingRental: { key: existing.key, groupId: group.id }, rentalsError: 'This check-in group already has a rental form.' });
            return false;
        }
        const participants = mergeRentalRoster([], group, entries);
        if (!participants.length) return false;
        this.setState({
            participants, excludedEntries: [], existingRental: null, checkInGroup: rentalGroupSource(group), rentalName: group.name,
            rentalRequests: Object.fromEntries(entries.map(entry => [entry.id, entry.rentalIntent])),
            numParticipants: participants.length, rentalnameError: null, numparticipantsError: null, rentalsError: null,
        });
    };

    clearRoster = () => {
        this.setState({ participants: [], rentalRequests: {}, excludedEntries: [], clearedInitialGroup: true, existingRental: null, checkInGroup: null, rentalName: '', numParticipants: '', rentalsError: null });
    };

    includeParticipant = (entryId, include) => {
        this.setState(state => {
            const excludedEntries = include ? state.excludedEntries.filter(id => id !== entryId) : [...state.excludedEntries, entryId];
            const minimum = state.participants.length - excludedEntries.length;
            return { excludedEntries, numParticipants: Math.max(minimum, (Number(state.numParticipants) || 0) + (include ? 1 : -1)) };
        });
    };

    setParticipantName = (entryId, name) => {
        this.setState(state => ({ participants: state.participants.map(row => row.groupEntryId === entryId ? { ...row, name } : row) }));
    };

    createForm = async event => {
        event.preventDefault();
        if (this.saving || !this.validateCreateForm()) return;
        const { cvc, number, expiry, name, zipcode, rentalName, numParticipants, rentalQuantities, checkInGroup } = this.state;
        const participants = this.state.participants.filter(row => !this.state.excludedEntries.includes(row.groupEntryId))
            .map(row => ({ ...row, name: row.name.trim() }));
        if ((checkInGroup || this.props.checkedInPlayer) && (!participants.length || participants.some(row => !row.name))) {
            this.setState({ rentalsError: 'Select at least one renter and enter a name for each selected player.' });
            return;
        }
        const size = Number(numParticipants);
        if (!rentalName.trim() || !Number.isSafeInteger(size) || size < 1 || size < participants.length) {
            this.setState({ rentalsError: 'Enter a rental name and a participant count that includes everyone on this form.' });
            return;
        }
        const selected = Object.entries(rentalQuantities).filter(([, quantity]) => quantity > 0);
        if (!selected.length) return;
        this.saving = true;
        this.createRequestId ??= uuid();
        this.setState({ submitting: true, rentalsError: null });
        // Keep IDs stable across transaction retries. Each physical item has
        // its own ID even when several rentals use the same equipment option.
        const reservations = selected.map(([optionId, amount]) => ({
            optionId, itemIds: Array.from({ length: amount }, () => uuid()),
        }));
        const form = {
            name: rentalName.trim(), size, cc: { cvc, number, expiry, name, zipcode },
            complete: false, createRequestId: this.createRequestId,
            ...(checkInGroup && { checkInGroup, participants }),
            ...(this.props.checkedInPlayer && {
                [this.props.checkedInPlayer.playerId.startsWith('guest:') ? 'walkOnCheckIn' : 'playerCheckIn']:
                    { playerId: this.props.checkedInPlayer.playerId, date: this.props.checkedInPlayer.date },
                ...(this.props.checkedInPlayer.groupId && { checkInGroup: {
                    id: this.props.checkedInPlayer.groupId, name: this.props.checkedInPlayer.groupName,
                    kind: this.props.checkedInPlayer.groupKind, date: this.props.checkedInPlayer.date,
                } }),
                participants,
            }),
        };
        try {
            if (this.props.checkedInPlayer) {
                const confirmed = await this.props.verifyCheckedInPlayer().catch(failure => {
                    throw new RentalReservationError(failure.message || 'Could not verify the player’s check-in. Please retry.');
                });
                if (confirmed.groupId !== this.props.checkedInPlayer.groupId || confirmed.groupEntryId !== this.props.checkedInPlayer.groupEntryId) {
                    throw new RentalReservationError('The player’s group changed. Reopen their check-in before creating the rental.');
                }
            }
            const result = await saveRentalForm(this.props.firebase, form, reservations, this.props.checkedInPlayer);
            if (result.duplicate) {
                this.setState({
                    existingRental: { key: result.key, groupId: checkInGroup?.id || this.props.checkedInPlayer?.playerId },
                    submitting: false, rentalsError: 'An open rental already exists for this check-in.',
                });
                return;
            }
            this.setState({
                ...INITIAL_STATE, rentalQuantities: {}, selectedRentals: {}, totalPrice: 0,
                success: true, createdIndex: result.key, checkInGroup,
                successMessage: 'Rental form created successfully! Please let a US Airsoft staff member know that you are done.',
            });
        } catch (error) {
            this.setState({ rentalsError: error instanceof RentalReservationError ? error.message :
                'Failed to save the rental form. Please try again.', submitting: false });
        } finally {
            this.saving = false;
        }
    };

    // Validate text field for createform
    validateCreateForm() {
        const { cvc, number, expiry, name, zipcode } = this.state
        let check = true
        if (cvc === "" || (cvc.length < 3 && cvc.length > 4)) {
            this.setState({ cvcError: "Enter a valid CVC." })
            check = false
        }
        if (number === "" || number.length < 15) {
            this.setState({ numberError: "Enter a valid card number." })
            check = false
        }
        if (expiry === "" || expiry.length !== 5) {
            this.setState({ expiryError: "Enter in MM/YY format." })
            check = false
        }
        if (name === "") {
            this.setState({ nameError: "Enter the name on card." })
            check = false
        }
        if (zipcode === "" || zipcode.length !== 5) {
            this.setState({ zipcodeError: "Enter valid US Zipcode." })
            check = false
        }
        return check
    }

    // Add this method to handle credit card input changes
    handleInputChange = ({ target }) => {
        if (target.name === "number") {
            target.value = formatCreditCardNumber(target.value);
        } else if (target.name === "expiry") {
            target.value = formatExpirationDate(target.value);
        } else if (target.name === "cvc") {
            target.value = formatCVC(target.value);
        }

        this.setState({
            [target.name]: target.value,
            [`${target.name}Error`]: null
        });
    };

    handleRentalSelect = (rental, quantity = 1) => {
        this.setState(prevState => {
            const currentQuantity = prevState.rentalQuantities[rental.id] || 0;
            const maxStock = rental.max - (rental.stock || 0); // Calculate available stock
            const newQuantity = Math.max(
                0, // Don't go below 0
                Math.min(
                    currentQuantity + quantity,
                    maxStock // Don't exceed available stock
                )
            );

            const newQuantities = {
                ...prevState.rentalQuantities,
                [rental.id]: newQuantity
            };

            // Only mark as selected if quantity > 0
            const newSelectedRentals = {
                ...prevState.selectedRentals,
                [rental.id]: newQuantity > 0
            };

            return {
                selectedRentals: newSelectedRentals,
                rentalQuantities: newQuantities,
                totalPrice: this.calculateTotal(newSelectedRentals, newQuantities)
            };
        });
    };

    calculateTotal = (selectedRentals, quantities) => {
        return Object.values(this.props.rentalOptions || {}).filter(Boolean).reduce((total, option) => {
            if (selectedRentals[option.id]) {
                const quantity = quantities[option.id] || 0;
                return total + (option.cost * quantity);
            }
            return total;
        }, 0);
    };

    // Add this method to your CreateRentalForm class
    grabNewForm = (index) => {
        // Redirect to the edit form page with the new form index
        //this.props.history.push(`/rentals/edit/${index}`);
    };

    render() {
        const {
            loading,
            rentalName,
            numParticipants,
            rentalsError,
            showAddParticipant,
            // Add all the error states
            rentalnameError,
            numparticipantsError,
            cvcError,
            numberError,
            expiryError,
            nameError,
            zipcodeError,
            // Add credit card fields
            number,
            cvc,
            expiry,
            name,
            zipcode,
            selectedRentals,
            rentalQuantities,
            totalPrice,
            success,
            successMessage,
            submitting
        } = this.state;

        const includedCount = this.state.participants.length - this.state.excludedEntries.length;
        const options = Object.values(this.props.rentalOptions || {}).filter(Boolean);

        if (success) {
            const sourceId = this.state.checkInGroup?.id || this.props.checkedInPlayer?.playerId;
            const assignGear = this.props.canImportGroup && this.props.onOpenExisting && sourceId
                ? () => this.props.onOpenExisting(this.state.createdIndex, sourceId) : null;
            return <SuccessScreen message={successMessage} onAssignGear={assignGear} fromCheckIn={Boolean(this.props.checkedInPlayer)} />;
        }

        return (
            <Container>
                <Row className="justify-content-center">
                    <Card className="card-rental-form">
                        <Card.Body>
                            <h1 className="rental-form-header">New Rental Form</h1>
                            {this.props.checkedInPlayer && <section className="rental-roster-review" aria-label="Checked-in player">
                                <h2>{this.props.checkedInPlayer.groupName || (this.props.checkedInPlayer.playerId.startsWith('guest:') ? 'Walk-on rental' : 'Member rental')}</h2>
                                <label>Participant name
                                    <input className="form-control" autoComplete="off" maxLength={120} disabled={submitting}
                                        value={this.state.participants[0]?.name || ''}
                                        onChange={event => this.setState({ participants: [{ ...this.state.participants[0], name: event.target.value }] })} />
                                </label>
                            </section>}
                            {this.props.canImportGroup && !this.props.checkedInPlayer && !this.state.checkInGroup && <GroupRentalPicker
                                firebase={this.props.firebase} uid={this.props.uid} initialGroupId={this.state.clearedInitialGroup ? null : this.props.initialGroupId}
                                existingEntries={this.state.participants} disabled={submitting} onAdd={this.importRoster} onPrefill={this.importRoster}
                            />}
                            {this.props.canImportGroup && this.state.checkInGroup && <section className="rental-roster-review" aria-label="Imported check-in group">
                                <h2>{this.state.checkInGroup.name}</h2>
                                <p>{includedCount} {includedCount === 1 ? 'player' : 'players'} on this rental form</p>
                                <fieldset className="rental-roster-fields" disabled={submitting}>
                                    <legend>Choose renters and edit their names</legend>
                                    {this.state.participants.some(row => this.state.rentalRequests?.[row.groupEntryId] === 'requested') && <button
                                        className="btn btn-outline-primary" type="button" disabled={submitting} onClick={() => {
                                            const excludedEntries = this.state.participants.filter(row => this.state.rentalRequests[row.groupEntryId] !== 'requested')
                                                .map(row => row.groupEntryId);
                                            this.setState({ excludedEntries, numParticipants: this.state.participants.length - excludedEntries.length });
                                        }}>Select players who requested rentals</button>}
                                    {this.state.participants.map((player, index) => {
                                        const included = !this.state.excludedEntries.includes(player.groupEntryId);
                                        return <div className="rental-roster-line" key={player.groupEntryId}>
                                            <label className="rental-roster-choice">
                                                <input type="checkbox" checked={included} aria-label={'Include renter ' + (index + 1)}
                                                    onChange={event => this.includeParticipant(player.groupEntryId, event.target.checked)} />
                                                Renter {index + 1}{this.state.rentalRequests?.[player.groupEntryId] === 'requested' ? ' · Rental requested' :
                                                    this.state.rentalRequests?.[player.groupEntryId] === 'bringing' ? ' · Bringing own gear' : ''}
                                            </label>
                                            <input className="form-control" aria-label={'Renter ' + (index + 1) + ' name'}
                                                value={player.name} disabled={!included} maxLength={120} autoComplete="off"
                                                onChange={event => this.setParticipantName(player.groupEntryId, event.target.value)} />
                                        </div>;
                                    })}
                                </fieldset>
                                <button type="button" className="btn btn-outline-secondary" disabled={submitting} onClick={this.clearRoster}>Remove imported group</button>
                            </section>}
                            {this.props.canImportGroup && this.props.onOpenExisting && this.state.existingRental && <button
                                type="button" className="btn btn-outline-primary" disabled={submitting}
                                onClick={() => this.props.onOpenExisting(this.state.existingRental.key, this.state.existingRental.groupId)}
                            >Open existing rental form</button>}
                            <Form onSubmit={this.createForm} className="rental-form">
                                <div className="rental-form-fields">
                                    <TextField
                                        className="rental-form-input"
                                        label="Rental Name"
                                        value={rentalName}
                                        onChange={(e) => this.setState({ rentalName: e.target.value })}
                                        disabled={submitting}
                                        error={!!rentalnameError}
                                        helperText={rentalnameError}
                                        required
                                        sx={{
                                            backgroundColor: 'transparent',
                                            borderRadius: '4px',
                                            marginBottom: '1rem'
                                        }}
                                    />
                                    <TextField
                                        className="rental-form-input"
                                        label="Number of Participants"
                                        type="number"
                                        inputProps={{ min: includedCount || 1, step: 1 }}
                                        value={numParticipants}
                                        onChange={(e) => this.setState({ numParticipants: e.target.value })}
                                        disabled={submitting}
                                        error={!!numparticipantsError}
                                        helperText={numparticipantsError}
                                        required
                                        sx={{
                                            backgroundColor: 'transparent',
                                            borderRadius: '4px',
                                            marginBottom: '1rem'
                                        }}
                                    />
                                    <Paper elevation={3} className="rental-options-section">
                                        <Typography variant="h6" className="rental-options-header">
                                            Select Rental Equipment
                                        </Typography>
                                        <FormControl component="fieldset" className="rental-options-group">
                                            <FormGroup>
                                                {options && options.map((option) => (
                                                    <div key={option.id} className="rental-option-item">
                                                        <FormControlLabel
                                                            control={
                                                                <Checkbox
                                                                    checked={!!selectedRentals[option.id]}
                                                                    onChange={() => this.handleRentalSelect(option, 1)}
                                                                    disabled={submitting || option.stock >= option.max}
                                                                />
                                                            }
                                                            label={
                                                                <div className="rental-option-label">
                                                                    <span>{option.label}</span>
                                                                    <span className="rental-option-price">
                                                                        ${option.cost.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            }
                                                        />
                                                        {selectedRentals[option.id] && (
                                                            <div className="rental-quantity-controls">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => this.handleRentalSelect(option, -1)}
                                                                    disabled={submitting}
                                                                >
                                                                    <Remove />
                                                                </IconButton>
                                                                <Typography variant="body1">
                                                                    {rentalQuantities[option.id] || 0}
                                                                </Typography>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => this.handleRentalSelect(option, 1)}
                                                                    disabled={
                                                                        submitting ||
                                                                        rentalQuantities[option.id] >= option.max
                                                                    }
                                                                >
                                                                    <Add />
                                                                </IconButton>
                                                            </div>
                                                        )}
                                                        <Typography variant="caption" color="textSecondary">
                                                            {option.stock >= option.max
                                                                ? 'Out of stock'
                                                                : `${option.max - option.stock} available`}
                                                        </Typography>
                                                    </div>
                                                ))}
                                            </FormGroup>
                                        </FormControl>
                                        <div className="rental-total">
                                            <Typography variant="h6">
                                                Total: ${totalPrice.toFixed(2)}
                                            </Typography>
                                        </div>
                                    </Paper>
                                    <PaymentForm
                                        handleInputChange={this.handleInputChange}
                                        cvc={cvc}
                                        expiry={expiry}
                                        name={name}
                                        number={number}
                                        zipcode={zipcode}
                                        cvcError={cvcError}
                                        expiryError={expiryError}
                                        nameError={nameError}
                                        numberError={numberError}
                                        zipcodeError={zipcodeError}
                                    />
                                    <div className="rental-form-submit">
                                        <MUIButton
                                            type="submit"
                                            variant="contained"
                                            color="primary"
                                            endIcon={<VerifiedUser />}
                                            className="submit-button"
                                            disabled={submitting || totalPrice === 0}
                                        >
                                            {submitting ? (
                                                <>
                                                    <Spinner
                                                        animation="border"
                                                        size="sm"
                                                        className="rental-submit-spinner"
                                                    />
                                                    Creating Rental Form...
                                                </>
                                            ) : `Create Rental ($${totalPrice.toFixed(2)})`}
                                        </MUIButton>
                                    </div>
                                    {submitting && (
                                        <p className="rental-submit-status">
                                            Creating the rental form now. Please keep this screen open and do not tap the button again.
                                        </p>
                                    )}
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Row>

                <Snackbar
                    open={rentalsError !== null}
                    autoHideDuration={6000}
                    onClose={() => this.setState({ rentalsError: null })}
                >
                    <Alert
                        onClose={() => this.setState({ rentalsError: null })}
                        severity="error"
                    >
                        {rentalsError}
                    </Alert>
                </Snackbar>
            </Container>
        );
    }
}

const SuccessScreen = ({ message, onAssignGear, fromCheckIn }) => (
    <Paper
        elevation={3}
        sx={{
            p: 4,
            textAlign: 'center',
            maxWidth: 600,
            margin: '40px auto',
            backgroundColor: 'var(--admin-surface)',
            color: 'var(--admin-text)',
            border: '1px solid var(--admin-border)'
        }}
    >
        <CheckCircle
            sx={{
                fontSize: 64,
                color: 'success.main',
                mb: 2
            }}
        />
        <Typography
            variant="h5"
            sx={{
                mb: 2,
                color: 'var(--admin-text)',
                fontWeight: 500
            }}
        >
            Success!
        </Typography>
        <Typography
            variant="body1"
            sx={{
                mb: 3,
                color: 'var(--admin-subtext)'
            }}
        >
            {message}
        </Typography>
        {onAssignGear && <MUIButton variant="contained" color="primary" onClick={onAssignGear}>
            Assign rental gear
        </MUIButton>}
        {!fromCheckIn && <MUIButton
            variant="contained"
            color="primary"
            onClick={() => window.location.reload()}
            startIcon={<Add />}
        >
            Create Another Rental
        </MUIButton>}
    </Paper>
);

export default withFirebase(CreateRentalForm); 
