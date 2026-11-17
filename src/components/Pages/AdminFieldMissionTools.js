import React, { useEffect, useRef, useState } from 'react';
import { fieldTimeInput, fieldTimeISO } from './FieldRoundsShared';
import './AdminFieldMissionTools.css';

const endpoint = '/api/field-mission-tools';
const clock = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const emptyDetails = { location: 'Main field', briefingLocation: '', camoSpawn: '', solidSpawn: '', notes: '' };

function DetailsFields({ values, update }) {
  return <>
    <div className="field-mission__fields">
      {Object.entries({ location: 'Field area', briefingLocation: 'Briefing location', camoSpawn: 'Camo spawn', solidSpawn: 'Solid spawn' }).map(([name, label]) => (
        <label key={name}>{label}<input name={name} value={values[name]} maxLength={name.includes('Spawn') ? 100 : 80}
          required={name === 'location'} placeholder={name === 'location' ? '' : 'Staff to confirm'} onChange={event => update(name, event.target.value)} /></label>
      ))}
    </div>
    <label>Staff notes (optional)<textarea name="notes" value={values.notes} maxLength={300} rows={2} onChange={event => update('notes', event.target.value)} /></label>
  </>;
}

function Briefing({ brief }) {
  return <div className="field-mission__print" aria-label="Prepared referee briefing">
    {brief.missing.length > 0 && <p className="field-mission__missing">Confirm before play · {brief.missing.join(', ')}</p>}
    <h3>{brief.title}</h3><p><strong>Field area</strong> · {brief.location}<br /><strong>Briefing</strong> · {brief.briefingLocation}</p>
    <h4>Objective</h4><p>{brief.objective}</p>{brief.modeNote && <p>{brief.modeNote}</p>}
    <dl><div><dt>Camo spawn</dt><dd>{brief.camoSpawn}</dd></div><div><dt>Solid spawn</dt><dd>{brief.solidSpawn}</dd></div></dl>
    <h4>Hits, revives, and respawns</h4><p>{brief.respawns}</p><h4>Winning condition</h4><p>{brief.winCondition}</p>
    {brief.notes && <><h4>Staff notes</h4><p>{brief.notes}</p></>}
  </div>;
}

export default function AdminFieldMissionTools({ request }) {
  const [library, setLibrary] = useState(null);
  const [values, setValues] = useState({ ...emptyDetails, startsAt: '', endsAt: '', roundMinutes: 25, breakMinutes: 10, modeIds: [] });
  const [briefValues, setBriefValues] = useState({ ...emptyDetails, modeId: '', round: '', respawns: '', winCondition: '' });
  const [plan, setPlan] = useState(null);
  const [brief, setBrief] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const active = useRef(null);
  const publication = useRef(null);
  const printing = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    request(endpoint, { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      if (!Array.isArray(data.modes) || !Array.isArray(data.recentGames)) throw new Error('The game library could not be read.');
      const now = Date.parse(data.serverNow) || Date.now();
      const start = Math.max(Date.parse(data.suggestedDay?.startsAt) || 0, Math.ceil((now + 5 * 60_000) / 60_000) * 60_000);
      const end = Date.parse(data.suggestedDay?.endsAt) > start + 25 * 60_000 ? Date.parse(data.suggestedDay.endsAt) : start + 3 * 3_600_000;
      setLibrary(data);
      setValues(previous => ({ ...previous, startsAt: fieldTimeInput(start), endsAt: fieldTimeInput(end), modeIds: data.modes.filter(mode => !mode.legacy).map(mode => mode.id) }));
      setBriefValues(previous => ({ ...previous, modeId: data.modes[0]?.id || '' }));
    }).catch(error => { if (!controller.signal.aborted) setNotice(error.message || 'Mission tools could not load. Reopen this page to retry.'); })
      .finally(() => { if (active.current === controller) { active.current = null; setBusy(false); } });
    return () => { controller.abort(); active.current?.abort(); };
  }, [request]);

  function editValues(name, value) {
    setValues(previous => ({ ...previous, [name]: value }));
    setPlan(null); publication.current = null;
  }
  function editBrief(name, value) { setBriefValues(previous => ({ ...previous, [name]: value })); setBrief(null); }

  async function mutate(body, receive) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true); setNotice('');
    try {
      const result = await request(endpoint, { method: 'POST', body, signal: controller.signal });
      if (!controller.signal.aborted) receive(result);
    } catch (error) {
      if (!controller.signal.aborted) {
        if (error.status === 401 || error.status === 403) { setLibrary(null); setPlan(null); setBrief(null); }
        setNotice(error.message || 'The planning action could not be completed. Try again.');
      }
    }
    finally { if (active.current === controller) { active.current = null; setBusy(false); } }
  }

  function suggest(event) {
    event.preventDefault();
    try {
      const { startsAt, endsAt, roundMinutes, breakMinutes, ...details } = values;
      void mutate({ action: 'plan', ...details, startsAt: fieldTimeISO(startsAt), endsAt: fieldTimeISO(endsAt), roundMinutes: Number(roundMinutes), breakMinutes: Number(breakMinutes) }, result => {
        if (!Array.isArray(result.plan?.rounds)) throw new Error('The suggested rotation could not be read.');
        setPlan(result.plan); publication.current = null;
        setNotice('Review the suggested games and their setup before publishing.');
      });
    } catch (error) { setNotice(error.message); }
  }

  function changeMode(index, modeId) {
    const mode = library.modes.find(item => item.id === modeId);
    setPlan(previous => ({ ...previous, rounds: previous.rounds.map((round, position) => position === index ? { ...round, modeId, title: mode.name } : round) }));
    publication.current = null;
  }
  function moveRound(index, direction) {
    const other = index + direction;
    if (other < 0 || other >= plan.rounds.length) return;
    setPlan(previous => {
      const rounds = previous.rounds.map(round => ({ ...round }));
      [rounds[index].modeId, rounds[other].modeId] = [rounds[other].modeId, rounds[index].modeId];
      [rounds[index].title, rounds[other].title] = [rounds[other].title, rounds[index].title];
      return { ...previous, rounds };
    });
    publication.current = null;
  }
  function publish() {
    if (!plan || busy || !window.confirm(`Publish these ${plan.rounds.length} reviewed rounds to the live field schedule?`)) return;
    publication.current ||= { operationId: window.crypto.randomUUID(), rounds: plan.rounds.map(round => ({ ...round })) };
    void mutate({ action: 'publishPlan', ...publication.current }, result => {
      if (result.ok !== true) throw new Error('The publication could not be confirmed.');
      setPlan(null); setNotice(`${result.count} rounds added to Round Controls. Staff start each round from the live board.`);
    });
  }
  function selectRound(id) {
    const round = library.recentGames.find(item => item.id === id);
    setBriefValues(previous => ({ ...previous, round: id, ...(round && Object.fromEntries(['modeId', ...Object.keys(emptyDetails)].map(key => [key, round[key] || '']))) }));
    setBrief(null);
  }
  function createBrief(event) {
    event.preventDefault();
    void mutate({ action: 'brief', ...briefValues }, result => {
      if (!result.brief?.title) throw new Error('The briefing could not be read.');
      setBrief(result.brief); setNotice('Briefing ready for staff review.');
    });
  }
  function printBrief() {
    printing.current.classList.add('field-mission--printing'); window.print(); printing.current.classList.remove('field-mission--printing');
  }

  if (!library) return <section className="field-tool__panel" aria-busy={busy}><h2>Field mission tools</h2><p role="status">{notice || 'Loading the game library…'}</p></section>;
  return <section className="field-mission" aria-label="Field mission tools" ref={printing}>
    <section className="field-tool__panel field-mission__panel" aria-labelledby="rotation-title">
      <h2 id="rotation-title">Game rotation planner</h2><p>Choose the modes your crew can run. Suggestions vary game categories and reduce recent repeats. Review each selected field area and setup.</p>
      {library.feedback?.responses > 0 && <aside className="field-mission__feedback"><strong>Player feedback · last 30 days</strong>
        <p>{library.feedback.responses} responses · {['gameVariety', 'breakTimes', 'teamBalance'].filter(key => Number.isFinite(library.feedback[key])).map(key => `${({ gameVariety: 'Variety', breakTimes: 'Breaks', teamBalance: 'Balance' })[key]} ${library.feedback[key].toFixed(1)} / 5`).join(' · ')}</p>
        {typeof library.feedback.gameVariety === 'number' && library.feedback.gameVariety < 3 && <p>Rotation suggestions give extra priority to switching game categories.</p>}
      </aside>}
      <form onSubmit={suggest}><fieldset disabled={busy}><div className="field-mission__fields">
        <label>Start time · California<input type="datetime-local" value={values.startsAt} required onChange={event => editValues('startsAt', event.target.value)} /></label>
        <label>End time · California<input type="datetime-local" value={values.endsAt} required onChange={event => editValues('endsAt', event.target.value)} /></label>
        <label>Round minutes<input type="number" min={5} max={90} value={values.roundMinutes} required onChange={event => editValues('roundMinutes', event.target.value)} /></label>
        <label>Break and briefing minutes<input type="number" min={0} max={60} value={values.breakMinutes} required onChange={event => editValues('breakMinutes', event.target.value)} /></label>
      </div><DetailsFields values={values} update={editValues} />
        <fieldset className="field-mission__modes"><legend>Available game modes</legend><div>{library.modes.map(mode => <label key={mode.id}>
          <input type="checkbox" checked={values.modeIds.includes(mode.id)} onChange={event => editValues('modeIds', event.target.checked ? [...values.modeIds, mode.id] : values.modeIds.filter(id => id !== mode.id))} />
          {mode.name}<small>{mode.type}</small>
        </label>)}</div></fieldset><button className="btn btn-primary" type="submit">Suggest rotation</button>
      </fieldset></form>
      {plan && <div className="field-mission__preview"><h3>Review your rotation</h3><p>{plan.rounds.length} rounds · {plan.unusedMinutes} minutes after the final round. Published rounds wait for a staff start.</p>
        <ol>{plan.rounds.map((round, index) => <li key={round.startsAt}>
          <div className="field-mission__time">{clock.format(new Date(round.startsAt))}<span>to {clock.format(new Date(round.endsAt))}</span></div>
          <label>Game mode<select aria-label={`Round ${index + 1} game mode`} disabled={busy} value={round.modeId} onChange={event => changeMode(index, event.target.value)}>{library.modes.map(mode => <option key={mode.id} value={mode.id}>{mode.name}</option>)}</select></label>
          <div className="field-mission__move"><button className="btn btn-secondary" type="button" disabled={busy || index === 0} onClick={() => moveRound(index, -1)} aria-label={`Move round ${index + 1} earlier`}>↑</button>
            <button className="btn btn-secondary" type="button" disabled={busy || index === plan.rounds.length - 1} onClick={() => moveRound(index, 1)} aria-label={`Move round ${index + 1} later`}>↓</button></div>
        </li>)}</ol><button className="btn btn-primary" type="button" disabled={busy} onClick={publish}>Publish reviewed rotation</button>
      </div>}
    </section>
    <section className="field-tool__panel field-mission__panel" aria-labelledby="brief-title"><h2 id="brief-title">Referee briefing builder</h2>
      <p>The objective comes from the USAW library. Fill in round-specific rules before printing.</p>
      <form onSubmit={createBrief}><fieldset disabled={busy}>
        <label>Load a published round<select value={briefValues.round} onChange={event => selectRound(event.target.value)}><option value="">Start with a game mode</option>{library.recentGames.map(round => <option key={round.id} value={round.id}>{round.title} · {clock.format(new Date(round.startsAt))}</option>)}</select></label>
        <label>Game mode<select value={briefValues.modeId} onChange={event => editBrief('modeId', event.target.value)}>{library.modes.map(mode => <option key={mode.id} value={mode.id}>{mode.name}</option>)}</select></label>
        <DetailsFields values={briefValues} update={editBrief} />
        <label>Hit, revive, and respawn rules<textarea value={briefValues.respawns} maxLength={600} rows={3} placeholder="Staff to confirm for this round" onChange={event => editBrief('respawns', event.target.value)} /></label>
        <label>Winning condition<textarea value={briefValues.winCondition} maxLength={600} rows={2} placeholder="Staff to confirm for this round" onChange={event => editBrief('winCondition', event.target.value)} /></label>
        <button className="btn btn-primary" type="submit">Build briefing</button>
      </fieldset></form>
      {brief && <><Briefing brief={brief} /><button className="btn btn-secondary" type="button" onClick={printBrief}>Print briefing</button></>}
    </section><p className="field-mission__notice" role="status" aria-live="polite">{busy ? 'Working…' : notice}</p>
  </section>;
}
