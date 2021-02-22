import { faCheckSquare, faSquare } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Avatar, Checkbox, Chip } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import MUIButton from '@material-ui/core/Button';
import Collapse from '@material-ui/core/Collapse';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import InputBase from '@material-ui/core/InputBase';
import Paper from '@material-ui/core/Paper';
// Imports for MUI Table
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableFooter from '@material-ui/core/TableFooter';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { Add, Cancel, CheckCircle, Delete, Edit, Remove, RemoveCircleOutline } from '@material-ui/icons';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import React, { Component } from 'react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { Col, Row, Spinner } from 'react-bootstrap/';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';
import * as ROLES from '../constants/roles';
import { withAuthorization } from '../session';
import { compose } from 'recompose';
// My imports 
import uuid from 'uuid/v4';

import { withFirebase } from '../Firebase';

import '../../App.css';

const verify = (item, list) => {
    for (let i = 0; i < list.length; i++)
        if (list[i].value === item.value) return false;
    return true // Verified that it's safe
}

// Copies over item to another list, verifies it doesn't exist
const copy = (source, destination, droppableSource, droppableDestination) => {
    const sourceClone = Array.from(source);
    const destClone = typeof destination === 'object' ? Array.from(destination) : [];
    const item = sourceClone[droppableSource.index];

    // Make sure it doesn't exist at destination

    if (verify(item, destClone))
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

class EditSelectedForm extends Component {
    state = {
        index: this.props.index,
        availableList: null,
        availableObject: null,
        participants: null,
        loading: true,
        removing: false,
        options: null,
        error: null,
    };

    // Apply all function to add items > 1 to all participants if
    // the rental doesn't exist already
    applyAll = () => {
        let { participants, availableList } = this.state
        let cutout = availableList.filter(obj => obj.amount === 1)
        availableList = availableList.filter(obj => obj.amount > 1)
        participants.forEach((participant, p_i) => {
            availableList.forEach((rental, i) => {
                if (rental.amount > 0) {
                    // Check if rental exists in participants rentals
                    // Push rental into participants rentals if not
                    let new_rental = JSON.parse(JSON.stringify(rental))
                    new_rental.id = uuid()
                    if (participant.rentals) {
                        if (!this.itemExists(availableList, participants[p_i].rentals, i)) {
                            participants[p_i].rentals.push(new_rental)
                            // Subtract from available list
                            availableList[i].amount--
                        }
                    }
                    else {
                        participants[p_i].rentals = [rental]
                        // participants[p_i].rentals.push(rental)
                        availableList[i].amount--
                    }
                }
            })
        })
        // Filter out amounts === 0 and add back original ones taken out
        availableList = availableList.filter(obj => obj.amount > 0)
        availableList.push(...cutout)
        this.props.firebase.rentalGroup(this.props.index).update({ participants, available: availableList })
    }

    // Checks to see if item exists in neighbor array before pushing it in
    itemExists = (source_arr, destination_arr, source_index) => {
        let rentalVal = source_arr[source_index].value
        if (destination_arr) {
            for (let i=0; i<destination_arr.length; i++) {
                if (destination_arr[i].value === rentalVal)
                    return true
            }
        }
        return false
    }

    // Checks to see if the rental number already exists in the rental group
    rentalNumCheck = (num, val) => {
        const {participants} = this.state
        for (let i=0; i<participants.length; i++) {
            if (participants[i].rentals) {
                for (let z=0; z<participants[i].rentals.length; z++) {
                    if (participants[i].rentals[z].number === num && participants[i].rentals[z].value === val) {
                        this.setState({
                            error: `Rental number: ${num} is already in use by ${participants[i].name.substr(0, participants[i].name.lastIndexOf('('))}`
                        })
                        return false
                    }
                }
            }
        }
        return true;
    }

    /**
     * A semi-generic way to handle multiple lists. Matches
     * the IDs of the droppable container to the names of the
     * source arrays stored in the state.
     */

    onDragEnd = result => {

        const { source, destination } = result;

        // dropped outside the list
        if (!destination) {
            return;
        }

        this.setState({ loading: true })

        if (source.droppableId === destination.droppableId) {
            // Do nothing, you cant reorder basically
        } else {
            let source_arr, destination_arr, index, index2

            if (source.droppableId !== "available") {
                if (source.droppableId.includes("p_rentals") && destination.droppableId.includes("p_rentals")) {
                    index = source.droppableId.split("-")[1]
                    index2 = destination.droppableId.split("-")[1]
                    source_arr = this.state.participants[index].rentals
                    destination_arr = this.state.participants[index2].rentals
                }
                else {
                    // Find index by splitting up the id string
                    index = source.droppableId.split("-")[1]
                    destination_arr = this.state.availableList
                    source_arr = this.state.participants[index].rentals
                }
                // Check here if it exists in the list
                if (!this.itemExists(source_arr, destination_arr, source.index)) {
                    const result = move(
                        source_arr,
                        destination_arr,
                        source,
                        destination,
                    );

                    if (index2) { // Both are p_rental trips
                        let p_index = "p_rentals-" + index
                        let p_index2 = "p_rentals-" + index2
                        this.props.firebase.participantsRentals(this.props.index, index).update({ rentals: result[p_index] })
                        this.props.firebase.participantsRentals(this.props.index, index2).update({ rentals: result[p_index2] })
                    }
                }
            }
            else { // Available case as source
                index = destination.droppableId.split("-")[1]
                destination_arr = this.state.participants[index].rentals
                source_arr = this.state.availableList


                if (!this.itemExists(source_arr, destination_arr, source.index)) {
                // Move instead of copy if 1 is left
                    if (source_arr[source.index].amount === 1) {
                        result = move(
                            source_arr,
                            destination_arr,
                            source,
                            destination,
                        );
                        this.updateAmount(source.index, null)
                        this.props.firebase.participantsRentals(this.props.index, index).update({ rentals: result[destination.droppableId] })
                    }
                    else {
                        result = copy(
                            source_arr,
                            destination_arr,
                            source,
                            destination
                        )
                        this.updateAmount(source.index, null)
                        this.props.firebase.participantsRentals(this.props.index, index).update({ rentals: result })
                    }
                }
            }



        }
        this.setState({ loading: false })
    };

    componentDidMount() {
        this.props.firebase.rentalOptions().once('value', obj => {
            const optionsObject = obj.val()

            let options = Object.keys(optionsObject).map(key => ({
                ...optionsObject[key],
            }))
            this.setState({options})
        })

        this.props.firebase.rentalGroups().on('value', snapshot => {
            const rentalsObject = snapshot.val()

            let rentalForms = Object.keys(rentalsObject).map(key => ({
                ...rentalsObject[key],
            }))

            let availableList = rentalForms[this.props.index].available ?? []

            this.setState({
                availableList: availableList,
                participants: rentalForms[this.props.index].participants,
                rentalForms: rentalForms,
                loading: false,
            })
        })
    }

    componentWillUnmount() {
        this.props.firebase.rentalGroups().off()
    }

    // Detaches rental from user
    detach = (rentalIndex, userIndex) => {
        // Update firebase rental at this index and increase amount of available for this item
        // Remove from participants at userIndex and remove rental at rentalIndex
        let rentals = this.state.participants[userIndex].rentals
        let obj = rentals.splice(rentalIndex, 1)
        this.props.firebase.participantsRentals(this.props.index, userIndex).update({ rentals })
        this.updateAmount(-1, obj[0])
    }

    // Edit rental number on user
    edit = (rentalIndex, userIndex, value) => {
        let rentals = this.state.participants[userIndex].rentals
        rentals[rentalIndex].number = value
        this.props.firebase.participantsRentals(this.props.index, userIndex).update({ rentals })
    }

    // Marks checked button on rental as opposite of what is on user
    checkin = (rentalIndex, userIndex) => {
        let rentals = this.state.participants[userIndex].rentals
        rentals[rentalIndex].checked = !(rentals[rentalIndex].checked)
        this.props.firebase.participantsRentals(this.props.index, userIndex).update({ rentals })
    }

    // Marks gamepass on selected user
    useGamepass = (userIndex) => {
        let gamepass = !this.state.participants[userIndex].gamepass
        this.props.firebase.participantsRentals(this.props.index, userIndex).update({ gamepass })
    }

    // Update amount of item in available list 
    updateAmount = (rentalIndex, obj) => {
        // Add 1 if index is -1
        // Subtract 1 otherwise
        let available = typeof this.state.availableList === 'object' ? this.state.availableList : []

        if (rentalIndex === -1) { // Add case
            let index = this.returnIndex(obj.value)
            if (index === -1) { // Was not found, push new object back in
                available.push(this.returnObject(obj.value))
            }
            else
                available[index].amount = available[index].amount += 1
            this.props.firebase.availableRentals(this.props.index).set(available)
        }
        else { // Subtract case
            available[rentalIndex].amount -= 1
            if (available[rentalIndex].amount === 0)
                available.splice(rentalIndex, 1)
            this.props.firebase.availableRentals(this.props.index).set(available)
        }
    }

    // Return index from availablelist where object value is found
    returnIndex = (value) => {
        const { availableList } = this.state
        if (availableList) {
            for (let i = 0; i < availableList.length; i++) {
                if (availableList[i].value === value)
                    return i
            }
        }
        return -1
    }

    // Find rental from options array
    returnObject = (value) => {
        for (let i = 0; i < this.state.options.length; i++) {
            if (this.state.options[i].value === value) {
                let obj = this.state.options[i]
                obj.amount = 1
                return obj
            }
        }
        return null;
    }

    // Remove participant from rental form
    remove = (i, obj) => {
        // Also move rentals back to original
        if (obj.rentals) {
            let available = this.state.availableList
            for (let i=0; i<obj.rentals.length; i++) {
                let index = available.findIndex(x => x.value === obj.rentals[i].value) 
                if (index !== -1)
                    available[index].amount += 1
                else {
                    obj.rentals[i].amount = 1
                    // Change id to old value
                    available.push(this.returnObject(obj.rentals[i].value))
                }
            }
            this.props.firebase.availableRentals(this.props.index).set(available)
        }
        this.props.firebase.participantsRentals(this.props.index, i).remove()
        this.props.firebase.validatedWaiver(obj.name).update({attached: false})
        if (i === 0) this.setState({removing: false})
    }


    // Normally you would want to split things out into separate components.
    // But in this example everything is just done in one place for simplicity
    render() {
        const { showAP } = this.props
        const { index, loading, participants, rentalForms, removing, availableList } = this.state
        return (
            <div>
                {loading ?
                    <Row className="justify-content-row">
                        <Spinner animation="border" />
                    </Row> :
                    <DragDropContext onDragEnd={this.onDragEnd}>
                        <TableContainer component={Paper} className="table-edit-rf">
                            <Table aria-label="collapsible table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell />
                                        <TableCell>Participant Name</TableCell>
                                        <TableCell align="right">Number of Rentals</TableCell>
                                        <TableCell align="right"></TableCell>
                                        <TableCell align="right"></TableCell>
                                        <TableCell align="right">Gamepass</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {
                                        participants && typeof participants !== 'undefined' ?
                                            participants.map((row, i) => (
                                                <MUITableRow key={row.name} row={row} index={i} removing={removing}
                                                    detach={this.detach} edit={this.edit} checkin={this.checkin} 
                                                    remove={this.remove.bind(this)} gamepass={this.useGamepass.bind(this)}
                                                    checkNum={this.rentalNumCheck.bind(this)}/>
                                            )) :
                                            <TableRow>
                                                <TableCell align="left" colSpan={6} className="tc-notice-rf">
                                                    Add Participants to attach rentals!
                                                </TableCell>
                                            </TableRow>
                                    }
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                        <TableCell colSpan={4} align="left" className="table-cell-button-rf">
                                            <MUIButton
                                                variant="contained"
                                                color="primary"
                                                size="small"
                                                disabled={!((participants ? participants.length : 0) < rentalForms[index].size)}
                                                startIcon={<Add />}
                                                onClick={() => {
                                                    showAP()
                                                }}>
                                                Add Participant
                                            </MUIButton>
                                            <MUIButton
                                                variant="contained"
                                                color="secondary"
                                                size="small"
                                                className="button-remove-esf"
                                                disabled={!participants}
                                                startIcon={<Remove />}
                                                onClick={() => {
                                                    this.setState({removing: !removing})
                                                }}>
                                                {!removing ? "Remove Participant" : "Removing"}
                                            </MUIButton>
                                        </TableCell>
                                        <TableCell colSpan={2} align="right">
                                            {`${participants && participants.length ? participants.length : 0}/${rentalForms[index].size} Participants`}
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </TableContainer>
                        {availableList ?
                        <Droppable droppableId="available" isDropDisabled={true}>
                            {(provided, snapshot) => (
                                <Row>
                                    <Col
                                        ref={provided.innerRef} className="col-rentals-esf"
                                        style={getListStyle(snapshot.isDraggingOver)}>
                                        {availableList.map((item, index) => (
                                            <Draggable
                                                key={item.id}
                                                draggableId={item.id}
                                                index={index}>
                                                {(provided, snapshot) => (
                                                    <React.Fragment key={item.id}>
                                                        <Chip avatar={<Avatar>{item.amount}</Avatar>} label={item.label}
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            style={getItemStyle(
                                                                snapshot.isDragging,
                                                                provided.draggableProps.style
                                                            )}
                                                        />
                                                    </React.Fragment>
                                                )}
                                            </Draggable>
                                        ))}
                                    </Col>
                                    {provided.placeholder}
                                    <Col md={4} className="col-applyall-rf">
                                        <MUIButton disabled={!(participants) || (availableList.length === 0)}
                                        onClick={() => this.applyAll()}>
                                            Apply To All
                                        </MUIButton>
                                    </Col>
                                </Row>
                            )}
                        </Droppable>
                         : null}
                    </DragDropContext>}
                <Snackbar open={this.state.error !== null} autoHideDuration={6000} onClose={() => this.setState({error: null})}>
                    <Alert onClose={() => this.setState({error: null})} severity="error">
                        {this.state.error}
                    </Alert>
                </Snackbar>
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
        marginLeft: theme.spacing(1),
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
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell component="th" scope="row" className="tc-name-esf">
                    <MUIButton disabled={!removing} onClick={() => {
                        remove(index, row) 
                    }} 
                    startIcon={removing ? <Delete /> : null }>
                        {row.name.substr(0, row.name.lastIndexOf('('))}
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
                                {`Rentals for ${row.name.substr(0, row.name.lastIndexOf('('))}`}
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

export default compose(
    withAuthorization(condition),
    withFirebase,
)(EditSelectedForm);