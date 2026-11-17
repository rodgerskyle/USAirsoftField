import React from 'react';

const fieldDateTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric',
  hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});
const fieldTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});
const fieldDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' });

export function bookingTime(booking) {
  const start = new Date(booking.start);
  const end = new Date(booking.end);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return 'Time unavailable';
  const endFormat = fieldDay.format(start) === fieldDay.format(end) ? fieldTime : fieldDateTime;
  return fieldDateTime.format(start) + ' – ' + endFormat.format(end);
}

export default function GroupPartySchedule({ group, staff = false }) {
  if (group.kind !== 'party' && !group.party && group.partyStatus !== 'review') return null;
  const confirmed = group.party?.confirmedAt ? new Date(group.party.confirmedAt) : null;
  return <section className="visit-party-schedule" aria-label="Party booking">
    <h3>Birthday or scheduled event</h3>
    {group.partyStatus === 'review' ? <>
      <strong>Booking needs staff review</strong>
      <p>{staff ? 'The Party Calendar booking changed or was removed. Check the reservation, then reconfirm the schedule or unlink it.' : 'The Party Calendar booking changed. Ask USAW staff to confirm your party details.'}</p>
    </> : group.party ? <>
      <strong>Schedule confirmed by staff</strong>
      <p>{bookingTime(group.party)}</p>
      {group.party.size > 0 && <p>Booked party size: {group.party.size}</p>}
      {confirmed && Number.isFinite(confirmed.getTime()) && <small>Details saved from the Party Calendar <time dateTime={group.party.confirmedAt}>{fieldDateTime.format(confirmed)}</time>.</small>}
    </> : <>
      <strong>Awaiting staff confirmation</strong>
      <p>{staff ? 'Find the matching reservation in the Party Calendar below.' : 'Give your group code to USAW staff so they can link your reservation. Creating this list does not reserve a party.'}</p>
    </>}
  </section>;
}
