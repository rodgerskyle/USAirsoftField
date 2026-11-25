// Shared with the field website's round desk. Both desks submit the displayed revisions.
const day = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'});
const time = new Intl.DateTimeFormat('en-US', {timeZone:'America/Los_Angeles',hour:'numeric',minute:'2-digit'});
export const roundConsoleNotices = {
  break:'Five-minute break started on Barracks TV.',
  briefing:'The selected briefing map is on Barracks TV.',
  start:'Round started. The field clock is running.',
  finish:'Round ended and MVP voting is open.',
};

export function mountRoundConsole(root, { save, timingUrl }) {
  const section = document.createElement('section');
  section.className = 'card lg-round-ops field-rounds-panel';
  section.setAttribute('aria-label', 'Run the next round');
  section.innerHTML = `<h2>Run the next round</h2>
    <label class="field">Game round<select data-console-round></select></label>
    <p data-console-state role="status"></p>
    <div class="lg-head-actions field-rounds-actions">
      <button type="button" class="btn btn-secondary" data-phase="break">Start 5-minute break</button>
      <button type="button" class="btn btn-secondary" data-phase="briefing">Start briefing on TV</button>
      <button type="button" class="btn btn-primary" data-phase="start">Start game</button>
      <button type="button" class="btn btn-primary" data-phase="finish">End game &amp; open MVP vote</button>
    </div><p><a data-console-timing>See where game time goes</a></p>`;
  section.querySelector('[data-console-timing]').href = timingUrl;
  root.append(section);
  const picker = section.querySelector('select'), state = section.querySelector('[data-console-state]');
  const buttons = Array.from(section.querySelectorAll('[data-phase]'));
  let board, now, disabled, selected, optionsKey, sending = false;
  function update(nextBoard, currentTime, locked = false) {
    board = nextBoard; now = currentTime; disabled = locked;
    section.hidden = !board?.isStaff;
    if(section.hidden) return;
    const rounds = (board.games || []).filter(game => day.format(new Date(game.startsAt)) === day.format(new Date(now)) &&
      ['queued','scheduled','delayed','live'].includes(game.status));
    const started = game => game.status === 'live' || (game.status === 'scheduled' && Date.parse(game.startsAt) <= now);
    const running = rounds.find(game => started(game) && Date.parse(game.endsAt) > now);
    selected = rounds.find(game => game.id === picker.value) || running ||
      rounds.find(game => board.briefingGameId === game.id) || rounds.find(game => !started(game)) || rounds[rounds.length-1];
    const key = JSON.stringify(rounds.map(game=>[game.id,game.title,game.startsAt,game.status]));
    if(key !== optionsKey) {
      optionsKey = key;
      const options = rounds.map(game => {
        const option = document.createElement('option');
        option.value = game.id; option.textContent = time.format(new Date(game.startsAt)) + ' · ' + game.title;
        return option;
      });
      if(!options.length) {
        const empty = document.createElement('option');
        empty.textContent = 'Schedule a round to get started'; options.push(empty);
      }
      picker.replaceChildren(...options);
    }
    if(selected) picker.value = selected.id;
    const hasStarted = selected && started(selected);
    const otherPoll = board.mvpPoll && !board.mvpPoll.closed && Date.parse(board.mvpPoll.closesAt)>now && board.mvpPoll.gameId!==selected?.id;
    const selectedFinishedVote = board.mvpPastResults?.some(result => result.gameId === selected?.id) ||
      (board.mvpPoll?.gameId === selected?.id && board.mvpPoll && (board.mvpPoll.closed || Date.parse(board.mvpPoll.closesAt)<=now));
    const onMap = !!selected && board.briefingGameId === selected.id;
    const allowed = {
      break: !running && !(board.barracksClock?.kind==='break' && Date.parse(board.barracksClock.endsAt)>now),
      briefing: selected && !hasStarted && !running && !onMap,
      start: selected && !hasStarted && !running,
      finish: hasStarted && !otherPoll && !selectedFinishedVote,
    };
    for(const button of buttons) button.disabled = sending || disabled || !allowed[button.dataset.phase];
    picker.disabled = sending || disabled || !rounds.length;
    const info = [];
    if(board.barracksClock?.kind && Date.parse(board.barracksClock.endsAt)>now)
      info.push('TV countdown ends at ' + time.format(new Date(board.barracksClock.endsAt)) + '.');
    if(onMap) info.push('This briefing map is on TV.');
    if(hasStarted) info.push(Date.parse(selected.endsAt)>now ? 'This game is in play.' : 'The game timer elapsed. Confirm when play has finished.');
    if(otherPoll && hasStarted) info.push('Close the previous MVP vote below before ending this game with voting.');
    else if(selectedFinishedVote && hasStarted) info.push('Voting already finished for this game. Use the separate End round control.');
    if(!info.length) info.push(selected?'Ready for the selected round.':'You can start a break while the next round is being scheduled.');
    if(state.textContent!==info.join(' ')) state.textContent=info.join(' ');
  }
  picker.addEventListener('change', () => update(board, now, disabled));
  section.addEventListener('click',async event=>{
    const button = event.target.closest('button[data-phase]');
    if(!button || button.disabled || sending || disabled || !board?.isStaff) return;
    const phase=button.dataset.phase;
    const body={action:'runRoundConsole',phase,commandId:crypto.randomUUID(),
      clockRevision:board.barracksClock?.revision ?? 0, displayRevision:board.briefingDisplayRevision ?? 0};
    if(phase!=='break') Object.assign(body,{gameId:selected.id,revision:selected.revision});
    if(phase==='finish' && !window.confirm('End '+selected.title+' and open MVP voting for this round?')) return;
    sending=true;update(board,now,disabled);
    try { await save(body); }
    finally {sending=false; if(root.isConnected)update(board,now,disabled);}
  });
  return { update, destroy:()=>section.remove() };
}
