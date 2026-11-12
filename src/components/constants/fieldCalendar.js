const endpoint = 'https://usaw-field-companion.pink-bud-3735.chatgpt.site/api/field-calendar';

async function requestCalendar(user, method, signal) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 15000);
    try {
        const response = await fetch(endpoint, {
            method,
            credentials: 'omit',
            redirect: 'error',
            cache: 'no-store',
            signal: controller.signal,
            headers: { Accept: 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        });
        if (!response.ok) throw new Error('The shared field calendar is unavailable.');
        return await response.json();
    } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abort);
    }
}

export async function readPostedFieldEvents(user, signal) {
    const result = await requestCalendar(user, 'GET', signal);
    if (result?.scheduleStatus !== 'current' || !Array.isArray(result.events)) {
        throw new Error('Posted events are unavailable.');
    }
    return result.events;
}

export async function publishFieldEvents(user, signal) {
    const result = await requestCalendar(user, 'POST', signal);
    if (result?.published !== true) throw new Error('Posted events could not be published.');
}
