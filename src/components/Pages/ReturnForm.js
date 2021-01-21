import React, { Component, useState } from 'react';
import '../../App.css';
import { withFirebase } from '../Firebase';
import { Avatar, Checkbox, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, TextField } from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import { Contacts, Check } from '@material-ui/icons';

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

import { Col, Row, Spinner } from 'react-bootstrap/';

class ReturnForm extends Component {
    constructor(props) {
        super(props);

        this.state = {
            rentalForms: null,
            loading: true,
            index: -1,
            combinedList: null,
            optionsLength: 0,
        };


    }

    componentDidMount() {
        this.props.firebase.rentalOptions().once('value', snapshot => {
            console.log(snapshot.val().length)
            this.setState({optionsLength: snapshot.val().length})
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

    // Creates list of the rentals checked out
    createCombinedList() {
        let list = Array.apply({}, Array(this.state.optionsLength))
        this.state.rentalForms[this.state.index].participants.forEach(function(player) {
            // player.rental double for loop
        })
    }




    render() {
        const {rentalForms, loading, index, combinedList} = this.state


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
                                            <Check />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            )
                        } else return null
                    })}
                </List> 
                :
                    <TableContainer component={Paper} className="table-edit-rf">
                        <Table className={classes.table} aria-label="summary table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Rental</TableCell>
                                    <TableCell align="center">Amount Rented</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {combinedList.map((row) => (
                                    <TableRow key={row.name}>
                                        <TableCell component="th" scope="row">
                                            {row.label}
                                        </TableCell>
                                        <TableCell align="center">{row.amount}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                }
            </div>
        )
    }
}

export default withFirebase(ReturnForm);