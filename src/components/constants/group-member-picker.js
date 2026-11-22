// Both group desks and organizer rosters use the same public member directory.
const playerId = /^[A-Za-z0-9_-]{10,128}$/;

function button(label, primary = false) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = primary ? 'btn btn-primary' : 'btn btn-secondary';
  element.textContent = label;
  return element;
}

export function mountGroupMemberPicker(root, { endpoint, profileHref, rosterIds, isFull, onAdd }) {
  root.classList.add('group-member-picker');
  root.innerHTML = `<h3>Member search</h3>
    <form role="search" aria-label="Group member search">
      <label>Member name, callsign, ID or profile link
        <input type="search" required maxlength="250" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="search">
      </label><button type="submit" class="btn btn-primary">Search members</button>
    </form>
    <p role="status" aria-live="polite"></p><div data-member-matches></div>`;
  const form = root.querySelector('form');
  const input = form.querySelector('input');
  const status = root.querySelector('[role=status]');
  const results = root.querySelector('[data-member-matches]');
  let request;
  let found;
  let adding = false;
  let destroyed = false;

  function draw() {
    results.replaceChildren();
    if (!found?.players.length) return;
    const roster = new Set(rosterIds());
    const list = document.createElement('ul');
    for (const player of found.players) {
      const row = document.createElement('li');
      const identity = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = player.name || player.displayName;
      const details = document.createElement('small');
      details.textContent = [player.rankName, 'ID ' + player.id].filter(Boolean).join(' · ');
      identity.append(name, details);
      const link = document.createElement('a');
      link.textContent = 'View profile';
      link.href = profileHref(player.id);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const onRoster = roster.has(player.id);
      const full = isFull();
      const add = button(onRoster ? 'On roster' : full ? 'Group full' : 'Add to group', true);
      add.disabled = adding || onRoster || full;
      add.addEventListener('click', async () => {
        if (destroyed || adding || rosterIds().includes(player.id) || isFull()) return;
        adding = true;
        draw();
        status.textContent = 'Adding ' + name.textContent + '…';
        try {
          await onAdd(player.id);
          if (!destroyed) status.textContent = rosterIds().includes(player.id) ? name.textContent + ' is on the roster.' : '';
        } catch (error) {
          if (!destroyed) status.textContent = error.message || 'Could not add this member. Try again.';
        } finally {
          adding = false;
          if (!destroyed) draw();
        }
      });
      row.append(identity, link, add);
      list.append(row);
    }
    results.append(list);
    if (found.totalPages > 1) {
      const pages = document.createElement('nav');
      pages.setAttribute('aria-label', 'Member search pages');
      const previous = button('Previous');
      previous.disabled = adding || found.page <= 1;
      previous.addEventListener('click', () => search(found.page - 1));
      const position = document.createElement('span');
      position.textContent = 'Page ' + found.page + ' of ' + found.totalPages;
      const next = button('Next');
      next.disabled = adding || found.page >= found.totalPages;
      next.addEventListener('click', () => search(found.page + 1));
      pages.append(previous, position, next);
      results.append(pages);
    }
  }

  async function search(page) {
    const term = input.value.trim();
    if (!term || destroyed || adding) return;
    resetSearch();
    const current = new AbortController();
    request = current;
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Searching members…';
    try {
      const url = new URL(typeof endpoint === 'function' ? endpoint() : endpoint, window.location.href);
      url.search = new URLSearchParams({lookup: 'players', q: term, page: String(page)}).toString();
      const response = await fetch(url.href, { credentials: 'omit', cache: 'no-store', redirect: 'error',
        headers: {Accept: 'application/json'}, signal: current.signal });
      const data = await response.json().catch(() => null);
      if (current.signal.aborted) return;
      if (!response.ok || !Array.isArray(data?.players)) throw new Error(typeof data?.error === 'string' ? data.error : 'Member search is unavailable. Try again.');
      found = {...data, players: data.players.filter(player => player && playerId.test(player.id) && (player.name || player.displayName))};
      const count = Number.isInteger(data.totalPlayers) ? data.totalPlayers : found.players.length;
      status.textContent = found.players.length ? count + (count === 1 ? ' match' : ' matches') :
        'No members found. Try another name, callsign or player ID.';
      draw();
    } catch (error) {
      if (!current.signal.aborted) status.textContent = error.message || 'Member search is unavailable. Try again.';
    } finally {
      if (request === current) { request = null; form.removeAttribute('aria-busy'); }
    }
  }

  function resetSearch() {
    request?.abort();
    request = null;
    found = null;
    form.removeAttribute('aria-busy');
    results.replaceChildren();
    status.textContent = '';
  }
  function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    void search(1);
  }
  form.addEventListener('submit', submit);
  input.addEventListener('input', resetSearch);
  function destroy() {
    destroyed = true;
    resetSearch();
    form.removeEventListener('submit', submit);
    input.removeEventListener('input', resetSearch);
    root.replaceChildren();
  }
  destroy.refresh = () => { if (!destroyed) draw(); };
  return destroy;
}
