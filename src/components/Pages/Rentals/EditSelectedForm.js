import { faCheckSquare, faSquare } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Avatar, Checkbox, Chip, Switch, FormControlLabel, CircularProgress } from '@mui/material';
import Box from '@mui/material/Box';
import MUIButton from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Paper from '@mui/material/Paper';
// Imports for MUI Table
import { makeStyles } from '@mui/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableFooter from '@mui/material/TableFooter';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Add, Cancel, CheckCircle, Delete, Edit, Remove, RemoveCircleOutline, KeyboardArrowDown, KeyboardArrowUp, Close, AutoAwesome } from '@mui/icons-material';
import React, { Component, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { Button, Col, Row, Spinner } from 'react-bootstrap/';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/lab/Alert';
import * as ROLES from '../../constants/roles';
import { withAuthorization } from '../../session';
import { listAll } from 'firebase/storage';
import convertDate from '../../utils/convertDate';

// import uuid from 'uuid/v4';
import { v4 as uuid } from 'uuid';

import { withFirebase } from '../../Firebase';

import '../../../App.css';
import { get, onValue, set, update } from "firebase/database";
import TablePagination from '@mui/material/TablePagination';
import Modal from '@mui/material/Modal';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';

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

function returnDay(day) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[day];
}

function returnMonth(month) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month];
}

// const verify = (item, list) => {
//     for (let i = 0; i < list.length; i++)
//         if (list[i].value === item.value) return false;
//     return true // Verified that it's safe
// }

// Copies over item to another list, verifies it doesn't exist
const copy = (source, destination, droppableSource, droppableDestination) => {
    const sourceClone = Array.from(source);
    const destClone = typeof destination === 'object' ? Array.from(destination) : [];
    const item = sourceClone[droppableSource.index];

    // Make sure it doesn't exist at destination

    // if (verify(item, destClone))
    destClone.splice(droppableDestination.index, 0, { ...item, id: uuid() });
    return destClone;
};

/**
 * Moves an item from one list to another list.
 */
const move = (source, destination, droppableSource, droppableDestination) => {
    const sourceClone = Array.from(source);
    const destClone = typeof destination === 'object' ? Array.from(destination) : [];

    const [removed] = sourceClone.splice(droppableSource.index, 1);
    destClone.splice(droppableDestination.index, 0, removed);

    const result = {};
    result[droppableSource.droppableId] = sourceClone;
    result[droppableDestination.droppableId] = destClone;

    return result;
};

const grid = 8;

const getItemStyle = (isDragging, draggableStyle) => ({
    // some basic styles to make the items look a bit nicer
    userSelect: 'none',
    paddingtop: 10,
    paddingbottom: 10,
    paddingleft: 20,
    paddingright: 20,
    margin: 5,

    // change background colour if dragging
    background: isDragging ? 'transparent' : 'grey',
    border: isDragging ? '1px solid lightgreen' : 'none',

    // styles we need to apply on draggables
    ...draggableStyle
});

const getCellStyle = (isDragging) => ({
    // change background colour if dragging
    width: isDragging ? '100%' : 'initial',
});

const getListStyle = isDraggingOver => ({
    background: isDraggingOver ? 'rgb(4,4,4, .2)' : 'transparent',
    padding: grid,
});

const ParticipantCard = ({ participant, index, onDelete, onRemoveRental, onAddRental, availableRentals, onEditRentalNumber }) => {
    const [showRentalMenu, setShowRentalMenu] = useState(false);
    const [editingRental, setEditingRental] = useState(null);
    const [tempNumber, setTempNumber] = useState('');

    // Get unique rentals with counts
    const getUniqueRentals = () => {
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
        };
    }

    componentDidMount = async () => {
        try {
            // Get form data
            const formSnapshot = await get(this.props.firebase.rentalGroup(this.props.index));
            const form = formSnapshot.val();
            if (form) {
                this.setState({
                    participants: form.participants || [],
                    availableList: form.available || [],
                    isComplete: form.complete || false,
                    transaction: form.transaction || ''
                });
            }

            // Load digital waivers
            await this.loadDigitalWaivers();
        } catch (error) {
            console.error('Error in componentDidMount:', error);
            this.setState({
                error: 'Failed to load initial data',
                loading: false
            });
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
        }).catch(error => {
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

    handleRemoveRental = (participantIndex, rentalIndex) => {
        const { participants, availableList } = this.state;
        const updatedParticipants = [...participants];
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

        const updatedAvailableList = [...availableList, returnedRental];

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

    handleAddRental = (participantIndex, rental) => {
        const { participants, availableList } = this.state;

        // Create updated participants array
        const updatedParticipants = [...participants];
        const participant = updatedParticipants[participantIndex];

        // Initialize rentals array if it doesn't exist
        if (!participant.rentals) {
            participant.rentals = [];
        }

        // Create updated available list
        const updatedAvailableList = [...availableList];
        const similarItems = updatedAvailableList.filter(item => item.value === rental.value);

        if (similarItems.length > 0) {
            // Remove one instance of this rental type
            const removeIndex = updatedAvailableList.findIndex(item => item.value === rental.value);
            const [removedRental] = updatedAvailableList.splice(removeIndex, 1);

            // Add to participant's rentals with a new ID
            participant.rentals.push({
                ...removedRental,
                id: uuid(),
                number: '',
                checked: false
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
            </div>
        );
    }
}


const useRowStyles = makeStyles({
    root: {
        '& > *': {
            borderBottom: 'unset',
        },
    },
})

const useStyles = makeStyles((theme) => ({
    root: {
        padding: '2px 4px',
        display: 'flex',
        alignItems: 'center',
        width: 300,
        float: 'right',
        background: '#424242'
    },
    input: {
        flex: 1,
        color: 'white',
    },
    iconButton: {
        padding: 10,
        color: '#b1f48f !important',
    },
    cancelButton: {
        padding: 10,
        color: '#f48fb1 !important',
    },
    divider: {
        height: 28,
        margin: 4,
    },
}));

function MUITableRow(props) {
    const { row, index, detach, edit, checkin, removing, remove, gamepass, checkNum } = props;

    const [open, setOpen] = React.useState(false);
    const [editArray, setEditArray] = React.useState(new Array(typeof row.rentals === 'object' ? (row.rentals.length) : []).fill(false));
    const [editArrayValue, setEditArrayValue] = React.useState(new Array(typeof row.rentals === 'object' ? (row.rentals.length) : []).fill(""));
    const classes = useRowStyles();
    const classes2 = useStyles()

    return (
        <React.Fragment>
            <TableRow className={classes.root}>
                <TableCell onClick={() => setOpen(!open)}>
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                </TableCell>
                <TableCell component="th" scope="row" className="tc-name-esf">
                    <MUIButton disabled={!removing} onClick={() => {
                        remove(index, row)
                    }}
                        startIcon={removing ? <Delete /> : null}>
                        {row.name}
                    </MUIButton>
                </TableCell>
                <TableCell align="right">{row.rentals ? row?.rentals.length : 0}</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell align="right">
                    <div className="div-checkbox-esf">
                        <Checkbox
                            checked={row.gamepass}
                            color="primary"
                            onClick={() => gamepass(index)}
                        />
                    </div>
                </TableCell>
            </TableRow>
            <TableRow className="collapse-table-row-rf" >
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box margin={1}>
                            <Typography variant="h6" gutterBottom component="div">
                                {`Rentals for ${row.name}`}
                            </Typography>
                            <Droppable droppableId={"p_rentals-" + index}>
                                {(provided, snapshot) => (
                                    <Table size="small" aria-label="participants-rentals" ref={provided.innerRef} style={getListStyle(snapshot.isDraggingOver)}
                                        className="table-collapse-esf">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Rental</TableCell>
                                                <TableCell align="right">Number</TableCell>
                                                <TableCell align="right">Returned</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {typeof row.rentals === 'object' ?
                                                row.rentals.map((rental, i) => (
                                                    <Draggable
                                                        isDragDisabled={true}
                                                        key={rental.id}
                                                        draggableId={rental.id}
                                                        index={i}>
                                                        {(provided, snapshot) => (
                                                            <TableRow key={rental.id}
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                style={getItemStyle(
                                                                    snapshot.isDragging,
                                                                    provided.draggableProps.style
                                                                )}>
                                                                <TableCell component="th" scope="row" className="th-esf"
                                                                    style={getCellStyle(
                                                                        snapshot.isDragging,
                                                                    )}>
                                                                    <IconButton aria-label="unlink" onClick={() => detach(i, index)}>
                                                                        <RemoveCircleOutline />
                                                                    </IconButton>
                                                                    {rental.label}
                                                                </TableCell>
                                                                {!editArray[i] ?
                                                                    <TableCell align="right"
                                                                        style={getCellStyle(
                                                                            snapshot.isDragging,
                                                                        )}>
                                                                        <IconButton aria-label="edit" onClick={() => {
                                                                            let tempArray = [...editArray];
                                                                            if (tempArray[i] !== true)
                                                                                tempArray.fill(false)
                                                                            tempArray[i] = !tempArray[i]
                                                                            setEditArray(tempArray)
                                                                        }}>
                                                                            <Edit />
                                                                        </IconButton>
                                                                        {rental.number}
                                                                    </TableCell>
                                                                    :
                                                                    <TableCell align="right"
                                                                        style={getCellStyle(
                                                                            snapshot.isDragging,
                                                                        )}>
                                                                        <Paper component="form" className={classes2.root} onSubmit={(e) => {
                                                                            e.preventDefault()
                                                                            if (checkNum(editArrayValue[i], rental.value)) {
                                                                                edit(i, index, editArrayValue[i])
                                                                                let tempArray = [...editArray];
                                                                                tempArray.fill(false)
                                                                                setEditArray(tempArray)
                                                                                let editArrayVal = [...editArrayValue]
                                                                                editArrayVal[i] = ""
                                                                                setEditArrayValue(editArrayVal)
                                                                            }
                                                                        }}>
                                                                            <InputBase
                                                                                className={classes2.input}
                                                                                placeholder="Enter Rental Number"
                                                                                inputProps={{ 'aria-label': 'enter rental number' }}
                                                                                autoFocus
                                                                                type="number"
                                                                                value={editArrayValue[i]}
                                                                                onChange={(e) => {
                                                                                    let tempArray = [...editArrayValue]
                                                                                    tempArray[i] = e.target.value
                                                                                    setEditArrayValue(tempArray)
                                                                                }}
                                                                            />
                                                                            <IconButton type="submit" className={classes2.iconButton} aria-label="confirm">
                                                                                <CheckCircle />
                                                                            </IconButton>
                                                                            <Divider className={classes2.divider} orientation="vertical" />
                                                                            <IconButton className={classes2.cancelButton} aria-label="cancel"
                                                                                onClick={() => {
                                                                                    let tempArray = [...editArray];
                                                                                    tempArray.fill(false)
                                                                                    setEditArray(tempArray)
                                                                                    let editArrayVal = [...editArrayValue]
                                                                                    editArrayVal[i] = ""
                                                                                    setEditArrayValue(editArrayVal)
                                                                                }}>
                                                                                <Cancel />
                                                                            </IconButton>
                                                                        </Paper>
                                                                    </TableCell>
                                                                }
                                                                <TableCell align="right"
                                                                    style={getCellStyle(
                                                                        snapshot.isDragging,
                                                                    )}>
                                                                    {!rental.checked ?
                                                                        <IconButton onClick={() => checkin(i, index)}>
                                                                            <FontAwesomeIcon icon={faSquare} className="icon-checked-rf" />
                                                                        </IconButton>
                                                                        :
                                                                        <IconButton onClick={() => checkin(i, index)}>
                                                                            <FontAwesomeIcon icon={faCheckSquare} className="icon-checked-rf" />
                                                                        </IconButton>
                                                                    }</TableCell>
                                                            </TableRow>
                                                        )}
                                                    </Draggable>
                                                )) : null}
                                        </TableBody>
                                        {provided.placeholder}
                                    </Table>
                                )}
                            </Droppable>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
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