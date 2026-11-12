import React from 'react';
import Calendar from 'react-calendar';
import './FieldCalendarGrid.css';

const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const dayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

function sameDay(first, second) {
    return first.getFullYear() === second.getFullYear()
        && first.getMonth() === second.getMonth()
        && first.getDate() === second.getDate();
}

function DayEvents({ day, selected, today, events }) {
    const dayState = [sameDay(day, today) ? 'Today' : '', sameDay(day, selected) ? 'Selected' : ''].filter(Boolean);
    const eventLabels = events.map(({ name, time }) => time ? `${name}, ${time}` : name);
    if (!dayState.length && !eventLabels.length) return null;

    return (
        <>
            <span className="field-calendar-grid__sr-only">{[...dayState, ...eventLabels].join('. ')}</span>
            {events.length > 0 && <span className="field-calendar-grid__events" aria-hidden="true">
                {events.slice(0, 2).map(({ id, name, time, kind }, index) => (
                    <span
                        className={`field-calendar-grid__event field-calendar-grid__event--${kind || 'posted'}`}
                        key={id ?? name}
                        title={time ? `${name} · ${time}` : name}
                    >
                        <span className="field-calendar-grid__event-name">{name}</span>
                        {kind === 'regular' && <span className="field-calendar-grid__event-short">
                            {day.getDay() === 5 ? 'Night play' : 'Open play'}
                        </span>}
                        {kind === 'closure' && <span className="field-calendar-grid__event-short">Closed</span>}
                        {index === 0 && time && <span className="field-calendar-grid__event-time">{time.replace(/\s+[–-]\s+/g, '–')}</span>}
                    </span>
                ))}
                {events.length > 2 && <span className="field-calendar-grid__more field-calendar-grid__more--wide">
                    +{events.length - 2} more
                </span>}
                {events.length > 1 && <span className="field-calendar-grid__more field-calendar-grid__more--compact">
                    +{events.length - 1} more
                </span>}
            </span>}
        </>
    );
}

export default function FieldCalendarGrid({ date, activeMonth, today, onDateChange, onMonthChange, eventsForDay, disabled = false }) {
    function moveMonth(amount) {
        onMonthChange(new Date(activeMonth.getFullYear(), activeMonth.getMonth() + amount, 1));
    }

    return (
        <section className="field-calendar-grid" aria-label="Monthly field calendar">
            <div className="field-calendar-grid__toolbar">
                <h2 className="field-calendar-grid__month" aria-live="polite">{monthLabel.format(activeMonth)}</h2>
                <div className="field-calendar-grid__actions">
                    <div className="field-calendar-grid__arrows" role="group" aria-label="Browse calendar">
                        <button type="button" aria-label="Previous year" onClick={() => moveMonth(-12)} disabled={disabled}>«</button>
                        <button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)} disabled={disabled}>‹</button>
                        <button type="button" aria-label="Next month" onClick={() => moveMonth(1)} disabled={disabled}>›</button>
                        <button type="button" aria-label="Next year" onClick={() => moveMonth(12)} disabled={disabled}>»</button>
                    </div>
                    <button className="field-calendar-grid__today" type="button" onClick={() => onDateChange(today)} disabled={disabled}>
                        Today
                    </button>
                </div>
            </div>
            <Calendar
                locale="en-US"
                calendarType="US"
                minDetail="month"
                maxDetail="month"
                showNavigation={false}
                value={date}
                activeStartDate={activeMonth}
                onChange={onDateChange}
                formatLongDate={(_, day) => dayLabel.format(day)}
                tileClassName={({ date: day }) => sameDay(day, today) ? 'field-calendar-grid__day--today' : null}
                tileContent={({ date: day }) => <DayEvents day={day} selected={date} today={today} events={eventsForDay(day)} />}
                tileDisabled={disabled ? () => true : undefined}
            />
        </section>
    );
}
