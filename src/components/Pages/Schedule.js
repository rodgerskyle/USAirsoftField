import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from 'react-bootstrap/';
import { Helmet } from 'react-helmet-async';
import { Add, ArrowDownward, ArrowForward, Delete, Edit, Event as EventIcon, Schedule as Clock } from '@mui/icons-material';
import { child, get, onValue, push, remove, runTransaction, set } from 'firebase/database';
import { withFirebase } from '../Firebase';
import * as ROLES from '../constants/roles';
import staticEvents from '../constants/staticcalendarevents';
import useFieldResources from '../constants/useFieldResources';
import { publishFieldEvents, readPostedFieldEvents } from '../constants/fieldCalendar';
import FieldCalendarGrid from './FieldCalendarGrid';
import './Schedule.css';

const fields = ['date', 'name', 'time', 'additional'];
const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
const pacificDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
});
const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short' });
const weekdayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
const fullDayLabel = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
const eventLabels = { posted: 'Posted event', regular: 'Open play', closure: 'Field closure' };

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
    if (holiday) return { ...holiday, kind: 'closure' };

    const year = date.getFullYear();
    const summer = date >= new Date(year, 4, 1) && date < new Date(year, 10, 2);
    const day = date.getDay();
    const time = hours?.[summer ? 'summer' : 'winter'].rows[(day + 6) % 7][1];
    return time && time.toLowerCase() !== 'closed'
        ? { name: day === 5 ? 'Friday Night Gameplay' : 'Weekend Gameplay', time, static: true, kind: 'regular' }
        : null;
}

function CalendarEvent({ event, onEdit, onDelete }) {
    return (
        <article className="field-schedule__event" data-kind={event.kind}>
            <div className="field-schedule__event-body">
                <span className="field-schedule__event-type">{eventLabels[event.kind]}</span>
                <h3>{event.name}</h3>
                {event.time && <p className="field-schedule__event-time"><Clock aria-hidden="true" />{event.time}</p>}
                {event.additional && <p className="field-schedule__event-description">{event.additional}</p>}
            </div>
            {(onEdit || onDelete) && (
                <div className="field-schedule__event-actions">
                    {onEdit && <button type="button" className="field-schedule__action" onClick={onEdit} aria-label={`Edit ${event.name}`}><Edit aria-hidden="true" />Edit</button>}
                    {onDelete && <button type="button" className="field-schedule__action field-schedule__action--danger" onClick={onDelete} aria-label={`Delete ${event.name}`}><Delete aria-hidden="true" />Remove</button>}
                </div>
            )}
        </article>
    );
}

function UpcomingEvent({ event, disabled, onSelect }) {
    const day = calendarDate(event.day);
    const label = `${monthLabel.format(day)} ${day.getDate()}, ${day.getFullYear()} · ${event.name}${event.time ? ` · ${event.time}` : ''}`;
    return (
        <li>
            <button className="field-schedule__upcoming-card" type="button" disabled={disabled}
                aria-label={label} onClick={() => onSelect(day)}>
                <time className="field-schedule__date-block" dateTime={event.day} aria-hidden="true">
                    <span>{monthLabel.format(day)}</span>
                    <strong>{day.getDate()}</strong>
                </time>
                <span className="field-schedule__upcoming-info">
                    <strong>{event.name}</strong>
                    {event.time && <span className="field-schedule__event-time"><Clock aria-hidden="true" />{event.time}</span>}
                    {event.additional && <span className="field-schedule__upcoming-description">{event.additional}</span>}
                </span>
                <ArrowForward className="field-schedule__upcoming-arrow" aria-hidden="true" />
            </button>
        </li>
    );
}

function EventEditor({ editor, date, saving, cancel, save }) {
    const event = editor.event;
    return (
        <form key={event?.id ?? 'new'} onSubmit={save} className="field-schedule__editor">
            <h3>{event ? 'Edit field event' : 'Add field event'}</h3>
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
                <button className="field-schedule__action field-schedule__action--primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save event'}</button>
                <button className="field-schedule__action" type="button" disabled={saving} onClick={cancel}>Cancel</button>
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
    const dayHeading = useRef(null);
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

    const today = fieldDate(new Date());
    const calendarEvents = useMemo(() => events.map(event => ({ ...event, day: fieldDate(event.date), kind: 'posted' }))
        .sort((first, second) => first.day.localeCompare(second.day) || first.name.localeCompare(second.name)), [events]);
    const postedByDay = useMemo(() => {
        const byDay = new Map();
        for (const event of calendarEvents) {
            if (!byDay.has(event.day)) byDay.set(event.day, []);
            byDay.get(event.day).push(event);
        }
        return byDay;
    }, [calendarEvents]);
    const upcoming = calendarEvents.filter(event => event.day >= today);
    const busy = saving || publishing;

    function eventsForDay(day) {
        const posted = postedByDay.get(inputDate(day)) ?? [];
        const regular = regularEvent(day, resources?.hours);
        return regular ? [...posted, regular] : posted;
    }

    const displayed = eventsForDay(date);

    function showDate(next) {
        setDate(next);
        setActiveMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    }

    function selectDate(next) {
        if (!(next instanceof Date) || busy) return;
        showDate(next);
        setShowDelete(false);
        setEditor(null);
        pendingCreate.current = null;
        setFeedback(null);
    }

    function openUpcomingDate(next) {
        selectDate(next);
        dayHeading.current?.focus();
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
        <main className="field-schedule">
            <Helmet><title>US Airsoft Field | Field Schedule</title></Helmet>
            <header className="field-schedule__heading">
                <div className="field-schedule__heading-copy">
                    <p>US Airsoft World <span aria-hidden="true">/</span> Anderson, CA</p>
                    <h1>Field Schedule</h1>
                </div>
                <a className="field-schedule__action field-schedule__jump" href="#upcoming-game-days">
                    Upcoming events <ArrowDownward aria-hidden="true" />
                </a>
            </header>
            {loading ? (
                <div className="field-schedule__loading"><Spinner animation="border" role="status"><span className="visually-hidden">Loading field schedule</span></Spinner></div>
            ) : (
                <>
                    {scheduleUnavailable && <div className="field-schedule__notice" role="status">
                        {viewer ? 'Posted events are temporarily unavailable. Regular field hours are shown.'
                            : <><a href="/login">Sign in</a> to view posted game days. Regular field hours are shown.</>}
                    </div>}
                    <FieldCalendarGrid date={date} activeMonth={activeMonth} today={calendarDate(today)}
                        onDateChange={selectDate} onMonthChange={setActiveMonth} eventsForDay={eventsForDay} disabled={busy} />
                    <section className="field-schedule__section" aria-labelledby="field-schedule-day">
                        <header className="field-schedule__section-header">
                            <div className="field-schedule__day-heading">
                                <span className="field-schedule__section-icon"><EventIcon aria-hidden="true" /></span>
                                <div>
                                    <p>{weekdayLabel.format(date)}</p>
                                    <h2 id="field-schedule-day" ref={dayHeading} tabIndex={-1}>{fullDayLabel.format(date)}</h2>
                                </div>
                            </div>
                            {isAdmin && <div className="field-schedule__staff-actions" aria-label="Field calendar tools">
                                <button type="button" className="field-schedule__action field-schedule__action--primary"
                                    aria-label="Add field event" disabled={busy} onClick={() => openEditor()}><Add aria-hidden="true" />Add event</button>
                                <button type="button" className="field-schedule__action" aria-label="Show remove controls"
                                    aria-pressed={showDelete} disabled={busy} onClick={() => {
                                        setShowDelete(current => !current);
                                        setEditor(null);
                                        setFeedback(null);
                                    }}>
                                    <Delete aria-hidden="true" />{showDelete ? 'Hide remove controls' : 'Remove events'}
                                </button>
                                <button type="button" className="field-schedule__action" disabled={busy}
                                    onClick={() => syncPlayerCalendar('Player calendars are up to date.')}>
                                    {publishing ? 'Publishing…' : 'Publish existing game days'}
                                </button>
                            </div>}
                        </header>
                        {displayed.length > 0 ? <div className="field-schedule__day-events">
                            {displayed.map(event => <CalendarEvent
                                key={event.id ?? event.name}
                                event={event}
                                onEdit={isAdmin && !event.static && !busy && !showDelete ? () => openEditor(event) : null}
                                onDelete={isAdmin && !event.static && !busy && showDelete ? () => deleteEvent(event.id) : null}
                            />)}
                        </div> : <p className="field-schedule__empty">No field events are listed for this date.</p>}
                        {isAdmin && editor && <EventEditor editor={editor} date={date} saving={busy} cancel={() => setEditor(null)} save={saveEvent} />}
                        {feedback && <p className="field-schedule__feedback" role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
                    </section>
                    <section className="field-schedule__section field-schedule__upcoming" aria-labelledby="upcoming-game-days">
                        <header className="field-schedule__section-header">
                            <h2 id="upcoming-game-days">Upcoming posted game days</h2>
                            {!isAdmin && <button type="button" className="field-schedule__action"
                                onClick={() => setRefreshCount(count => count + 1)}>Refresh calendar</button>}
                        </header>
                        {upcoming.length > 0 && <ul className="field-schedule__upcoming-list">
                            {upcoming.map(event => <UpcomingEvent key={event.id} event={event} disabled={busy} onSelect={openUpcomingDate} />)}
                        </ul>}
                        {!upcoming.length && !scheduleUnavailable && <p className="field-schedule__empty">No additional game days are posted yet.</p>}
                    </section>
                </>
            )}
        </main>
    );
}

export default withFirebase(Schedule);
