import React, { Component } from 'react';
import '../../App.css';
import { withFirebase } from '../Firebase';
import { Avatar, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, TextField } from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import { Contacts, AssignmentTurnedIn, ArrowBackIos, VerifiedUser } from '@material-ui/icons';
import MUIButton from '@material-ui/core/Button';

import logo from '../../assets/usairsoft-small-logo.png';
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

import { Row, Spinner, Button } from 'react-bootstrap/';

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
            optionsList: null,
            error: null,
            success: false,
            complete: false,
            email: "",
        };
    }

    componentDidMount() {
        this.props.firebase.rentalOptions().on('value', snapshot => {
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

            if (rentalsObject) {
                let rentalForms = Object.keys(rentalsObject).map(key => ({
                    ...rentalsObject[key],
                }))
    
                this.setState({
                    rentalForms: rentalForms,
                    loading: false,
                })
            }
            else {
                this.setState({loading: false})
            }
        })
    }

    componentWillUnmount() {
        this.props.firebase.rentalGroups().off()
        this.props.firebase.rentalOptions().off()
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
                        if (rental.checked === false && rental.number !== "") {
                            status = false
                        }
                    })
                }
            })
            return status
        }
        else return status
    }

    // Return back stock from group
    returnRentals(rentalForm) {
        let optionsObject = this.state.optionsObject
        let options = JSON.parse(JSON.stringify(this.state.optionsList))
        // Check if participants exist at all
        if (rentalForm.participants) {
            for (let i=0; i < rentalForm.participants.length; i++) {
                let participant = rentalForm.participants[i]
                // Check if participant has any rentals
                if (typeof participant.rentals === 'object') {
                    for (let z=0; z < participant.rentals.length; z++) {
                        let rental = participant.rentals[z]
                        let index = parseInt(optionsObject[rental.value].id.substring(1))
                        options[index].stock = parseInt(options[index].stock) - 1
                    }
                }
            }
        }
        if (rentalForm.available) {
            for (let i=0; i<rentalForm.available.length; i++) {
                let rental = rentalForm.available[i]
                let index = parseInt(rental.id.substring(1))
                options[index].stock = parseInt(options[index].stock) - parseInt(rental.amount)
            }
        }

        // Set the options with the new updated
        this.props.firebase.rentalOptions().set(options)
    }

    // Looks through users attached to rental form and detaches them for future use
    detachUsers(rentalForm) {
        if (rentalForm.participants) {
            for (let i=0; i < rentalForm.participants.length; i++) {
                // let name = rentalForm.participants[i].name;
                // Delete from validated array to clean up and allow recycle of users if they are not a member
                // if (!rentalForm.participants[i].isMember) {
                //     this.props.firebase.validatedWaiver(name.substr(0, name.lastIndexOf(')')+1)).remove()
                // }
            }
        }
    }

    // Release form function
    releaseForm() {
        const { index, rentalForms, email } = this.state
        // Add stock back to original
        this.returnRentals(rentalForms[index])
        // Detach users from rental
        // this.detachUsers(rentalForms[index])
        // Email a summary if email is not empty
        if (email) {
            let sendReceipt = this.props.firebase.sendReceipt()
            const name = rentalForms[index].name
            const receipt = rentalForms[index].transaction
            const last4 = rentalForms[index].cc.number.substr(rentalForms[index].cc.number.length - 4)
            sendReceipt({email, name, receipt, last4})
        }
        this.setState({successMessage: `Group ${rentalForms[index].name} was successfully removed.`, success: true, index: -1, complete: false, email: ""})
        // Removes index from group and updates firebase
        let group = rentalForms
        group.splice(index, 1)
        this.props.firebase.rentals().update({group})
    }


    render() {
        const {rentalForms, loading, index, combinedList, optionsList, error, complete} = this.state



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
                        {rentalForms ?
                        rentalForms.map((form, i) => {
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
                        }) : <p className="p-empty-rentals-rf">Add Rental Forms to see groups here.</p>}
                    </List> 
                </div>
                :
                    complete ? 
                        <div>
                            <Row className="row-notice">
                                <h2 className="page-header">Rental Form Completed.</h2>
                            </Row>
                            <Row className="row-notice">
                                <p className="notice-text-g">Please type in the customer's email below for them to </p>
                            </Row>
                            <Row className="row-notice">
                                <p className="notice-text-g">receive a receipt. Finally, click Complete Form when finished.</p>
                            </Row>
                            <Row className="justify-content-row">
                                <div className="div-email-rf">
                                    <TextField
                                        id="email"
                                        label="Email Address"
                                        variant="outlined"
                                        type="email"
                                        value={this.state.email}
                                        onChange={(e) => this.setState({email: e.target.value})}
                                    />
                                </div>
                            </Row>
                            <Row className="justify-content-row">
                                <Button className="next-button-rp" variant="info" type="button"
                                    onClick={() => {
                                        this.releaseForm()
                                    }}>Complete Form</Button>
                            </Row>
                            <Row className="row-notice">
                                <img src={logo} alt="US Airsoft logo" className="small-logo-home" />
                            </Row> 
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
                                                        {row.sort((a,b) => (a.number > b.number ? 1 : -1)).map((rental, i) => (
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
                                                        this.setState({complete: true})
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
                <Snackbar open={error !== null} autoHideDuration={6000} onClose={() => this.setState({error: null})}>
                    <Alert onClose={() => this.setState({error: null})} severity="error">
                        {error}
                    </Alert>
                </Snackbar>
            </div>
        )
    }
}

export default withFirebase(ReturnForm);