// Calendar rows use movable numeric indices. Match the staff-visible booking itself.
const fieldDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
});

function calendarInstant(value) {
  if (!(value instanceof Date) && (typeof value !== 'string' || !/(?:Z|[+-]\d\d:\d\d)$/i.test(value))) return null;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export function normalizePartyBooking(booking) {
  if (!booking || typeof booking.title !== 'string') return null;
  const title = booking.title.trim();
  const start = calendarInstant(booking.start);
  const end = calendarInstant(booking.end);
  if (!title || !start || !end || end <= start) return null;
  const rawSize = typeof booking.size === 'string' ? booking.size.trim() : booking.size;
  const number = typeof rawSize === 'number' || typeof rawSize === 'string' && /^\d+$/.test(rawSize) ? Number(rawSize) : 0;
  const size = Number.isSafeInteger(number) && number > 0 ? number : null;
  return { title, date: fieldDate.format(new Date(start)), start, end, size };
}

const durableId = /^[a-f0-9]{64}$/;

async function digest(parts) {
  const bytes = new TextEncoder().encode(JSON.stringify(parts));
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function partyBookingReference(booking) {
  const value = normalizePartyBooking(booking);
  if (!value) return null;
  const fingerprint = await digest([value.title, value.start, value.end, value.size]);
  const bookingId = typeof booking.bookingId === 'string' && durableId.test(booking.bookingId) ? booking.bookingId : fingerprint;
  const key = bookingId === fingerprint ? fingerprint : await digest([bookingId, fingerprint]);
  return { ...value, bookingId, key };
}

export async function partyBookingKey(booking) {
  return (await partyBookingReference(booking))?.key || null;
}

export async function partyBookingIdentity(booking) {
  return (await partyBookingReference(booking))?.bookingId || null;
}
