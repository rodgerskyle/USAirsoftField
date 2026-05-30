import { Chip, CircularProgress } from '@mui/material';
import Box from '@mui/material/Box';
import MUIButton from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Add, Cancel, CheckCircle, Delete, Edit, Close, AutoAwesome } from '@mui/icons-material';
import React, { Component, useState, useEffect } from 'react';
import { Button, Spinner } from 'react-bootstrap/';
import * as ROLES from '../../constants/roles';
import { withAuthorization } from '../../session';
import convertDate from '../../utils/convertDate';

// import uuid from 'uuid/v4';
import { v4 as uuid } from 'uuid';

import { withFirebase } from '../../Firebase';

import '../../../App.css';
import { get, update, onValue, set, query, orderByKey, startAt, endAt, orderByChild, limitToFirst, limitToLast, ref as dbRef } from "firebase/database";
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
            border: '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)'
        }}>
            <div className="modal-header">
                <Typography variant="h6">Add Participant</Typography>
                <IconButton onClick={onClose}>
                    <Close />
                </IconButton>
            </div>

            <div className="search-controls">
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder={isMemberMode ? "Search members..." : "Search waivers..."}
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
                    {searchQuery.trim()
                        ? (isMemberMode
                            ? `Searching members for "${searchQuery.trim()}".`
                            : `Searching all waivers in selected dates for "${searchQuery.trim()}".`)
                        : (isMemberMode
                            ? 'Type to search members.'
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
                {!isMemberMode && (
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
                                primary={searchQuery.trim()
                                    ? `No matches for "${searchQuery.trim()}".`
                                    : 'No records found for current filters.'}
                                secondary={searchQuery.trim()
                                    ? 'Try fewer characters or check spelling.'
                                    : 'Try adjusting month/day/year filters.'}
                            />
                        </ListItem>
                    )}
                </List>

                {!searchQuery.trim() ? (
                    <Box sx={{
                        position: 'sticky',
                        bottom: 0,
                        bgcolor: 'background.paper',
                        borderTop: 1,
                        borderColor: 'divider'
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
                            background: 'rgba(255,255,255,0.72)',
                            backdropFilter: 'blur(1px)',
                            zIndex: 5,
                            borderRadius: 1
                        }}
                    >
                        <CircularProgress size={28} />
                        <Typography variant="caption" sx={{ mt: 1 }}>
                            Updating results...
                        </Typography>
                    </Box>
                )}
            </Box>
        </Paper>
    </Modal>
);

const TransactionDialog = ({ open, onClose, onSubmit, error, value, onChange }) => {
    return (
        <Modal
            open={open}
            onClose={onClose}
            aria-labelledby="transaction-dialog"
        >
            <Paper className="add-participant-modal">
                <div className="modal-header">
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

const ParticipantCard = ({ participant, index, onDelete, onRemoveRental, onAddRental, availableRentals, onEditRentalNumber }) => {
    const [showRentalMenu, setShowRentalMenu] = useState(false);
    const [editingRental, setEditingRental] = useState(null);
    const [tempNumber, setTempNumber] = useState('');

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

    const handleEditNumber = (rental, rentalIndex) => {
        setEditingRental(rentalIndex);
        setTempNumber(rental.number || '');
    };

    const handleSubmitNumber = (rentalIndex) => {
        if (tempNumber.trim()) {
            onEditRentalNumber(index, rentalIndex, tempNumber.trim());
        }
        setEditingRental(null);
        setTempNumber('');
    };

    const handleCancelEdit = () => {
        setEditingRental(null);
        setTempNumber('');
    };

    return (
        <Paper className="participant-card" elevation={2} key={index}>
            <div className="participant-header">
                <Typography variant="h6">{participant.name}</Typography>
                <div className="participant-actions">
                    <IconButton
                        onClick={() => setShowRentalMenu(!showRentalMenu)}
                        color="primary"
                        title="Add Rental"
                    >
                        <Add />
                    </IconButton>
                    <IconButton
                        onClick={() => onDelete(index)}
                        color="error"
                        title="Remove Participant"
                    >
                        <Delete />
                    </IconButton>
                </div>
            </div>

            {/* Rental Items List */}
            {participant.rentals && participant.rentals.length > 0 && (
                <div className="participant-rentals-list">
                    {participant.rentals?.map((rental, rentalIndex) => (
                        <div key={rentalIndex} className="rental-item">
                            <div className="rental-content">
                                <Chip
                                    label={rental.label}
                                    onDelete={() => onRemoveRental(index, rentalIndex)}
                                    className="rental-chip"
                                    icon={rental.checked ? <CheckCircle color="success" /> : null}
                                />
                                {editingRental === rentalIndex ? (
                                    <Paper component="form" className="rental-number-edit"
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleSubmitNumber(rentalIndex);
                                        }}
                                    >
                                        <InputBase
                                            value={tempNumber}
                                            onChange={(e) => setTempNumber(e.target.value)}
                                            placeholder="Rental #"
                                            type="number"
                                            autoFocus
                                            className="rental-number-input"
                                        />
                                        <IconButton size="small" type="submit">
                                            <CheckCircle fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" onClick={handleCancelEdit}>
                                            <Cancel fontSize="small" />
                                        </IconButton>
                                    </Paper>
                                ) : (
                                    <Typography
                                        variant="caption"
                                        className="rental-number"
                                        onClick={() => handleEditNumber(rental, rentalIndex)}
                                    >
                                        {rental.number || 'Set #'}
                                    </Typography>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Quick Add Rental Menu */}
            <Collapse in={showRentalMenu}>
                <Paper className="rental-menu">
                    <div className="rental-menu-items">
                        {getUniqueRentals().map((rental, rentalIndex) => (
                            <Button
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
                            </Button>
                        ))}
                    </div>
                </Paper>
            </Collapse>
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
                p: 3
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

const InventoryEditModal = ({ open, onClose, available, onSave, currentOptions }) => {
    const [inventory, setInventory] = useState({});
    const [selectedRental, setSelectedRental] = useState('');

    useEffect(() => {
        // Group available items by type
        if (!available || !Array.isArray(available)) {
            setInventory([])
            return;
        }

        const grouped = available.reduce((acc, item) => {
            acc[item.value] = (acc[item.value] || 0) + 1;
            return acc;
        }, {});
        setInventory(grouped);
    }, [available]);

    // Get rental options that aren't in inventory
    const getAvailableOptions = () => {
        return currentOptions.filter(option =>
            !inventory.hasOwnProperty(option.value)
        );
    };

    const handleAddRental = () => {
        if (!selectedRental) return;

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
        <Modal open={open} onClose={onClose}>
            <Paper sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '400px',
                p: 3,
                maxHeight: '90vh',
                overflow: 'auto'
            }}>
                <Typography variant="h6" mb={2}>Edit Available Inventory</Typography>

                {/* Add New Rental Type */}
                <Box sx={{ mb: 3, display: 'flex', gap: 1 }}>
                    <TextField
                        select
                        fullWidth
                        value={selectedRental}
                        onChange={(e) => setSelectedRental(e.target.value)}
                        label="Add Rental Type"
                        size="small"
                    >
                        {getAvailableOptions().map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>
                    <IconButton
                        onClick={handleAddRental}
                        disabled={!selectedRental}
                        color="primary"
                    >
                        <Add />
                    </IconButton>
                </Box>

                {/* Inventory List */}
                {Object.entries(inventory).map(([value, count]) => {
                    const label = currentOptions.find(opt => opt.value === value)?.label || value;

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
                                value={count}
                                onChange={(e) => setInventory(prev => ({
                                    ...prev,
                                    [value]: Math.max(0, parseInt(e.target.value) || 0)
                                }))}
                                InputProps={{ inputProps: { min: 0 } }}
                                size="small"
                            />
                        </Box>
                    );
                })}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button variant="contained" onClick={() => onSave(inventory)}>Save Changes</Button>
                </Box>
            </Paper>
        </Modal>
    );
};

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
            rentalOptions: [], // Add this to track rental options
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
        for (let i = 2020; i < date.getFullYear() + 1; i++) {
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
            // Set up real-time listener for form data
            // this.formListener = onValue(this.props.firebase.rentalGroup(this.props.index),
            //     (snapshot) => {
            //         const form = snapshot.val();
            //         console.log(form)
            //         if (form) {
            //             console.log(form)
            //             this.setState({
            //                 participants: form.participants || [],
            //                 availableList: form.available || [],
            //                 isComplete: form.complete || false,
            //                 transaction: form.transaction || '',
            //                 size: form.size || 0,
            //                 name: form.name || '',
            //                 loading: false
            //             });
            //         } else {
            //             this.setState({
            //                 loading: false,
            //                 error: 'Form not found'
            //             });
            //         }
            //     },
            //     (error) => {
            //         console.error('Error loading form data:', error);
            //         this.setState({
            //             error: 'Failed to load form data',
            //             loading: false
            //         });
            //     }
            // );

            // Load digital waivers with current date filters
            const { activeMonth, activeDay, activeYear } = this.state;
            const dateRange = this.calculateDateRange(activeMonth, activeDay, activeYear);
            await this.loadDigitalWaivers(dateRange.startDate, dateRange.endDate);

            // Add listener for rental options
            this.optionsListener = onValue(this.props.firebase.rentalOptions(),
                (snapshot) => {
                    if (snapshot.exists()) {
                        this.setState({ rentalOptions: snapshot.val() });
                    }
                }
            );

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
        // Remove the listener when component unmounts
        if (this.formListener) {
            this.formListener();
        }
        if (this.waiversListener) {
            this.waiversListener();
        }
        if (this.optionsListener) {
            this.optionsListener();
        }
        if (this.memberSearchDebounce) {
            clearTimeout(this.memberSearchDebounce);
        }
    };

    loadDigitalWaivers = async (startDate = null, endDate = null) => {
        try {
            this.setState({ isLoadingDigital: true });
            // Default to current month if no dates provided
            if (!startDate || !endDate) {
                const now = new Date();
                startDate = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // Last day of current month
            }

            // Convert dates to timestamps for Firebase query
            const startTimestamp = startDate.getTime();
            const endTimestamp = endDate.getTime();
            const searchTerm = this.state.searchQuery.trim().toLowerCase();
            const monthKey = this.getMonthKeyIfSpecific();

            if (searchTerm && monthKey) {
                const searchedWaivers = await this.fetchDigitalSearchResults(monthKey, searchTerm, startTimestamp, endTimestamp);
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

    getMonthlyDigitalCountIfApplicable = async () => {
        const { activeMonth, activeDay, activeYear } = this.state;
        const allYearsValue = new Date().getFullYear() + 1;
        const isSpecificMonth = activeMonth !== 13;
        const isSpecificYear = activeYear !== allYearsValue;
        const isWholeMonth = activeDay === 32;

        if (!isSpecificMonth || !isSpecificYear || !isWholeMonth) {
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
        const runFallbackMemberSearch = async (normalizedSearch) => {
            const fullSnapshot = await get(this.props.firebase.users());
            if (!fullSnapshot.exists()) {
                this.setState({
                    members: [],
                    totalMembers: 0,
                    isLoadingMembers: false
                });
                return;
            }

            const allMembers = Object.entries(fullSnapshot.val())
                .map(([key, value]) => ({
                    name: value.username,
                    date: new Date(),
                    ref: key,
                    isMember: true,
                    data: value
                }))
                .filter(member =>
                    member.name &&
                    (!normalizedSearch || member.name.toLowerCase().includes(normalizedSearch)))
                .sort((a, b) => a.name.localeCompare(b.name))
                .slice(0, this.state.membersPerPage);

            this.setState({
                members: allMembers,
                totalMembers: allMembers.length,
                isLoadingMembers: false
            });
        };

        try {
            this.setState({ isLoadingMembers: true });
            const normalizedSearch = searchTerm.trim().toLowerCase();
            const membersQuery = normalizedSearch
                ? query(
                    this.props.firebase.users(),
                    orderByChild('usernameLower'),
                    startAt(normalizedSearch),
                    endAt(`${normalizedSearch}\uf8ff`),
                    limitToFirst(this.state.membersPerPage)
                )
                : query(
                    this.props.firebase.users(),
                    orderByChild('usernameLower'),
                    limitToFirst(this.state.membersPerPage)
                );
            const snapshot = await get(membersQuery);

            if (snapshot.exists()) {
                const membersObject = snapshot.val();
                const members = Object.entries(membersObject)
                    .map(([key, value]) => ({
                        name: value.username,
                        date: new Date(),
                        ref: key,
                        isMember: true,
                        data: value
                    }));

                // Sort by name
                members.sort((a, b) => a.name.localeCompare(b.name));

                this.setState({
                    members,
                    totalMembers: members.length,
                    isLoadingMembers: false
                });
            } else {
                this.setState({
                    members: [],
                    totalMembers: 0,
                    isLoadingMembers: false
                });

                // Fallback for legacy user records that may not have usernameLower
                if (normalizedSearch) {
                    await runFallbackMemberSearch(normalizedSearch);
                }
            }
        } catch (error) {
            console.error('Error loading members:', error);
            console.log(error)
            const normalizedSearch = searchTerm.trim().toLowerCase();
            const message = (error && error.message) || '';
            if (message.includes('Index not defined')) {
                await runFallbackMemberSearch(normalizedSearch);
                return;
            }
            this.setState({
                error: 'Failed to load members',
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

        update(this.props.firebase.rentalGroup(this.props.form.key), {
            complete: true,
            transaction: transaction.trim()
        }).then(() => {
            this.setState({
                showTransactionDialog: false,
            });
        }).catch(() => {
            this.setState({ transactionError: 'Failed to update transaction' });
        });
    }

    addParticipant = async (person) => {
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
            await update(this.props.firebase.rentalGroup(this.props.form.key), {
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

    handleDeleteParticipant = (index) => {
        // Use props.form instead of state to get the latest data
        const { participants, available } = this.props.form;
        const updatedParticipants = [...participants];
        const removedParticipant = updatedParticipants[index];

        // Return all rentals back to availableList
        const updatedAvailableList = available ? [...available] : [];
        if (removedParticipant?.rentals && removedParticipant?.rentals?.length > 0) {
            // Add removed participant's rentals to the available list
            removedParticipant.rentals.forEach(rental => {
                updatedAvailableList.push({
                    ...rental,
                    id: uuid(), // Generate new ID to avoid conflicts
                    number: '', // Reset number
                    checked: false // Reset checked status
                });
            });
        }

        // Remove the participant
        updatedParticipants.splice(index, 1);

        // Update Firebase with the changes
        update(this.props.firebase.rentalGroup(this.props.form.key), {
            participants: updatedParticipants,
            available: updatedAvailableList
        }).catch(error => {
            console.error("Error deleting participant:", error);
        });
    }

    handleRemoveRental = async (participantIndex, rentalIndex) => {
        const { participants, available } = this.props.form;
        const { rentalOptions } = this.state;

        if (!participants?.[participantIndex]?.rentals?.[rentalIndex]) {
            console.error('Invalid rental removal attempt');
            return;
        }

        try {
            const updatedParticipants = [...participants];
            let updatedAvailableList = available ? [...available] : [];

            // Get the rental to be removed
            const removedRental = updatedParticipants[participantIndex].rentals[rentalIndex];

            // Remove rental from participant
            updatedParticipants[participantIndex].rentals.splice(rentalIndex, 1);

            // Reset rental properties and add back to available list
            const returnedRental = {
                ...removedRental,
                id: uuid(), // Generate new ID
                number: '', // Reset number
                checked: false // Reset checked status
            };

            updatedAvailableList.push(returnedRental);

            // Update firebase
            await update(this.props.firebase.rentalGroup(this.props.form.key), {
                participants: updatedParticipants,
                available: updatedAvailableList
            });

        } catch (error) {
            console.error('Error removing rental:', error);
            this.setState({ error: 'Failed to remove rental' });
        }
    };

    handleEditRentalNumber = (participantIndex, rentalIndex, number) => {
        const { participants } = this.props.form;
        const updatedParticipants = [...participants];

        // Update the rental number
        updatedParticipants[participantIndex].rentals[rentalIndex].number = number;

        // Update state and firebase
        this.setState({ participants: updatedParticipants });
        update(this.props.firebase.rentalGroup(this.props.form.key), {
            participants: updatedParticipants
        });
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
        const { rentalOptions } = this.state;
        const { participants, available } = this.props.form;

        // Create updated participants array
        const updatedParticipants = [...participants];
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

            // Update rental options stock
            const updatedOptions = rentalOptions.map(option => {
                if (option.value === rental.value) {
                    return {
                        ...option,
                        stock: (option.stock || 0) + 1
                    };
                }
                return option;
            });

            // Add to participant's rentals
            participant.rentals.push({
                ...removedRental,
                id: uuid(),
                number: '',
                checked: false
            });

            try {
                // Update both rental form and options
                await Promise.all([
                    update(this.props.firebase.rentalGroup(this.props.form.key), {
                        participants: updatedParticipants,
                        available: updatedAvailableList
                    }),
                    set(this.props.firebase.rentalOptions(), updatedOptions)
                ]);

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
        const { participants, available } = this.props.form;
        const { rentalOptions } = this.state;

        if (!participants || !available || participants.length === 0 || available.length === 0) {
            console.log('No participants or available rentals to distribute');
            return;
        }

        try {
            const updatedParticipants = [...participants];
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
                            id: uuid(),
                            number: '',
                            checked: false
                        });

                        console.log(`Added ${rentalType} to participant ${participantIndex + 1}`);
                    }
                }
            }

            // Update firebase
            await update(this.props.firebase.rentalGroup(this.props.form.key), {
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
            // All years - use a very wide range
            startDate = new Date(2020, 0, 1);
            endDate = new Date(now.getFullYear() + 1, 11, 31);
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
            await update(this.props.firebase.rentalGroup(this.props.form.key), {
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

    handleInventoryUpdate = async (newInventory) => {
        try {
            const { availableList, rentalOptions } = this.state;
            let updatedAvailableList = [];
            if (availableList?.length >= 0) {
                updatedAvailableList = [...availableList]
            }

            // For each rental type in the new inventory
            Object.entries(newInventory).forEach(([value, count]) => {
                // Find the rental option for this value
                const rentalOption = rentalOptions.find(opt => opt.value === value);
                if (!rentalOption) return;

                // Count current items of this type
                const currentCount = availableList && Array.isArray(availableList) ? availableList?.filter(item => item.value === value).length : 0;

                if (count > currentCount) {
                    // Add new items
                    const itemsToAdd = count - currentCount;
                    for (let i = 0; i < itemsToAdd; i++) {
                        updatedAvailableList.push({
                            value: value,
                            label: rentalOption.label,
                            id: uuid(),
                            number: '',
                            checked: false
                        });
                    }
                } else if (count < currentCount) {
                    // Remove items
                    const itemsToRemove = currentCount - count;
                    for (let i = 0; i < itemsToRemove; i++) {
                        const removeIndex = updatedAvailableList.findIndex(item => item.value === value);
                        if (removeIndex !== -1) {
                            updatedAvailableList.splice(removeIndex, 1);
                        }
                    }
                }
            });

            // Update both the rental form and the global rental options
            await update(this.props.firebase.rentalGroup(this.props.form.key), {
                available: updatedAvailableList
            });

            this.setState({
                availableList: updatedAvailableList,
                showInventoryEdit: false
            });
        } catch (error) {
            console.error('Error updating inventory:', error);
            this.setState({ error: 'Failed to update inventory' });
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

        return (
            <div className="rental-management">
                <Paper className="form-header">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" style={{ marginLeft: '1rem' }}>
                            Rental Form
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <MUIButton
                                startIcon={<Edit />}
                                onClick={() => this.setState({ showSizeEdit: true })}
                            >
                                Edit Size ({this.props.form.size})
                            </MUIButton>
                            <MUIButton
                                startIcon={<Edit />}
                                onClick={() => this.setState({ showInventoryEdit: true })}
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

                {/* Action Buttons */}
                <div className="edit-form-actions">
                    {!this.props.form.complete ? (
                        <MUIButton
                            variant="contained"
                            color="success"
                            onClick={() => this.setState({ showTransactionDialog: true })}
                        >
                            Activate Form
                        </MUIButton>
                    ) : (
                        <>
                            <MUIButton
                                variant="contained"
                                color="primary"
                                startIcon={<Add />}
                                onClick={() => this.setState({ showAddParticipant: true })}
                            >
                                Add Participant
                            </MUIButton>
                            <MUIButton
                                variant="contained"
                                color="secondary"
                                startIcon={<AutoAwesome />}
                                onClick={this.handleApplyToAll}
                                disabled={!this.props.form?.available?.length || !this.props.form?.participants?.length}
                            >
                                Apply to All
                            </MUIButton>
                        </>
                    )}
                </div>

                {/* Participants Grid */}
                <div className="participant-grid">
                    {this.props.form?.participants?.map((participant, index) => (
                        <ParticipantCard
                            key={index}
                            participant={participant}
                            index={index}
                            onDelete={this.handleDeleteParticipant}
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

                <InventoryEditModal
                    open={this.state.showInventoryEdit}
                    onClose={() => this.setState({ showInventoryEdit: false })}
                    available={this.props.form.available}
                    onSave={this.handleInventoryUpdate}
                    currentOptions={this.state.rentalOptions}
                />
            </div>
        );
    }
}


const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default withAuthorization(condition)(withFirebase(EditSelectedForm));
