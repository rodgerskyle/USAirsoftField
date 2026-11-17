const numbers = new Intl.NumberFormat('en-US');
const dayLabel = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
const monthLabel = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' });
const timeLabel = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

export function gameLedgerMarkup() {
  return `<div class="game-ledger"><h2>Game history</h2><p data-career></p>
    <p data-history-note></p><p role="status" data-history-status>Loading game history…</p>
    <ol data-history-list aria-label="Recorded game results"></ol><div data-history-actions></div></div>`;
}

function recordDate(item) {
  if (!item.date || item.precision === 'unknown') return 'Date unavailable';
  const source = item.precision === 'month' ? item.date.slice(0, 7) + '-01T12:00:00Z' :
    item.precision === 'day' ? item.date.slice(0, 10) + 'T12:00:00Z' : item.date;
  const time = Date.parse(source);
  if (!Number.isFinite(time)) return 'Date unavailable';
  if (item.precision === 'month') return monthLabel.format(time);
  if (item.precision === 'day') return dayLabel.format(time);
  return 'Recorded ' + timeLabel.format(time);
}

function historyRow(item) {
  const row = document.createElement('li');
  const main = document.createElement('div');
  const title = document.createElement('strong');
  const date = document.createElement('span');
  const score = document.createElement('span');
  if (item.type === 'game') {
    title.textContent = item.outcome === 'win' ? 'Win' : 'Loss';
    title.className = item.outcome === 'win' ? 'game-ledger__win' : 'game-ledger__loss';
    if (item.mode) title.append(document.createTextNode(' · ' + item.mode));
  } else {
    const labels = { day: 'Game-day totals', month: 'Monthly totals', undated: 'Results without a recorded date' };
    title.textContent = labels[item.type] || 'Recorded totals';
    const tally = document.createElement('span');
    tally.textContent = `${numbers.format(item.wins)} ${item.wins === 1 ? 'win' : 'wins'} · ${numbers.format(item.losses)} ${item.losses === 1 ? 'loss' : 'losses'}`;
    main.append(tally);
  }
  main.prepend(title);
  date.textContent = recordDate(item);
  main.append(date);
  score.textContent = `${numbers.format(item.points)} pts`;
  row.append(main, score);
  return row;
}

export function bindGameLedger(root, { playerId, request, signal }) {
  const status = root.querySelector('[data-history-status]');
  const list = root.querySelector('[data-history-list]');
  const actions = root.querySelector('[data-history-actions]');
  const seen = new Set();
  const visitedCursors = new Set();
  let next = null, busy = false, started = false;

  function button(label, handler) {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'btn btn-secondary';
    control.textContent = label;
    control.addEventListener('click', handler, { signal });
    actions.replaceChildren(control);
  }

  async function load(append) {
    if (signal.aborted || busy || (append && (!next || visitedCursors.has(next)))) return;
    busy = true;
    const cursor = append ? next : null;
    const params = new URLSearchParams({ playerId });
    if (cursor) params.set('cursor', cursor);
    status.textContent = append ? 'Loading earlier results…' : 'Loading game history…';
    if (actions.firstElementChild) actions.firstElementChild.disabled = true;
    try {
      const result = await request('/api/player-game-history?' + params, signal);
      if (signal.aborted) return;
      if (result.player?.id !== playerId || !Array.isArray(result.items)) throw new Error('The game history could not be verified.');
      const before = seen.size;
      for (const item of result.items) {
        if (!item.id || seen.has(item.id)) continue;
        list.append(historyRow(item)); seen.add(item.id);
      }
      if (cursor) visitedCursors.add(cursor);
      const candidate = result.nextCursor;
      next = seen.size > before && typeof candidate === 'string' && candidate && !visitedCursors.has(candidate) ? candidate : null;
      const player = result.player;
      root.querySelector('[data-career]').textContent = `${numbers.format(player.wins)} career wins · ${numbers.format(player.losses)} career losses · ${numbers.format(player.points)} career points`;
      root.querySelector('[data-history-note]').textContent = result.historyNote || '';
      status.textContent = seen.size === 0 ? 'No game results have been recorded.' : next ? '' : 'All available results shown.';
      started = true;
      if (next) button('Load more game history', () => load(true));
      else actions.replaceChildren();
    } catch (failure) {
      if (signal.aborted) return;
      status.textContent = failure.message || 'Game history could not load.';
      button('Retry game history', () => load(started));
    } finally { busy = false; }
  }
  void load(false);
}
