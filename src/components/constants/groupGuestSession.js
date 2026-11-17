export const guestSessionKey = 'usaw-group-guest-v1';
let temporarySecret;

export function getGroupGuestSession() {
  let storage;
  try {
    storage = window.localStorage;
    const saved = storage.getItem(guestSessionKey);
    if (/^[a-f0-9]{64}$/.test(saved || '')) return { secret: saved, persistent: true };
  } catch { /* Some browsers disable storage in private mode. */ }

  const bytes = temporarySecret ? null : window.crypto.getRandomValues(new Uint8Array(32));
  const secret = temporarySecret || Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  try {
    storage.setItem(guestSessionKey, secret);
    if (storage.getItem(guestSessionKey) === secret) {
      temporarySecret = undefined;
      return { secret, persistent: true };
    }
  } catch { /* Keep the group available in this tab for the current visit. */ }
  temporarySecret = secret;
  return { secret, persistent: false };
}
