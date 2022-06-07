import React, { Component, useState } from 'react';
import { Container, Col, Spinner, Row } from 'react-bootstrap/';
import { Helmet } from 'react-helmet-async';
import Calendar from 'react-calendar';
import "../constants/react-calendar.css";
import InfoIcon from '@material-ui/icons/Info';
import IconButton from '@material-ui/core/IconButton';
import { Add, Close, Delete, Save, FiberManualRecord } from '@material-ui/icons';
import { Button, TextField } from '@material-ui/core';
import { withFirebase } from '../Firebase';
import * as ROLES from '../constants/roles';
import staticEvents from '../constants/staticcalendarevents';

class Schedule extends Component {
    constructor(props) {
        super(props);

        this.state = {
            date: new Date(),
            events: [],
            eventsDisplayed: [],
            showCreateEvent: false,
            showDeleteEvent: false,
            loading: true,
            authUser: null,
        };
    }

    // Sets the selcted date and filters out list based on chosen date
    setDate = (val) => {
        // Create events in here based on date chosen
        let EventList = this.state.events.filter(event => this.compareDate(val, new Date(event.date), false))
        this.addStaticEvents(EventList, val);
        this.setState({
            date: val, 
            eventsDisplayed: EventList,
            showCreateEvent: false,
            showDeleteEvent: false,
            loading: false,
        })
    };

    // Compares the dates to check if they are the same day, month and year
    // Unless the paramter for reoccuring yearly is set, it will not check year
    compareDate = (date1, date2, reoccuring) => {
        // Date 1 is the selected date
        let selectedYear = date1.getFullYear();
        let selectedMonth = date1.getMonth();
        let selectedDay = date1.getDate();

        // Date 2 is the compared to from the event list
        let comparedYear = date2.getFullYear();
        let comparedMonth = date2.getMonth();
        let comparedDay = date2.getDate();

        if (!reoccuring)
            return selectedYear === comparedYear && selectedMonth === comparedMonth && selectedDay === comparedDay 
        else
            return selectedMonth === comparedMonth && selectedDay === comparedDay 
    }

    // Show create Event tab so you can add more events
    showCreateEvent = (val) => {
        this.setState({showCreateEvent: val})
    };

    // Add newly created event to list of events
    createEvent = (title, additional, time) => {
        let event = {
            name: title,
            time: time,
            additional: additional,
            date: this.state.date.toJSON(),
        }

        this.props.firebase.scheduleEvent(this.state.events.length).set(event).then(() => {
            this.setState({ 
                showCreateEvent: false,
                loading: true,
            }, () => {
                this.setDate(this.state.date);
            })
        })
    };

    // Deletes selected event from events list
    deleteEvent = (obj) => {
        // splice event from object and call setdate function on cur date
        let events = this.state.events
        events.splice(obj.index, 1)
        this.props.firebase.schedule().set(events).then(() => {
            this.setState({
                loading: true,
            }, () => {
                this.setDate(new Date(obj.date))
            })
        })
    }

    // Checks if the events array contains the date object
    checkForDate = (date) => {
        const { events } = this.state;
        for (let i=0; i<events.length; i++ ) {
            if (this.compareDate(date, new Date(events[i].date), false))
                return true;
        }
        return this.checkForStaticEvent(date);
    };

    checkTile = (date, view) => {
        if (view === "month" ) {
            // Pass in events to check if it exists
            // this.compareDate(date, this.state.date)
            if (this.checkForDate(date)) {
                return (
                    <div>
                        <Row className="justify-content-row">
                            {date.getDate()}
                        </Row>
                        <Row className="dot-row-schedule">
                            <FiberManualRecord />
                        </Row>
                    </div>
                )
            }
            else {
                return (
                    <div>
                        <Row className="justify-content-row">
                            {date.getDate()}
                        </Row>
                    </div>
                )
            }
        }
    }

    // Function to add event if there is not one on the given tile, this will be for 
    // Saturday, Sunday and Friday night games
    // WIP

    // This function will return true or false depending on if the date
    // meets the conditions of the static events hosted on at US Airsoft
    checkForStaticEvent(date) {
        for (let i=0; i<staticEvents.length; i++) {
            if (this.compareDate(date, new Date(staticEvents[i].date), false))
                return true;
        }

        const days = [];
        if (this.checkSeason(date)) {
            // Summer condition
            days.push(5, 6, 0)
        }
        else {
            // Winter condition
            days.push(6, 0)
        }

        if (days.includes(date.getDay())) {
            return true;
        }

        return false;
    }

    // Checks date to check for season if it is summer or not
    checkSeason(date) {
        const summerStart = new Date(date.getFullYear(), 4, 1)
        const summerEnd = new Date(date.getFullYear(), 10, 1)
        return ((summerStart.getTime() <= date.getTime()) && (date.getTime() <= summerEnd.getTime()));
    }

    // This function will add static events into existing events array
    // if the date matches with the date in the static event
    addStaticEvents(events, date) {
        for (let i=0; i<staticEvents.length; i++) {
            if (this.compareDate(date, new Date(staticEvents[i].date), staticEvents[i].reoccuring)) {
                events.push(staticEvents[i]);
                return; // Set so it only adds the first event found in static events
            }
        }

        const days = [];
        if (this.checkSeason(date)) {
            // Summer condition
            days.push(5, 6, 0)
        }
        else {
            // Winter condition
            days.push(6, 0)
        }

        if (days.includes(date.getDay())) {
            let time = ""
            let name = "Weekend Gameplay"
            if (this.checkSeason(date) && date.getDay() !== 5) {
                time = "8am - 2pm"
            }
            else if (!this.checkSeason(date) && date.getDay() !== 5) {
                time = "9am - 3pm"
            }
            else {
                name = "Friday Night Gameplay"
                time = "6pm - 11pm"
            }
            let event = { 
                date: date,
                name: name,
                time: time,
                additional: "",
                static: true,
                reoccuring: false, 
            };
            events.push(event)
        }
    }

    componentDidMount() {
        this.props.firebase.schedule().on('value', obj => {
            let events = obj.val() || [];

            let eventsObj = Object.keys(events).map(key => ({
                ...events[key],
                index: key,
            }));

            const today = new Date();

            let EventList = [];
            if (events.length !== 0) {
                EventList = events.filter(event => this.compareDate(today, new Date(event.date), false))
            }

            this.setState({
                events: eventsObj, 
                obj: obj.val(),
                eventsDisplayed: EventList,
            })
        })

        this.authSubscription = 
            this.props.firebase.onAuthUserListener((user) => {
                if (user) {
                    this.setState({authUser: user, loading: false})
            }
        }, 
        () => {
                this.setState({authUser: null, loading: false})
            },
        )
    };

    componentWillUnmount() {
        this.props.firebase.schedule().off()
        this.authSubscription()
    }

    render() {
        const { date, eventsDisplayed, showCreateEvent, showDeleteEvent, loading, authUser } = this.state;
 
        return (
            <div className="background-static-all">
                <Helmet>
                    <title>US Airsoft Field: Schedule</title>
                </Helmet>
                <h2 className="page-header-schedule">US Airsoft Schedule</h2>
                {loading ?
                    <Row className="justify-content-row padding-5px"><Spinner animation="border" /></Row> :
                <Container className="calendar-container">
                    <Row>
                        <Col className="justify-content-center-col">
                            <Calendar 
                                onChange={this.setDate} 
                                value={date} 
                                tileContent={({date, view}) => (this.checkTile(date, view))}
                                tileClassName={({ activeStartDate, date, view }) => (
                                    view === 'month' && (date.getDay() === 6 || date.getDay() === 0) ? 'weekend-calendar-games' : 
                                    (date.getDay() === 5 ? "friday-night-calendar-games" : "non-event-calendar-days")
                                )}
                            />
                        </Col>
                    </Row>
                    <Row className="justify-content-row">
                        <Col xl={2} className="selected-date-col-schedule">
                            <div className="selected-date-div">
                                <div className="selected-date-div-number">{date.getDate()}</div>
                                <div>{date.toDateString().split(" ")[1]}</div>
                            </div>
                        </Col>
                        <Col xl={3} className="selected-date-events-col">
                            {eventsDisplayed.map((event, i) => (
                                <EventElement event={event} key={i} deleteEvent={this.deleteEvent.bind(this)} deleting={showDeleteEvent}/>
                            ))}
                            {showCreateEvent ? 
                            <CreateEventElement createEvent={this.createEvent.bind(this)} close={this.showCreateEvent.bind(this)}/>
                            : null}
                            {/* only show if user is admin */}
                            {authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]) ? 
                            <Row className="add-event-row-schedule">
                                {!showDeleteEvent ?
                                <Col className="justify-content-center-col">
                                    <IconButton onClick={() => {this.setState({showCreateEvent: !showCreateEvent})}}>
                                        <Add />
                                    </IconButton>
                                </Col> : null}
                                {!showCreateEvent ?
                                <Col className="justify-content-center-col">
                                    <IconButton onClick={() => {this.setState({showDeleteEvent: !showDeleteEvent})}}>
                                        <Delete />
                                    </IconButton>
                                </Col> : null}
                            </Row> : null}
                        </Col>
                    </Row>
                </Container>}
            </div>
        );

            function CreateEventElement({createEvent, close}) {
                const [time, setTime] = useState("");
                const [event, setEvent] = useState("");
                const [additional, setAdditional] = useState("");
                return(
                        <Row>
                            <Col>
                                <div className="div-element-schedule-box">
                                    <div>
                                        <Row className="event-create-row">
                                            <Col lg={10}>
                                                <TextField
                                                    label="Time Slot*"
                                                    type="text"
                                                    autoComplete={null}
                                                    onChange={(e) => setTime(e.target.value)}
                                                    variant="standard" />
                                            </Col>
                                        </Row>
                                    </div>
                                    <div>
                                        <Row className="event-create-row">
                                            <Col lg={10}>
                                                <TextField
                                                    label="Event Name*"
                                                    type="text"
                                                    autoComplete={null}
                                                    onChange={(e) => setEvent(e.target.value)}
                                                    variant="standard" />
                                            </Col>
                                        </Row>
                                    </div>
                                    <div>
                                        <Row className="event-create-row">
                                            <Col lg={10}>
                                                <TextField
                                                    label="Additional Info"
                                                    type="text"
                                                    autoComplete={null}
                                                    onChange={(e) => setAdditional(e.target.value)}
                                                    variant="standard" />
                                            </Col>
                                        </Row>
                                    </div> 
                                    <Row className="save-button-row-schedule">
                                        <Button variant="outlined" startIcon={<Save />} onClick={() => {createEvent(event, additional, time)}}>
                                            Save
                                        </Button>
                                        <IconButton onClick={() => {close(false)}}>
                                            <Close />
                                        </IconButton>
                                    </Row>
                                </div>
                            </Col>
                        </Row>
                );
            }

            function EventElement({event, deleteEvent, deleting}) {
                return (
                    <Row md={12}>
                        <Col>
                            <div className={deleting && !('static' in event) ? "deleting-div-element-schedule-box" : "div-element-schedule-box"} 
                                onClick={() => {if (deleting && !('static' in event)) deleteEvent(event)}}>
                                <div>
                                    <Row className="justify-content-row">
                                        <Close className="trash-icon-schedule"/>
                                    </Row>
                                    <Row className="event-info-row">
                                        <Col lg={2} className="icon-additional-info-col">
                                            Time:
                                        </Col>
                                        <Col lg={9} className="event-element-col-schedule">
                                            {event.time}
                                        </Col>
                                    </Row>
                                </div>
                                <div>
                                    <Row className="event-info-row">
                                        <Col lg={2} className="icon-additional-info-col">
                                            Event:
                                        </Col>
                                        <Col lg={9} className="text-event-title-col">
                                            {event.name}
                                        </Col>
                                    </Row>
                                </div>
                                {event.additional !== "" ? 
                                <div>
                                    <Row className="event-info-row">
                                        <Col lg={2} className="icon-additional-info-col">
                                            <InfoIcon/>
                                        </Col>
                                        <Col lg={9} className="text-event-title-col">
                                            {event.additional}
                                        </Col>
                                    </Row>
                                </div> 
                                : null}
                            </div>
                        </Col>
                    </Row>
                );
            }
        };
    }
    

export default withFirebase(Schedule);