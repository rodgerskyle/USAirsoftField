import React, { useEffect, useRef, useState } from 'react';
import { Col, Row, Spinner } from 'react-bootstrap/';
import { Helmet } from 'react-helmet-async';
import Calendar from 'react-calendar';
import '../constants/react-calendar.css';
import { Add, Delete, Edit, Event as EventIcon, FiberManualRecord } from '@mui/icons-material';
import { Box, Card, Container, IconButton, Paper, Typography } from '@mui/material';
import { child, get, onValue, push, remove, runTransaction, set } from 'firebase/database';
import { withFirebase } from '../Firebase';
import * as ROLES from '../constants/roles';
import staticEvents from '../constants/staticcalendarevents';
import useFieldResources from '../constants/useFieldResources';
import { publishFieldEvents, readPostedFieldEvents } from '../constants/fieldCalendar';

const fields = ['date', 'name', 'time', 'additional'];
const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
const pacificDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
});

function sameDate(first, second) {
    return first.getFullYear() === second.getFullYear()
        && first.getMonth() === second.getMonth()
        && first.getDate() === second.getDate();
}

function inputDate(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function fieldDate(value) {
    const isDateOnly = typeof value === 'string' && dateOnly.test(value);
    const date = new Date(isDateOnly ? value + 'T20:00:00Z' : value);
    if (!Number.isFinite(date.getTime())) return '';
    if (isDateOnly) return date.toISOString().slice(0, 10) === value ? value : '';
    const { year, month, day } = Object.fromEntries(pacificDate.formatToParts(date).map(({ type, value: part }) => [type, part]));
    return `${year}-${month}-${day}`;
}

function calendarDate(value) {
    return new Date(value + 'T12:00:00');
}

function isCalendarEvent(event) {
    return typeof event?.name === 'string' && typeof event.date === 'string' && Boolean(fieldDate(event.date));
}

function regularEvent(date, hours) {
    const holiday = staticEvents.find(event => sameDate(date, new Date(event.date)));
    if (holiday) return holiday;

    const year = date.getFullYear();
    const summer = date >= new Date(year, 4, 1) && date < new Date(year, 10, 2);
    const day = date.getDay();
    const time = hours?.[summer ? 'summer' : 'winter'].rows[(day + 6) % 7][1];
    return time && time.toLowerCase() !== 'closed'
        ? { name: day === 5 ? 'Friday Night Gameplay' : 'Weekend Gameplay', time, static: true }
        : null;
}

function CalendarEvent({ event, onEdit, onDelete }) {
    return (
        <Card sx={{ mb: 2, backgroundColor: event.static ? 'var(--usaw-subtle)' : 'var(--usaw-raised)', color: 'var(--usaw-text)' }}>
            <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>{event.name}</Typography>
                <Typography variant="body2" sx={{ color: 'var(--usaw-muted)' }}>{event.time}</Typography>
                {event.additional && <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-line' }}>{event.additional}</Typography>}
                {(onEdit || onDelete) && (
                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                        {onEdit && <IconButton onClick={onEdit} color="primary" aria-label={`Edit ${event.name}`}><Edit /></IconButton>}
                        {onDelete && <IconButton onClick={onDelete} color="error" aria-label={`Delete ${event.name}`}><Delete /></IconButton>}
                    </Box>
                )}
            </Box>
        </Card>
    );
}

function EventEditor({ editor, date, saving, cancel, save }) {
    const event = editor.event;
    return (
        <form key={event?.id ?? 'new'} onSubmit={save} className="d-grid gap-2 mt-3">
            <Typography variant="h6">{event ? 'Edit field event' : 'Add field event'}</Typography>
            <label className="form-label mb-0">Date
                <input className="form-control" type="date" name="date" required defaultValue={event ? fieldDate(event.date) : inputDate(date)} />
            </label>
            <label className="form-label mb-0">Event name
                <input className="form-control" name="name" required maxLength={120} defaultValue={event?.name} />
            </label>
            <label className="form-label mb-0">Time
                <input className="form-control" name="time" maxLength={80} defaultValue={event?.time} placeholder="9:00 AM – 3:00 PM" />
            </label>
            <label className="form-label mb-0">Details
                <textarea className="form-control" name="additional" rows={3} maxLength={800} defaultValue={event?.additional} />
            </label>
            <div className="d-flex flex-wrap gap-2">
                <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save event'}</button>
                <button className="btn btn-outline-secondary" type="button" disabled={saving} onClick={cancel}>Cancel</button>
            </div>
        </form>
    );
}

function Schedule({ firebase }) {
    const [date, setDate] = useState(() => calendarDate(fieldDate(new Date())));
    const [activeMonth, setActiveMonth] = useState(() => new Date(date.getFullYear(), date.getMonth(), 1));
    const [events, setEvents] = useState([]);
    const [viewer, setViewer] = useState(null);
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [scheduleUnavailable, setScheduleUnavailable] = useState(false);
    const [refreshCount, setRefreshCount] = useState(0);
    const [editor, setEditor] = useState(null);
    const [showDelete, setShowDelete] = useState(false);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const pendingCreate = useRef(null);
    const isAdmin = Boolean(admin);
    const { resources } = useFieldResources();

    useEffect(() => {
        let stopEvents = null;
        let request = null;
        let active = true;
        const stopAuth = firebase.auth.onAuthStateChanged((user) => {
            if (!active) return;
            stopEvents?.();
            stopEvents = null;
            request?.abort();
            request = new AbortController();
            const { signal } = request;
            setViewer(user);
            setAdmin(null);
            setEvents([]);
            setEditor(null);
            setShowDelete(false);
            setSaving(false);
            setPublishing(false);
            setFeedback(null);
            pendingCreate.current = null;
            setLoading(true);
            setScheduleUnavailable(false);

            let isStaff = false;
            let hasDirectRead = false;
            let attemptedPublish = false;
            function publishExistingEvents() {
                if (!isStaff || !hasDirectRead || attemptedPublish || signal.aborted) return;
                attemptedPublish = true;
                publishFieldEvents(user, signal).catch(() => {
                    if (!signal.aborted) setFeedback(current => current ?? {
                        error: true, text: 'Player calendars could not be refreshed. Use Publish existing game days to retry.',
                    });
                });
            }

            stopEvents = onValue(firebase.schedule(), (snapshot) => {
                if (signal.aborted) return;
                const rows = snapshot.val();
                setEvents(Object.entries(rows && typeof rows === 'object' ? rows : {})
                    .filter(([, event]) => isCalendarEvent(event))
                    .map(([id, event]) => ({ ...event, id })));
                setScheduleUnavailable(false);
                setLoading(false);
                hasDirectRead = true;
                publishExistingEvents();
            }, async () => {
                if (signal.aborted) return;
                const publishedEvents = user ? await readPostedFieldEvents(user, signal).catch(() => null) : null;
                if (signal.aborted) return;
                setEvents(publishedEvents ? publishedEvents.filter(isCalendarEvent) : []);
                setScheduleUnavailable(publishedEvents === null);
                setLoading(false);
            });

            if (user) {
                get(child(firebase.user(user.uid), `roles/${ROLES.ADMIN}`)).then(snapshot => {
                    const role = snapshot.val();
                    if (signal.aborted || (role !== true && role !== ROLES.ADMIN)) return;
                    isStaff = true;
                    setAdmin(user);
                    publishExistingEvents();
                }, () => {});
            }
        });
        return () => {
            active = false;
            request?.abort();
            stopEvents?.();
            stopAuth();
        };
    }, [firebase, refreshCount]);

    const selectedDate = inputDate(date);
    const calendarEvents = events.map(event => ({ ...event, day: fieldDate(event.date) }));
    const markedDays = new Set(calendarEvents.map(event => event.day));
    const displayed = calendarEvents.filter(event => event.day === selectedDate);
    const today = fieldDate(new Date());
    const upcoming = calendarEvents.filter(event => event.day >= today)
        .sort((first, second) => first.day.localeCompare(second.day) || first.name.localeCompare(second.name));
    const regular = regularEvent(date, resources?.hours);
    if (regular) displayed.push(regular);

    function showDate(next) {
        setDate(next);
        setActiveMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    }

    function selectDate(next) {
        if (!(next instanceof Date) || saving) return;
        showDate(next);
        setShowDelete(false);
        setEditor(null);
        pendingCreate.current = null;
        setFeedback(null);
    }

    function openEditor(event = null) {
        setEditor({ event });
        pendingCreate.current = null;
        setShowDelete(false);
        setFeedback(null);
    }

    async function saveEvent(event) {
        event.preventDefault();
        if (saving || publishing || !editor || !admin || firebase.auth.currentUser !== admin) return;
        const input = new FormData(event.currentTarget);
        const day = input.get('date');
        const when = new Date(day + 'T20:00:00Z');
        const name = String(input.get('name')).trim();
        if (!Number.isFinite(when.getTime()) || when.toISOString().slice(0, 10) !== day || !name) {
            setFeedback({ error: true, text: 'Enter a valid date and event name.' });
            return;
        }
        const data = { date: when.toISOString(), name, time: String(input.get('time')).trim(), additional: String(input.get('additional')).trim() };
        setSaving(true);
        setFeedback(null);
        try {
            if (editor.event) {
                const original = editor.event;
                const result = await runTransaction(firebase.scheduleEvent(original.id), (current) => {
                    if (!current || fields.some(field => (current[field] ?? '') !== (original[field] ?? ''))) return undefined;
                    return { ...current, ...data };
                }, { applyLocally: false });
                if (!result.committed) throw new Error('The event changed. Select it again before editing.');
            } else {
                pendingCreate.current ??= push(firebase.schedule());
                await set(pendingCreate.current, data);
            }
            if (firebase.auth.currentUser !== admin) return;
            showDate(calendarDate(day));
            setEditor(null);
            pendingCreate.current = null;
            await syncPlayerCalendar('Event saved and published.', 'Event saved.');
        } catch (error) {
            if (firebase.auth.currentUser === admin) {
                setFeedback({ error: true, text: error?.message === 'The event changed. Select it again before editing.'
                    ? error.message : 'The field calendar could not save this event. Check your access and try again.' });
            }
        } finally {
            if (firebase.auth.currentUser === admin) setSaving(false);
        }
    }

    async function deleteEvent(id) {
        if (!admin || saving || publishing || firebase.auth.currentUser !== admin) return;
        setSaving(true);
        try {
            await remove(firebase.scheduleEvent(id));
            await syncPlayerCalendar('Event removed from player calendars.', 'Event removed.');
        } catch {
            if (firebase.auth.currentUser === admin) {
                setFeedback({ error: true, text: 'The field calendar could not remove this event.' });
            }
        } finally {
            if (firebase.auth.currentUser === admin) setSaving(false);
        }
    }

    async function syncPlayerCalendar(success, saved = '') {
        if (!admin || firebase.auth.currentUser !== admin) return;
        setPublishing(true);
        try {
            await publishFieldEvents(admin);
            if (firebase.auth.currentUser === admin) setFeedback({ text: success });
        } catch {
            if (firebase.auth.currentUser === admin) setFeedback({
                error: true,
                text: `${saved ? saved + ' ' : ''}Player calendars could not be refreshed. Use Publish existing game days to retry.`,
            });
        } finally {
            if (firebase.auth.currentUser === admin) setPublishing(false);
        }
    }

    return (
        <Box className="background-static-all" sx={{ minHeight: '100vh' }}>
            <Helmet><title>US Airsoft Field: Schedule</title></Helmet>
            <Typography variant="h4" component="h2" sx={{ textAlign: 'center', py: 3, color: 'var(--usaw-text)' }}>
                US Airsoft Schedule
            </Typography>
            {loading ? (
                <Box display="flex" justifyContent="center" p={5}><Spinner animation="border" /></Box>
            ) : (
                <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
                    <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, backgroundColor: 'var(--usaw-surface)', color: 'var(--usaw-text)', borderRadius: { xs: '12px', sm: '16px' } }}>
                        <Row>
                            <Col xs={12} md={8} className="mb-4 mb-md-0">
                                <Calendar
                                    onChange={selectDate}
                                    value={date}
                                    activeStartDate={activeMonth}
                                    onActiveStartDateChange={({ activeStartDate }) => setActiveMonth(activeStartDate)}
                                    tileContent={({ date: day, view }) => view === 'month' && (
                                        markedDays.has(inputDate(day)) || regularEvent(day, resources?.hours)
                                    ) ? <Box sx={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)' }}><FiberManualRecord sx={{ fontSize: 10 }} /></Box> : null}
                                    tileClassName={({ date: day }) => {
                                        if (day.getDay() === 6 || day.getDay() === 0) return 'weekend-calendar-games';
                                        if (day.getDay() === 5) return 'friday-night-calendar-games';
                                        return 'non-event-calendar-days';
                                    }}
                                />
                            </Col>
                            <Col xs={12} md={4}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                    <EventIcon sx={{ mr: 1 }} />
                                    <Typography variant="h6">
                                        {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </Typography>
                                </Box>
                                {scheduleUnavailable && <p role="status">Regular hours are shown. {viewer
                                    ? 'Posted events are temporarily unavailable.'
                                    : <> <a href="/login">Sign in</a> to view posted game days.</>}
                                </p>}
                                {displayed.map((event) => (
                                    <CalendarEvent
                                        key={event.id ?? event.name}
                                        event={event}
                                        onEdit={isAdmin && !event.static && !saving && !showDelete ? () => openEditor(event) : null}
                                        onDelete={isAdmin && !event.static && !saving && showDelete ? () => deleteEvent(event.id) : null}
                                    />
                                ))}
                                {isAdmin && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                                        <IconButton color="primary" aria-label="Add field event" disabled={saving || publishing} onClick={() => openEditor()}>
                                            <Add />
                                        </IconButton>
                                        <IconButton color="error" aria-label="Show remove controls" aria-pressed={showDelete} disabled={saving || publishing} onClick={() => {
                                            setShowDelete(current => !current);
                                            setEditor(null);
                                            setFeedback(null);
                                        }}>
                                            <Delete />
                                        </IconButton>
                                        <button type="button" className="btn btn-outline-secondary" disabled={saving || publishing}
                                            onClick={() => syncPlayerCalendar('Player calendars are up to date.')}>
                                            {publishing ? 'Publishing…' : 'Publish existing game days'}
                                        </button>
                                    </Box>
                                )}
                                {isAdmin && editor && <EventEditor editor={editor} date={date} saving={saving || publishing} cancel={() => setEditor(null)} save={saveEvent} />}
                                {feedback && <p className="mt-3" role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
                            </Col>
                        </Row>
                        <Box component="section" aria-labelledby="upcoming-game-days" sx={{ mt: 3, borderTop: '1px solid var(--usaw-border)', pt: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                                <Typography id="upcoming-game-days" variant="h6" component="h3">Upcoming posted game days</Typography>
                                {!isAdmin && <button type="button" className="btn btn-outline-secondary btn-sm"
                                    onClick={() => setRefreshCount(count => count + 1)}>Refresh</button>}
                            </Box>
                            {upcoming.length > 0 && <ul className="list-unstyled d-grid gap-2 mb-0">
                                {upcoming.map(event => <li key={event.id}>
                                    <button className="btn btn-outline-secondary text-start w-100" type="button"
                                        disabled={saving} onClick={() => selectDate(calendarDate(event.day))}>
                                        <time dateTime={event.day}>{calendarDate(event.day).toLocaleDateString('en-US', {
                                            month: 'short', day: 'numeric', year: 'numeric',
                                        })}</time>
                                        {' · '}{event.name}{event.time ? ` · ${event.time}` : ''}
                                    </button>
                                </li>)}
                            </ul>}
                            {!upcoming.length && !scheduleUnavailable && <p className="mb-0">No additional game days are posted yet.</p>}
                        </Box>
                    </Paper>
                </Container>
            )}
        </Box>
    );
}

export default withFirebase(Schedule);
