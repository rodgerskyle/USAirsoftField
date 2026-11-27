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
import StaffWaiverPicker from '../StaffWaiverPicker';
import { searchRentalWaivers } from './utils/rentalWaiverProof';
import RenterGearChoices from './RenterGearChoices';
import { activateVerifiedRental, depositErrors, readRentalProofs, rentalFieldDay, rentalDraftProblem, pendingRentalMessage } from './utils/rentalActivation';
import { availableRentalUnits, heldCount, rentalInventoryCount } from './utils/rentalGear';
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
    receipt: '',
    manualName: '',
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

function rentalPrice(option) {
    if (option.cost == null || String(option.cost).trim() === '') return null;
    const price = Number(option.cost);
    return Number.isFinite(price) && price >= 0 ? price : null;
}

// Form keys are numeric on existing desks. Allocate a key and reserve the
// inventory together so competing creates retry against the updated stock.
async function saveRentalForm(firebase, form, reservations, player, proofReview) {
    const rentalRef = firebase.rentals();
    let existing;
    let key;
    let problem;
    let pendingMessage;
    const result = await runTransaction(rentalRef, current => {
        // A cold RTDB cache can call this with null before comparing against
        // the server. A null proposal performs that comparison without
        // creating inventory or resurrecting records if the desk is empty.
        if (current === null) return null;
        if (current.closedGear?.[form.createRequestId]) {
            problem = 'This rental was already returned. Open a new rental to reserve gear again.';
            existing = null;
            return undefined;
        }
        const groups = current.group || {};
        existing = Object.entries(groups).find(([, row]) => row?.createRequestId === form.createRequestId ||
            (!row?.returned && ((form.checkInGroup && row?.checkInGroup?.id === form.checkInGroup.id) ||
                playerRentalMatch(row, player))));
        if (existing) return undefined;
        const options = { ...current?.options };
        const available = [];
        for (const { value, itemIds } of reservations) {
            const matching = Object.entries(options).filter(([, option]) => option?.value != null && String(option.value) === value);
            if (matching.length !== 1) {
                problem = 'A selected equipment option is no longer available. Review your equipment and try again.';
                return undefined;
            }
            const [index, option] = matching[0];
            const recorded = rentalInventoryCount(option.stock ?? 0);
            const stock = Math.max(recorded ?? 0, heldCount(groups, option));
            if (recorded === null || availableRentalUnits(option, stock) < itemIds.length) {
                problem = 'There is no longer enough ' + option.label + ' available. Adjust the quantity and try again.';
                return undefined;
            }
            options[index] = { ...option, stock: stock + itemIds.length };
            // Service holds describe the catalog, not an individual reservation.
            const unit = { ...option };
            delete unit.repairHolds;
            available.push(...itemIds.map(id => ({ ...unit, id, number:'', checked:false })));
        }
        const indexes = Object.keys(groups).filter(id => /^(0|[1-9]\d*)$/.test(id)).map(Number);
        key = indexes.reduce((largest, value) => Math.max(largest, value), -1) + 1;
        if (!Number.isSafeInteger(key)) {
            problem = 'Unable to allocate a rental form number.';
            return undefined;
        }
        const draft = {...form,available};
        const saved = activateVerifiedRental(draft,proofReview);
        pendingMessage = saved.complete ? '' : pendingRentalMessage(draft,proofReview);
        return { ...current, options, group: { ...groups, [key]: saved } };
    }, { applyLocally: false });
    if (result.committed && key !== undefined && result.snapshot.child('group/' + key + '/createRequestId').val() === form.createRequestId) {
        return { key, pendingMessage, active:result.snapshot.child('group/' + key + '/complete').val() === true };
    }
    if (existing) return { key: existing[0], duplicate: existing[1].createRequestId !== form.createRequestId, active:existing[1].complete === true };
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

    searchWaivers = (name,signal) => searchRentalWaivers(this.props.firebase,this.props.uid,name,signal);

    addSignedRenter = match => {
        if (!this.props.canImportGroup || this.saving || !match?.ref || !match.name?.trim()) return;
        this.setState(state => {
            if (state.participants.some(person => person.ref === match.ref)) return {rentalsError:'This renter is already on the form.'};
            const participants = [...state.participants,{name:match.name.trim(),ref:match.ref,waiverRef:match.ref,waiverName:match.name.trim(),isDigital:true,rentals:[]}];
            return {participants,numParticipants:Math.max(Number(state.numParticipants)||0,participants.length),rentalsError:null};
        });
    };

    requestOptions = () => Object.values(this.props.rentalOptions || {}).filter(Boolean)
        .filter(option => Number(this.state.rentalQuantities[option.value]) > 0)
        .map(option=>({value:option.value,label:option.label,quantity:Number(this.state.rentalQuantities[option.value])}));

    includedRenters = () => {
        const included = this.state.participants.filter(row=>!this.state.excludedEntries.includes(row.groupEntryId));
        if (included.length === 1 && Number(this.state.numParticipants) === 1) {
            return [{...included[0],requestedItems:this.requestOptions().map(({value,quantity})=>({value,quantity}))}];
        }
        return included;
    };

    setGearChoices = (index,requestedItems) => {
        const selected = this.includedRenters()[index];
        this.setState(state=>({participants:state.participants.map(row=>row.renterKey===selected.renterKey && row.ref===selected.ref && row.groupEntryId===selected.groupEntryId
            ? {...row,requestedItems} : row)}));
    };

    createForm = async event => {
        event.preventDefault();
        if (this.saving || this.props.catalogPending || !this.validateCreateForm()) return;
        const { cvc, number, expiry, name, zipcode, rentalName, numParticipants, rentalQuantities, checkInGroup } = this.state;
        const participants = this.includedRenters()
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
        const reservations = selected.map(([value, amount]) => ({
            value, itemIds: Array.from({ length: amount }, () => uuid()),
        }));
        const form = {
            name: rentalName.trim(), size, cc: { cvc, number, expiry, name, zipcode },
            complete:false, createRequestId:this.createRequestId, armoryVersion:1, playDate:rentalFieldDay(),
            ...(this.state.receipt.trim() && {transaction:this.state.receipt.trim()}),
            ...(participants.length && {participants}),
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
            const deskOptions = Object.values(this.props.rentalOptions || {}).filter(Boolean);
            const available = reservations.flatMap(({value,itemIds})=>{
                const option=deskOptions.find(row=>row.value != null && String(row.value)===value);
                return option ? itemIds.map(id=>({id,value:option.value,label:option.label})) : [];
            });
            const preview = {...form,available};
            let review = null;
            if (!rentalDraftProblem(preview)) {
                try { review=await readRentalProofs(this.props.firebase,this.props.uid,preview); }
                catch { /* Keep the paid reservation pending if waiver verification is offline. */ }
            }
            const result = await saveRentalForm(this.props.firebase, form, reservations, this.props.checkedInPlayer,review);
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
                successMessage: result.active ? 'Active and ready for armory pickup.' : 'Rental saved. ' + (result.pendingMessage || 'Open the form to finish verification for armory pickup.'),
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
        const errors = depositErrors(this.state);
        this.setState({cvcError:null,numberError:null,expiryError:null,nameError:null,zipcodeError:null,...errors});
        return !Object.keys(errors).length;
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
            const currentQuantity = prevState.rentalQuantities[rental.value] || 0;
            const newQuantity = Math.max(0, Math.min(currentQuantity + quantity, availableRentalUnits(rental)));

            const newQuantities = {
                ...prevState.rentalQuantities,
                [rental.value]: newQuantity
            };

            // Only mark as selected if quantity > 0
            const newSelectedRentals = {
                ...prevState.selectedRentals,
                [rental.value]: newQuantity > 0
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
            if (selectedRentals[option.value]) {
                const quantity = quantities[option.value] || 0;
                return total + ((rentalPrice(option) ?? 0) * quantity);
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
            const assignGear = this.props.canImportGroup && this.props.onOpenExisting
                ? () => sourceId ? this.props.onOpenExisting(this.state.createdIndex,sourceId) :
                    this.props.onOpenExisting(this.state.createdIndex,undefined,this.createRequestId) : null;
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
                            {this.props.canImportGroup && !this.props.checkedInPlayer && !this.state.checkInGroup && <GroupRentalPicker pickupOnly={this.props.pickupOnly}
                                firebase={this.props.firebase} uid={this.props.uid} initialGroupId={this.state.clearedInitialGroup ? null : this.props.initialGroupId}
                                existingEntries={this.state.participants} disabled={submitting} onAdd={this.importRoster} onPrefill={this.importRoster}
                            />}
                            {!this.props.checkedInPlayer && !this.state.checkInGroup && <section className="rental-roster-review" aria-label="Rental participants">
                                <h2>Renters</h2>
                                <label>Renter name<input className="form-control" type="text" maxLength={120} autoComplete="off"
                                    value={this.state.manualName} disabled={submitting} onChange={e=>this.setState({manualName:e.target.value})}/></label>
                                <button type="button" className="btn btn-outline-primary" disabled={submitting || !this.state.manualName.trim()}
                                    onClick={()=>{
                                        const renterKey=uuid();
                                        this.setState(state=>{
                                            const participants=[...state.participants,{name:state.manualName.trim(),renterKey,rentals:[]}];
                                            return {participants,manualName:'',numParticipants:Math.max(Number(state.numParticipants)||0,participants.length)};
                                        });
                                    }}>Add renter</button>
                                {this.props.canImportGroup && <details>
                                    <summary>Add a renter from a signed waiver</summary>
                                    <StaffWaiverPicker searchWaivers={this.searchWaivers} disabled={submitting} onChoose={this.addSignedRenter}/>
                                </details>}
                                {this.state.participants.map((person,i)=><div className="rental-roster-line" key={person.ref || person.renterKey}>
                                    <strong>{person.name}</strong><button type="button" className="btn btn-outline-secondary" disabled={submitting}
                                      onClick={()=>this.setState(state=>({participants:state.participants.filter((_,index)=>index!==i),
                                          numParticipants:Math.max(1,(Number(state.numParticipants)||1)-1)}))}>
                                      Remove {person.name}</button></div>)}
                                <a href="/waiver" target="_blank" rel="noreferrer">Open the field waiver</a>
                            </section>}
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
                                                {!options.length && !this.props.catalogPending && <p role="status">No rental equipment is listed.</p>}
                                                {options.map(option => {
                                                    const remaining = availableRentalUnits(option);
                                                    const price = rentalPrice(option);
                                                    return <div key={option.value} className="rental-option-item">
                                                        <FormControlLabel
                                                            control={
                                                                <Checkbox
                                                                    checked={!!selectedRentals[option.value]}
                                                                    onChange={() => this.handleRentalSelect(option, 1)}
                                                                    disabled={submitting || !remaining || price === null}
                                                                />
                                                            }
                                                            label={
                                                                <div className="rental-option-label">
                                                                    <span>{option.label}</span>
                                                                    <span className="rental-option-price">
                                                                        {price === null ? 'Price unavailable' : '$' + price.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            }
                                                        />
                                                        {selectedRentals[option.value] && (
                                                            <div className="rental-quantity-controls">
                                                                <IconButton
                                                                    size="small" aria-label={'Remove one ' + option.label}
                                                                    onClick={() => this.handleRentalSelect(option, -1)}
                                                                    disabled={submitting}
                                                                >
                                                                    <Remove />
                                                                </IconButton>
                                                                <Typography variant="body1">
                                                                    {rentalQuantities[option.value] || 0}
                                                                </Typography>
                                                                <IconButton
                                                                    size="small" aria-label={'Add one ' + option.label}
                                                                    onClick={() => this.handleRentalSelect(option, 1)}
                                                                    disabled={
                                                                        submitting ||
                                                                        rentalQuantities[option.value] >= remaining
                                                                    }
                                                                >
                                                                    <Add />
                                                                </IconButton>
                                                            </div>
                                                        )}
                                                        <Typography variant="caption" color="textSecondary">
                                                            {remaining ? `${remaining} available` : 'Out of stock'}
                                                        </Typography>
                                                    </div>;
                                                })}
                                            </FormGroup>
                                        </FormControl>
                                        <div className="rental-total">
                                            <Typography variant="h6">
                                                Total: ${totalPrice.toFixed(2)}
                                            </Typography>
                                        </div>
                                    </Paper>
                                    {this.includedRenters().length > 0 && Number(numParticipants)>1 &&
                                        <RenterGearChoices people={this.includedRenters()} options={this.requestOptions()}
                                            onChange={this.setGearChoices} disabled={submitting}/>}
                                    <TextField label="Receipt / transaction number" value={this.state.receipt} disabled={submitting}
                                        onChange={event=>this.setState({receipt:event.target.value})} inputProps={{maxLength:120}}
                                        helperText="A receipt and a current signed waiver for every renter release the form to the armory." />
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
                                            disabled={submitting || this.props.catalogPending || totalPrice === 0}
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
