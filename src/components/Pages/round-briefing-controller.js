import { mountBriefingMap } from './round-briefing-map.js';

const endpoint = '/api/live-games';
const defaultMap = () => ({marks: [], view: {zoom: 1, x: .5, y: .5}});
const validRevision = n => Number.isSafeInteger(n) && n >= 0;

// Compare the wire values independently of the key order used by either client.
function sameMap(a, b) {
  const fields = ['type', 'color', 'x', 'y', 'x2', 'y2'];
  return ['zoom', 'x', 'y'].every(key => a.view[key] === b.view[key]) &&
    a.marks.length === b.marks.length && a.marks.every((mark, i) => fields.every(key => mark[key] === b.marks[i][key]));
}

function stylePage() {
  if (document.getElementById('round-briefing-session-style')) return;
  const style = document.createElement('style');
  style.id = 'round-briefing-session-style';
  style.textContent = `
  .round-brief-session {min-width:0}
  .round-brief-session [hidden],.round-brief-tv[hidden] {display:none!important}
  .round-brief-session-bar {display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.55rem 1rem;margin:.3rem 0 .75rem}
  .round-brief-state {display:inline-flex;align-items:center;gap:.45rem;font-size:.9rem;line-height:1.3;font-weight:700}
  .round-brief-state::before {content:'';width:.6rem;height:.6rem;border-radius:50%;background:#8393a4}
  .round-brief-state[data-live=true]::before {background:#34cb84;box-shadow:0 0 0 3px #34cb8424}
  .round-brief-session button.round-brief-action {min-height:44px;border:1px solid #2279b5;border-radius:8px;padding:.55rem .95rem;background:#125a92;color:#fff;font:inherit;font-weight:700;cursor:pointer}
  .round-brief-session button.round-brief-action:focus-visible {outline:3px solid #ffbc38;outline-offset:2px}
  .round-brief-session button.round-brief-action:disabled {opacity:.58;cursor:wait}
  .round-brief-session .round-brief-note {font-size:.9rem;line-height:1.4;margin:.4rem 0;overflow-wrap:anywhere}
  .round-brief-session .round-brief-resolve {display:flex;align-items:center;flex-wrap:wrap;gap:.5rem;margin:.5rem 0}
  .round-brief-tv {width:100%;min-width:0;margin:0 auto}
  .round-brief-tv h2 {color:inherit;font-size:clamp(1.45rem,3.5vw,3.5rem);line-height:1.1;overflow-wrap:anywhere;margin:0 0 .6rem}
  .round-brief-tv .round-brief-tv-note {margin:0 0 .5rem;color:inherit;font-weight:700}
  .round-brief-tv-map {max-width:min(100%,calc( max(45vh,100dvh - 10rem) * 1.7778));margin-inline:auto}
  `;
  document.head.append(style);
}

function confirmed(result, key) {
  if (result?.ok !== true || !validRevision(result[key])) throw Error('The field service could not confirm the change.');
  return result[key];
}

export function mountBriefingController(host, {game, imageUrl, request, displayGameId = null, displayRevision = 0, onDisplayChange}) {
  stylePage();
  const gameId = game.id;
  let revision = game.briefingRevision ?? 0;
  let saved = game.briefingMap || defaultMap();
  let draft = saved;
  let pins = game.mapPins || {};
  let canvas, outstanding, attempted, conflict;
  let syncError = '', displayMessage = '';
  let changingDisplay = false, destroyed = false;

  const root = document.createElement('section');
  root.className = 'round-brief-session';
  root.innerHTML = `<div class="round-brief-session-bar">
    <span class="round-brief-state" data-brief-state></span>
    <button type="button" class="round-brief-action" data-brief-display></button>
  </div><div data-brief-canvas></div><p class="round-brief-note" role="status" data-brief-save></p>
  <div class="round-brief-resolve" hidden data-brief-resolve>
    <button type="button" class="round-brief-action" data-brief-retry>Retry save</button>
    <button type="button" class="round-brief-action" data-brief-load>Use saved map</button>
    <button type="button" class="round-brief-action" data-brief-keep>Replace saved map with my edits</button>
  </div><p class="round-brief-note" role="status" data-brief-message hidden></p>`;
  host.replaceChildren(root);
  const el = key => root.querySelector(`[data-brief-${key}]`);
  const show = el('display');
  const dirty = () => !sameMap(draft, saved);
  function paint() {
    if (destroyed) return;
    const live = displayGameId === gameId;
    el('state').textContent = live ? 'On Barracks TV' : 'Staff draft';
    el('state').dataset.live = String(live);
    show.textContent = live ? 'Stop showing on TV' : displayGameId ? 'Switch TV to this round' : 'Show on Barracks TV';
    show.disabled = changingDisplay || (!live && Boolean(conflict));
    const status = conflict ? 'Another staff device saved a different map. Choose which version to keep.' :
      syncError || (outstanding || dirty() ? 'Saving map…' : live ? 'Saved. The TV follows your marks and zoom.' : 'Saved. This map is ready to show.');
    if (el('save').textContent !== status) el('save').textContent = status;
    el('resolve').hidden = !conflict && !syncError;
    el('retry').hidden = !syncError || Boolean(conflict);
    el('load').hidden = el('keep').hidden = !conflict;
    el('message').hidden = !displayMessage;
    el('message').textContent = displayMessage;
  }
  function mountCanvas() {
    canvas?.destroy();
    canvas = mountBriefingMap(el('canvas'), {imageUrl, map: draft, pins, editable: true, onChange: map => {
      draft = map;
      if (!syncError && !conflict) void flush();
      paint();
    }});
  }
  function acceptMap(nextRevision, next) {
    if (!validRevision(nextRevision) || nextRevision <= revision || (conflict && nextRevision < conflict.revision)) return;
    const ownWrite = attempted && nextRevision === attempted.revision + 1 && sameMap(next, attempted.map);
    if (!dirty() || sameMap(next, draft) || ownWrite) {
      if (!ownWrite && !sameMap(next, draft)) {
        draft = next;
        if (!destroyed) canvas.setMap(next);
      }
      revision = nextRevision;
      saved = next;
      conflict = null;
      syncError = '';
    } else if (!conflict || nextRevision > conflict.revision) {
      conflict = {revision: nextRevision, map: next};
    }
  }
  function update(state) {
    if (validRevision(state.displayRevision) && state.displayRevision >= displayRevision) {
      displayRevision = state.displayRevision;
      displayGameId = state.displayGameId ?? null;
    }
    if (state.game?.id === gameId) {
      acceptMap(state.game.briefingRevision, state.game.briefingMap || defaultMap());
      const nextPins = state.game.mapPins || {};
      if (!destroyed && JSON.stringify(nextPins) !== JSON.stringify(pins)) { pins = nextPins; canvas.setMap(draft, pins); }
    }
    if (!outstanding && dirty() && !syncError && !conflict) void flush();
    paint();
  }
  async function staffRequest(path, options) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try { return await request(path, {...options, signal: controller.signal}); }
    finally { clearTimeout(timeout); }
  }
  async function refresh() {
    const board = await staffRequest(endpoint + '?staff=1');
    update({game: board.games?.find(row => row.id === gameId), displayGameId: board.briefingGameId, displayRevision: board.briefingDisplayRevision});
  }
  async function save() {
    while (dirty() && !conflict && !syncError) {
      const sent = {revision, map: draft};
      attempted = sent;
      try {
        const result = await staffRequest(endpoint, {method: 'POST', body: {action: 'saveBriefingMap', gameId, ...sent}});
        const nextRevision = confirmed(result, 'revision');
        if (nextRevision !== sent.revision + 1) throw Error('The map version could not be confirmed.');
        acceptMap(nextRevision, sent.map);
      } catch (error) {
        // A dropped response can still mean the write landed. Read before offering a retry.
        try { await refresh(); } catch { /* Keep the draft available on this device. */ }
        if (!conflict && revision <= sent.revision) syncError = `Map save unconfirmed. ${error?.message || 'Check the connection and retry.'}`;
      }
      paint();
    }
    return !dirty() && !conflict && !syncError;
  }
  function flush() {
    if (outstanding) return outstanding;
    if (!dirty() || conflict || syncError) return Promise.resolve(!dirty() && !conflict && !syncError);
    outstanding = save().finally(() => { outstanding = null; paint(); });
    paint();
    return outstanding;
  }
  async function changeDisplay() {
    if (changingDisplay || destroyed) return;
    changingDisplay = true;
    displayMessage = '';
    const hide = displayGameId === gameId;
    // A concurrent staff action while a final map save is finishing must still trip CAS.
    const expectedDisplayRevision = displayRevision;
    paint();
    try {
      if (!hide && !(await flush())) return;
      if (destroyed) return;
      const result = await staffRequest(endpoint, {method: 'POST', body: {action: hide ? 'hideBriefingMap' : 'showBriefingMap', gameId, displayRevision: expectedDisplayRevision}});
      const nextRevision = confirmed(result, 'displayRevision');
      if (nextRevision < expectedDisplayRevision) throw Error('The TV selection could not be confirmed.');
      update({displayGameId: hide ? null : gameId, displayRevision: nextRevision});
      if (!destroyed) onDisplayChange?.({gameId: displayGameId, displayRevision});
    } catch (error) {
      try { await refresh(); } catch { /* Report the unconfirmed action. */ }
      if (!(hide ? displayGameId !== gameId : displayGameId === gameId)) {
        displayMessage = error?.message || 'Could not confirm the TV selection. Check the connection and try again.';
      }
      if (!destroyed) onDisplayChange?.({gameId: displayGameId, displayRevision});
    } finally { changingDisplay = false; paint(); }
  }
  show.addEventListener('click', changeDisplay);
  el('retry').addEventListener('click', async () => {
    try { await refresh(); } catch { /* The guarded write can still confirm a retry. */ }
    if (destroyed) return;
    syncError = '';
    void flush();
    paint();
  });
  function resolveConflict(keepMine) {
    if (!conflict) return;
    revision = conflict.revision;
    saved = conflict.map;
    conflict = null;
    syncError = '';
    if (keepMine) void flush();
    else { draft = saved; canvas.setMap(draft); }
    paint();
  }
  el('load').addEventListener('click', () => resolveConflict(false));
  el('keep').addEventListener('click', () => resolveConflict(true));
  mountCanvas();
  paint();
  return {update, beforeClose: flush, destroy() {
    if (destroyed) return;
    destroyed = true;
    canvas.destroy();
    root.remove();
  }};
}

export function mountBriefingTV(host, {imageUrl, request, onActiveChange}) {
  stylePage();
  const root = document.createElement('section');
  root.className = 'round-brief-tv';
  root.hidden = true;
  root.setAttribute('aria-label', 'Round briefing');
  root.innerHTML = '<h2></h2><p class="round-brief-tv-note" role="status" hidden></p><div class="round-brief-tv-map"></div>';
  host.replaceChildren(root);
  const heading = root.querySelector('h2');
  const note = root.querySelector('p');
  const surface = root.querySelector('.round-brief-tv-map');
  let last = null, canvas, timer, flight, destroyed = false;
  function display(briefing) {
    if (!briefing) {
      if (last) { canvas.destroy(); canvas = null; last = null; root.hidden = true; onActiveChange?.(false); }
      return;
    }
    if (!briefing.gameId || !briefing.map || !validRevision(briefing.revision)) throw Error('Incomplete briefing');
    heading.textContent = briefing.title || 'Round briefing';
    const entering = !last;
    if (!last || last.gameId !== briefing.gameId) {
      canvas?.destroy();
      root.hidden = false;
      if (entering) onActiveChange?.(true);
      canvas = mountBriefingMap(surface, {imageUrl, map: briefing.map, pins: briefing.mapPins || {}, editable: false});
    } else if (last.revision !== briefing.revision || JSON.stringify(last.mapPins) !== JSON.stringify(briefing.mapPins)) {
      canvas.setMap(briefing.map, briefing.mapPins || {});
    }
    last = briefing;
  }
  async function poll() {
    if (destroyed || flight || document.visibilityState === 'hidden') return;
    clearTimeout(timer);
    flight = new AbortController();
    const timeout = setTimeout(() => flight?.abort(), 8000);
    try {
      const data = await request(endpoint + '?briefing=1', {signal: flight.signal});
      if (destroyed) return;
      if (!data || !Object.prototype.hasOwnProperty.call(data, 'briefing')) throw Error('Unavailable');
      display(data.briefing);
      note.hidden = true;
    } catch {
      if (!destroyed && last) { note.textContent = 'Connection interrupted. Showing the last briefing update.'; note.hidden = false; }
    } finally {
      clearTimeout(timeout);
      flight = null;
      if (!destroyed && document.visibilityState !== 'hidden') timer = setTimeout(poll, 2000);
    }
  }
  document.addEventListener('visibilitychange', poll);
  window.addEventListener('online', poll);
  void poll();
  return {destroy() {
    destroyed = true;
    clearTimeout(timer);
    flight?.abort();
    document.removeEventListener('visibilitychange', poll);
    window.removeEventListener('online', poll);
    canvas?.destroy();
    root.remove();
  }};
}
