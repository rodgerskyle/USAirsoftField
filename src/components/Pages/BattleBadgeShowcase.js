import React, { useEffect, useRef } from 'react';
import { bindBattleBadgeShowcase } from '../constants/battle-badge-showcase';
import { requestPlayerExperience } from '../constants/playerExperience';
import './BattleBadgeShowcase.css';

export default function BattleBadgeShowcase({ playerId }) {
  const host = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    bindBattleBadgeShowcase(host.current, { playerId, request: requestPlayerExperience, signal: controller.signal });
    return () => controller.abort();
  }, [playerId]);
  return <section ref={host} className="battle-showcase" aria-label="US Airsoft World Battle Badges">
    <h2 className="battle-showcase__title">US Airsoft World Battle Badges</h2>
    <div data-battle-badge-progress="" />
  </section>;
}
