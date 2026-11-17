import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { badgeById } from '../constants/playerBadges';
import { milestoneDate, playerCount, playerIdPattern, requestPlayerExperience } from '../constants/playerExperience';
import { PrestigeEmblem } from './PlayerPrestige';
import './PlayerExperience.css';

export default function PlayerMilestones({ playerId, embedded = false }) {
  const { id: routeId } = useParams();
  const id = playerId || routeId || '';
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const operation = useRef(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!playerIdPattern.test(id)) return undefined;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError('');
    setRecord(null);
    requestPlayerExperience('/api/player-milestones?' + new URLSearchParams({ id }), controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if (data.player?.id !== id || !Array.isArray(data.items)) throw new Error('The player milestones could not be verified.');
      setRecord(data);
    }).catch(failure => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) { setBusy(false); operation.current = null; } });
    return () => controller.abort();
  }, [id, reload]);

  useEffect(() => () => operation.current?.abort(), []);
  async function earlier() {
    if (operation.current || record?.player.id !== id || !record.nextCursor) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError('');
    try {
      const data = await requestPlayerExperience('/api/player-milestones?' + new URLSearchParams({ id, cursor: record.nextCursor }), controller.signal);
      if (controller.signal.aborted) return;
      if (data.player?.id !== id || !Array.isArray(data.items)) throw new Error('The milestone page could not be verified.');
      setRecord(previous => ({ ...data, items: [...new Map([...previous.items, ...data.items].map(item => [item.id, item])).values()] }));
    } catch (failure) { if (!controller.signal.aborted) setError(failure.message); }
    finally { if (!controller.signal.aborted) { operation.current = null; setBusy(false); } }
  }
  const current = record?.player.id === id ? record : null;
  const Wrapper = embedded ? 'section' : 'main';
  const Heading = embedded ? 'h2' : 'h1';
  return (
    <Wrapper className={`player-experience player-milestones${embedded ? ' player-profile__panel' : ' player-experience-page'}`} aria-busy={busy}>
      {!embedded && <Helmet><title>Player Milestones | US Airsoft Field</title></Helmet>}
      <header className="player-experience__heading"><div><p>USAW player history</p><Heading>Player milestones</Heading></div>
        <Link to={'/player-comparison?left=' + encodeURIComponent(id)}>Compare player</Link></header>
      {!playerIdPattern.test(id) && <p>Choose a player from the leaderboard to view recorded milestones.</p>}
      {busy && !current && <p role="status">Loading recorded milestones…</p>}
      {current && <>
        <div className="player-milestones__current">
          <div>{current.player.prestigeCount > 0 && <PrestigeEmblem count={current.player.prestigeCount} />}<p>Current milestones</p><h3>{current.player.name}</h3><span>{current.player.rankName}{current.player.prestigeCount > 0 && ` · Prestige ${current.player.prestigeCount}`}</span></div>
          <dl><div><dt>Career points</dt><dd>{playerCount(current.player.points)}</dd></div><div><dt>Patches earned</dt><dd>{playerCount(current.player.patchesEarned)}</dd></div></dl>
          {!embedded && <Link to={'/profilelookup/' + encodeURIComponent(id)}>Player profile</Link>}
        </div>
        <p className="player-experience__note">{current.historyNote}</p>
        {current.items.length ? <ol className="player-milestones__list">{current.items.map(item => (
          <li key={item.id}>
            <span className="player-milestones__marker" aria-hidden="true">{badgeById[item.badgeId] ? <img src={badgeById[item.badgeId].thumbUrl} alt="" width="56" height="56" loading="lazy" /> : item.type === 'prestige' ? '★' : item.type === 'team' ? '◆' : '●'}</span>
            <div><time dateTime={item.date}>{milestoneDate(item.date)}</time><h3>{item.title}</h3><p>{item.detail}</p></div>
          </li>
        ))}</ol> : <p>Recorded milestones will appear as you play and earn awards.</p>}
        {current.nextCursor && <button type="button" className="player-experience__button" disabled={busy} onClick={earlier}>{busy ? 'Loading…' : 'Load earlier milestones'}</button>}
      </>}
      {error && <div role="alert"><p>{error}</p><button className="player-experience__button" type="button" disabled={busy} onClick={() => current ? earlier() : setReload(value => value + 1)}>Try again</button></div>}
    </Wrapper>
  );
}
