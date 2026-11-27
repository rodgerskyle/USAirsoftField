import React from 'react';
import './gear-movement-times.css';

const fieldTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});

export function GearTime({ value }) {
    if (!Number.isSafeInteger(value) || value <= 0) return 'Time not recorded';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'Time not recorded';
    return <time dateTime={date.toISOString()}>{fieldTime.format(date)}</time>;
}

function MovementDates({ pickedUpAt, returnedAt, returned }) {
    return <dl className="gear-movement-dates">
        <div><dt>Pickup time</dt><dd><GearTime value={pickedUpAt} /></dd></div>
        {returned && <div><dt>Return time</dt><dd><GearTime value={returnedAt} /></dd></div>}
    </dl>;
}

export function GearMovementTimes({ row, search = '' }) {
    if (!row || (!row.physicallyIssued && !row.checked && !row.pickedUpAt)) return null;
    const previous = row.previousNumbers || [];
    const matchedPrevious = Boolean(search && previous.some(item => item.number.toLowerCase().includes(search)));
    return <div className="gear-movement">
        <MovementDates pickedUpAt={row.pickedUpAt} returnedAt={row.returnedAt} returned={row.checked} />
        {previous.length > 0 && <details open={matchedPrevious || undefined}>
            <summary>Replaced gear ({previous.length})</summary>
            {previous.map((item, index) => <div className="gear-movement-previous" key={index}>
                <strong>#{item.number}</strong>
                <MovementDates pickedUpAt={item.pickedUpAt} returnedAt={item.returnedAt} returned />
            </div>)}
        </details>}
    </div>;
}
