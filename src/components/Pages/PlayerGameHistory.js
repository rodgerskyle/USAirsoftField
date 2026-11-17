import React, { useEffect, useRef } from 'react';
import { requestPlayerExperience } from '../constants/playerExperience';
import { bindGameLedger, gameLedgerMarkup } from '../constants/game-ledger';
import './GameLedger.css';

export default function PlayerGameHistory({ playerId }) {
  const host = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    host.current.innerHTML = gameLedgerMarkup();
    bindGameLedger(host.current, { playerId, request: requestPlayerExperience, signal: controller.signal });
    return () => controller.abort();
  }, [playerId]);
  return <section className="player-profile__panel" aria-label="Game history" ref={host} />;
}
