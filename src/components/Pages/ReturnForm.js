import React, { Component } from 'react';
import '../../App.css';
import { withFirebase } from '../Firebase';
import { Avatar, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText } from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import { Contacts, AssignmentTurnedIn, ArrowBackIos, VerifiedUser } from '@material-ui/icons';
import MUIButton from '@material-ui/core/Button';

import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';

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

import { Row, Spinner } from 'react-bootstrap/';

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
  }

class ReturnForm extends Component {
    constructor(props) {
        super(props);

        this.state = {
            rentalForms: null,
            loading: true,
            index: -1,
            combinedList: null,
            optionsLength: 0, optionsObject: null,
            error: null,
            success: false,
        };
    }

    componentDidMount() {
        this.props.firebase.rentalOptions().once('value', snapshot => {
            const obj = snapshot.val()
            let optionsObject = {};
            for (let i=0; i<obj.length; i++)
                optionsObject[obj[i].value] = {...obj[i]}

            let optionsList = Object.keys(obj).map(key => ({
                ...obj[key],
            }))

            this.setState({
                optionsLength: obj.length,
                optionsObject: optionsObject,
                optionsList: optionsList,
            })
        })
        this.props.firebase.rentalGroups().on('value', snapshot => {
            const rentalsObject = snapshot.val()

            let rentalForms = Object.keys(rentalsObject).map(key => ({
                ...rentalsObject[key],
            }))

            this.setState({
                rentalForms: rentalForms,
                loading: false,
            })
        })
    }

    componentWillUnmount() {
        this.props.firebase.rentalGroups().off()
    }

    // creates array given dimensions
    createArray(length) {
        var arr = new Array(length || 0),
            i = length;
    
        if (arguments.length > 1) {
            var args = Array.prototype.slice.call(arguments, 1);
            while(i--) arr[length-1 - i] = this.createArray.apply(this, args);
        }
    
        return arr;
    }

    // Creates list of the rentals checked out
    createCombinedList() {
        const { optionsLength, rentalForms, index, optionsObject } = this.state
        // let list = Array.apply({}, Array(optionsLength))
        if (rentalForms[index].participants) {
            let list = this.createArray(optionsLength)
            rentalForms[index].participants.forEach(function(player, participantIndex) {
                // player.rental double for loop
                if (player.rentals) {
                    player.rentals.forEach(function(rental, rentalIndex) {
                        let i = parseInt(optionsObject[rental.value].id.replace('r', ''))
                        if (list[i]) {
                            let obj = {number: rental.number, rentalIndex, participantIndex}
                            list[i].push(obj)
                        }
                        else {
                            let temp = new Array(1)
                            let obj = {number: rental.number, rentalIndex, participantIndex}
                            temp[0] = obj
                            list[i] = temp
                        }
                    })
                }
            })
            this.setState({combinedList: list, loading: false})
        }
        else {this.setState({combinedList: null, loading: false})}
    }

    // Checks off selected rental from the participant
    checkOffRental(rentalIndex, participantIndex) {
        const { rentalForms, index } = this.state
        let check = rentalForms[index].participants[participantIndex].rentals[rentalIndex].checked;
        let rentals = rentalForms[index].participants[participantIndex].rentals;
        rentals[rentalIndex].checked = !check
        this.props.firebase.participantsRentals(index, participantIndex).update({rentals})
    }

    // Validates if all rentals were returned
    validateReturn() {
        const { rentalForms, index } = this.state
        let status = true
        if (rentalForms[index].participants) {
            rentalForms[index].participants.forEach(function(player) {
                if (player.rentals) {
                    player.rentals.forEach(function(rental) {
                        if (rental.checked === false) {
                            status = false
                        }
                    })
                }
            })
            return status
        }
        else return status
    }

    // Release form function
    releaseForm() {
        const { index, rentalForms } = this.state
        // Add stock back to original
        this.setState({successMessage: `Group ${rentalForms[index].name} was successfully removed.`, success: true, index: -1})
        this.props.firebase.rentalGroup(index).remove()
    }


    render() {
        const {rentalForms, loading, index, combinedList, optionsList, error} = this.state



        const classes = makeStyles({ table: {
                '& > *': {
                    borderBottom: 'unset',
                },
            },
        });

        return(
            <div>
                {loading ? 
                <Row className="spinner-standard">
                    <Spinner animation="border" />
                </Row>
                :
                index === -1 ?
                <div>
                    <h5 className="admin-header">Return Rental Form</h5>
                    <List className="list-edit-rf">
                        {rentalForms.map((form, i) => {
                            if (form.complete !== false) {
                                return (
                                    <ListItem key={i}>
                                        <ListItemAvatar>
                                            <Avatar>
                                                <Contacts />
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={form.name}
                                            secondary={`${form.size} Participants`}
                                        />
                                        <ListItemSecondaryAction>
                                            <IconButton edge="end" aria-label="edit"
                                                onClick={() => {
                                                    this.setState({loading: true, index: i}, () => {this.createCombinedList()})
                                                }
                                                }>
                                                <AssignmentTurnedIn />
                                            </IconButton>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                )
                            } else return null
                        })}
                    </List> 
                </div>
                :
                    <div>
                        <Row className="row-transaction-rf">
                            <h5 className="h5-transaction-rf">{`Transaction #${rentalForms[index].transaction}`}</h5>
                        </Row>
                        <div className="div-back-button-rf">
                            <MUIButton
                                variant="contained"
                                color="primary"
                                size="small"
                                startIcon={<ArrowBackIos />}
                                onClick={() => {
                                    this.setState({index: -1, error: null})
                                }}>
                                Back
                            </MUIButton>
                        </div>
                        <Row className="justify-content-row row-group-name-rf">
                            <h5 className="h5-group-name-rf">{`Group: ${rentalForms[index].name}`}</h5>
                        </Row>
                        <TableContainer component={Paper} className="table-edit-rf">
                            <Table className={classes.table} aria-label="summary table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Rental</TableCell>
                                        <TableCell align="left">Numbers Rented Out</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {combinedList ?
                                    combinedList.map((row, i) => {
                                        if (row)
                                            return (
                                                <TableRow key={i}>
                                                    <TableCell component="th" scope="row">
                                                        {optionsList[i].label}
                                                    </TableCell>
                                                    <TableCell align="left">
                                                        {row.sort((a,b) => (a.number < b.number ? 1 : -1)).map((rental, i) => (
                                                            <div key={i} 
                                                            className={rentalForms[index].participants[rental.participantIndex].rentals[rental.rentalIndex].checked ?
                                                             "div-checked-in-rf" : "div-checked-out-rf"}>
                                                                <MUIButton
                                                                disabled={rental.number === ""}
                                                                onClick={() => {
                                                                    //Check the item in for the user
                                                                    this.checkOffRental(rental.rentalIndex, rental.participantIndex)
                                                                }}>
                                                                    {rental.number === "" ? "N/A" : rental.number}
                                                                </MUIButton>
                                                            </div>
                                                        ))}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        else 
                                            return null;
                                    }) :
                                    <TableRow>
                                        <TableCell align="left" colSpan={6} className="tc-notice-rf">
                                            Add Participants to return rentals or click complete to remove form!
                                        </TableCell>
                                    </TableRow>
                                }
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                        <TableCell colSpan={6} align="right" className="table-cell-button-rf">
                                            <MUIButton
                                                variant="contained"
                                                color="primary"
                                                size="small"
                                                endIcon={<VerifiedUser />}
                                                onClick={() => {
                                                    if (this.validateReturn())
                                                        this.releaseForm()
                                                    else 
                                                        this.setState({error: "Please verify that all items were checked in."})
                                                }}>
                                                Complete Form
                                            </MUIButton>
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </TableContainer>
                    </div>
                }
                <Snackbar open={this.state.success} autoHideDuration={6000} onClose={() => this.setState({success: false})}>
                    <Alert onClose={() => this.setState({success: false})} severity="success">
                        {this.state.successMessage}
                    </Alert>
                </Snackbar>
                <Snackbar open={error} autoHideDuration={6000} onClose={() => this.setState({error: null})}>
                    <Alert onClose={() => this.setState({error: null})} severity="error">
                        {error}
                    </Alert>
                </Snackbar>
            </div>
        )
    }
}

export default withFirebase(ReturnForm);