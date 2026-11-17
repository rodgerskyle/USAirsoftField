import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { onValue } from "firebase/database";

import { Container, Col, Breadcrumb, Spinner, Row } from 'react-bootstrap/';

import { Calendar, Views, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';

import { LinkContainer } from 'react-router-bootstrap';

import * as ROLES from '../constants/roles';
import { Helmet } from 'react-helmet-async';
import {
    Dialog, DialogActions, DialogContent, DialogTitle, Button,
    TextField, Checkbox, Select, MenuItem, InputLabel, FormControl
} from '@mui/material';
import { Add, ArrowForward, Delete, Save } from '@mui/icons-material';
import PartyBookingCheckInLink from './PartyBookingCheckInLink';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';
import { mutatePartyCalendar, newPartyBookingId } from '../constants/partyCalendarRecords';

class Birthday extends Component {
    constructor(props) {
        super(props);

        this.state = {
            events: [],
            obj: null,
            loading: true,
            saving: false,
            saveError: '',
            refreshFailures: [],
            refreshing: false,
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
    handleSelect = ({ start }) => {
        const opens = new Date(start);
        const closes = new Date(start);
        opens.setHours(6, 0, 0, 0);
        closes.setHours(20, 0, 0, 0);
        this.setState({
            start: opens, end: closes, startTimeHours: 6, startTimeMinutes: 0,
            endTimeHours: 20, endTimeMinutes: 0, showDialog: true, saveError: '',
        });
    }

    // Handles the logic on click for existing event
    handleEdit = (event) => {
        // Use the last saved booking for the check-in link while staff edit the form.
        this.setState({
            index: event.index,
            title: event.title ?? '',
            size: event.size ?? '',
            notes: event.notes ?? '',
            receipt: event.receipt ?? null,
            deposit: event.deposit ?? false,
            depositAmt: event.depositAmt ?? 0,
            start: new Date(event.start),
            end: new Date(event.end),
            savedBooking: this.state.obj?.[event.index],
            originalCalendar: this.state.obj,
            startTimeHours: event.start.getHours(),
            startTimeMinutes: event.start.getMinutes(),
            endTimeHours: event.end.getHours(),
            endTimeMinutes: event.end.getMinutes(),
            editDialog: true,
            saveError: '',
        });
    }

    refreshLinkedGroups = async (bookingId, uid) => {
        try {
            await requestStaffFieldTool(this.props.firebase, uid, '/api/check-in-groups', {
                method: 'POST', body: { action: 'refreshPartyCalendar', bookingId },
            });
            if (this.mounted) this.setState(state => ({
                refreshFailures: state.refreshFailures.filter(id => id !== bookingId),
            }));
        } catch {
            if (this.mounted) this.setState(state => ({
                refreshFailures: [...new Set([...state.refreshFailures, bookingId])],
            }));
        }
    }

    retryRefresh = async () => {
        if (this.state.refreshing) return;
        this.setState({ refreshing: true });
        const uid = this.props.firebase.auth.currentUser?.uid;
        for (const id of this.state.refreshFailures) await this.refreshLinkedGroups(id, uid);
        if (this.mounted) this.setState({ refreshing: false });
    }

    saveBooking = async action => {
        if (this.writePending) return;
        const { index, savedBooking, originalCalendar, title, size, receipt, deposit, depositAmt, notes, start, end } = this.state;
        const uid = this.props.firebase.auth.currentUser?.uid;
        if (!uid) {
            this.setState({ saveError: 'Sign in again to update the Party Calendar.' });
            return;
        }
        const values = { title, size, receipt, deposit, depositAmt, notes, start: start?.toJSON(), end: end?.toJSON() };
        this.writePending = true;
        this.setState({ saving: true, saveError: '' });
        try {
            if (action === 'create' && !this.draftBookingId) this.draftBookingId = newPartyBookingId();
            const { refreshBookingIds } = await mutatePartyCalendar(this.props.firebase.calendar(), {
                action, original: savedBooking, originalCalendar, index, values,
                bookingId: action === 'create' ? this.draftBookingId : undefined,
            });
            if (this.mounted) this.resetDialog();
            for (const bookingId of refreshBookingIds) await this.refreshLinkedGroups(bookingId, uid);
        } catch (error) {
            if (this.mounted) this.setState({ saveError: error.message || 'The booking could not be saved. Reopen it and try again.' });
        } finally {
            this.writePending = false;
            if (this.mounted) this.setState({ saving: false });
        }
    }

    createEvent = () => this.saveBooking('create');
    handleUpdate = () => this.saveBooking('edit');
    handleRemoval = () => this.saveBooking('remove');
    handleClose = () => { if (!this.writePending) this.resetDialog(); };
    handleEditClose = this.handleClose;

    resetDialog = () => {
        this.draftBookingId = null;
        this.setState({
            showDialog: false, editDialog: false, savedBooking: null, originalCalendar: null, saveError: '',
            title: '', size: '', receipt: null, deposit: false, depositAmt: 0, notes: '',
            index: null, start: null, end: null,
            startTimeHours: '', startTimeMinutes: '', endTimeHours: '', endTimeMinutes: '',
        });
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
        this.mounted = true;
        this.unsubscribe = onValue(this.props.firebase.calendar(), snapshot => {
            const rows = snapshot.val() || {};
            const events = Object.entries(rows)
                .filter(([, row]) => row && typeof row === 'object')
                .map(([index, row]) => ({ ...row, index, start: new Date(row.start), end: new Date(row.end) }));
            this.setState({ events, obj: rows, loading: false });
        });
    }

    componentWillUnmount() {
        this.mounted = false;
        this.unsubscribe?.();
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
            <div className="admin-container admin-compact-page admin-birthday-page">
                <Helmet>
                    <title>Party Calendar | US Airsoft World</title>
                </Helmet>
                {loading ?
                    <Row className="justify-content-row padding-5px"><Spinner animation="border" /></Row> :
                    <Container className="admin-content">
                        <h2 className="admin-header">Party Calendar</h2>
                        <Breadcrumb className="admin-breadcrumb">
                            {window.location.href.indexOf("admin") > -1 ?
                                <LinkContainer to="/admin">
                                    <Breadcrumb.Item>Admin</Breadcrumb.Item>
                                </LinkContainer>
                                :
                                <LinkContainer to="/dashboard">
                                    <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
                                </LinkContainer>
                            }
                            <Breadcrumb.Item active>Party Calendar</Breadcrumb.Item>
                        </Breadcrumb>
                        {this.state.refreshFailures.length > 0 && <div role="status" className="alert alert-warning">
                            The booking change is saved. Linked group details still need to refresh.{' '}
                            <button type="button" className="btn btn-sm btn-outline-primary" disabled={this.state.refreshing} onClick={this.retryRefresh}>
                                {this.state.refreshing ? 'Refreshing…' : 'Retry group update'}
                            </button>
                        </div>}
                        <div className="div-main-birthday admin-panel-card">
                            <Calendar
                                selectable
                                localizer={localizer}
                                events={events}
                                defaultView={VM}
                                scrollToTime={new Date(1970, 1, 1, 6)}
                                defaultDate={new Date()}
                                onSelectEvent={event => this.handleEdit(event)}
                                onSelectSlot={this.handleSelect}
                                titleAccessor={event => { return `(${event.size}) ${event.title}` }}
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
                                    {this.state.saveError && <p role="alert" className="alert alert-warning">{this.state.saveError}</p>}
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
                                                <InputLabel style={{ fontSize: 12 }} id="time-start-hours-label">Hour</InputLabel>
                                                <Select
                                                    labelId='time-start-hours-label'
                                                    id='time-start-hours-label'
                                                    value={startTimeHours}
                                                    label="Start Time Hour"
                                                    onChange={(e) => this.handleStartHour(e.target.value)}
                                                    MenuProps={{ style: { maxHeight: 'calc(50% - 96px)' } }}
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
                                                <InputLabel style={{ fontSize: 12 }} id="time-start-minutes-label">Minutes</InputLabel>
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
                                            <ArrowForward />
                                        </Col>
                                        {/* End time hours */}
                                        <Col md={2}>
                                            <FormControl fullWidth>
                                                <InputLabel style={{ fontSize: 12 }} id="time-start-hours-label">Hour</InputLabel>
                                                <Select
                                                    labelId='time-start-hours-label'
                                                    id='time-start-hours-label'
                                                    value={endTimeHours}
                                                    label="Start Time Hour"
                                                    className="hour-select-birthday"
                                                    onChange={(e) => this.handleEndHour(e.target.value)}
                                                    MenuProps={{ style: { maxHeight: 'calc(50% - 96px)' } }}
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
                                                <InputLabel style={{ fontSize: 12 }} id="time-start-minutes-label">Minutes</InputLabel>
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
                                    <Row className='mb-2'>
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
                                        <Button disabled={this.state.saving} onClick={this.createEvent} type="button" color="primary"
                                            endIcon={<Add />}>
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
                                    {this.state.saveError && <p role="alert" className="alert alert-warning">{this.state.saveError}</p>}
                                    {editDialog && <PartyBookingCheckInLink booking={this.state.savedBooking} />}
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
                                                <InputLabel style={{ fontSize: 12 }} id="time-start-hours-label">Hour</InputLabel>
                                                <Select
                                                    labelId='time-start-hours-label'
                                                    id='time-start-hours-label'
                                                    value={startTimeHours}
                                                    label="Start Time Hour"
                                                    onChange={(e) => this.handleStartHour(e.target.value)}
                                                    MenuProps={{ style: { maxHeight: 'calc(50% - 96px)' } }}
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
                                                <InputLabel style={{ fontSize: 12 }} id="time-start-minutes-label">Minutes</InputLabel>
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
                                            <ArrowForward />
                                        </Col>
                                        {/* End time hours */}
                                        <Col md={2}>
                                            <FormControl fullWidth>
                                                <InputLabel style={{ fontSize: 12 }} id="time-start-hours-label">Hour</InputLabel>
                                                <Select
                                                    labelId='time-start-hours-label'
                                                    id='time-start-hours-label'
                                                    value={endTimeHours}
                                                    label="Start Time Hour"
                                                    onChange={(e) => this.handleEndHour(e.target.value)}
                                                    MenuProps={{ style: { maxHeight: 'calc(50% - 96px)' } }}
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
                                                <InputLabel style={{ fontSize: 12 }} id="time-start-minutes-label">Minutes</InputLabel>
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
                                        <Button disabled={this.state.saving} onClick={this.handleUpdate} type="button" color="primary"
                                            endIcon={<Save />}>
                                            Update
                                        </Button>
                                        <Button disabled={this.state.saving} onClick={this.handleRemoval} color="primary"
                                            endIcon={<Delete />}>
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

export default withAuthorization(condition)(withFirebase(Birthday));

// export default composeHooks(
//     withAuthorization(condition),
//     withFirebase,
// )(Birthday);
