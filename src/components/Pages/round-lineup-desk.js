// Used by both USAW round desks. A closed round can be scored from any staff device.
const sides = { camo: 'Yellow / Camo', solid: 'Blue / Solid' };
const fieldTime = new Intl.DateTimeFormat('en-US', { timeZone:'America/Los_Angeles', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const amount = (number, word) => number + ' ' + word + (number === 1 ? '' : 's');
const count = value => Number.isSafeInteger(value) && value >= 0;
const validPlayer = row => row && typeof row.playerId === 'string' && typeof row.displayName === 'string'
  && Object.hasOwn(sides, row.side) && typeof row.member === 'boolean';

function checked(data, expected) {
  if (!data || !Array.isArray(data.recentGames) || data.recentGames.some(game => !game?.id || typeof game.title !== 'string')) throw Error('Could not verify the round list.');
  if (!data.game && !expected) return data;
  if (!data.game?.id || (expected && data.game.id !== expected) || !count(data.revision)
    || !Array.isArray(data.players) || !data.players.every(validPlayer)
    || !Array.isArray(data.candidates) || !data.candidates.every(validPlayer)
    || (data.winner !== null && !Object.hasOwn(sides, data.winner))
    || !data.progress || !['saved','remaining','failed'].every(key => count(data.progress[key]))
    || !Array.isArray(data.failures)) throw Error('Could not verify this round lineup. Refresh before recording a result.');
  return data;
}

function sideList(players, side, byId) {
  const team = players.filter(player => player.side === side);
  const names = team.map(player => {
    const buddy = byId.get(player.buddyId);
    const info = [!player.member && 'Walk-on', buddy && 'Buddy: ' + buddy.displayName].filter(Boolean);
    return '<li>' + escape(player.displayName) + (info.length ? ' <small>' + escape(info.join(' · ')) + '</small>' : '') + '</li>';
  }).join('');
  return '<details data-team="' + side + '"><summary><span>' + sides[side] + '</span> <strong>' + team.length
    + '</strong></summary>' + (names ? '<ul>' + names + '</ul>' : '<p>No players on this side.</p>') + '</details>';
}

export function mountRoundLineup(root, { request, scoresUrl }) {
  const box = document.createElement('section');
  box.className = 'field-rounds-panel card lg-round-ops round-lineup-desk';
  box.setAttribute('aria-label', 'Round lineup and result');
  box.innerHTML = '<header class="round-desk-heading"><h2 tabindex="-1">Round lineup and result</h2>'
    + '<button type="button" class="btn btn-secondary" data-open>Review lineup</button></header>'
    + '<div data-panel hidden><fieldset><div class="lineup-picker"><label class="field">Played round<select data-game></select></label>'
    + '<button type="button" class="btn btn-secondary" data-refresh>Refresh lineup</button>'
    + '<button type="button" class="btn btn-secondary" data-latest hidden>Show recent lineups</button></div><div data-roster></div></fieldset>'
    + '<p role="status" aria-live="polite" data-status></p></div>';
  root.append(box);
  const find = selector => box.querySelector(selector);
  const openButton = find('[data-open]'), panel = find('[data-panel]'), fieldset = find('fieldset'), picker = find('[data-game]'), roster = find('[data-roster]'), status = find('[data-status]');
  let model, chosen, review, controller, locked = true, allowed = false, disposed = false, loading = false, queuedGame;
  function lockControls() {
    openButton.disabled = locked;
    fieldset.disabled = locked || loading;
    panel.setAttribute('aria-busy', String(loading));
  }
  function show() {
    const expanded = new Set(Array.from(roster.querySelectorAll('details[open]'), el => el.dataset.team));
    const recent = model?.recentGames || [];
    find('[data-latest]').hidden = true;
    picker.replaceChildren(...recent.map(game => {
      const opt = document.createElement('option');
      opt.value = game.id;
      const started = Date.parse(game.startedAt);
      opt.textContent = game.title + (Number.isFinite(started) ? ' · ' + fieldTime.format(started) : '');
      return opt;
    }));
    picker.disabled = !recent.length;
    if (!model?.game) {
      roster.innerHTML = '<p>No saved lineup for this round. Lineups are captured at game start.</p><a data-scores>Individual score entry</a>';
      find('[data-scores]').href = scoresUrl;
      return;
    }
    picker.value = model.game.id;
    const players = model.players, byId = new Map(players.map(player => [player.playerId, player]));
    const members = players.filter(player => player.member).length;
    const walkOns = players.length - members;
    let html = '<div class="lineup-summary"><h3>Players in this round</h3><p>' + amount(members, 'member') + ' · ' + amount(walkOns, 'walk-on') + '</p></div>'
      + '<div class="lineup-teams">' + sideList(players, 'camo', byId) + sideList(players, 'solid', byId) + '</div>';
    const selectedSide = model.winner || review;
    html += '<div class="lineup-result"' + (selectedSide ? ' data-side="' + selectedSide + '"' : '') + '>';
    if (model.winner) {
      const progress = model.progress;
      const unfinished = progress.remaining > 0 || progress.failed > 0;
      html += '<h3 tabindex="-1" data-recorded>' + sides[model.winner] + ' won</h3><p>' + (unfinished
        ? progress.saved + ' saved · ' + progress.remaining + ' remaining' : 'Round result recorded.') + '</p>';
      if (progress.failed) {
        html += '<ul aria-label="Players needing a retry">' + model.failures.map(row => '<li>' + escape(row.displayName) + ' · ' + escape(row.error) + '</li>').join('') + '</ul>';
      }
      if (unfinished) html += '<button type="button" class="btn btn-primary" data-resume>Resume saving results</button>';
      html += '<p><a data-scores>Individual score corrections and MVP awards</a></p>';
    } else if (model.game.status !== 'ended') {
      html += '<p>End the game to record the winner.</p>';
    } else if (!players.length) {
      html += '<p>Add the players who took part before recording a winner.</p>';
    } else if (review) {
      const winCount = players.filter(player => player.side === review && player.member).length;
      html += '<h3>' + sides[review] + ' wins</h3><p>' + amount(winCount, 'member win') + ' · ' + (members - winCount)
        + (members - winCount === 1 ? ' member loss · ' : ' member losses · ') + amount(walkOns, 'walk-on') + ' in this lineup</p>'
        + '<div class="field-rounds-actions"><button type="button" class="btn btn-primary" data-confirm>Confirm round result</button>'
        + '<button type="button" class="btn btn-secondary" data-back>Change winner</button></div>';
    } else {
      html += '<h3>Who won?</h3><div class="field-rounds-actions">'
        + Object.entries(sides).map(([side, label]) => '<button type="button" class="btn btn-secondary" data-win="' + side + '">Review ' + label + ' win</button>').join('')
        + '</div>';
    }
    html += '</div>';
    if (!model.winner && (model.candidates.length || players.length)) {
      html += '<details class="lineup-adjustments" data-team="changes"><summary>Adjust players in this round</summary>';
      if (model.candidates.length) {
        html += '<div class="lineup-adjust"><label class="field">Add someone who played<select data-late><option value="">Choose a player outside this lineup</option>'
          + model.candidates.map(person => '<option value="' + escape(person.playerId) + '">' + escape(person.displayName + ' · ' + sides[person.side]) + '</option>').join('')
          + '</select></label><button type="button" class="btn btn-secondary" data-add disabled>Add to this round</button></div>';
      }
      if (players.length) {
        html += '<div class="lineup-adjust"><label class="field">Player to exclude<select data-exclude><option value="">Choose a player</option>'
          + players.map(person => '<option value="' + escape(person.playerId) + '">' + escape(person.displayName + ' · ' + sides[person.side]) + '</option>').join('')
          + '</select></label><button type="button" class="btn btn-secondary" data-remove disabled>Exclude from this round</button>'
          + '<p>Exclude anyone who left before play or already received an individual score for this round.</p></div>';
      }
      html += '</details>';
    }
    roster.innerHTML = html;
    for (const el of roster.querySelectorAll('details')) el.open = expanded.has(el.dataset.team);
    if (!model.winner && !players.length && model.candidates.length) find('.lineup-adjustments').open = true;
    const scoreLink = find('[data-scores]');
    if (scoreLink) scoreLink.href = scoresUrl;
  }
  async function run(body) {
    if (!allowed || locked || loading || disposed) return;
    const current = new AbortController();
    controller = current;
    const restoreFocus = box.contains(document.activeElement);
    loading = true;
    lockControls();
    const resultCommand = body.action === 'lineupResult';
    let timeout, timedOut = false;
    const abortOnTimeout = () => { timedOut = true; current.abort(); };
    const pending = {lineupAdd:'Adding player…', lineupRemove:'Excluding player…', lineupResult:'Saving round results…'};
    status.dataset.tone = 'busy';
    status.textContent = pending[body.action] || 'Loading lineup…';
    try {
      let previousUntried = Infinity;
      for (;;) {
        timeout = setTimeout(abortOnTimeout, 60000);
        const data = checked(await request(body, current.signal), body.gameId);
        clearTimeout(timeout);
        if (current.signal.aborted) return;
        if (resultCommand && data.winner !== body.winner) throw Error('The selected winner was not confirmed. Refresh the lineup.');
        model = data;
        chosen = model.game?.id;
        review = null;
        show();
        const untried = data.progress.remaining - data.progress.failed;
        if (!resultCommand || untried <= 0 || untried >= previousUntried || locked) break;
        previousUntried = untried;
        status.textContent = 'Saving round results… ' + data.progress.saved + ' saved.';
      }
      status.dataset.tone = resultCommand && model.progress.failed ? 'error' : 'done';
      status.textContent = body.action === 'lineupAdd' ? 'Player added to this round.' : body.action === 'lineupRemove' ? 'Player excluded from this round.'
        : resultCommand && model.progress.failed ? 'Some results still need attention. Review the players above and retry.' : '';
    } catch (error) {
      if (controller !== current || (current.signal.aborted && !timedOut)) return;
      // An interrupted submission may already have saved some scores. Read it again before offering any write.
      status.dataset.tone = 'error';
      model = null;
      review = null;
      roster.replaceChildren();
      find('[data-latest]').hidden = !chosen;
      status.textContent = (timedOut ? 'The round desk timed out.' : error?.message || 'The lineup is unavailable.') + ' Use Refresh lineup to check the saved state.';
    } finally {
      clearTimeout(timeout);
      if (controller === current) {
        controller = null;
        loading = false;
        lockControls();
        if (restoreFocus && !locked && (document.activeElement === document.body || !document.activeElement)) {
          const intended = !model ? '[data-refresh]' : resultCommand ? (model.progress.remaining ? '[data-resume]' : '[data-recorded]')
            : body.action === 'lineupAdd' ? '[data-late]' : body.action === 'lineupRemove' ? '[data-exclude]' : '[data-game]';
          (find(intended) || find('.lineup-adjustments summary'))?.focus();
        }
        if (queuedGame && !locked) {
          const id = queuedGame; queuedGame = null; open(id);
        }
      }
    }
  }
  function open(gameId, focusHeading = false) {
    if (!allowed || disposed) return;
    panel.hidden = false;
    openButton.hidden = true;
    if (focusHeading) {
      const heading = find('h2');
      heading.focus({preventScroll:true});
      heading.scrollIntoView?.({block:'nearest'});
    }
    if (locked || loading) { queuedGame = gameId || null; return; }
    chosen = gameId;
    review = null;
    void run({action:'lineup', ...(gameId && {gameId})});
  }
  box.addEventListener('change', event => {
    if (event.target === picker) open(picker.value);
    if (event.target.matches('[data-exclude]')) find('[data-remove]').disabled = !event.target.value;
    if (event.target.matches('[data-late]')) find('[data-add]').disabled = !event.target.value;
  });
  box.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || locked || loading) return;
    if (button.hasAttribute('data-latest')) { open(); return; }
    if (button === openButton || button.hasAttribute('data-refresh')) { open(chosen, button === openButton); return; }
    if (!model?.game || model.game.id !== chosen) return;
    if (button.hasAttribute('data-add')) {
      const playerId = find('[data-late]').value;
      if (model.candidates.some(person => person.playerId === playerId)) void run({action:'lineupAdd',gameId:chosen,playerId,revision:model.revision});
    } else if (button.hasAttribute('data-remove')) {
      const playerId = find('[data-exclude]').value;
      if (model.players.some(person => person.playerId === playerId)) void run({action:'lineupRemove',gameId:chosen,playerId,revision:model.revision});
    } else if (button.dataset.win && Object.hasOwn(sides, button.dataset.win)) {
      review = button.dataset.win; show(); find('[data-confirm]')?.focus();
    } else if (button.hasAttribute('data-back')) {
      const prior = review; review = null; show(); find('[data-win="' + prior + '"]')?.focus();
    } else if (button.hasAttribute('data-confirm') || button.hasAttribute('data-resume')) {
      const winner = model.winner || review;
      if (winner) void run({action:'lineupResult',gameId:chosen,winner,revision:model.revision});
    }
  });
  function update(isStaff, disabled) {
    allowed = Boolean(isStaff);
    locked = !allowed || Boolean(disabled);
    box.hidden = !allowed;
    if (!allowed) {
      controller?.abort(); controller = null; model = null; chosen = null; review = null; queuedGame = null; loading = false;
      panel.hidden = true; openButton.hidden = false;
      picker.replaceChildren(); roster.replaceChildren(); status.textContent = '';
    }
    lockControls();
    if (queuedGame && !locked && !loading) { const id = queuedGame; queuedGame = null; open(id); }
  }
  return { open, update, destroy() { disposed = true; controller?.abort(); controller = null; box.remove(); } };
}
