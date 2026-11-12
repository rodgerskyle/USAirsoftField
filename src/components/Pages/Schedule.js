import React, { useEffect, useRef, useState } from 'react';
import { Col, Row, Spinner } from 'react-bootstrap/';
import { Helmet } from 'react-helmet-async';
import Calendar from 'react-calendar';
import '../constants/react-calendar.css';
import { Add, Delete, Edit, Event as EventIcon, FiberManualRecord } from '@mui/icons-material';
import { Box, Card, Container, IconButton, Paper, Typography } from '@mui/material';
import { onValue, push, remove, runTransaction, set } from 'firebase/database';
import { withFirebase } from '../Firebase';
import * as ROLES from '../constants/roles';
import staticEvents from '../constants/staticcalendarevents';
import useFieldResources from '../constants/useFieldResources';

const fields = ['date', 'name', 'time', 'additional'];
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
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? pacificDate.format(date) : '';
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
    const [date, setDate] = useState(() => new Date());
    const [events, setEvents] = useState([]);
    const [authUser, setAuthUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [scheduleUnavailable, setScheduleUnavailable] = useState(false);
    const [editor, setEditor] = useState(null);
    const [showDelete, setShowDelete] = useState(false);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const pendingCreate = useRef(null);
    const isAdmin = Boolean(authUser?.roles?.[ROLES.ADMIN]);
    const { resources } = useFieldResources();

    useEffect(() => {
        let stopEvents = null;
        const subscribe = (user) => {
            stopEvents?.();
            setAuthUser(user);
            setLoading(true);
            setScheduleUnavailable(false);
            stopEvents = onValue(firebase.schedule(), (snapshot) => {
                const rows = snapshot.val();
                setEvents(Object.entries(rows && typeof rows === 'object' ? rows : {})
                    .filter(([, event]) => typeof event?.name === 'string' && typeof event.date === 'string')
                    .map(([id, event]) => ({ ...event, id })));
                setLoading(false);
            }, () => {
                setEvents([]);
                setScheduleUnavailable(true);
                setLoading(false);
            });
        };
        const stopAuth = firebase.onAuthUserListener(subscribe, () => subscribe(null));
        return () => { stopEvents?.(); stopAuth(); };
    }, [firebase]);

    const selectedDate = inputDate(date);
    const displayed = events.filter(event => fieldDate(event.date) === selectedDate);
    const regular = regularEvent(date, resources?.hours);
    if (regular) displayed.push(regular);

    function selectDate(next) {
        if (!(next instanceof Date) || saving) return;
        setDate(next);
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
        if (saving || !editor || !isAdmin) return;
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
            setDate(new Date(day + 'T12:00:00'));
            setEditor(null);
            pendingCreate.current = null;
            setFeedback({ text: 'Event saved.' });
        } catch (error) {
            setFeedback({ error: true, text: error?.message === 'The event changed. Select it again before editing.'
                ? error.message : 'The field calendar could not save this event. Check your access and try again.' });
        } finally {
            setSaving(false);
        }
    }

    async function deleteEvent(id) {
        if (!isAdmin || saving) return;
        setSaving(true);
        try {
            await remove(firebase.scheduleEvent(id));
            setFeedback({ text: 'Event removed.' });
        } catch {
            setFeedback({ error: true, text: 'The field calendar could not remove this event.' });
        } finally {
            setSaving(false);
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
                                    tileContent={({ date: day, view }) => view === 'month' && (
                                        events.some(event => fieldDate(event.date) === inputDate(day)) || regularEvent(day, resources?.hours)
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
                                {scheduleUnavailable && <p role="status">Regular hours are shown. Posted events are unavailable.</p>}
                                {displayed.map((event) => (
                                    <CalendarEvent
                                        key={event.id ?? event.name}
                                        event={event}
                                        onEdit={isAdmin && !event.static && !saving && !showDelete ? () => openEditor(event) : null}
                                        onDelete={isAdmin && !event.static && !saving && showDelete ? () => deleteEvent(event.id) : null}
                                    />
                                ))}
                                {isAdmin && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                                        <IconButton color="primary" aria-label="Add field event" disabled={saving} onClick={() => openEditor()}>
                                            <Add />
                                        </IconButton>
                                        <IconButton color="error" aria-label="Show remove controls" aria-pressed={showDelete} disabled={saving} onClick={() => {
                                            setShowDelete(current => !current);
                                            setEditor(null);
                                            setFeedback(null);
                                        }}>
                                            <Delete />
                                        </IconButton>
                                    </Box>
                                )}
                                {isAdmin && editor && <EventEditor editor={editor} date={date} saving={saving} cancel={() => setEditor(null)} save={saveEvent} />}
                                {feedback && <p className="mt-3" role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
                            </Col>
                        </Row>
                    </Paper>
                </Container>
            )}
        </Box>
    );
}

export default withFirebase(Schedule);
