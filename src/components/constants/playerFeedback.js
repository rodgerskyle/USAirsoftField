export const suggestionCategories = Object.freeze([
  ['gameplay', 'Games and gameplay'],
  ['field', 'Field and facilities'],
  ['store', 'Tactical store'],
  ['app-website', 'App or website'],
  ['other', 'Something else'],
]);

export function suggestionRequestId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function submitSuggestion(values, { signal } = {}) {
  const response = await fetch('https://app.usairsoftfield.com/api/suggestions', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    signal,
  });
  const result = await response.json().catch(() => null);
  if (signal?.aborted) throw new DOMException('Request canceled', 'AbortError');
  if (response.status === 429) throw new Error('Please wait a little before sending another suggestion.');
  if (!response.ok || result?.ok !== true) throw new Error('Your suggestion could not be sent. Try again.');
}
