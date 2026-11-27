import { Chip, CircularProgress } from '@mui/material';
import Box from '@mui/material/Box';
import MUIButton from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Add, CheckCircle, Delete, Edit, Close, AutoAwesome } from '@mui/icons-material';
import React, { Component, useState } from 'react';
import RentalIntakeEditor from './RentalIntakeEditor';
import { activateReadyRental, needsRentalIntake, canUpgradeRental } from './utils/rentalActivation';
import { Button, Spinner } from 'react-bootstrap/';
import * as ROLES from '../../constants/roles';
import { withAuthorization } from '../../session';
import convertDate from '../../utils/convertDate';
import { archiveMonthKeys, waiverArchiveStart } from '../../utils/waiverArchive';

// import uuid from 'uuid/v4';
import { v4 as uuid } from 'uuid';

import { withFirebase } from '../../Firebase';
import GroupRentalPicker from './GroupRentalPicker';
import { isCheckInRenter } from './utils/checkInRenter';
import { editRentalInventory } from './utils/editRentalInventory';
import { GearMovementTimes } from './GearMovementTimes';
import { armoryPeople, availableRentalUnits, changeEquipment, gearRows, reservationQuantity } from './utils/rentalGear';
import { importRentalParticipants, changeOpenRental, renameRentalParticipant, rentalIdentity, rentalParticipants, rentalRows } from './utils/openRental';

import '../../../App.css';
import { get, query, orderByKey, startAt, startAfter, endAt, orderByChild, limitToFirst, limitToLast, ref as dbRef } from "firebase/database";
import TablePagination from '@mui/material/TablePagination';
import Modal from '@mui/material/Modal';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';

const AddParticipantModal = ({
    open,
    onClose,
    onAdd,
    waivers,
    searchQuery,
    onSearchChange,
    isMemberMode,
    onToggleMode,
    isLoadingMembers,
    isLoadingDigital,
    membersPage,
    membersPerPage,
    totalMembers,
    onMemberPageChange,
    digitalPage,
    digitalPerPage,
    totalDigital,
    digitalTotalKnown,
    onDigitalPageChange,
    activeMonth,
    activeDay,
    activeYear,
    months,
    days,
    years,
    onMonthChange,
    onDayChange,
    onYearChange,
}) => (
    <Modal open={open} onClose={onClose}>
        {(() => {
            const trimmedSearch = searchQuery.trim();
            const isMemberShortSearch = isMemberMode && trimmedSearch.length > 0 && trimmedSearch.length < 2;
            const isDigitalShortSearch = !isMemberMode && trimmedSearch.length > 0 && trimmedSearch.length < 2;
            const hasActiveSearch = trimmedSearch.length >= 2;
            const showDigitalDateFilters = !isMemberMode && !hasActiveSearch;
            const loadingLabel = isLoadingMembers
                ? 'Loading members...'
                : (hasActiveSearch && !isMemberMode
                    ? 'Searching waivers from the past year…'
                    : 'Updating results...');

            return (
        <Paper className="add-participant-modal" sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '94%',
            maxWidth: 860,
            maxHeight: '92vh',
            overflow: 'auto',
            p: 3,
            bgcolor: 'var(--admin-surface)',
            color: 'var(--admin-text)',
            border: '1px solid var(--admin-border)',
            boxShadow: 'var(--admin-shadow)'
        }}>
            <div className="rental-dialog-header">
                <Typography variant="h6">Add Participant</Typography>
                <IconButton onClick={onClose}>
                    <Close />
                </IconButton>
            </div>

            <div className="search-controls">
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder={isMemberMode ? "Search members by first or last name..." : "Search waivers..."}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    InputProps={{
                        endAdornment: searchQuery.trim() ? (
                            <InputAdornment position="end">
                                <IconButton
                                    size="small"
                                    onClick={() => onSearchChange('')}
                                    aria-label="Clear search"
                                >
                                    <Close fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : null
                    }}
                    sx={{ mb: 2 }}
                />
                <Typography variant="body2" className="search-status-text">
                    {isMemberShortSearch
                        ? 'Type at least 2 characters to search members by first or last name.'
                        : isDigitalShortSearch
                        ? 'Type at least 2 characters to search digital waivers by name.'
                        : trimmedSearch
                        ? (isMemberMode
                            ? `Searching members for "${trimmedSearch}".`
                            : `Searching all waivers for "${trimmedSearch}".`)
                        : (isMemberMode
                            ? 'Type at least 2 characters to search all members.'
                            : 'Tap a waiver to add participant.')}
                </Typography>
                <Box sx={{
                    display: 'flex',
                    gap: 2,
                    justifyContent: 'center',
                    mb: 2
                }}>
                    <MUIButton
                        variant={!isMemberMode ? "contained" : "outlined"}
                        onClick={() => onToggleMode('digital')}
                        size="small"
                        disabled={isLoadingMembers || isLoadingDigital}
                    >
                        Digital Waivers
                    </MUIButton>
                    <MUIButton
                        variant={isMemberMode ? "contained" : "outlined"}
                        onClick={() => onToggleMode('member')}
                        size="small"
                        disabled={isLoadingMembers || isLoadingDigital}
                    >
                        Members
                    </MUIButton>
                </Box>
            </div>

            <Box sx={{ position: 'relative', minHeight: 440 }}>
                {/* Add date filters */}
                {showDigitalDateFilters && (
                    <Box sx={{
                        display: 'flex',
                        gap: 2,
                        justifyContent: 'center',
                        mb: 2
                    }}>
                        <TextField
                            select
                            label="Month"
                            value={activeMonth}
                            onChange={(e) => onMonthChange(e.target.value)}
                            sx={{ minWidth: 120 }}
                        >
                            <MenuItem value={13}>All Months</MenuItem>
                            {months.map((month, index) => (
                                <MenuItem key={month} value={index + 1}>
                                    {month}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Day"
                            value={activeDay}
                            onChange={(e) => onDayChange(e.target.value)}
                            sx={{ minWidth: 100 }}
                        >
                            <MenuItem value={32}>All Days</MenuItem>
                            {days.map((_, index) => (
                                <MenuItem key={index} value={index + 1}>
                                    {index + 1}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Year"
                            value={activeYear}
                            onChange={(e) => onYearChange(e.target.value)}
                            sx={{ minWidth: 100 }}
                        >
                            <MenuItem value={new Date().getFullYear() + 1}>All Years</MenuItem>
                            {years.map((year) => (
                                <MenuItem key={year} value={year}>
                                    {year}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>)}
                <List sx={{
                    maxHeight: '50vh',
                    minHeight: '38vh',
                    overflow: 'auto',
                    mb: 2
                }}>
                    {waivers.length > 0 ? (
                        waivers.map((person) => (
                            <ListItem
                                key={person.ref}
                                button
                                onClick={() => onAdd(person)}
                            >
                                <ListItemText
                                    primary={person.name}
                                    secondary={person.isMember ? 'Member' : convertDate(person.date)}
                                />
                            </ListItem>
                        ))
                    ) : (
                        <ListItem>
                            <ListItemText
                                primary={hasActiveSearch
                                    ? `No matches for "${trimmedSearch}".`
                                    : 'No records found for current filters.'}
                                secondary={hasActiveSearch
                                    ? 'Try fewer characters or check spelling.'
                                    : 'Try adjusting month/day/year filters.'}
                            />
                        </ListItem>
                    )}
                </List>

                {!hasActiveSearch ? (
                    <Box sx={{
                        position: 'sticky',
                        bottom: 0,
                        bgcolor: 'var(--admin-surface)',
                        borderTop: 1,
                        borderColor: 'var(--admin-border)'
                    }}>
                        <TablePagination
                            component="div"
                            count={isMemberMode ? totalMembers : (digitalTotalKnown ? totalDigital : -1)}
                            page={isMemberMode ? membersPage : digitalPage}
                            onPageChange={isMemberMode ? onMemberPageChange : onDigitalPageChange}
                            rowsPerPage={isMemberMode ? membersPerPage : digitalPerPage}
                            rowsPerPageOptions={[50]}
                        />
                    </Box>
                ) : (
                    <Typography variant="caption" className="search-results-meta">
                        Showing {waivers.length} search result{waivers.length === 1 ? '' : 's'}
                    </Typography>
                )}

                {(isLoadingMembers || isLoadingDigital) && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            background: 'color-mix(in srgb, var(--admin-surface) 82%, transparent)',
                            backdropFilter: 'blur(1px)',
                            zIndex: 5,
                            borderRadius: 1
                        }}
                    >
                        <CircularProgress size={28} />
                        <Typography variant="caption" sx={{ mt: 1 }}>
                            {loadingLabel}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Paper>
            );
        })()}
    </Modal>
);

const TransactionDialog = ({ open, onClose, onSubmit, error, value, onChange }) => {
    return (
        <Modal
            open={open}
            onClose={onClose}
            aria-labelledby="transaction-dialog"
        >
            <Paper className="add-participant-modal" sx={{ bgcolor: 'var(--admin-surface)', color: 'var(--admin-text)' }}>
                <div className="rental-dialog-header">
                    <Typography variant="h6">Complete Rental Form</Typography>
                    <IconButton onClick={onClose}>
                        <Close />
                    </IconButton>
                </div>

                <form onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit();
                }}>
                    <TextField
                        fullWidth
                        label="Transaction Number"
                        variant="outlined"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        error={!!error}
                        helperText={error}
                        autoFocus
                        sx={{ mb: 2 }}
                    />

                    <div className="dialog-actions">
                        <MUIButton onClick={onClose}>
                            Cancel
                        </MUIButton>
                        <MUIButton
                            type="submit"
                            variant="contained"
                            color="primary"
                        >
                            Activate Form
                        </MUIButton>
                    </div>
                </form>
            </Paper>
        </Modal>
    );
};

function EquipmentNumberField({ rental, movement, label, canIssue: active, onSave, onRemove }) {
    const canIssue = active && !rental.checked;
    const savedNumber = String(rental.number ?? '');
    const [draft, setDraft] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const number = draft?.value ?? savedNumber;

    function discard() {
        setDraft(null);
        setError('');
    }

    async function save(event) {
        event.preventDefault();
        if (!canIssue || saving || !draft || !number.trim()) return;
        if (savedNumber !== draft.original && savedNumber !== number.trim()) {
            setError('Another desk changed this number. Cancel to see the current number.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await onSave(number.trim());
            discard();
        } catch (failure) {
            setError(failure.message || 'Could not save this equipment number. Try again.');
        } finally {
            setSaving(false);
        }
    }

    return <li className="rental-unit">
        <div className="rental-unit-heading">
            <strong>{label}</strong>
            {rental.checked && <CheckCircle titleAccess="Returned" fontSize="small" color="success" />}
            {canIssue && !savedNumber && <IconButton type="button" className="rental-unit-remove"
                aria-label={'Remove ' + label} disabled={saving} onClick={onRemove}>
                <Close fontSize="small" />
            </IconButton>}
        </div>
        <form className="rental-unit-number" onSubmit={save}>
            <label>Equipment number
                <input className="form-control" type="text" inputMode="numeric" autoComplete="off"
                    aria-label={label + ' equipment number'} placeholder="Enter number"
                    value={number} readOnly={!canIssue || saving}
                    onChange={e => {
                        setError('');
                        setDraft({ original: draft?.original ?? savedNumber, value: e.target.value });
                    }} />
            </label>
            {canIssue && draft && <div className="rental-unit-actions">
                <MUIButton type="submit" size="small" variant="contained" disabled={saving || !number.trim()}>
                    {saving ? 'Saving…' : 'Save number'}
                </MUIButton>
                <MUIButton type="button" size="small" variant="outlined" disabled={saving} onClick={discard}>
                    Cancel
                </MUIButton>
            </div>}
            {error && <p role="alert">{error}</p>}
        </form>
        <GearMovementTimes row={movement} />
    </li>;
}

const ParticipantCard = ({ participant, equipment, fromCheckIn, returnToCheckIn, index, canIssue, onDelete, onRemoveRental, onAddRental, availableRentals, onEditRentalNumber, onRename }) => {
    const [nameEdit, setNameEdit] = useState(null);
    const [savingName, setSavingName] = useState(false);
    const [nameMessage, setNameMessage] = useState(null);
    const [showRentalMenu, setShowRentalMenu] = useState(false);

    const rentals = participant.rentals || [];
    const unitsByLabel = new Map();
    for (const rental of rentals) {
        const units = unitsByLabel.get(rental.label) || [];
        units.push(rental);
        unitsByLabel.set(rental.label, units);
    }

    async function saveName(event) {
        event.preventDefault();
        if (savingName || !nameEdit.value.trim()) return;
        setSavingName(true);
        setNameMessage(null);
        try {
            await onRename(index, nameEdit.reviewed, nameEdit.value);
            setNameEdit(null);
            setNameMessage({ text: 'Rental name saved.' });
        } catch (error) {
            setNameMessage({ failed: true, text: error.message || 'The name could not be saved. Try again.' });
        } finally {
            setSavingName(false);
        }
    }

    // Get unique rentals with counts
    const getUniqueRentals = () => {
        // Return empty array if availableRentals is null/undefined or not an array
        if (!availableRentals || !Array.isArray(availableRentals)) {
            return [];
        }

        return availableRentals.reduce((acc, rental) => {
            const existingRental = acc.find(item => item.value === rental.value);
            if (existingRental) {
                existingRental.count += 1;
            } else {
                acc.push({
                    ...rental,
                    count: 1
                });
            }
            return acc;
        }, []);
    };

    return (
        <Paper className={'participant-card' + (fromCheckIn ? ' participant-card-checkin' : '')} elevation={2} key={index}>
            {fromCheckIn && <p className="participant-checkin-label">Selected at check-in</p>}
            <div className="participant-header">
                <Typography variant="h6">{participant.name}</Typography>
                <div className="participant-actions">
                    {onRename && !nameEdit && <MUIButton variant="outlined" size="small" startIcon={<Edit />} onClick={() => {
                        setNameEdit({ reviewed: participant, value: participant.name || '' });
                        setNameMessage(null);
                    }}>Edit name</MUIButton>}
                    <MUIButton variant="outlined" size="small" startIcon={<Add />}
                        aria-expanded={showRentalMenu} onClick={() => setShowRentalMenu(!showRentalMenu)} disabled={!canIssue}>Add Rental</MUIButton>
                    <MUIButton variant="text" size="small" color="error" startIcon={<Delete />}
                        onClick={() => onDelete(index)}>Remove Participant</MUIButton>
                </div>
            </div>

            {onRename && nameEdit && <form className="rental-name-editor" onSubmit={saveName}>
                <label>Rental player name
                    <input className="form-control" value={nameEdit.value} maxLength={120} autoFocus required
                        disabled={savingName} onChange={event => setNameEdit({ ...nameEdit, value: event.target.value })} />
                </label>
                <div className="rental-name-actions">
                    <MUIButton type="submit" variant="contained" disabled={savingName || !nameEdit.value.trim()}>
                        {savingName ? 'Saving…' : 'Save name'}
                    </MUIButton>
                    <MUIButton type="button" variant="outlined" disabled={savingName}
                        onClick={() => { setNameEdit(null); setNameMessage(null); }}>Cancel</MUIButton>
                </div>
            </form>}
            {nameMessage && <p role={nameMessage.failed ? 'alert' : 'status'}>{nameMessage.text}</p>}
            {/* Rental Items List */}
            {rentals.length > 0 && (
                <ul className="participant-rentals-list" aria-label={'Equipment for ' + participant.name}>
                    {rentals.map((rental, rentalIndex) => {
                        const units = unitsByLabel.get(rental.label);
                        const label = units.length > 1
                            ? rental.label + ' (' + (units.indexOf(rental) + 1) + ' of ' + units.length + ')' : rental.label;
                        return <EquipmentNumberField key={rental.id || rental.value + '-' + rentalIndex}
                            rental={rental} movement={equipment[rentalIndex]} label={label} canIssue={canIssue}
                            onSave={number => onEditRentalNumber(index, rentalIndex, number)}
                            onRemove={() => onRemoveRental(index, rentalIndex)} />;
                    })}
                </ul>
            )}

            {/* Quick Add Rental Menu */}
            <Collapse in={showRentalMenu}>
                <Paper className="rental-menu">
                    <div className="rental-menu-items">
                        {!availableRentals?.length && <p>No equipment available on this rental form.</p>}
                        {getUniqueRentals().map((rental, rentalIndex) => (
                            <MUIButton
                                key={rentalIndex}
                                variant="outlined"
                                onClick={() => {
                                    onAddRental(index, rental);
                                    setShowRentalMenu(false);
                                }}
                                className="rental-menu-item"
                                startIcon={<Add />}
                                disabled={rental.count === 0}
                            >
                                {rental.label} ({rental.count})
                            </MUIButton>
                        ))}
                    </div>
                </Paper>
            </Collapse>
            {fromCheckIn && returnToCheckIn && <a className="btn btn-outline-primary mt-2" href={returnToCheckIn}>Return to this player’s check-in</a>}
        </Paper>
    );
};

const SizeEditModal = ({ open, onClose, currentSize, onSave }) => {
    const [newSize, setNewSize] = useState(currentSize);

    return (
        <Modal open={open} onClose={onClose}>
            <Paper className="size-edit-modal" sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '300px',
                p: 3,
                bgcolor: 'var(--admin-surface)',
                color: 'var(--admin-text)'
            }}>
                <Typography variant="h6" mb={2}>Edit Group Size</Typography>
                <TextField
                    fullWidth
                    type="number"
                    label="Maximum Participants"
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <MUIButton onClick={onClose}>Cancel</MUIButton>
                    <MUIButton
                        variant="contained"
                        onClick={() => onSave(newSize)}
                        disabled={newSize < 1}
                    >
                        Save
                    </MUIButton>
                </Box>
            </Paper>
        </Modal>
    );
};

const InventoryEditModal = ({ onClose, available, onSave, currentOptions, createRequestId, saving, catalogPending }) => {
    const options = rentalRows(currentOptions);
    const [inventory, setInventory] = useState(() => {
        const grouped = Object.create(null);
        for (const item of rentalRows(available)) {
            const option = options.find(entry => entry.value === item.value);
            grouped[item.value] = (grouped[item.value] || 0) + reservationQuantity({ createRequestId }, item, option);
        }
        return grouped;
    });
    const [selectedRental, setSelectedRental] = useState('');
    const otherOptions = options.filter(option => !Object.prototype.hasOwnProperty.call(inventory, option.value));
    const canAdd = !catalogPending && otherOptions.some(option => option.value === selectedRental && availableRentalUnits(option) > 0);

    const handleAddRental = () => {
        if (!canAdd) return;

        // Add new rental type with initial count of 1
        setInventory(prev => ({
            ...prev,
            [selectedRental]: 1
        }));

        setSelectedRental('');
    };

    const handleDeleteRental = (value) => {
        const { [value]: _, ...rest } = inventory;
        setInventory(rest);
    };

    return (
        <Modal open onClose={onClose}>
            <Paper className="inventory-edit-modal" sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(400px, 94vw)',
                p: 3,
                maxHeight: '90vh',
                overflow: 'auto',
                bgcolor: 'var(--admin-surface)',
                color: 'var(--admin-text)'
            }}>
                <Typography variant="h6" mb={2}>Edit Available Inventory</Typography>

                {/* Add New Rental Type */}
                <Box sx={{ mb: 3, display: 'flex', gap: 1 }}>
                    <TextField
                        select
                        fullWidth
                        value={selectedRental}
                        onChange={(e) => setSelectedRental(e.target.value)}
                        disabled={catalogPending || !otherOptions.length}
                        label="Add Rental Type"
                        size="small"
                    >
                        {otherOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value} disabled={!availableRentalUnits(option)}>
                                {option.label || option.value} · {availableRentalUnits(option)} available
                            </MenuItem>
                        ))}
                    </TextField>
                    <IconButton
                        onClick={handleAddRental}
                        disabled={!canAdd}
                        aria-label="Add rental type"
                        color="primary"
                    >
                        <Add />
                    </IconButton>
                </Box>

                {/* Inventory List */}
                {Object.entries(inventory).map(([value, count]) => {
                    const label = options.find(opt => String(opt.value) === value)?.label || value;

                    return (
                        <Box key={value} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle2">
                                    {label}
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={() => handleDeleteRental(value)}
                                    color="error"
                                >
                                    <Delete fontSize="small" />
                                </IconButton>
                            </Box>
                            <TextField
                                fullWidth
                                type="number"
                                inputProps={{ min: 0, 'aria-label': label + ' quantity' }}
                                value={count}
                                onChange={(e) => setInventory(prev => ({
                                    ...prev,
                                    [value]: Math.max(0, parseInt(e.target.value) || 0)
                                }))}
                                size="small"
                            />
                        </Box>
                    );
                })}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                    <Button onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button variant="contained" disabled={saving || catalogPending} onClick={() => onSave(inventory)}>Save Changes</Button>
                </Box>
            </Paper>
        </Modal>
    );
};

function copyParticipants(participants) {
    return participants.map(person => ({ ...person, rentals: (person.rentals || []).map(item => ({ ...item })) }));
}

class EditSelectedForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            participants: [],
            availableList: [],
            options: [],
            available: [],
            error: null,
            page: 0,
            rowsPerPage: 10,
            showTransactionDialog: false,
            transaction: '',
            transactionError: null,
            showAddParticipant: false,
            waivers: [],
            searchQuery: '',
            members: [],
            isMemberMode: false,
            isLoadingMembers: false,
            isLoadingDigital: false,
            membersPage: 0,
            membersPerPage: 50,
            totalMembers: 0,
            filteredMembers: [],
            digitalPage: 0,
            digitalPerPage: 50,
            totalDigital: 0,
            digitalTotalKnown: false,
            digitalAggregateCountApplied: false,
            digitalPages: [],
            digitalHasNextPage: false,
            digitalRangeStart: null,
            digitalRangeEnd: null,
            showSizeEdit: false,
            showInventoryEdit: false,
            form: this.props.form,
            activeMonth: new Date().getMonth() + 1, // Current month (1-12)
            activeDay: 32,  // 32 represents "All Days" 
            activeYear: new Date().getFullYear(),
            days: [...Array(31).keys()].map(String),
            years: [],
            months: [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ],
        };
    };


    // Add this method after constructor
    initializeDates = () => {
        let date = new Date();
        let years = [];
        for (let i = new Date(waiverArchiveStart()).getFullYear(); i < date.getFullYear() + 1; i++) {
            years.push(i);
        }
        this.setState({ years });
    }

    getFilteredWaivers = () => {
        const {
            waivers,
            members,
            searchQuery,
            isMemberMode,
            membersPage,
            membersPerPage
        } = this.state;

        if (isMemberMode) {
            // Members are fetched server-side based on the search query
            return members;
        } else {
            // Digital waivers are filtered and paged server-side.
            return waivers;
        }
    };

    // Update the compareDate helper method to be more robust
    compareDate = (month, day, year, date2) => {
        if (!date2) return false;

        // Convert date2 to local timezone to ensure consistent comparison
        const localDate = new Date(date2);

        // If any filter is set to "All", it matches automatically
        const matchesYear = year === new Date().getFullYear() + 1 || year === localDate.getFullYear();
        const matchesMonth = month === 13 || month === localDate.getMonth() + 1;
        const matchesDay = day === 32 || day === localDate.getDate();

        return matchesYear && matchesMonth && matchesDay;
    };

    componentDidMount = async () => {
        try {
            this.setState({ loading: true });
            this.initializeDates();
            // Load digital waivers with current date filters
            const { activeMonth, activeDay, activeYear } = this.state;
            const dateRange = this.calculateDateRange(activeMonth, activeDay, activeYear);
            await this.loadDigitalWaivers(dateRange.startDate, dateRange.endDate);

            this.setState({ loading: false })
        } catch (error) {
            console.error('Error in componentDidMount:', error);
            this.setState({
                error: 'Failed to load initial data',
                loading: false
            });
        }
    };

    componentWillUnmount = () => {
        if (this.memberSearchDebounce) {
            clearTimeout(this.memberSearchDebounce);
        }
    };

    loadDigitalWaivers = async (startDate = null, endDate = null) => {
        try {
            this.setState({ isLoadingDigital: true });
            const searchTerm = this.state.searchQuery.trim().toLowerCase();

            if (searchTerm.length >= 2) {
                const globalSearchRange = this.getGlobalDigitalSearchRange();
                startDate = globalSearchRange.startDate;
                endDate = globalSearchRange.endDate;
            }

            // Default to current month if no dates provided
            if (!startDate || !endDate) {
                const now = new Date();
                startDate = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // Last day of current month
            }

            // Convert dates to timestamps for Firebase query
            const now = Date.now();
            const startTimestamp = Math.max(startDate.getTime(), waiverArchiveStart(now) + 1);
            const endTimestamp = Math.min(endDate.getTime(), now);
            if (startTimestamp > endTimestamp) {
                this.setState({ waivers: [], totalDigital: 0, digitalTotalKnown: true, digitalPages: [], digitalPage: 0, digitalHasNextPage: false, isLoadingDigital: false });
                return;
            }
            const monthKeysForSearch = archiveMonthKeys(startTimestamp, endTimestamp);

            if (searchTerm.length >= 2 && monthKeysForSearch.length > 0) {
                const searchResultsByMonth = await Promise.all(
                    monthKeysForSearch.map((key) =>
                        this.fetchDigitalSearchResults(key, searchTerm, startTimestamp, endTimestamp)
                    )
                );
                const mergedResults = searchResultsByMonth.flat();
                const uniqueByRef = new Map();
                mergedResults.forEach((item) => {
                    if (!uniqueByRef.has(item.ref)) {
                        uniqueByRef.set(item.ref, item);
                    }
                });
                const searchedWaivers = Array.from(uniqueByRef.values())
                    .sort((a, b) => b.date.getTime() - a.date.getTime());
                this.setState({
                    waivers: searchedWaivers,
                    totalDigital: searchedWaivers.length,
                    digitalTotalKnown: true,
                    digitalAggregateCountApplied: false,
                    digitalPage: 0,
                    digitalPages: [{ waivers: searchedWaivers, hasMore: false, oldestTimestamp: null }],
                    digitalHasNextPage: false,
                    digitalRangeStart: startTimestamp,
                    digitalRangeEnd: endTimestamp,
                    isLoadingDigital: false
                });
                return;
            }

            const pageResult = await this.fetchDigitalPage(startTimestamp, endTimestamp);
            const initialPages = [pageResult];
            const monthlyCount = await this.getMonthlyDigitalCountIfApplicable();
            const hasExactAggregate = monthlyCount !== null;
            this.setState({
                waivers: pageResult.waivers,
                totalDigital: hasExactAggregate ? monthlyCount : pageResult.waivers.length,
                digitalTotalKnown: hasExactAggregate || !pageResult.hasMore,
                digitalAggregateCountApplied: hasExactAggregate,
                digitalPage: 0,
                digitalPages: initialPages,
                digitalHasNextPage: pageResult.hasMore,
                digitalRangeStart: startTimestamp,
                digitalRangeEnd: endTimestamp,
                isLoadingDigital: false
            });
        } catch (error) {
            console.error('Error loading digital waivers:', error);
            this.setState({
                error: 'Failed to load digital waivers. Please verify the digital_waivers timestamp index and data.',
                waivers: [],
                totalDigital: 0,
                digitalTotalKnown: false,
                digitalAggregateCountApplied: false,
                isLoadingDigital: false
            });
        }
    };

    getMonthKeyIfSpecific = () => {
        const { activeMonth, activeYear } = this.state;
        const allYearsValue = new Date().getFullYear() + 1;
        if (activeMonth === 13 || activeYear === allYearsValue) {
            return null;
        }
        const monthKey = String(activeMonth).padStart(2, '0');
        return `${activeYear}-${monthKey}`;
    };

    getGlobalDigitalSearchRange = () => {
        const now = Date.now();
        return { startDate: new Date(waiverArchiveStart(now) + 1), endDate: new Date(now) };
    };

    getMonthlyDigitalCountIfApplicable = async () => {
        const { activeMonth, activeDay, activeYear } = this.state;
        const allYearsValue = new Date().getFullYear() + 1;
        const isSpecificMonth = activeMonth !== 13;
        const isSpecificYear = activeYear !== allYearsValue;
        const isWholeMonth = activeDay === 32;

        if (!isSpecificMonth || !isSpecificYear || !isWholeMonth || new Date(activeYear, activeMonth - 1, 1).getTime() <= waiverArchiveStart()) {
            return null;
        }

        const monthKey = String(activeMonth).padStart(2, '0');
        const ym = `${activeYear}-${monthKey}`;
        const countSnap = await get(dbRef(this.props.firebase.db, `digital_waiver_counts/${ym}/count`));

        if (!countSnap.exists()) {
            return 0;
        }

        const countValue = Number(countSnap.val());
        return Number.isFinite(countValue) ? countValue : 0;
    };

    fetchDigitalPage = async (startTimestamp, endTimestamp, upperBoundTimestamp = null) => {
        const queryEnd = upperBoundTimestamp == null ? endTimestamp : upperBoundTimestamp;
        const waiversQuery = query(
            this.props.firebase.digitalWaivers(),
            orderByChild('timestamp'),
            startAt(startTimestamp),
            endAt(queryEnd),
            limitToLast(this.state.digitalPerPage + 1)
        );
        const snapshot = await get(waiversQuery);

        if (!snapshot.exists()) {
            return { waivers: [], hasMore: false, oldestTimestamp: null };
        }

        const mapped = Object.entries(snapshot.val())
            .map(([key, value]) => {
                const timestamp = Number(value.timestamp);
                return {
                    name: value.name,
                    date: new Date(timestamp),
                    timestamp,
                    ref: key,
                    isDigital: true,
                    data: value
                };
            })
            .filter(waiver => Number.isFinite(waiver.timestamp));

        mapped.sort((a, b) => b.timestamp - a.timestamp);

        const hasMore = mapped.length > this.state.digitalPerPage;
        const waivers = hasMore ? mapped.slice(0, this.state.digitalPerPage) : mapped;
        const oldestTimestamp = waivers.length > 0 ? waivers[waivers.length - 1].timestamp : null;

        return { waivers, hasMore, oldestTimestamp };
    };

    fetchDigitalSearchResults = async (monthKey, searchTerm, startTimestamp, endTimestamp) => {
        const searchRef = dbRef(this.props.firebase.db, `digital_waiver_search/${monthKey}`);
        const searchQuery = query(
            searchRef,
            orderByChild('nameLower'),
            startAt(searchTerm),
            endAt(`${searchTerm}\uf8ff`),
            limitToFirst(500)
        );
        const snapshot = await get(searchQuery);
        if (!snapshot.exists()) {
            return [];
        }

        const matches = Object.entries(snapshot.val())
            .map(([waiverId, value]) => ({
                ref: waiverId,
                name: value.name || '',
                timestamp: Number(value.timestamp),
                isDigital: true,
                data: value.data || {}
            }))
            .filter(item => Number.isFinite(item.timestamp))
            .filter(item => item.timestamp >= startTimestamp && item.timestamp <= endTimestamp)
            .sort((a, b) => b.timestamp - a.timestamp)
            .map(item => ({
                ref: item.ref,
                name: item.name,
                date: new Date(item.timestamp),
                isDigital: true,
                data: item.data
            }));

        return matches;
    };

    loadMembers = async (searchTerm = '') => {
        const mapMember = ([key, value]) => ({
            name: value.name || value.username || '',
            date: new Date(),
            ref: key,
            isMember: true,
            data: value
        });

        const dedupeMembers = (entries) => {
            const uniqueMembers = new Map();
            entries.forEach((entry) => {
                if (!entry) {
                    return;
                }

                if (!uniqueMembers.has(entry.ref)) {
                    uniqueMembers.set(entry.ref, entry);
                }
            });

            return Array.from(uniqueMembers.values())
                .filter((member) => member.name)
                .sort((a, b) => a.name.localeCompare(b.name))
                .slice(0, this.state.membersPerPage);
        };

        try {
            this.setState({ isLoadingMembers: true });
            const normalizedSearch = searchTerm.trim().toLowerCase();
            if (normalizedSearch.length < 2) {
                this.setState({
                    members: [],
                    totalMembers: 0,
                    isLoadingMembers: false
                });
                return;
            }

            const limit = this.state.membersPerPage;
            const byField = async field => {
                const matches = [];
                let lowerBound = startAt(normalizedSearch);
                while (matches.length < limit) {
                    const page = await get(query(this.props.firebase.users(), orderByChild(field), lowerBound,
                        endAt(normalizedSearch + '\uf8ff'), limitToFirst(limit)));
                    let count = 0;
                    let last;
                    page.forEach(row => {
                        const record = row.val();
                        count++;
                        last = [record[field], row.key];
                        if (!record.accountRemovedAt) matches.push(mapMember([row.key, record]));
                    });
                    // Read another page only when archived rows displaced active matches.
                    if (count < limit || matches.length >= limit) break;
                    lowerBound = startAfter(...last);
                }
                return matches;
            };
            const batches = await Promise.all(['usernameLower', 'nameLower'].map(byField));
            const mergedMembers = dedupeMembers(batches.flat());

            this.setState({
                members: mergedMembers,
                totalMembers: mergedMembers.length,
                isLoadingMembers: false
            });
        } catch (error) {
            console.error('Error loading members:', error);
            const message = (error && error.message) || '';
            this.setState({
                error: message.includes('Index not defined')
                    ? 'Member search index is not configured yet. Add database indexes for usernameLower and nameLower to enable fast full-database search.'
                    : 'Failed to load members',
                members: [],
                totalMembers: 0,
                isLoadingMembers: false
            });
        }
    };

    handleSearchChange = (value) => {
        this.setState({ searchQuery: value, membersPage: 0, digitalPage: 0 });

        if (this.memberSearchDebounce) {
            clearTimeout(this.memberSearchDebounce);
        }

        this.memberSearchDebounce = setTimeout(() => {
            if (this.state.isMemberMode) {
                this.loadMembers(value);
                return;
            }

            const { activeMonth, activeDay, activeYear } = this.state;
            const dateRange = this.calculateDateRange(activeMonth, activeDay, activeYear);
            this.loadDigitalWaivers(dateRange.startDate, dateRange.endDate);
        }, 300);
    };

    toggleMode = async (mode) => {
        // Don't allow toggle if currently loading
        if (this.state.isLoadingMembers || this.state.isLoadingDigital) {
            return;
        }

        this.setState({
            isMemberMode: mode === 'member',
            searchQuery: ''
        });

        try {
            if (mode === 'member' && this.state.members.length === 0) {
                this.setState({ isLoadingMembers: true });
                await this.loadMembers();
            } else if (mode === 'digital' && this.state.waivers.length === 0) {
                // Load digital waivers with current date filters
                const { activeMonth, activeDay, activeYear } = this.state;
                const dateRange = this.calculateDateRange(activeMonth, activeDay, activeYear);
                await this.loadDigitalWaivers(dateRange.startDate, dateRange.endDate);
            }
        } catch (error) {
            console.error('Error toggling mode:', error);
            this.setState({
                error: 'Failed to load data',
                isLoadingMembers: false,
                isLoadingDigital: false
            });
        }
    };

    handleTransactionSubmit = () => {
        const { transaction } = this.state;
        if (!transaction.trim()) {
            this.setState({ transactionError: 'Transaction number is required' });
            return;
        }

        const {form,firebase,uid}=this.props;
        const receipt=transaction.trim();
        changeOpenRental(firebase.rentalGroup(form.key), current=>{
            if (current.complete) return current;
            if (current.transaction && current.transaction!==receipt) return undefined;
            return {...current,armoryVersion:1,transaction:receipt};
        },rentalIdentity(form)).then(async current=>{
            const message=await activateReadyRental(firebase,uid,{...current,key:form.key});
            this.setState({showTransactionDialog:false,transactionError:null,error:message || null});
        }).catch(error=>{
            this.setState({transactionError:error.message || 'Failed to save the transaction.'});
        });
    }

    saveForm = fields => {
        const { form, firebase } = this.props;
        return changeOpenRental(firebase.rentalGroup(form.key), current => ({ ...current, ...fields }), rentalIdentity(form));
    };

    addCheckedInRenter = async () => {
        const { checkedInPlayer, verifyCheckedInPlayer, form } = this.props;
        if (this.addingCheckedInRenter || !checkedInPlayer || !form.checkInGroup?.id) return;
        this.addingCheckedInRenter = true;
        this.setState({ addingFromCheckIn: true, error: null });
        try {
            const player = await verifyCheckedInPlayer();
            if (player.groupId !== form.checkInGroup.id || player.groupEntryId !== checkedInPlayer.groupEntryId) {
                throw new Error('The player’s group changed. Return to check-in to refresh their record.');
            }
            await this.importGroup(form.checkInGroup, [{ id: player.groupEntryId, playerId: player.playerId, displayName: player.displayName }]);
        } catch (error) {
            this.setState({ error: error.message || 'Could not add this player. Please retry.' });
        } finally {
            this.addingCheckedInRenter = false;
            this.setState({ addingFromCheckIn: false });
        }
    };

    importGroup = async (group, entries) => {
        const { firebase, uid, canImportGroup, form } = this.props;
        if (!canImportGroup || !uid || uid !== firebase.auth.currentUser?.uid) throw new Error('Sign in to the rental desk again.');
        await importRentalParticipants(firebase.rentalGroups(), form.key, group, entries, rentalIdentity(form));
    };

    // A second desk can add arrivals while equipment is being issued. Keep newer
    // participants, and reject changes to rows or inventory that this desk edited.
    saveRoster = (fields) => {
        const { form, firebase } = this.props;
        return changeOpenRental(firebase.rentalGroup(form.key), current => {
            const previous = form.participants ?? [];
            const latest = rentalParticipants(current.participants);
            if (latest.length < previous.length || JSON.stringify(latest.slice(0, previous.length)) !== JSON.stringify(previous)) return;
            if (fields.available && JSON.stringify(rentalRows(current.available)) !== JSON.stringify(form.available ?? [])) return;
            return { ...current, ...fields, participants: [...fields.participants, ...latest.slice(previous.length)] };
        }, rentalIdentity(form));
    };

    addParticipant = async (person) => {
        if (person.isMember) {
            try {
                const member = (await get(this.props.firebase.user(person.ref))).val();
                if (!member || member.accountRemovedAt) {
                    this.setState({ error: 'This player account was removed. Search again to add a current member.', showAddParticipant: false });
                    return;
                }
            } catch {
                this.setState({ error: 'Could not verify this player account. Try the member search again.', showAddParticipant: false });
                return;
            }
        }
        const { participants } = this.props.form;

        // Check if participant already exists
        const exists = participants?.some(p => p.ref === person.ref);
        if (exists) {
            this.setState({ error: 'Participant already added to this form' });
            return;
        }

        // Create new participant object
        const newParticipant = {
            ref: person.isMember ? person.ref : person.isDigital ? person.ref : person.fullName,
            name: person.name,
            rentals: [],
            date: person.date.toISOString(),
            isDigital: person.isDigital || false,
            isMember: person.isMember || false
        };

        // Update state and firebase
        const updatedParticipants = [...participants ?? [], newParticipant];
        try {
            await this.saveRoster({
                participants: updatedParticipants
            });

            this.setState({
                participants: updatedParticipants,
                showAddParticipant: false,
                error: null
            });
        } catch (error) {
            console.error('Error adding participant:', error);
            this.setState({ error: 'Failed to add participant' });
        }
    };

    handleChangePage = (event, newPage) => {
        this.setState({ page: newPage });
    };

    handleChangeRowsPerPage = (event) => {
        this.setState({
            rowsPerPage: parseInt(event.target.value, 10),
            page: 0
        });
    };

    handleRenameParticipant = (index, reviewed, name) => {
        const { firebase, form } = this.props;
        return renameRentalParticipant(firebase.rentalGroup(form.key), form, index, reviewed, name);
    };

    handleDeleteParticipant = (index) => {
        // Use props.form instead of state to get the latest data
        const { participants, available } = this.props.form;
        const updatedParticipants = copyParticipants(participants);
        const removedParticipant = updatedParticipants[index];
        if (participants[index]?.armoryIssuedAt || participants[index]?.rentals?.some(item => item.number || item.issuedAt || item.checked)) {
            this.setState({ error: 'Keep this participant on the form to preserve their issued equipment history.' });
            return;
        }


        // Return all rentals back to availableList
        const updatedAvailableList = available ? [...available] : [];
        if (removedParticipant?.rentals && removedParticipant?.rentals?.length > 0) {
            // Add removed participant's rentals to the available list
            removedParticipant.rentals.forEach(rental => {
                updatedAvailableList.push({
                    ...rental,
                    id: rental.id || uuid(),
                    number: '', // Reset number
                    checked: false // Reset checked status
                });
            });
        }

        // Remove the participant
        updatedParticipants.splice(index, 1);

        // Update Firebase with the changes
        this.saveRoster({
            participants: updatedParticipants,
            available: updatedAvailableList
        }).catch(error => {
            console.error("Error deleting participant:", error);
        });
    }

    handleRemoveRental = async (participantIndex, rentalIndex) => {
        const { participants, available } = this.props.form;

        if (!participants?.[participantIndex]?.rentals?.[rentalIndex]) {
            console.error('Invalid rental removal attempt');
            return;
        }

        if (participants[participantIndex].armoryIssuedAt || participants[participantIndex].rentals[rentalIndex].number || participants[participantIndex].rentals[rentalIndex].checked) {
            this.setState({ error: 'Use Swaps & returns for issued equipment.' });
            return;
        }
        try {
            const updatedParticipants = copyParticipants(participants);
            let updatedAvailableList = available ? [...available] : [];

            // Get the rental to be removed
            const removedRental = updatedParticipants[participantIndex].rentals[rentalIndex];

            // Remove rental from participant
            updatedParticipants[participantIndex].rentals.splice(rentalIndex, 1);

            // Reset rental properties and add back to available list
            const returnedRental = {
                ...removedRental,
                id: removedRental.id || uuid(),
                number: '', // Reset number
                checked: false // Reset checked status
            };

            updatedAvailableList.push(returnedRental);

            // Update firebase
            await this.saveRoster({
                participants: updatedParticipants,
                available: updatedAvailableList
            });

        } catch (error) {
            console.error('Error removing rental:', error);
            this.setState({ error: 'Failed to remove rental' });
        }
    };

    handleEditRentalNumber = (participantIndex, rentalIndex, number) => {
        const { form, firebase } = this.props;
        const row = gearRows(form).find(item => item.personKey === String(participantIndex) && item.unitKey === String(rentalIndex));
        if (!row || !form.complete) throw new Error('Reopen the activated rental form to number this item.');
        return changeEquipment(firebase, form, [row], 'assign', number);
    };

    getAvailableItemsSummary = () => {
        const availableList = this.props.form.available;

        // Return empty array if availableList is null/undefined
        if (!availableList || !Array.isArray(availableList)) {
            return [];
        }

        // Create a summary of available items by counting occurrences
        const summary = availableList.reduce((acc, item) => {
            const existingItem = acc.find(i => i.value === item.value);
            if (existingItem) {
                existingItem.count += 1;
            } else {
                acc.push({
                    label: item.label,
                    value: item.value,
                    count: 1
                });
            }
            return acc;
        }, []);

        return summary;
    };

    handleAddRental = async (participantIndex, rental) => {
        const { participants, available } = this.props.form;
        if (participants?.[participantIndex]?.armoryIssuedAt) {
            this.setState({error:'Use Swaps & returns for a renter whose equipment has been handed out.'});
            return;
        }

        // Create updated participants array
        const updatedParticipants = copyParticipants(participants);
        const participant = updatedParticipants[participantIndex];

        if (!participant.rentals) {
            participant.rentals = [];
        }

        const updatedAvailableList = [...available];
        const similarItems = updatedAvailableList.filter(item => item.value === rental.value);

        if (similarItems.length > 0) {
            // Remove one instance of this rental type
            const removeIndex = updatedAvailableList.findIndex(item => item.value === rental.value);
            const [removedRental] = updatedAvailableList.splice(removeIndex, 1);

            // Add to participant's rentals
            participant.rentals.push({
                ...removedRental,
                id: removedRental.id || uuid(),
                number: '',
                checked: false
            });

            try {
                await this.saveRoster({ participants: updatedParticipants, available: updatedAvailableList });

                this.setState({
                    participants: updatedParticipants,
                    availableList: updatedAvailableList
                });
            } catch (error) {
                console.error('Error updating rental:', error);
                this.setState({ error: 'Failed to update rental' });
            }
        }
    };

    handleApplyToAll = async () => {
        if (this.props.form.participants?.some(person=>person.armoryIssuedAt)) {
            this.setState({error:'Assign new requests individually. Issued equipment can be changed through Swaps & returns.'});
            return;
        }
        const { participants, available } = this.props.form;

        if (!participants || !available || participants.length === 0 || available.length === 0) {
            console.log('No participants or available rentals to distribute');
            return;
        }

        try {
            const updatedParticipants = copyParticipants(participants);
            let updatedAvailableList = [...available];

            // Group available items by type
            const availableByType = updatedAvailableList.reduce((acc, item) => {
                if (!acc[item.value]) {
                    acc[item.value] = [];
                }
                acc[item.value].push(item);
                return acc;
            }, {});

            // For each type of rental
            for (const [rentalType, items] of Object.entries(availableByType)) {
                // For each available item of this type
                for (const item of items) {
                    // Find first participant without this type of rental
                    const participantIndex = updatedParticipants.findIndex(participant => {
                        const hasThisRentalType = participant.rentals?.some(rental =>
                            rental.value === rentalType
                        );
                        return !hasThisRentalType;
                    });

                    // If we found a participant who needs this rental
                    if (participantIndex !== -1) {
                        // Remove item from available list
                        const removeIndex = updatedAvailableList.findIndex(available =>
                            available.id === item.id
                        );
                        const [removedRental] = updatedAvailableList.splice(removeIndex, 1);

                        // Initialize rentals array if needed
                        if (!updatedParticipants[participantIndex].rentals) {
                            updatedParticipants[participantIndex].rentals = [];
                        }

                        // Add to participant's rentals
                        updatedParticipants[participantIndex].rentals.push({
                            ...removedRental,
                            id: removedRental.id || uuid(),
                            number: '',
                            checked: false
                        });

                        console.log(`Added ${rentalType} to participant ${participantIndex + 1}`);
                    }
                }
            }

            // Update firebase
            await this.saveRoster({
                participants: updatedParticipants,
                available: updatedAvailableList
            });

            console.log('Successfully distributed rentals to participants');

        } catch (error) {
            console.error('Error applying rentals to all:', error);
            this.setState({ error: 'Failed to apply rentals to all participants' });
        }
    };

    // Handle member page change
    handleMemberPageChange = (event, newPage) => {
        this.setState({ membersPage: newPage });
    };

    // Add handler for digital waiver pagination
    handleDigitalPageChange = async (event, newPage) => {
        const { digitalPage, digitalPages, digitalRangeStart, isLoadingDigital, digitalAggregateCountApplied, totalDigital } = this.state;
        if (isLoadingDigital || newPage === digitalPage) return;

        if (newPage < digitalPage && digitalPages[newPage]) {
            const pageData = digitalPages[newPage];
            const digitalTotalKnown = !pageData.hasMore;
            const computedTotalDigital = digitalTotalKnown
                ? (newPage * this.state.digitalPerPage) + pageData.waivers.length
                : 0;

            this.setState({
                digitalPage: newPage,
                waivers: pageData.waivers,
                digitalHasNextPage: digitalPages[newPage + 1] ? true : pageData.hasMore,
                totalDigital: digitalAggregateCountApplied ? totalDigital : computedTotalDigital,
                digitalTotalKnown: digitalAggregateCountApplied ? true : digitalTotalKnown
            });
            return;
        }

        if (newPage === digitalPage + 1) {
            if (digitalPages[newPage]) {
                const pageData = digitalPages[newPage];
                const digitalTotalKnown = !pageData.hasMore;
                const computedTotalDigital = digitalTotalKnown
                    ? (newPage * this.state.digitalPerPage) + pageData.waivers.length
                    : 0;

                this.setState({
                    digitalPage: newPage,
                    waivers: pageData.waivers,
                    digitalHasNextPage: pageData.hasMore,
                    totalDigital: digitalAggregateCountApplied ? totalDigital : computedTotalDigital,
                    digitalTotalKnown: digitalAggregateCountApplied ? true : digitalTotalKnown
                });
                return;
            }

            const currentPageData = digitalPages[digitalPage];
            const oldest = currentPageData?.oldestTimestamp;
            if (!oldest || !digitalRangeStart) return;

            this.setState({ isLoadingDigital: true });
            try {
                const nextPageData = await this.fetchDigitalPage(digitalRangeStart, oldest - 1);
                const updatedPages = [...digitalPages];
                updatedPages[newPage] = nextPageData;

                const digitalTotalKnown = !nextPageData.hasMore;
                const computedTotalDigital = digitalTotalKnown
                    ? (newPage * this.state.digitalPerPage) + nextPageData.waivers.length
                    : 0;

                this.setState({
                    digitalPage: newPage,
                    waivers: nextPageData.waivers,
                    digitalPages: updatedPages,
                    digitalHasNextPage: nextPageData.hasMore,
                    totalDigital: digitalAggregateCountApplied ? totalDigital : computedTotalDigital,
                    digitalTotalKnown: digitalAggregateCountApplied ? true : digitalTotalKnown,
                    isLoadingDigital: false
                });
            } catch (error) {
                console.error('Error loading next digital waivers page:', error);
                this.setState({
                    error: 'Failed to load more digital waivers',
                    isLoadingDigital: false
                });
            }
        }
    };

    // Handle date filter changes and reload waivers
    handleDateFilterChange = async (type, value) => {
        const newState = {};
        newState[`active${type.charAt(0).toUpperCase() + type.slice(1)}`] = value;
        newState.digitalPage = 0;

        await this.setState(newState);

        // Reload digital waivers with new date range
        if (!this.state.isMemberMode) {
            const { activeMonth, activeDay, activeYear } = this.state;
            const dateRange = this.calculateDateRange(activeMonth, activeDay, activeYear);
            await this.loadDigitalWaivers(dateRange.startDate, dateRange.endDate);
        }
    };

    // Calculate date range based on selected filters
    calculateDateRange = (month, day, year) => {
        const now = new Date();
        let startDate, endDate;

        if (year === now.getFullYear() + 1) {
            return this.getGlobalDigitalSearchRange();
        } else {
            if (month === 13) {
                // All months in selected year
                startDate = new Date(year, 0, 1);
                endDate = new Date(year, 11, 31);
            } else {
                if (day === 32) {
                    // All days in selected month/year
                    startDate = new Date(year, month - 1, 1);
                    endDate = new Date(year, month, 0); // Last day of the month
                } else {
                    // Specific date
                    startDate = new Date(year, month - 1, day);
                    endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
                }
            }
        }

        return { startDate, endDate };
    };

    handleSizeUpdate = async (newSize) => {
        try {
            await this.saveForm({
                size: newSize
            });
            this.setState({
                size: newSize,
                showSizeEdit: false
            });
        } catch (error) {
            console.error('Error updating size:', error);
            this.setState({ error: 'Failed to update group size' });
        }
    };

    handleInventoryUpdate = async quantities => {
        if (!this.state.inventoryReview || this.savingInventory) return;
        this.savingInventory = true;
        this.setState({ savingInventory: true, error: null });
        try {
            await editRentalInventory(this.props.firebase.rentals(), this.state.inventoryReview, quantities);
            this.setState({ showInventoryEdit: false, inventoryReview: null });
        } catch (error) {
            this.setState({ showInventoryEdit: false, inventoryReview: null, error: error.message || 'Failed to update inventory.' });
        } finally {
            this.savingInventory = false;
            this.setState({ savingInventory: false });
        }
    };

    render() {
        const {
            loading,
            participants,
            availableList,
            showAddParticipant,
            searchQuery,
            membersPage,
            membersPerPage,
            totalMembers,
            isMemberMode,
        } = this.state;

        if (loading) {
            return <div className="spinner-container"><Spinner animation="border" /></div>;
        }

        const filteredWaivers = this.getFilteredWaivers();
        const player = this.props.checkedInPlayer;
        const equipment = this.props.equipmentByParticipant || armoryPeople(this.props.form).map(person => person.rows);
        const displayed = (this.props.form.participants || []).map((participant, index) =>
            ({ participant, index, selected: isCheckInRenter(participant, player) }));
        if (player) displayed.sort((a, b) => Number(b.selected) - Number(a.selected));

        return (
            <div className="rental-management">
                <Paper className="form-header">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" style={{ marginLeft: '1rem' }}>
                            Rental Form
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {this.props.onOpenReturns && <MUIButton variant="contained" onClick={() => this.props.onOpenReturns(this.props.form.key)}>Swaps &amp; returns</MUIButton>}
                            <MUIButton
                                startIcon={<Edit />}
                                onClick={() => this.setState({ showSizeEdit: true })}
                            >
                                Edit Size ({this.props.form.size})
                            </MUIButton>
                            <MUIButton
                                startIcon={<Edit />}
                                disabled={this.props.catalogPending}
                                onClick={() => this.setState({ showInventoryEdit: true, inventoryReview: {
                                    key: this.props.form.key, identity: rentalIdentity(this.props.form),
                                    available: rentalRows(this.props.form.available),
                                } })}
                            >
                                Edit Inventory
                            </MUIButton>
                        </Box>
                    </Box>
                </Paper>

                {/* Summary of Available Items */}
                <Paper className="available-rentals-summary">
                    <Typography variant="h6">Available Rentals</Typography>
                    <div className="summary-chips">
                        {this.getAvailableItemsSummary().map(item => (
                            <Chip
                                key={item.label}
                                label={`${item.label} (${item.count})`}
                                color="primary"
                                variant="outlined"
                            />
                        ))}
                    </div>
                </Paper>

                {this.props.canImportGroup && (needsRentalIntake(this.props.form) || canUpgradeRental(this.props.form)) &&
                    <RentalIntakeEditor form={this.props.form} firebase={this.props.firebase} uid={this.props.uid}/>}
                <div className="edit-form-actions">
                    {!this.props.form.complete && this.props.form.armoryVersion!==1 && <MUIButton variant="outlined"
                        onClick={() => this.setState({showTransactionDialog:true})}>Activate Form</MUIButton>}
                    <MUIButton variant="contained" color="primary" startIcon={<Add />} disabled={!this.props.canImportGroup}
                        onClick={() => this.setState({showAddParticipant:true})}>Add Participant</MUIButton>
                    {this.props.form.complete && <MUIButton variant="contained" color="secondary" startIcon={<AutoAwesome />}
                        onClick={this.handleApplyToAll} disabled={!this.props.form?.available?.length || !this.props.form?.participants?.length}>
                        Apply to All</MUIButton>}
                </div>
                {this.state.error && <p role="alert">{this.state.error}</p>}
                {this.props.canImportGroup && <GroupRentalPicker pickupOnly={this.props.pickupOnly} firebase={this.props.firebase} uid={this.props.uid}
                    linkedGroupId={this.props.form.checkInGroup?.id} initialGroupId={this.props.form.checkInGroup?.id || this.props.initialGroupId}
                    existingEntries={this.props.form.participants || []} onAdd={this.importGroup} />}

                {player && this.props.canImportGroup && player.groupEntryId && player.groupId === this.props.form.checkInGroup?.id &&
                    !displayed.some(row => row.selected) && <section className="rental-checkin-return">
                        <strong>{player.displayName}</strong>
                        <button type="button" className="btn btn-primary" disabled={this.state.addingFromCheckIn}
                            onClick={this.addCheckedInRenter}>{this.state.addingFromCheckIn ? 'Adding player…' : 'Add checked-in player to this rental'}</button>
                    </section>}

                {/* Participants Grid */}
                <div className="participant-grid">
                    {displayed.map(({ participant, index, selected }) => (
                        <ParticipantCard
                            key={participant.groupEntryId || participant.ref || index}
                            participant={participant}
                            equipment={equipment[index]}
                            fromCheckIn={selected}
                            returnToCheckIn={this.props.returnToCheckIn}
                            canIssue={Boolean(this.props.form.complete && !participant.armoryIssuedAt && (this.props.form.armoryVersion!==1 || participant.waiverProof))}
                            index={index}
                            onDelete={this.handleDeleteParticipant}
                            onRename={this.props.canImportGroup ? this.handleRenameParticipant : null}
                            onRemoveRental={this.handleRemoveRental}
                            onAddRental={this.handleAddRental}
                            onEditRentalNumber={this.handleEditRentalNumber}
                            availableRentals={this.props.form?.available}
                        />
                    ))}
                </div>

                {/* Add Participant Modal */}
                <AddParticipantModal
                    open={showAddParticipant}
                    onClose={() => this.setState({ showAddParticipant: false })}
                    onAdd={this.addParticipant}
                    waivers={filteredWaivers}
                    searchQuery={searchQuery}
                    onSearchChange={this.handleSearchChange}
                    isMemberMode={isMemberMode}
                    onToggleMode={this.toggleMode}
                    isLoadingMembers={this.state.isLoadingMembers}
                    isLoadingDigital={this.state.isLoadingDigital}
                    membersPage={membersPage}
                    membersPerPage={membersPerPage}
                    totalMembers={totalMembers}
                    onMemberPageChange={this.handleMemberPageChange}
                    digitalPage={this.state.digitalPage}
                    digitalPerPage={this.state.digitalPerPage}
                    totalDigital={this.state.totalDigital}
                    digitalTotalKnown={this.state.digitalTotalKnown}
                    onDigitalPageChange={this.handleDigitalPageChange}
                    activeMonth={this.state.activeMonth}
                    activeDay={this.state.activeDay}
                    activeYear={this.state.activeYear}
                    months={this.state.months}
                    days={this.state.days}
                    years={this.state.years}
                    onMonthChange={(value) => this.handleDateFilterChange('month', value)}
                    onDayChange={(value) => this.handleDateFilterChange('day', value)}
                    onYearChange={(value) => this.handleDateFilterChange('year', value)}
                />

                {/* Transaction Dialog */}
                <TransactionDialog
                    open={this.state.showTransactionDialog}
                    onClose={() => this.setState({ showTransactionDialog: false })}
                    onSubmit={this.handleTransactionSubmit}
                    error={this.state.transactionError}
                    value={this.state.transaction}
                    onChange={(value) => this.setState({ transaction: value })}
                />

                <SizeEditModal
                    open={this.state.showSizeEdit}
                    onClose={() => this.setState({ showSizeEdit: false })}
                    currentSize={this.props.form.size}
                    onSave={this.handleSizeUpdate}
                />

                {this.state.showInventoryEdit && <InventoryEditModal
                    catalogPending={this.props.catalogPending}
                    onClose={() => { if (!this.savingInventory) this.setState({ showInventoryEdit: false, inventoryReview: null }); }}
                    saving={this.state.savingInventory}
                    available={this.state.inventoryReview?.available}
                    onSave={this.handleInventoryUpdate}
                    createRequestId={this.props.form.createRequestId}
                    currentOptions={this.props.rentalOptions}
                />}
            </div>
        );
    }
}


const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default withAuthorization(condition)(withFirebase(EditSelectedForm));
