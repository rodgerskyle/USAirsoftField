const origin = 'https://app.usairsoftfield.com';
export const playerIdPattern = /^[A-Za-z0-9_-]{10,128}$/;
export const playerCount = value => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—';
const dates = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
const pacificDates = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric' });
export const milestoneDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? (/^\d{4}-\d{2}-\d{2}$/.test(value) ? dates : pacificDates).format(new Date(value)) : 'Date unavailable';
export async function requestPlayerExperience(path, signal) {
  const response = await fetch(origin + path, { headers: { Accept: 'application/json' }, credentials: 'omit', cache: 'no-store', redirect: 'error', signal });
  const data = await response.json().catch(() => null);
  if (signal?.aborted) throw new DOMException('Request canceled', 'AbortError');
  if (!response.ok || !data) throw new Error(typeof data?.error === 'string' ? data.error : 'Player information is temporarily unavailable.');
  return data;
}
export function currentFieldMonth() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit' }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}`;
}
