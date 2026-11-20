import { matchesSignedInEmail, verifySignedInAdminIdentity } from './officialAdminAccount';

const companionOrigin = 'https://app.usairsoftfield.com';
export const fieldStaffPaths = Object.freeze({
  checkIn: '/admin/field/check-in',
  groups: '/admin/field/groups',
  rounds: '/admin/field/rounds',
  missionTools: '/admin/field/mission-tools',
  membership: '/admin/field/membership',
  reports: '/admin/field/reports',
  feedback: '/admin/field/feedback',
  tv: '/barracks-tv',
});

const staffEndpoints = new Set([
  '/api/staff-session',
  '/api/staff-round-result-receipts',
  '/api/staff-player-accounts',
  '/api/staff-player-accounts/email-service',
  '/api/game-day-check-in',
  '/api/live-games',
  '/api/member-card/verify',
  '/api/member-card/waiver-name',
  '/api/waivers/review-paper',
  '/api/teams',
  '/api/player-feedback',
  '/api/field-mission-tools',
  '/api/check-in-groups',
  '/api/staff-groups',
  '/api/rental-groups',
  '/api/staff-waivers',
  '/api/party-check-in',
]);

export class FieldStaffError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.code = data?.code;
    this.data = data;
  }
}

function companionEndpoint(path) {
  const endpoint = new URL(path, companionOrigin);
  if (endpoint.origin !== companionOrigin || endpoint.username || endpoint.password || endpoint.hash) {
    throw new Error('Invalid field tool endpoint.');
  }
  return endpoint;
}

async function readResponse(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'The field service could not complete this request.';
    throw new FieldStaffError(message, response.status, data);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('The field service returned an unreadable response.');
  }
  return data;
}

function requireCurrentAccount(firebase, user, uid) {
  if (!user || user.uid !== uid || firebase.auth.currentUser !== user) {
    throw new FieldStaffError('Sign in with your USAW staff account.', 401);
  }
}

export async function requestStaffFieldTool(firebase, uid, path, { method = 'GET', body, signal } = {}) {
  const endpoint = companionEndpoint(path);
  if (!staffEndpoints.has(endpoint.pathname)) throw new Error('Invalid field tool endpoint.');
  const user = firebase.auth.currentUser;
  requireCurrentAccount(firebase, user, uid);
  if (endpoint.pathname === '/api/staff-session' && method === 'POST' && matchesSignedInEmail(firebase, body?.email)) {
    await verifySignedInAdminIdentity(firebase, user, body.password);
    body = { action: 'unlock-account' };
  }
  const token = await user.getIdToken().catch(() => {
    throw new FieldStaffError('Your USAW sign-in could not be verified. Sign in again or retry after reconnecting.', 401);
  });
  requireCurrentAccount(firebase, user, uid);

  const headers = { Accept: 'application/json', Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(endpoint.href, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: ['/api/staff-player-accounts/email-service', '/api/party-check-in', '/api/rental-groups', '/api/staff-round-result-receipts', '/api/member-card/waiver-name', '/api/waivers/review-paper'].includes(endpoint.pathname) ? 'omit' : 'include',
    cache: 'no-store',
    redirect: 'error',
    signal,
  });
  requireCurrentAccount(firebase, user, uid);
  const data = await readResponse(response);
  requireCurrentAccount(firebase, user, uid);
  return data;
}

export async function requestPublicFieldTool(path, { signal } = {}) {
  const endpoint = companionEndpoint(path);
  if (endpoint.pathname !== '/api/live-games') throw new Error('Invalid public field display endpoint.');
  const response = await fetch(endpoint.href, {
    headers: { Accept: 'application/json' },
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    signal,
  });
  return readResponse(response);
}

export async function requestPlayerPoll(user, { vote, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
  if (signal?.aborted) throw new DOMException('Request canceled', 'AbortError');
  if (vote) headers['Content-Type'] = 'application/json';
  const response = await fetch(companionEndpoint('/api/live-games').href, {
    method: vote ? 'POST' : 'GET',
    headers,
    ...(vote && { body: JSON.stringify({ action: 'vote', pollId: vote.pollId, modeId: vote.modeId }) }),
    credentials: 'include',
    cache: 'no-store',
    redirect: 'error',
    signal,
  });
  return readResponse(response);
}
