const recapUrl = 'https://app.usairsoftfield.com/api/game-day-recap';
export const recapNotificationSetupUrl = 'https://app.usairsoftfield.com/#profile/recap-notifications';

const timeZone = 'America/Los_Angeles';
const fieldDayFormat = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
const dateFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', dateStyle: 'long' });
const closeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone, month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isFieldDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value));

export function todayAtField() {
  const parts = Object.fromEntries(fieldDayFormat.formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatFieldDate(date) {
  return isFieldDate(date) ? dateFormat.format(new Date(date)) : '';
}

export function formatFieldClose(timestamp) {
  return typeof timestamp === 'string' && Number.isFinite(Date.parse(timestamp))
    ? closeFormat.format(new Date(timestamp)) : '';
}

async function requestRecap(firebase, playerId, url, { signal, body } = {}) {
  const user = firebase.auth.currentUser;
  const checkSession = () => {
    if (signal?.aborted) throw new DOMException('Request canceled', 'AbortError');
    if (!user || user.uid !== playerId || firebase.auth.currentUser !== user) {
      throw new Error('Sign in to your USAW account and try again.');
    }
  };

  checkSession();
  const token = await user.getIdToken();
  checkSession();

  const headers = { Accept: 'application/json', Authorization: `Bearer ${token}` };
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers,
    ...(body && { body: JSON.stringify(body) }),
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
    signal,
  });
  checkSession();
  const result = await response.json().catch(() => null);
  checkSession();
  if (response.status === 401) throw new Error('Sign in to your USAW account and try again.');
  if (!response.ok || !isObject(result)) throw new Error('Game-day recap service is unavailable.');
  return result;
}

export async function getGameDayRecap(firebase, playerId, { date, signal } = {}) {
  const url = new URL(recapUrl);
  if (isFieldDate(date)) url.searchParams.set('date', date);
  const result = await requestRecap(firebase, playerId, url.href, { signal });
  const { recap, availableDates, nextGameDay, availableAt } = result;
  if (!Array.isArray(availableDates) || (recap !== null && (!isObject(recap) || !isFieldDate(recap.date)
    || ![recap.wins, recap.losses, recap.pointsEarned].every(Number.isFinite) || !Array.isArray(recap.patches)))) {
    throw new Error('Game-day recap service returned an unreadable response.');
  }
  return { recap, availableDates: availableDates.filter(isFieldDate), nextGameDay, availableAt };
}

export async function gameDayRecapNotifications(firebase, playerId, { enabled, signal } = {}) {
  const body = typeof enabled === 'boolean' ? { action: 'settings', enabled } : undefined;
  const result = await requestRecap(firebase, playerId, `${recapUrl}/notifications`, { body, signal });
  if (typeof result.enabled !== 'boolean') throw new Error('Notification settings could not be read.');
  return { enabled: result.enabled, configured: result.configured === true };
}

export async function getGameDayFeedback(firebase, playerId, date, { signal } = {}) {
  const url = new URL('/api/game-day-feedback', recapUrl);
  url.searchParams.set('date', date);
  const result = await requestRecap(firebase, playerId, url.href, { signal });
  if (result.feedback !== null && (!isObject(result.feedback) || result.feedback.date !== date)) {
    throw new Error('Game-day feedback could not be read.');
  }
  return result.feedback;
}

export async function saveGameDayFeedback(firebase, playerId, date, values, { signal } = {}) {
  const url = new URL('/api/game-day-feedback', recapUrl);
  const result = await requestRecap(firebase, playerId, url.href, { body: { date, ...values }, signal });
  if (result.ok !== true || !isObject(result.feedback) || result.feedback.date !== date) {
    throw new Error('Your feedback could not be confirmed.');
  }
  return result.feedback;
}
