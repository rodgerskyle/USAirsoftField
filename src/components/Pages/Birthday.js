import React, { Component } from 'react';
import '../../App.css';
import './FrontDeskForms.css';

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
    TextField, Checkbox, FormControlLabel
} from '@mui/material';
import { Add, Delete, Save } from '@mui/icons-material';
import PartyBookingCheckInLink from './PartyBookingCheckInLink';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';
import { mutatePartyCalendar, newPartyBookingId } from '../constants/partyCalendarRecords';

function samePartyBooking(left, right) {
    return Boolean(left && right && ['bookingId', 'title', 'size', 'start', 'end'].every(field => left[field] === right[field]));
}

function BookingTime({ label, hour, minute, onHour, onMinute }) {
    const minutes = [0, 10, 20, 30, 40, 50];
    if (Number.isInteger(minute) && !minutes.includes(minute)) minutes.push(minute);
    return (
        <fieldset className="desk-booking-time">
            <legend>{label}</legend>
            <label>Hour
                <select className="form-select" value={hour} onChange={e => onHour(Number(e.target.value))}>
                    {Array.from({ length: 24 }, (_, value) => (
                        <option key={value} value={value}>{value % 12 || 12} {value < 12 ? 'AM' : 'PM'}</option>
                    ))}
                </select>
            </label>
            <label>Minutes
                <select className="form-select" value={minute} onChange={e => onMinute(Number(e.target.value))}>
                    {minutes.sort((a, b) => a - b).map(value => <option key={value} value={value}>{String(value).padStart(2, '0')}</option>)}
                </select>
            </label>
        </fieldset>
    );
}

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
            lastSaved: null,
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
            lastSaved: null, start: opens, end: closes, startTimeHours: 6, startTimeMinutes: 0,
            endTimeHours: 20, endTimeMinutes: 0, showDialog: true, saveError: '',
        });
    }

    // Handles the logic on click for existing event
    handleEdit = (event) => {
        // Use the last saved booking for the check-in link while staff edit the form.
        this.setState({
            lastSaved: null, index: event.index,
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
            const { bookingId: savedId, refreshBookingIds } = await mutatePartyCalendar(this.props.firebase.calendar(), {
                action, original: savedBooking, originalCalendar, index, values,
                bookingId: action === 'create' ? this.draftBookingId : undefined,
            });
            if (this.mounted) {
                this.resetDialog();
                if (action !== 'remove') this.setState({ lastSaved: {
                    bookingId: savedId, title, size, start: values.start, end: values.end,
                } });
            }
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
        let startTemp = this.state.start
        startTemp.setHours(val)
        this.setState({ start: startTemp, startTimeHours: val })
    }

    // Handles start time for calendar selection
    handleStartMinutes = (val) => {
        let startTemp = this.state.start
        startTemp.setMinutes(val)
        this.setState({ start: startTemp, startTimeMinutes: val })
    }

    // Handles start time for calendar selection
    handleEndHour = (val) => {
        let endTemp = this.state.end
        endTemp.setHours(val)
        this.setState({ end: endTemp, endTimeHours: val })
    }

    // Handles start time for calendar selection
    handleEndMinutes = (val) => {
        let endTemp = this.state.end
        endTemp.setMinutes(val)
        this.setState({ end: endTemp, endTimeMinutes: val })
    }

    componentDidMount() {
        this.mounted = true;
        this.unsubscribe = onValue(this.props.firebase.calendar(), snapshot => {
            const rows = snapshot.val() || {};
            const events = Object.entries(rows)
                .filter(([, row]) => row && typeof row === 'object')
                .map(([index, row]) => ({ ...row, index, start: new Date(row.start), end: new Date(row.end) }));
            this.setState(state => {
                const current = state.lastSaved && Object.values(rows).find(row => row?.bookingId === state.lastSaved.bookingId);
                return {
                    events, obj: rows, loading: false,
                    lastSaved: samePartyBooking(state.lastSaved, current) ? state.lastSaved : current || null,
                };
            });
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
                        {this.state.lastSaved && <PartyBookingCheckInLink firebase={this.props.firebase} booking={this.state.lastSaved} afterSave />}
                        <form className="desk-booking-create" onSubmit={event => {
                            event.preventDefault();
                            this.handleSelect({ start: new Date(event.currentTarget.elements.bookingDate.value + 'T12:00:00') });
                        }}>
                            <label>Booking date
                                <input name="bookingDate" className="form-control" type="date" required
                                    defaultValue={moment().format('YYYY-MM-DD')} />
                            </label>
                            <button type="submit" className="btn btn-primary">Add booking</button>
                        </form>
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
                                    {`New booking · ${start ? start.toDateString() : ''}`}
                                </DialogTitle>
                                <DialogContent className="content-create-birthday">
                                    {this.state.saveError && <p role="alert" className="alert alert-warning">{this.state.saveError}</p>}
                                    <div className="desk-booking-times">
                                        <BookingTime label="Start time" hour={startTimeHours} minute={startTimeMinutes}
                                            onHour={this.handleStartHour} onMinute={this.handleStartMinutes} />
                                        <BookingTime label="End time" hour={endTimeHours} minute={endTimeMinutes}
                                            onHour={this.handleEndHour} onMinute={this.handleEndMinutes} />
                                    </div>
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
                                        <Col xs="auto" className="align-items-center-col">
                                            <FormControlLabel label="Deposit received"
                                                control={<Checkbox checked={deposit} onChange={this.handleDeposit} />} />
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
                                        <Button disabled={this.state.saving} onClick={this.createEvent} type="button" variant="contained" color="primary"
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
                                    {`Edit booking · ${start ? start.toDateString() : ''}`}
                                </DialogTitle>
                                <DialogContent className="content-create-birthday">
                                    {this.state.saveError && <p role="alert" className="alert alert-warning">{this.state.saveError}</p>}
                                    {editDialog && (samePartyBooking(this.state.savedBooking, this.state.obj?.[this.state.index])
                                        ? <PartyBookingCheckInLink firebase={this.props.firebase} booking={this.state.savedBooking} />
                                        : <p role="status">The saved party changed. Reopen it on the calendar to manage its group code.</p>)}
                                    <div className="desk-booking-times">
                                        <BookingTime label="Start time" hour={startTimeHours} minute={startTimeMinutes}
                                            onHour={this.handleStartHour} onMinute={this.handleStartMinutes} />
                                        <BookingTime label="End time" hour={endTimeHours} minute={endTimeMinutes}
                                            onHour={this.handleEndHour} onMinute={this.handleEndMinutes} />
                                    </div>
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
                                        <Col xs="auto" className="align-items-center-col">
                                            <FormControlLabel label="Deposit received"
                                                control={<Checkbox checked={deposit} onChange={this.handleDeposit} />} />
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
                                        <Button disabled={this.state.saving} onClick={this.handleUpdate} type="button" variant="contained" color="primary"
                                            endIcon={<Save />}>
                                            Update
                                        </Button>
                                        <Button disabled={this.state.saving} onClick={this.handleRemoval} color="error"
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
