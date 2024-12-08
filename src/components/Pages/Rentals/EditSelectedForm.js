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
import { listAll } from 'firebase/storage';
import convertDate from '../../utils/convertDate';

// import uuid from 'uuid/v4';
import { v4 as uuid } from 'uuid';

import { withFirebase } from '../../Firebase';

import '../../../App.css';
import { get, update, onValue, set } from "firebase/database";
import TablePagination from '@mui/material/TablePagination';
import Modal from '@mui/material/Modal';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';

const AddParticipantModal = ({
    open,
    onClose,
    onAdd,
    waivers,
    searchQuery,
    onSearchChange,
    isLegacyMode,
    isMemberMode,
    onToggleMode,
    isLoadingMembers,
    isLoadingLegacy,
    membersPage,
    membersPerPage,
    totalMembers,
    onMemberPageChange,
    legacyStartDate,
    onLegacyDateChange,
    digitalPage,
    digitalPerPage,
    totalDigital,
    onDigitalPageChange,
}) => (
    <Modal open={open} onClose={onClose}>
        <Paper className="add-participant-modal" sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: 600,
            maxHeight: '90vh',
            overflow: 'auto',
            p: 3
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
                    sx={{ mb: 2 }}
                />
                <Box sx={{
                    display: 'flex',
                    gap: 2,
                    justifyContent: 'center',
                    mb: 2
                }}>
                    <MUIButton
                        variant={!isLegacyMode && !isMemberMode ? "contained" : "outlined"}
                        onClick={() => onToggleMode('digital')}
                        size="small"
                        disabled={isLoadingMembers || isLoadingLegacy}
                    >
                        Digital Waivers
                    </MUIButton>
                    <MUIButton
                        variant={isLegacyMode ? "contained" : "outlined"}
                        onClick={() => onToggleMode('legacy')}
                        size="small"
                        disabled={isLoadingMembers || isLoadingLegacy}
                    >
                        Legacy Waivers
                    </MUIButton>
                    <MUIButton
                        variant={isMemberMode ? "contained" : "outlined"}
                        onClick={() => onToggleMode('member')}
                        size="small"
                        disabled={isLoadingMembers || isLoadingLegacy}
                    >
                        Members
                    </MUIButton>
                </Box>
            </div>

            {isLoadingMembers || isLoadingLegacy ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {isLegacyMode && (
                        <Box sx={{ mb: 2 }}>
                            <TextField
                                type="month"
                                label="Select Month"
                                value={legacyStartDate.toISOString().slice(0, 7)}
                                onChange={(e) => {
                                    const date = new Date(e.target.value);
                                    onLegacyDateChange(date);
                                }}
                                fullWidth
                            />
                        </Box>
                    )}

                    <List sx={{
                        maxHeight: '50vh',
                        overflow: 'auto',
                        mb: 2
                    }}>
                        {waivers.map((person) => (
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
                        ))}
                    </List>

                    {(isMemberMode || !isLegacyMode) && (
                        <Box sx={{
                            position: 'sticky',
                            bottom: 0,
                            bgcolor: 'background.paper',
                            borderTop: 1,
                            borderColor: 'divider'
                        }}>
                            <TablePagination
                                component="div"
                                count={isMemberMode ? totalMembers : totalDigital}
                                page={isMemberMode ? membersPage : digitalPage}
                                onPageChange={isMemberMode ? onMemberPageChange : onDigitalPageChange}
                                rowsPerPage={isMemberMode ? membersPerPage : digitalPerPage}
                                rowsPerPageOptions={[50]}
                            />
                        </Box>
                    )}
                </>
            )}
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
                            Complete Form
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
            legacyWaivers: [],
            isLegacyMode: false,
            searchQuery: '',
            members: [],
            isMemberMode: false,
            isLoadingMembers: false,
            isLoadingLegacy: false,
            membersPage: 0,
            membersPerPage: 50,
            legacyStartDate: new Date(), // Start with current date
            legacyPageSize: 50,
            totalMembers: 0,
            filteredMembers: [],
            digitalPage: 0,
            digitalPerPage: 50,
            totalDigital: 0,
            showSizeEdit: false,
            showInventoryEdit: false,
            rentalOptions: [], // Add this to track rental options
        };
    }

    componentDidMount = () => {
        try {
            // Set up real-time listener for form data
            this.formListener = onValue(this.props.firebase.rentalGroup(this.props.index),
                (snapshot) => {
                    const form = snapshot.val();
                    if (form) {
                        this.setState({
                            participants: form.participants || [],
                            availableList: form.available || [],
                            isComplete: form.complete || false,
                            transaction: form.transaction || '',
                            size: form.size || 0,
                            name: form.name || '',
                            loading: false
                        });
                    } else {
                        this.setState({
                            loading: false,
                            error: 'Form not found'
                        });
                    }
                },
                (error) => {
                    console.error('Error loading form data:', error);
                    this.setState({
                        error: 'Failed to load form data',
                        loading: false
                    });
                }
            );

            // Load digital waivers
            this.loadDigitalWaivers();

            // Add listener for rental options
            this.optionsListener = onValue(this.props.firebase.rentalOptions(),
                (snapshot) => {
                    if (snapshot.exists()) {
                        this.setState({ rentalOptions: snapshot.val() });
                    }
                }
            );
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
        if (this.optionsListener) {
            this.optionsListener();
        }
    };

    loadDigitalWaivers = async () => {
        try {
            const snapshot = await get(this.props.firebase.digitalWaivers());
            if (snapshot.exists()) {
                const waiversObject = snapshot.val();
                const waivers = Object.entries(waiversObject).map(([key, value]) => ({
                    name: value.name,
                    date: new Date(value.timestamp),
                    ref: key,
                    isDigital: true,
                    data: value
                }));

                // Sort by date, newest first
                waivers.sort((a, b) => b.date - a.date);

                this.setState({
                    waivers,
                    totalDigital: waivers.length,
                    loading: false
                });
            } else {
                this.setState({
                    waivers: [],
                    totalDigital: 0,
                    loading: false
                });
            }
        } catch (error) {
            console.error('Error loading digital waivers:', error);
            this.setState({
                error: 'Failed to load digital waivers',
                loading: false
            });
        }
    };

    loadLegacyWaivers = async () => {
        this.setState({ isLoadingLegacy: true });
        try {
            const result = await listAll(this.props.firebase.waiversList());
            const endDate = this.state.legacyStartDate;
            const startDate = new Date(endDate);
            startDate.setMonth(startDate.getMonth() - 1); // Load 1 month at a time

            const tempWaivers = [];

            for (const item of result.items) {
                const waiverName = item.name;
                const dateStr = waiverName.substr(waiverName.lastIndexOf('(') + 1).split(')')[0];
                const [datePart, timePart] = dateStr.split(':');
                const [month, day, year] = datePart.split('-');
                const [hour, minute] = [timePart, dateStr.split(':')[2]];

                const dateObj = new Date(year, month - 1, day, hour, minute);

                // Only include waivers within the date range
                if (dateObj >= startDate && dateObj <= endDate) {
                    tempWaivers.push({
                        name: waiverName.substring(0, waiverName.lastIndexOf('(')).trim(),
                        date: dateObj,
                        ref: item,
                        isDigital: false,
                        fullName: waiverName
                    });
                }
            }

            // Sort by date, newest first
            tempWaivers.sort((a, b) => b.date - a.date);

            this.setState({
                legacyWaivers: tempWaivers,
                isLoadingLegacy: false
            });
        } catch (error) {
            console.error('Error loading legacy waivers:', error);
            this.setState({
                error: 'Failed to load legacy waivers',
                isLoadingLegacy: false
            });
        }
    };

    loadMembers = async (searchTerm = '') => {
        try {
            this.setState({ isLoadingMembers: true });
            const snapshot = await get(this.props.firebase.users());

            if (snapshot.exists()) {
                const membersObject = snapshot.val();
                const allMembers = Object.entries(membersObject)
                    .map(([key, value]) => ({
                        name: value.username,
                        date: new Date(),
                        ref: key,
                        isMember: true,
                        data: value
                    }));

                // Filter by search term
                const filtered = searchTerm
                    ? allMembers.filter(member =>
                        member.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    : allMembers;

                // Sort by name
                filtered.sort((a, b) => a.name.localeCompare(b.name));

                this.setState({
                    members: filtered,
                    totalMembers: filtered.length,
                    isLoadingMembers: false
                });
            }
        } catch (error) {
            console.error('Error loading members:', error);
            console.log(error)
            this.setState({
                error: 'Failed to load members',
                isLoadingMembers: false
            });
        }
    };

    toggleMode = async (mode) => {
        // Don't allow toggle if currently loading
        if (this.state.isLoadingMembers || this.state.isLoadingLegacy) {
            return;
        }

        this.setState({
            isMemberMode: mode === 'member',
            isLegacyMode: mode === 'legacy',
            searchQuery: ''
        });

        try {
            if (mode === 'member' && this.state.members.length === 0) {
                this.setState({ isLoadingMembers: true });
                await this.loadMembers();
            } else if (mode === 'legacy' && this.state.legacyWaivers.length === 0) {
                this.setState({ isLoadingLegacy: true });
                await this.loadLegacyWaivers();
            }
        } catch (error) {
            console.error('Error toggling mode:', error);
            this.setState({
                error: 'Failed to load data',
                isLoadingMembers: false,
                isLoadingLegacy: false
            });
        }
    };

    onDragEnd = result => {
        const { source, destination } = result;

        if (!destination) {
            return;
        }

        const { participants, availableList } = this.state;

        // Moving from available list to participant
        if (source.droppableId === 'options') {
            const participantIndex = parseInt(destination.droppableId.split('-')[1]);
            const sourceItem = availableList[source.index];

            // Create a new array with one less item of the same type
            const updatedAvailableList = [...availableList];
            const similarItems = updatedAvailableList.filter(item => item.value === sourceItem.value);

            if (similarItems.length > 1) {
                // Remove just one instance of this rental type
                const removeIndex = updatedAvailableList.findIndex(item => item.id === sourceItem.id);
                updatedAvailableList.splice(removeIndex, 1);
            } else {
                // Remove the only instance
                updatedAvailableList.splice(source.index, 1);
            }

            // Add to participant's rentals
            const updatedParticipants = [...participants];
            if (!updatedParticipants[participantIndex].rentals) {
                updatedParticipants[participantIndex].rentals = [];
            }

            updatedParticipants[participantIndex].rentals.push({
                ...sourceItem,
                id: uuid(),
                number: '', // Reset rental number if needed
                checked: false // Reset checked status if needed
            });

            this.setState({
                participants: updatedParticipants,
                availableList: updatedAvailableList
            });

            update(this.props.firebase.rentalGroup(this.props.index), {
                participants: updatedParticipants,
                available: updatedAvailableList
            });
        }
    };

    handleTransactionSubmit = () => {
        const { transaction } = this.state;
        if (!transaction.trim()) {
            this.setState({ transactionError: 'Transaction number is required' });
            return;
        }

        update(this.props.firebase.rentalGroup(this.props.index), {
            complete: true,
            transaction: transaction.trim()
        }).then(() => {
            this.setState({
                showTransactionDialog: false,
                isComplete: true
            });
        }).catch(() => {
            this.setState({ transactionError: 'Failed to update transaction' });
        });
    }

    getFilteredWaivers = () => {
        const {
            waivers,
            legacyWaivers,
            members,
            searchQuery,
            isMemberMode,
            isLegacyMode,
            membersPage,
            membersPerPage,
            digitalPage,
            digitalPerPage
        } = this.state;

        if (isMemberMode) {
            const filtered = members.filter(member =>
                member.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            const startIndex = membersPage * membersPerPage;
            return filtered.slice(startIndex, startIndex + membersPerPage);
        } else if (isLegacyMode) {
            return legacyWaivers;
        } else {
            // Digital waivers
            const filtered = waivers.filter(waiver =>
                waiver.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            const startIndex = digitalPage * digitalPerPage;
            return filtered.slice(startIndex, startIndex + digitalPerPage);
        }
    };

    addParticipant = async (person) => {
        const { participants } = this.state;

        // Check if participant already exists
        const exists = participants.some(p => p.ref === person.ref);
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
        const updatedParticipants = [...participants, newParticipant];
        try {
            await update(this.props.firebase.rentalGroup(this.props.index), {
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
        const { participants, availableList } = this.state;
        const updatedParticipants = [...participants];
        const removedParticipant = updatedParticipants[index];

        // Return all rentals back to availableList
        const updatedAvailableList = [...availableList];
        if (removedParticipant.rentals && removedParticipant.rentals.length > 0) {
            updatedAvailableList.push(...removedParticipant.rentals);
        }

        // Remove the participant
        updatedParticipants.splice(index, 1);

        update(this.props.firebase.rentalGroup(this.props.index), {
            participants: updatedParticipants,
            available: updatedAvailableList
        }).then(() => {
            this.setState({
                participants: updatedParticipants,
                availableList: updatedAvailableList
            });
        });
    }

    handleRemoveRental = async (participantIndex, rentalIndex) => {
        const { participants, availableList, rentalOptions } = this.state;
        const updatedParticipants = [...participants];
        const removedRental = updatedParticipants[participantIndex].rentals[rentalIndex];

        // Update rental options stock
        const updatedOptions = rentalOptions.map(option => {
            if (option.value === removedRental.value) {
                return {
                    ...option,
                    stock: Math.max(0, (option.stock || 0) - 1)
                };
            }
            return option;
        });

        // Remove rental from participant
        updatedParticipants[participantIndex].rentals.splice(rentalIndex, 1);

        // Reset rental properties and add back to available list
        const returnedRental = {
            ...removedRental,
            id: uuid(), // Generate new ID
            number: '', // Reset number
            checked: false // Reset checked status
        };

        const updatedAvailableList = [...availableList, returnedRental];

        try {
            await Promise.all([
                update(this.props.firebase.rentalGroup(this.props.index), {
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
            console.error('Error removing rental:', error);
            this.setState({ error: 'Failed to remove rental' });
        }
    };

    handleEditRentalNumber = (participantIndex, rentalIndex, number) => {
        const { participants } = this.state;
        const updatedParticipants = [...participants];

        // Update the rental number
        updatedParticipants[participantIndex].rentals[rentalIndex].number = number;

        // Update state and firebase
        this.setState({ participants: updatedParticipants });
        update(this.props.firebase.rentalGroup(this.props.index), {
            participants: updatedParticipants
        });
    };

    getAvailableItemsSummary = () => {
        const { availableList } = this.state;

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
        const { participants, availableList, rentalOptions } = this.state;

        // Create updated participants array
        const updatedParticipants = [...participants];
        const participant = updatedParticipants[participantIndex];

        if (!participant.rentals) {
            participant.rentals = [];
        }

        const updatedAvailableList = [...availableList];
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
                    update(this.props.firebase.rentalGroup(this.props.index), {
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

    handleApplyToAll = () => {
        const { participants, availableList } = this.state;
        if (!participants.length || !availableList.length) return;

        const updatedParticipants = [...participants];
        const updatedAvailableList = [...availableList];

        // Get unique rental types
        const uniqueRentals = Array.from(new Set(availableList.map(item => item.value)))
            .map(value => availableList.find(item => item.value === value));

        // Try to assign one of each type to each participant
        updatedParticipants.forEach(participant => {
            if (!participant.rentals) {
                participant.rentals = [];
            }

            uniqueRentals.forEach(rentalType => {
                // Find first available item of this type
                const availableIndex = updatedAvailableList.findIndex(item =>
                    item.value === rentalType.value
                );

                if (availableIndex !== -1) {
                    // Remove from available list and add to participant
                    const [removedRental] = updatedAvailableList.splice(availableIndex, 1);
                    participant.rentals.push({
                        ...removedRental,
                        id: uuid(),
                        number: '',
                        checked: false
                    });
                }
            });
        });

        // Update state and firebase
        this.setState({
            participants: updatedParticipants,
            availableList: updatedAvailableList
        });

        update(this.props.firebase.rentalGroup(this.props.index), {
            participants: updatedParticipants,
            available: updatedAvailableList
        });
    };

    // Get current page of members
    getCurrentMembers = () => {
        const { members, membersPage, membersPerPage } = this.state;
        const start = membersPage * membersPerPage;
        return members.slice(start, start + membersPerPage);
    };

    // Handle member page change
    handleMemberPageChange = (event, newPage) => {
        this.setState({ membersPage: newPage });
    };

    // Handle legacy date change
    handleLegacyDateChange = async (date) => {
        await this.setState({ legacyStartDate: date });
        this.loadLegacyWaivers();
    };

    // Add handler for digital waiver pagination
    handleDigitalPageChange = (event, newPage) => {
        this.setState({ digitalPage: newPage });
    };

    handleSizeUpdate = async (newSize) => {
        try {
            await update(this.props.firebase.rentalGroup(this.props.index), {
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
            await update(this.props.firebase.rentalGroup(this.props.index), {
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
            isComplete,
            showAddParticipant,
            searchQuery,
            isLegacyMode,
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
                                Edit Size ({this.state.size})
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
                    {!isComplete ? (
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
                                disabled={!availableList.length || !participants.length}
                            >
                                Apply to All
                            </MUIButton>
                        </>
                    )}
                </div>

                {/* Participants Grid */}
                <div className="participant-grid">
                    {participants.map((participant, index) => (
                        <ParticipantCard
                            key={index}
                            participant={participant}
                            index={index}
                            onDelete={this.handleDeleteParticipant}
                            onRemoveRental={this.handleRemoveRental}
                            onAddRental={this.handleAddRental}
                            onEditRentalNumber={this.handleEditRentalNumber}
                            availableRentals={availableList}
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
                    onSearchChange={(value) => this.setState({ searchQuery: value })}
                    isLegacyMode={isLegacyMode}
                    isMemberMode={isMemberMode}
                    onToggleMode={this.toggleMode}
                    isLoadingMembers={this.state.isLoadingMembers}
                    isLoadingLegacy={this.state.isLoadingLegacy}
                    membersPage={membersPage}
                    membersPerPage={membersPerPage}
                    totalMembers={totalMembers}
                    onMemberPageChange={this.handleMemberPageChange}
                    legacyStartDate={this.state.legacyStartDate}
                    onLegacyDateChange={this.handleLegacyDateChange}
                    digitalPage={this.state.digitalPage}
                    digitalPerPage={this.state.digitalPerPage}
                    totalDigital={this.state.totalDigital}
                    onDigitalPageChange={this.handleDigitalPageChange}
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
                    currentSize={this.state.size}
                    onSave={this.handleSizeUpdate}
                />

                <InventoryEditModal
                    open={this.state.showInventoryEdit}
                    onClose={() => this.setState({ showInventoryEdit: false })}
                    available={this.state.availableList}
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

// export default composeHooks(
//     withAuthorization(condition),
//     withFirebase,
// )(EditSelectedForm);


// export default 
//     <withFirebase>
//         <withAuthorization condition={condition}>
//             <EditSelectedForm/>
//         </withAuthorization>
//     </withFirebase>
//         </withAuthorization>
//     </withFirebase>