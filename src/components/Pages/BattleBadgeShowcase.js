import React, { useContext, useEffect, useRef } from 'react';
import AuthUserContext from '../session/context';
import { bindBattleBadgeShowcase } from '../constants/battle-badge-showcase';
import { requestPlayerExperience } from '../constants/playerExperience';
import './BattleBadgeShowcase.css';

export default function BattleBadgeShowcase({ playerId }) {
  const host = useRef(null);
  const player = useContext(AuthUserContext);
  useEffect(() => {
    const controller = new AbortController();
    bindBattleBadgeShowcase(host.current, { playerId, request: requestPlayerExperience, signal: controller.signal });
    return () => controller.abort();
  }, [playerId]);
  return <section ref={host} className="battle-showcase" aria-label="US Airsoft World Battle Badges">
    <h2 className="battle-showcase__title">US Airsoft World Battle Badges</h2>
    <div data-battle-badge-progress="" />
    {player?.uid === playerId && playerId && <a className="battle-showcase__scan" href="https://app.usairsoftfield.com/#badge-scanner">
      Scan a physical Battle Badge
    </a>}
  </section>;
}
