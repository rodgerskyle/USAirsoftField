import React, { useState, useCallback, useEffect } from 'react';
import { Container, Col, Spinner, Row } from 'react-bootstrap/';
import { Helmet } from 'react-helmet-async';
import Calendar from 'react-calendar';
import "../constants/react-calendar.css";
import {
    Add,
    Delete,
    FiberManualRecord,
    Event as EventIcon
} from '@mui/icons-material';
import {
    IconButton,
    Card,
    Typography,
    Box,
    Paper
} from '@mui/material';
import { withFirebase } from '../Firebase';
import * as ROLES from '../constants/roles';
import staticEvents from '../constants/staticcalendarevents';
import { onValue, set } from 'firebase/database';

const Schedule = ({ firebase }) => {
    const [state, setState] = useState({
        date: new Date(),
        events: [],
        eventsDisplayed: [],
        showCreateEvent: false,
        showDeleteEvent: false,
        loading: true,
        authUser: null,
    });

    // Simplified state updates using custom hook
    const updateState = (updates) => {
        setState(prev => ({ ...prev, ...updates }));
    };

    // Modernized setDate function
    const setDate = useCallback((val) => {
        const EventList = state.events.filter(event =>
            compareDate(val, new Date(event.date), false)
        );
        addStaticEvents(EventList, val);

        updateState({
            date: val,
            eventsDisplayed: EventList,
            showCreateEvent: false,
            showDeleteEvent: false,
            loading: false,
        });
    }, [state.events]);

    // Modernized createEvent function
    const createEvent = async (title, additional, time) => {
        const event = {
            name: title,
            time,
            additional,
            date: state.date.toJSON(),
        };

        try {
            await set(firebase.scheduleEvent(state.events.length), event);
            updateState({ showCreateEvent: false, loading: true });
            setDate(state.date);
        } catch (error) {
            console.error('Error creating event:', error);
        }
    };

    // Compares the dates to check if they are the same day, month and year
    // Unless the paramter for reoccuring yearly is set, it will not check year
    const compareDate = (date1, date2, reoccuring) => {
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
    const showCreateEvent = (val) => {
        updateState({ showCreateEvent: val })
    };

    // Deletes selected event from events list
    const deleteEvent = (obj) => {
        // splice event from object and call setdate function on cur date
        let events = state.events
        events.splice(obj.index, 1)
        set(firebase.schedule(), events).then(() => {
            updateState({
                loading: true,
            }, () => {
                setDate(new Date(obj.date))
            })
        })
    }

    // Checks if the events array contains the date object
    const checkForDate = (date) => {
        const { events } = state;
        for (let i = 0; i < events.length; i++) {
            if (compareDate(date, new Date(events[i].date), false))
                return true;
        }
        return checkForStaticEvent(date);
    };

    // Function to add event if there is not one on the given tile, this will be for 
    // Saturday, Sunday and Friday night games
    // WIP

    // This function will return true or false depending on if the date
    // meets the conditions of the static events hosted on at US Airsoft
    const checkForStaticEvent = (date) => {
        for (let i = 0; i < staticEvents.length; i++) {
            if (compareDate(date, new Date(staticEvents[i].date), false))
                return true;
        }

        const days = [];
        if (checkSeason(date)) {
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
    const checkSeason = (date) => {
        const summerStart = new Date(date.getFullYear(), 4, 1)
        const summerEnd = new Date(date.getFullYear(), 10, 1)
        return ((summerStart.getTime() <= date.getTime()) && (date.getTime() <= summerEnd.getTime()));
    }

    // This function will add static events into existing events array
    // if the date matches with the date in the static event
    const addStaticEvents = (events, date) => {
        for (let i = 0; i < staticEvents.length; i++) {
            if (compareDate(date, new Date(staticEvents[i].date), staticEvents[i].reoccuring)) {
                events.push(staticEvents[i]);
                return; // Set so it only adds the first event found in static events
            }
        }

        const days = [];
        if (checkSeason(date)) {
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
            if (checkSeason(date) && date.getDay() !== 5) {
                time = "8am - 2pm"
            }
            else if (!checkSeason(date) && date.getDay() !== 5) {
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

    useEffect(() => {
        const unsubscribeEvents = onValue(firebase.schedule(), obj => {
            const events = obj.val() || [];
            const eventsObj = Object.keys(events).map(key => ({
                ...events[key],
                index: key,
            }));

            const today = new Date();
            const EventList = events.length !== 0
                ? events.filter(event => compareDate(today, new Date(event.date), false))
                : [];

            updateState({
                events: eventsObj,
                obj: obj.val(),
                eventsDisplayed: EventList,
            });
        });

        const unsubscribeAuth = firebase.onAuthUserListener(
            (user) => updateState({ authUser: user, loading: false }),
            () => updateState({ authUser: null, loading: false })
        );

        return () => {
            unsubscribeEvents();
            unsubscribeAuth();
        };
    }, [firebase]);

    // Modernized calendar tile content
    const renderTileContent = useCallback(({ date, view }) => {
        if (view !== "month") return null;

        const hasEvent = checkForDate(date);

        return hasEvent ? (
            <Box sx={{
                position: 'absolute',
                bottom: '0px',
                left: '50%',
                transform: 'translateX(-50%)'
            }}>
                <FiberManualRecord
                    sx={{
                        fontSize: '10px',
                        color: 'black'
                    }}
                />
            </Box>
        ) : null;
    }, []);

    // Modernized event display component
    const EventElement = ({ event, deleteEvent, deleting }) => (
        <Card
            sx={{
                mb: 2,
                backgroundColor: event.static ? 'action.selected' : 'background.paper',
                position: 'relative'
            }}
        >
            <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    {event.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {event.time}
                </Typography>
                {event.additional && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        {event.additional}
                    </Typography>
                )}
                {deleting && !event.static && (
                    <IconButton
                        onClick={deleteEvent}
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8
                        }}
                    >
                        <Delete color="error" />
                    </IconButton>
                )}
            </Box>
        </Card>
    );

    return (
        <Box className="background-static-all" sx={{ minHeight: '100vh' }}>
            <Helmet>
                <title>US Airsoft Field: Schedule</title>
            </Helmet>

            <Typography
                variant="h4"
                component="h2"
                sx={{
                    textAlign: 'center',
                    py: 3,
                    color: 'white'
                }}
            >
                US Airsoft Schedule
            </Typography>

            {state.loading ? (
                <Box display="flex" justifyContent="center" p={5}>
                    <Spinner animation="border" />
                </Box>
            ) : (
                <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
                    <Paper
                        elevation={3}
                        sx={{
                            p: { xs: 2, sm: 3 },
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            borderRadius: { xs: '12px', sm: '16px' }
                        }}
                    >
                        <Row>
                            <Col xs={12} md={8} className="mb-4 mb-md-0">
                                <Calendar
                                    onChange={setDate}
                                    value={state.date}
                                    tileContent={renderTileContent}
                                    tileClassName={({ date }) => {
                                        const day = date.getDay();
                                        if (day === 6 || day === 0) return 'weekend-calendar-games';
                                        if (day === 5) return 'friday-night-calendar-games';
                                        return 'non-event-calendar-days';
                                    }}
                                />
                            </Col>
                            <Col xs={12} md={4}>
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    mb: 3
                                }}>
                                    <EventIcon sx={{ mr: 1 }} />
                                    <Typography variant="h6">
                                        {state.date.toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </Typography>
                                </Box>

                                {/* Events List */}
                                <Box sx={{ mb: 3 }}>
                                    {state.eventsDisplayed.map((event, i) => (
                                        <EventElement
                                            key={i}
                                            event={event}
                                            deleteEvent={() => deleteEvent(event)}
                                            deleting={state.showDeleteEvent}
                                        />
                                    ))}
                                </Box>

                                {/* Admin Controls */}
                                {state.authUser?.roles[ROLES.ADMIN] && (
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: 2
                                    }}>
                                        {!state.showDeleteEvent && (
                                            <IconButton
                                                onClick={() => updateState({
                                                    showCreateEvent: !state.showCreateEvent
                                                })}
                                                color="primary"
                                            >
                                                <Add />
                                            </IconButton>
                                        )}
                                        {!state.showCreateEvent && (
                                            <IconButton
                                                onClick={() => updateState({
                                                    showDeleteEvent: !state.showDeleteEvent
                                                })}
                                                color="error"
                                            >
                                                <Delete />
                                            </IconButton>
                                        )}
                                    </Box>
                                )}
                            </Col>
                        </Row>
                    </Paper>
                </Container>
            )}
        </Box>
    );
};

export default withFirebase(Schedule);