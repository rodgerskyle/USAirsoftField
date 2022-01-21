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
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, 
    TextField, Checkbox, Select, MenuItem, InputLabel, FormControl } from '@material-ui/core';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';

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
            startTimeHours: '',
            startTimeMinutes: '',
            endTimeHours: '',
            endTimeMinutes: '',
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
        this.setState({ 
            startTimeHours: event.start.getHours(),
            startTimeMinutes: event.start.getMinutes(),
            endTimeHours: event.end.getHours(),
            endTimeMinutes: event.end.getMinutes()
        })
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
                        startTimeHours: '',
                        startTimeMinutes: '',
                        endTimeHours: '',
                        endTimeMinutes: '',
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
                start: null,
                startTimeHours: '',
                startTimeMinutes: '',
                endTimeHours: '',
                endTimeMinutes: '',
                end: null,
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
                start: null,
                startTimeHours: '',
                startTimeMinutes: '',
                endTimeHours: '',
                endTimeMinutes: '',
                end: null,
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

    // Handles start time for calendar selection
    handleStartHour = (val) => {
        console.log(val)
        let startTemp = this.state.start
        startTemp.setHours(val)
        console.log(startTemp)
        this.setState({ start: startTemp, startTimeHours: val })
    }

    // Handles start time for calendar selection
    handleStartMinutes = (val) => {
        console.log(val)
        let startTemp = this.state.start
        startTemp.setMinutes(val)
        console.log(startTemp)
        this.setState({ start: startTemp, startTimeMinutes: val })
    }

    // Handles start time for calendar selection
    handleEndHour = (val) => {
        console.log(val)
        let endTemp = this.state.end
        endTemp.setHours(val)
        console.log(endTemp)
        this.setState({ end: endTemp, endTimeHours: val })
    }

    // Handles start time for calendar selection
    handleEndMinutes = (val) => {
        console.log(val)
        let endTemp = this.state.end
        endTemp.setMinutes(val)
        console.log(endTemp)
        this.setState({ end: endTemp, endTimeMinutes: val })
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
            notes, editDialog, title, size, receipt, depositAmt,
            startTimeHours, startTimeMinutes, endTimeHours, endTimeMinutes
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
                                        <Col md={7}>
                                            Start Time
                                        </Col>
                                        <Col md={5}>
                                            End Time
                                        </Col>
                                    </Row>
                                    <Row className="margin15-bottom justify-content-row">
                                        {/* Start time hours */}
                                        <Col md={2}>
                                            <FormControl fullWidth className="tester-test">
                                                <InputLabel style={{fontSize: 12}} id="time-start-hours-label">Hour</InputLabel>
                                                <Select
                                                    labelId='time-start-hours-label'
                                                    id='time-start-hours-label'
                                                    value={startTimeHours}
                                                    label="Start Time Hour"
                                                    onChange={(e) => this.handleStartHour(e.target.value)}
                                                    MenuProps={{ style: { maxHeight: 'calc(50% - 96px)'}}}
                                                >
                                                    <MenuItem value={0}>0</MenuItem>
                                                    <MenuItem value={1}>1</MenuItem>
                                                    <MenuItem value={2}>2</MenuItem>
                                                    <MenuItem value={3}>3</MenuItem>
                                                    <MenuItem value={4}>4</MenuItem>
                                                    <MenuItem value={5}>5</MenuItem>
                                                    <MenuItem value={6}>6</MenuItem>
                                                    <MenuItem value={7}>7</MenuItem>
                                                    <MenuItem value={8}>8</MenuItem>
                                                    <MenuItem value={9}>9</MenuItem>
                                                    <MenuItem value={10}>10</MenuItem>
                                                    <MenuItem value={11}>11</MenuItem>
                                                    <MenuItem value={12}>12</MenuItem>
                                                    <MenuItem value={13}>13</MenuItem>
                                                    <MenuItem value={14}>14</MenuItem>
                                                    <MenuItem value={15}>15</MenuItem>
                                                    <MenuItem value={16}>16</MenuItem>
                                                    <MenuItem value={17}>17</MenuItem>
                                                    <MenuItem value={18}>18</MenuItem>
                                                    <MenuItem value={19}>19</MenuItem>
                                                    <MenuItem value={20}>20</MenuItem>
                                                    <MenuItem value={21}>21</MenuItem>
                                                    <MenuItem value={22}>22</MenuItem>
                                                    <MenuItem value={23}>23</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Col>
                                        <Col md={3}>
                                            <FormControl fullWidth>
                                                <InputLabel style={{fontSize: 12}} id="time-start-minutes-label">Minutes</InputLabel>
                                                <Select
                                                    labelId='time-start-minutes-label'
                                                    id='time-start-minutes-label'
                                                    value={startTimeMinutes}
                                                    label="Start Time Minutes"
                                                    onChange={(e) => this.handleStartMinutes(e.target.value)}
                                                >
                                                    <MenuItem value={0}>00</MenuItem>
                                                    <MenuItem value={10}>10</MenuItem>
                                                    <MenuItem value={20}>20</MenuItem>
                                                    <MenuItem value={30}>30</MenuItem>
                                                    <MenuItem value={40}>40</MenuItem>
                                                    <MenuItem value={50}>50</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Col>
                                        <Col md={2} className="col-center-middle">
                                            <ArrowForwardIcon />
                                        </Col>
                                        {/* End time hours */}
                                        <Col md={2}>
                                            <FormControl fullWidth>
                                                <InputLabel style={{fontSize: 12}} id="time-start-hours-label">Hour</InputLabel>
                                                <Select
                                                    labelId='time-start-hours-label'
                                                    id='time-start-hours-label'
                                                    value={endTimeHours}
                                                    label="Start Time Hour"
                                                    className="hour-select-birthday"
                                                    onChange={(e) => this.handleEndHour(e.target.value)}
                                                    MenuProps={{ style: { maxHeight: 'calc(50% - 96px)'}}}
                                                >
                                                    <MenuItem value={0}>0</MenuItem>
                                                    <MenuItem value={1}>1</MenuItem>
                                                    <MenuItem value={2}>2</MenuItem>
                                                    <MenuItem value={3}>3</MenuItem>
                                                    <MenuItem value={4}>4</MenuItem>
                                                    <MenuItem value={5}>5</MenuItem>
                                                    <MenuItem value={6}>6</MenuItem>
                                                    <MenuItem value={7}>7</MenuItem>
                                                    <MenuItem value={8}>8</MenuItem>
                                                    <MenuItem value={9}>9</MenuItem>
                                                    <MenuItem value={10}>10</MenuItem>
                                                    <MenuItem value={11}>11</MenuItem>
                                                    <MenuItem value={12}>12</MenuItem>
                                                    <MenuItem value={13}>13</MenuItem>
                                                    <MenuItem value={14}>14</MenuItem>
                                                    <MenuItem value={15}>15</MenuItem>
                                                    <MenuItem value={16}>16</MenuItem>
                                                    <MenuItem value={17}>17</MenuItem>
                                                    <MenuItem value={18}>18</MenuItem>
                                                    <MenuItem value={19}>19</MenuItem>
                                                    <MenuItem value={20}>20</MenuItem>
                                                    <MenuItem value={21}>21</MenuItem>
                                                    <MenuItem value={22}>22</MenuItem>
                                                    <MenuItem value={23}>23</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Col>
                                        <Col md={3}>
                                            <FormControl fullWidth>
                                                <InputLabel style={{fontSize: 12}} id="time-start-minutes-label">Minutes</InputLabel>
                                                <Select
                                                    labelId='time-end-minutes-label'
                                                    id='time-end-minutes-label'
                                                    value={endTimeMinutes}
                                                    label="End Time Minutes"
                                                    onChange={(e) => this.handleEndMinutes(e.target.value)}
                                                >
                                                    <MenuItem value={0}>00</MenuItem>
                                                    <MenuItem value={10}>10</MenuItem>
                                                    <MenuItem value={20}>20</MenuItem>
                                                    <MenuItem value={30}>30</MenuItem>
                                                    <MenuItem value={40}>40</MenuItem>
                                                    <MenuItem value={50}>50</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Col>
                                    </Row>
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
                                        <Col md={7}>
                                            Start Time
                                        </Col>
                                        <Col md={5}>
                                            End Time
                                        </Col>
                                    </Row>
                                    <Row className="margin15-bottom justify-content-row">
                                        {/* Start time hours */}
                                        <Col md={2}>
                                            <FormControl fullWidth>
                                                <InputLabel style={{fontSize: 12}} id="time-start-hours-label">Hour</InputLabel>
                                                <Select
                                                    labelId='time-start-hours-label'
                                                    id='time-start-hours-label'
                                                    value={startTimeHours}
                                                    label="Start Time Hour"
                                                    onChange={(e) => this.handleStartHour(e.target.value)}
                                                    MenuProps={{ style: { maxHeight: 'calc(50% - 96px)'}}}
                                                >
                                                    <MenuItem value={0}>0</MenuItem>
                                                    <MenuItem value={1}>1</MenuItem>
                                                    <MenuItem value={2}>2</MenuItem>
                                                    <MenuItem value={3}>3</MenuItem>
                                                    <MenuItem value={4}>4</MenuItem>
                                                    <MenuItem value={5}>5</MenuItem>
                                                    <MenuItem value={6}>6</MenuItem>
                                                    <MenuItem value={7}>7</MenuItem>
                                                    <MenuItem value={8}>8</MenuItem>
                                                    <MenuItem value={9}>9</MenuItem>
                                                    <MenuItem value={10}>10</MenuItem>
                                                    <MenuItem value={11}>11</MenuItem>
                                                    <MenuItem value={12}>12</MenuItem>
                                                    <MenuItem value={13}>13</MenuItem>
                                                    <MenuItem value={14}>14</MenuItem>
                                                    <MenuItem value={15}>15</MenuItem>
                                                    <MenuItem value={16}>16</MenuItem>
                                                    <MenuItem value={17}>17</MenuItem>
                                                    <MenuItem value={18}>18</MenuItem>
                                                    <MenuItem value={19}>19</MenuItem>
                                                    <MenuItem value={20}>20</MenuItem>
                                                    <MenuItem value={21}>21</MenuItem>
                                                    <MenuItem value={22}>22</MenuItem>
                                                    <MenuItem value={23}>23</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Col>
                                        <Col md={3}>
                                            <FormControl fullWidth>
                                                <InputLabel style={{fontSize: 12}} id="time-start-minutes-label">Minutes</InputLabel>
                                                <Select
                                                    labelId='time-start-minutes-label'
                                                    id='time-start-minutes-label'
                                                    value={startTimeMinutes}
                                                    label="Start Time Minutes"
                                                    onChange={(e) => this.handleStartMinutes(e.target.value)}
                                                >
                                                    <MenuItem value={0}>00</MenuItem>
                                                    <MenuItem value={10}>10</MenuItem>
                                                    <MenuItem value={20}>20</MenuItem>
                                                    <MenuItem value={30}>30</MenuItem>
                                                    <MenuItem value={40}>40</MenuItem>
                                                    <MenuItem value={50}>50</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Col>
                                        <Col md={2} className="col-center-middle">
                                            <ArrowForwardIcon />
                                        </Col>
                                        {/* End time hours */}
                                        <Col md={2}>
                                            <FormControl fullWidth>
                                                <InputLabel style={{fontSize: 12}} id="time-start-hours-label">Hour</InputLabel>
                                                <Select
                                                    labelId='time-start-hours-label'
                                                    id='time-start-hours-label'
                                                    value={endTimeHours}
                                                    label="Start Time Hour"
                                                    onChange={(e) => this.handleEndHour(e.target.value)}
                                                    MenuProps={{ style: { maxHeight: 'calc(50% - 96px)'}}}
                                                >
                                                    <MenuItem value={0}>0</MenuItem>
                                                    <MenuItem value={1}>1</MenuItem>
                                                    <MenuItem value={2}>2</MenuItem>
                                                    <MenuItem value={3}>3</MenuItem>
                                                    <MenuItem value={4}>4</MenuItem>
                                                    <MenuItem value={5}>5</MenuItem>
                                                    <MenuItem value={6}>6</MenuItem>
                                                    <MenuItem value={7}>7</MenuItem>
                                                    <MenuItem value={8}>8</MenuItem>
                                                    <MenuItem value={9}>9</MenuItem>
                                                    <MenuItem value={10}>10</MenuItem>
                                                    <MenuItem value={11}>11</MenuItem>
                                                    <MenuItem value={12}>12</MenuItem>
                                                    <MenuItem value={13}>13</MenuItem>
                                                    <MenuItem value={14}>14</MenuItem>
                                                    <MenuItem value={15}>15</MenuItem>
                                                    <MenuItem value={16}>16</MenuItem>
                                                    <MenuItem value={17}>17</MenuItem>
                                                    <MenuItem value={18}>18</MenuItem>
                                                    <MenuItem value={19}>19</MenuItem>
                                                    <MenuItem value={20}>20</MenuItem>
                                                    <MenuItem value={21}>21</MenuItem>
                                                    <MenuItem value={22}>22</MenuItem>
                                                    <MenuItem value={23}>23</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Col>
                                        <Col md={3}>
                                            <FormControl fullWidth>
                                                <InputLabel style={{fontSize: 12}} id="time-start-minutes-label">Minutes</InputLabel>
                                                <Select
                                                    labelId='time-end-minutes-label'
                                                    id='time-end-minutes-label'
                                                    value={endTimeMinutes}
                                                    label="End Time Minutes"
                                                    onChange={(e) => this.handleEndMinutes(e.target.value)}
                                                >
                                                    <MenuItem value={0}>00</MenuItem>
                                                    <MenuItem value={10}>10</MenuItem>
                                                    <MenuItem value={20}>20</MenuItem>
                                                    <MenuItem value={30}>30</MenuItem>
                                                    <MenuItem value={40}>40</MenuItem>
                                                    <MenuItem value={50}>50</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Col>
                                    </Row>
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