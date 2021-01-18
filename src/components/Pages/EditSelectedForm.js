import { faCheckSquare, faSquare } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Avatar, Chip } from '@material-ui/core';
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
import { Add, Cancel, CheckCircle, Edit, RemoveCircleOutline } from '@material-ui/icons';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import React, { Component } from 'react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { Col, Row, Spinner } from 'react-bootstrap/';
import styled from 'styled-components';
// My imports 
import uuid from 'uuid/v4';

import { withFirebase } from '../Firebase';

import '../../App.css';

const options = [
    { label: "M4 Rental w/ battery", value: "M4 Rental", number: "", checked: false, id: "r0" },
    { label: "M4 Magazine", value: "M4 Magazine", number: "", checked: false, id: "r1" },
    { label: "Full Face Mask", value: "Mask", number: "", checked: false, id: "r2" },
    { label: "M4 Premium Rental w/ battery", value: "M4 Premium Rental", number: "", checked: false, id: "r3" },
    { label: "Firehawk (9 to 11 yrs.)", value: "Firehawk", number: "", checked: false, id: "r4"},
    { label: "Premium Dye Mask", value: "Dye Mask", number: "", checked: false, id: "r5" },
    { label: "Condor Sling", value: "Condor Sling", number: "", checked: false, id: "r6" },
    { label: "Condor Vest", value: "Condor Vest", number: "", checked: false, id: "r7" },
    { label: "9.6v Battery", value: "9.6v Battery", number: "", checked: false, id: "r8" },
    { label: "Elite Force 1911", value: "Elite Force 1911", number: "", checked: false, id: "r9" },
    { label: "Elite Force 1911 Magazine", value: "Elite Force 1911 Magazine", number: "", checked: false, id: "r10" },
    { label: "Glock 17", value: "Glock 17", number: "", checked: false, id: "r11" },
]

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
const move = (source, destination, droppableSource, droppableDestination, availableList) => {
    const sourceClone = Array.from(source);
    const destClone = typeof destination === 'object' ? Array.from(destination) : [];
    //let removed = source[droppableSource.index]

    //if (!removed) return;

    //let foundIndex = -1
    if (droppableSource.droppableId.includes("p_rentals") && droppableDestination.droppableId.includes("p_rentals")) {
        return;
    }
    // else if (removed.amount) { // Copy case
    //     // Decrement number of rentals left if the number is greater than 1
    //     // if (removed?.amount > 1) {
    //     //     sourceClone.amount--
    //     //     // Adds it back but we need to remove it if it is wrong
    //     //     //sourceClone.splice(droppableSource.index, 0, Object.assign({}, removed));
    //     // }
    //     else {
    //         // [removed] = sourceClone.splice(droppableSource.index, 1);
    //     }
    // }
    // else {
    // Moving it the opposite direction checking if it exists in Available object
    // [removed] = sourceClone.splice(droppableSource.index, 1);
    // let amount = 1
    // // Change how duplicate is found
    // for (let i = 0; i < availableList.length; i++) {
    //     if (availableList[i].value === removed.value) {
    //         amount = availableList[i].amount + 1
    //         foundIndex = i
    //         break;
    //     }
    // }
    // removed["amount"] = amount
    //}

    // console.log(destClone)
    // // If it wasn't found add it back to the array
    // if (foundIndex === -1)
    //     destClone.splice(droppableDestination.index, 0, removed);
    // else {
    //     destClone[foundIndex] = removed
    // }

    const [removed] = sourceClone.splice(droppableSource.index, 1);

    const result = {};
    result[droppableSource.droppableId] = sourceClone;
    result[droppableDestination.droppableId] = destClone;

    return result;
};

const Item = styled.div`
  display: flex;
  user-select: none;
  padding: 0.5rem;
  margin: 0 0  0.5rem 0;
  align-items: flex-start;
  align-content: flex-start;
  line-height: 1.5;
  border-radius: 3px;
  border: 1px ${props => (props.isDragging ? 'dashed #000' : 'solid #ddd')};

 `;

const Clone = styled(Item)`
  + div {
    display: none!important;
  }
`;

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
    };

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
                const { availableList } = this.state
                const result = move(
                    source_arr,
                    destination_arr,
                    source,
                    destination,
                    availableList
                );

                if (index2) { // Both are p_rental trips
                    let p_index = "p_rentals-" + index
                    let p_index2 = "p_rentals-" + index2
                    console.log(result[p_index])
                    console.log(result[p_index2])
                    this.props.firebase.participantsRentals(this.props.index, index).update({ rentals: result[p_index] })
                    this.props.firebase.participantsRentals(this.props.index, index2).update({ rentals: result[p_index2] })
                }
                else { // Available case as destination (not gonna be used)
                    let p_index = "p_rentals-" + index
                    this.props.firebase.participantsRentals(this.props.index, index).update({ rentals: result[p_index] })
                    this.props.firebase.availableRentals(this.props.index).update(result.available)
                }
            }
            else { // Available case as source
                index = destination.droppableId.split("-")[1]
                destination_arr = this.state.participants[index].rentals
                source_arr = this.state.availableList
                result = copy(
                    source_arr,
                    destination_arr,
                    source,
                    destination
                )

                let p_index = "p_rentals-" + index
                for (let i = 0; i < result.length; i++) {
                    result[i].number = ""
                    delete result[i].amount
                }

                console.log(result)

                this.updateAmount(source.index, null)
                this.props.firebase.participantsRentals(this.props.index, index).update({ rentals: result })
                // this.props.firebase.availableRentals(this.props.index).update(result.available)
            }


            console.log(result)
            console.log(index2)
            //Update database here
            // if (typeof index2 !== 'undefined') {
            //     // temp = this.state.participants
            //     // if (typeof temp.rentals === 'undefined')
            //     //     temp.rentals = ""
            //     // temp[index].rentals = result["p_rentals-" + index]
            //     // temp[index2].rentals = result["p_rentals-" + index2]
            // }
            // else {
            //     let p_index = "p_rentals-" + index
            //     for (let i=0; i<result[p_index].length; i++) {
            //         result[p_index][i].number = ""
            //         delete result[p_index][i].amount 
            //     }
            //     this.props.firebase.participantsRentals(this.props.index, index).update({ rentals: result[p_index]})
            //     this.props.firebase.availableRentals(this.props.index).update(result.available)
            //     //this.props.firebase.rental(this.props.index).update({ participants: temp })
            //     //this.props.firebase.rental(this.props.index).update({ available: result.available })
            // }



            //this.props.firebase.rental(this.props.index).update({ participants: temp })

            // this.setState({
            //     availableList: result.available,
            //     participants: temp
            // });
        }
        this.setState({ loading: false })
    };

    componentDidMount() {
        this.props.firebase.rentals().on('value', snapshot => {
            const rentalsObject = snapshot.val()

            let rentalForms = Object.keys(rentalsObject).map(key => ({
                ...rentalsObject[key]
            }))

            this.setState({
                availableList: rentalForms[this.props.index].available,
                participants: rentalForms[this.props.index].participants,
                rentalForms: rentalForms,
                loading: false
            })
        })
    }

    componentWillUnmount() {
        this.props.firebase.rentals().off()
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
            this.props.firebase.availableRentals(this.props.index).update(available)
        }
        else { // Subtract case
            available[rentalIndex].amount -= 1
            if (available[rentalIndex].amount === 0)
                available.splice(rentalIndex, 1)
            this.props.firebase.availableRentals(this.props.index).update(available)
        }
    }

    // Return index from availablelist where object value is found
    returnIndex = (value) => {
        const { availableList } = this.state
        for (let i = 0; i < availableList.length; i++) {
            if (availableList[i].value === value)
                return i
        }
        return -1
    }

    // Find rental from options array
    returnObject = (value) => {
        for (let i = 0; i < options.length; i++)
            if (options[i].value === value) return options[i]
        return null;
    }


    // Normally you would want to split things out into separate components.
    // But in this example everything is just done in one place for simplicity
    render() {
        const { showAP } = this.props
        const { index, loading, participants, rentalForms } = this.state
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
                                        <TableCell align="right"></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {
                                        typeof participants !== 'undefined' ?
                                            participants.map((row, i) => (
                                                <MUITableRow key={row.name} row={row} index={i}
                                                    detach={this.detach} edit={this.edit} checkin={this.checkin} />
                                            )) :
                                            <Row className="justify-content-row">
                                                <Spinner animation="border" />
                                            </Row>
                                    }
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                        <TableCell colSpan={4} align="left" className="table-cell-button-rf">
                                            <MUIButton
                                                variant="contained"
                                                color="primary"
                                                size="small"
                                                startIcon={<Add />}
                                                onClick={() => {
                                                    showAP()
                                                }}>
                                                Add Participant
                                        </MUIButton>
                                        </TableCell>
                                        <TableCell colSpan={2} align="right">
                                            {`${participants.length ? participants.length : 0}/${rentalForms[index].size} Participants`}
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </TableContainer>
                        <Droppable droppableId="available" isDropDisabled={true}>
                            {(provided, snapshot) => (
                                <Row>
                                    <Col
                                        ref={provided.innerRef} className="col-rentals-esf"
                                        style={getListStyle(snapshot.isDraggingOver)}>
                                        {this.state.availableList.map((item, index) => (
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
                                </Row>
                            )}
                        </Droppable>
                    </DragDropContext>}
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
    const { row, index, detach, edit, checkin } = props;

    const [open, setOpen] = React.useState(false);
    const [editArray, setEditArray] = React.useState(new Array(typeof row.rentals === 'object' ? (row.rentals.length) : []).fill(false));
    const [editArrayValue, setEditArrayValue] = React.useState(new Array(typeof row.rentals === 'object' ? (row.rentals.length) : []).fill(""));
    const classes = useRowStyles();
    const classes2 = useStyles()

    return (
        <React.Fragment>
            <TableRow className={classes.root}>
                <TableCell>
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell component="th" scope="row">
                    {row.name.substr(0, row.name.lastIndexOf('('))}
                </TableCell>
                <TableCell align="right">{row.rentals ? row?.rentals.length : 0}</TableCell>
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
                                                                            edit(i, index, editArrayValue[i])
                                                                            let tempArray = [...editArray];
                                                                            tempArray.fill(false)
                                                                            setEditArray(tempArray)
                                                                        }}>
                                                                            <InputBase
                                                                                className={classes2.input}
                                                                                placeholder="Enter Rental Number"
                                                                                inputProps={{ 'aria-label': 'enter rental number' }}
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

export default withFirebase(EditSelectedForm);