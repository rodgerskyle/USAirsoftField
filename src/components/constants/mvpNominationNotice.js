// Shared by the website and Companion. The server only exposes an open nomination
// once a ref has explicitly ended its round and chosen to invite nominations.
const storagePrefix = 'usaw-mvp-notice:';
const seen = new Map();
const pollingInterval = 30000;
const validId = id => typeof id === 'string' && /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(id);

function mvpNoticeWasRead(actor, id) {
  try { if (localStorage.getItem(storagePrefix + actor) === id) return true; } catch { /* private browsing */ }
  return seen.get(actor) === id;
}

export function watchMvpNotice({ read, actor, visible, render }) {
  let disposed = false, request, refreshTimer, expiryTimer, current;
  const hide = () => { clearTimeout(expiryTimer); current = null; render(null); };

  function dismiss(id = current?.id) {
    if (!validId(id)) return;
    const who = actor();
    seen.set(who, id);
    try { localStorage.setItem(storagePrefix + who, id); } catch { /* remember for this session */ }
    if (id === current?.id) hide();
  }

  async function update() {
    clearTimeout(refreshTimer);
    request?.abort();
    if (disposed || document.hidden || !visible()) { hide(); return; }
    const controller = new AbortController();
    const who = actor();
    request = controller;
    const timeout = setTimeout(() => {
      if (request === controller) { controller.abort(); hide(); }
    }, 8000);
    try {
      const { serverNow, mvpPoll: poll } = await read(controller.signal);
      if (controller.signal.aborted || disposed || who !== actor()) return;
      const left = Date.parse(poll?.closesAt) - Date.parse(serverNow);
      if (!validId(poll?.id) || !Number.isFinite(left) || left <= 0 || poll.closed || mvpNoticeWasRead(who, poll.id)) {
        hide();
      } else {
        clearTimeout(expiryTimer);
        current = poll;
        render(poll);
        expiryTimer = setTimeout(hide, left);
      }
    } catch {
      if (!controller.signal.aborted) hide();
    } finally {
      clearTimeout(timeout);
      if (request === controller && !disposed && !document.hidden && visible()) {
        refreshTimer = setTimeout(update, pollingInterval);
      }
    }
  }

  function storage(event) {
    if (event.key === storagePrefix + actor() && current?.id === event.newValue) hide();
  }
  const voted = event => { if (validId(event.detail?.pollId)) dismiss(event.detail.pollId); };
  function pause() { clearTimeout(refreshTimer); request?.abort(); hide(); }
  window.addEventListener('storage', storage);
  window.addEventListener('usaw:mvp-voted', voted);
  window.addEventListener('pagehide', pause);
  window.addEventListener('pageshow', update);
  document.addEventListener('visibilitychange', update);
  update();
  return { dismiss, update, stop() {
    disposed = true;
    pause();
    window.removeEventListener('storage', storage);
    window.removeEventListener('usaw:mvp-voted', voted);
    window.removeEventListener('pagehide', pause);
    window.removeEventListener('pageshow', update);
    document.removeEventListener('visibilitychange', update);
  }};
}
