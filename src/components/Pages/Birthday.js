import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import { Container, Col, Breadcrumb, Spinner, Row } from 'react-bootstrap/';
import SaveIcon from '@material-ui/icons/Save';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';

import { Calendar, Views, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';

import { LinkContainer } from 'react-router-bootstrap';

import * as ROLES from '../constants/roles';
import { Helmet } from 'react-helmet-async';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField, Checkbox } from '@material-ui/core';

class Birthday extends Component {
    constructor(props) {
        super(props);

        this.state = {
            events: [],
            obj: null,
            loading: true,
            start: null,
            end: null,
            showDialog: false,
            editDialog: false,
            title: '',
            size: '',
            receipt: null,
            deposit: false,
            depositAmt: 0,
            notes: '',
            index: null,
        }
    }

    // Handles the logic on click for each day on the Calendar
    handleSelect = ({ start, end }) => {
        let temp = new Date(start.setHours(6))
        end.setHours(20)
        this.setState({ start: temp, end, showDialog: true })
    }

    // Handles the logic on click for existing event
    handleEdit = (event) => {
        // need to set all the states to the items in the event
        this.setState(event)
        this.setState({editDialog: true})
    }

    // Handles the creation of event on selected calendar date
    createEvent = (e) => {
        e.preventDefault()
        const { start, end, title, size, receipt, deposit, depositAmt, notes, events } = this.state
        if (title) {
            // Update database here
            let event = {
                        start: start.toJSON(),
                        end: end.toJSON(),
                        title,
                        size,
                        receipt,
                        deposit,
                        depositAmt,
                        notes,
                    }
            this.props.firebase.calendarEvent(events.length).set(event).then(() => {
                this.setState({showDialog: false}, () => {
                    this.setState({
                        title: '',
                        size: '',
                        receipt: null,
                        deposit: false,
                        depositAmt: 0,
                        notes: '',
                    })
                })
            })
        }
    }

    // Handles updating of the event
    handleUpdate = () => {
        const { index, title, size, receipt, deposit, depositAmt, notes } = this.state
        let event = this.state.events[index];
        event.title = title
        event.size = size
        event.receipt = receipt
        event.deposit = deposit
        event.depositAmt = depositAmt
        event.notes = notes
        event.start = event.start.toJSON()
        event.end = event.end.toJSON()
        // this.setState(events)
        this.props.firebase.calendarEvent(index).set(event).then(() => {
            this.handleEditClose()
        })
    }

    // Handles removal of the given event
    handleRemoval = () => {
        let events = this.state.obj
        events.splice(this.state.index, 1)
        this.props.firebase.calendar().set(events).then(() => {
            this.handleEditClose()
        })
    }

    // Handles the closing of the dialog
    handleClose = () => {
        this.setState({ showDialog: false }, () => {
            this.setState({
                title: '',
                size: '',
                receipt: null,
                deposit: false,
                depositAmt: 0,
                notes: '',
                index: null,
            })
        })
    }

    // Handles the closing of the edit dialog
    handleEditClose = () => {
        this.setState({ editDialog: false }, () => {
            this.setState({
                title: '',
                size: '',
                receipt: null,
                deposit: false,
                depositAmt: 0,
                notes: '',
                index: null,
            })
        })
    }

    // Handles dialog change for title (group name)
    handleGroupName = (val) => {
        this.setState({ title: val })
    }

    // Handles dialog change for size
    handleSize = (val) => {
        this.setState({ size: val })
    }

    // Handles dialog change for receipt
    handleReceipt = (val) => {
        this.setState({ receipt: val })
    }

    // Handles dialog change for deposit 
    handleDeposit = () => {
        this.setState({ deposit: !this.state.deposit })
    }

    // Handles dialog change for receipt
    handleDepositAmt = (val) => {
        this.setState({ depositAmt: val })
    }

    // Handles dialog change for notes
    handleNotes = (val) => {
        this.setState({ notes: val })
    }

    componentDidMount() {
        this.props.firebase.calendar().on('value', obj => {
            let events = obj.val() || [];
            for (let i=0; i<events.length; i++) {
                events[i].start = new Date(events[i].start)
                events[i].end = new Date(events[i].end)
            }

            let eventsObj = Object.keys(events).map(key => ({
                ...events[key],
                index: key,
            }));

            this.setState({events: eventsObj, obj: obj.val()}, () => {
                this.setState({ loading: false, })
            })
        })
    }

    componentWillUnmount() {
        this.props.firebase.calendar().off()
    }

    render() {
        const localizer = momentLocalizer(moment)
        const { 
            events, loading, showDialog, start, deposit, 
            notes, editDialog, title, size, receipt, depositAmt
        } = this.state
        const VM = Views.MONTH
        return (
            <div className="background-static-all">
                <Helmet>
                    <title>US Airsoft Field: Birthday</title>
                </Helmet>
                {loading ?
                    <Row className="justify-content-row padding-5px"><Spinner animation="border" /></Row> :
                    <Container>
                        <h2 className="admin-header">Calendar - Birthday</h2>
                        <Breadcrumb className="admin-breadcrumb">
                            <LinkContainer to="/admin">
                                <Breadcrumb.Item>Admin</Breadcrumb.Item>
                            </LinkContainer>
                            <Breadcrumb.Item active>Calendar</Breadcrumb.Item>
                        </Breadcrumb>
                        <div className="div-main-birthday">
                            <Calendar
                                selectable
                                localizer={localizer}
                                events={events}
                                defaultView={VM}
                                scrollToTime={new Date(1970, 1, 1, 6)}
                                defaultDate={new Date()}
                                onSelectEvent={event => this.handleEdit(event)}
                                onSelectSlot={this.handleSelect}
                                titleAccessor={event => {return  `(${event.size}) ${event.title}`}}
                                startAccessor="start"
                                endAccessor="end"
                                popup
                            />
                        </div>
                        <div>
                            <Dialog
                                open={showDialog}
                                className="dialog-create-birthday"
                                onClose={this.handleClose}>
                                <DialogTitle>
                                    {`Selected Date: ${start !== null ? start.toDateString() : start}`}
                                </DialogTitle>
                                <DialogContent className="content-create-birthday">
                                    <Row>
                                        <Col>
                                            <TextField
                                                label="Group Name"
                                                type="text"
                                                autoFocus
                                                autoComplete={null}
                                                onChange={(e) => this.handleGroupName(e.target.value)}
                                                variant="outlined" />
                                        </Col>
                                        <Col>
                                            <TextField
                                                label="Group Size"
                                                type="text"
                                                autoComplete={null}
                                                onChange={(e) => this.handleSize(e.target.value)}
                                                variant="outlined" />
                                        </Col>
                                    </Row>
                                    <Row className="row-notes-birthday">
                                        <Col>
                                            <TextField
                                                label="Additional Notes"
                                                fullWidth
                                                multiline
                                                rows={4}
                                                value={notes}
                                                onChange={(e) => this.handleNotes(e.target.value)}
                                                variant="outlined"
                                            />
                                        </Col>
                                    </Row>
                                    <Row className="row-deposit-birthday">
                                        <Col xs={"auto"} className="align-items-center-col">
                                            <p className="no-margin-bottom">Deposit:</p>
                                        </Col>
                                        <Col xs={"auto"} className="align-items-center-col">
                                            <Checkbox
                                                value={deposit}
                                                onChange={this.handleDeposit}
                                            />
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col>
                                            {deposit ?
                                                <TextField
                                                    label="Deposit Amt."
                                                    type="text"
                                                    autoComplete={null}
                                                    onChange={(e) => this.handleDepositAmt(e.target.value)}
                                                    variant="outlined" />
                                                : null}
                                        </Col>
                                        <Col>
                                            {deposit ?
                                                <TextField
                                                    label="Receipt #"
                                                    type="text"
                                                    autoComplete={null}
                                                    onChange={(e) => this.handleReceipt(e.target.value)}
                                                    variant="outlined" />
                                                : null}
                                        </Col>
                                    </Row>
                                </DialogContent>
                                <DialogActions className="actions-create-birthday">
                                    <Col md={8}>
                                        <Button onClick={this.createEvent} type="button" color="primary"
                                        endIcon={<AddIcon />}>
                                            Create
                                        </Button>
                                    </Col>
                                    <Col md={4} className="justify-content-flex-end-col">
                                        <Button onClick={this.handleClose} color="primary">
                                            Cancel
                                        </Button>
                                    </Col>
                                </DialogActions>
                            </Dialog>
                        </div>
                        <div>
                            <Dialog
                                open={editDialog}
                                className="dialog-edit-birthday"
                                onClose={this.handleEditClose}>
                                <DialogTitle>
                                    {`Selected Date: ${start !== null ? start.toDateString() : start}`}
                                </DialogTitle>
                                <DialogContent className="content-create-birthday">
                                    <Row>
                                        <Col>
                                            <TextField
                                                label="Group Name"
                                                type="text"
                                                autoFocus
                                                autoComplete={null}
                                                value={title}
                                                onChange={(e) => this.handleGroupName(e.target.value)}
                                                variant="outlined" />
                                        </Col>
                                        <Col>
                                            <TextField
                                                label="Group Size"
                                                type="text"
                                                autoComplete={null}
                                                value={size}
                                                onChange={(e) => this.handleSize(e.target.value)}
                                                variant="outlined" />
                                        </Col>
                                    </Row>
                                    <Row className="row-notes-birthday">
                                        <Col>
                                            <TextField
                                                label="Additional Notes"
                                                fullWidth
                                                multiline
                                                rows={4}
                                                value={notes}
                                                onChange={(e) => this.handleNotes(e.target.value)}
                                                variant="outlined"
                                            />
                                        </Col>
                                    </Row>
                                    <Row className="row-deposit-birthday">
                                        <Col xs={"auto"} className="align-items-center-col">
                                            <p className="no-margin-bottom">Deposit:</p>
                                        </Col>
                                        <Col xs={"auto"} className="align-items-center-col">
                                            <Checkbox
                                                checked={deposit}
                                                value={deposit}
                                                onChange={this.handleDeposit}
                                            />
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col>
                                            {deposit ?
                                                <TextField
                                                    label="Deposit Amt."
                                                    type="text"
                                                    autoComplete={null}
                                                    value={depositAmt}
                                                    onChange={(e) => this.handleDepositAmt(e.target.value)}
                                                    variant="outlined" />
                                                : null}
                                        </Col>
                                        <Col>
                                            {deposit ?
                                                <TextField
                                                    label="Receipt #"
                                                    type="text"
                                                    autoComplete={null}
                                                    value={receipt}
                                                    onChange={(e) => this.handleReceipt(e.target.value)}
                                                    variant="outlined" />
                                                : null}
                                        </Col>
                                    </Row>
                                </DialogContent>
                                <DialogActions className="actions-create-birthday">
                                    <Col md={8}>
                                        <Button onClick={this.handleUpdate} type="button" color="primary"
                                        endIcon={<SaveIcon />}>
                                            Update
                                        </Button>
                                        <Button onClick={this.handleRemoval} color="primary"
                                        endIcon={<DeleteIcon />}>
                                            Remove
                                        </Button>
                                    </Col>
                                    <Col md={4} className="justify-content-flex-end-col">
                                        <Button onClick={this.handleEditClose} color="primary">
                                            Cancel
                                        </Button>
                                    </Col>
                                </DialogActions>
                            </Dialog>
                        </div>
                    </Container>}
            </div>
        );
    }
}

const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default compose(
    withAuthorization(condition),
    withFirebase,
)(Birthday);