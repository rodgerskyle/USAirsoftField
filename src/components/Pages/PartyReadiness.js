import React, { useState } from 'react';
import WaiverStatus from './WaiverStatus';
import './PartyReadiness.css';

const companion = 'https://app.usairsoftfield.com';
export const validPartyToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export function partyChecklistLink(role, token) {
  if (!['guest', 'organizer'].includes(role) || !validPartyToken(token)) return null;
  return `${companion}/#group-check-in/${role}/${token}`;
}

export function PartyReadinessSummary({ readiness }) {
  if (!readiness) return null;
  const { ready, expected, unlisted, rentalsRequested } = readiness;
  return <section className="party-readiness-summary" aria-label="Party readiness before arrival">
    <h3>Ready before arrival</h3>
    <p><strong>{ready} of {expected} ready</strong></p>
    <p>Ready means the player has a verified waiver and has answered the rental question.</p>
    {!!unlisted && <p>{unlisted} expected {unlisted === 1 ? 'player still needs' : 'players still need'} a roster entry.</p>}
    <p>{rentalsRequested} {rentalsRequested === 1 ? 'player has' : 'players have'} requested rental gear.</p>
  </section>;
}

export function PartyEntryReadiness({ preparation }) {
  if (!preparation) return null;
  return <div className="party-entry-readiness">
    <WaiverStatus status={preparation.waiverStatus} />
    <span>{preparation.rentalIntent === 'requested' ? 'Rental gear requested' :
      preparation.rentalIntent === 'bringing' ? 'Bringing own gear' : 'Rental choice needed'}</span>
  </div>;
}

export function CopyPartyLink({ url, label, context = '' }) {
  const [copied, setCopied] = useState(null);
  if (!url) return null;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied({ url, ok: true });
    } catch {
      setCopied({ url, ok: false });
    }
  }
  return <div className="party-copy-link"><button type="button" className="ph-button" onClick={copy}>{label}<span className="visually-hidden">{context && ` for ${context}`}</span></button>
    {copied?.url === url && (copied.ok ? <span role="status">Link copied.</span> : <label>Copy this private link<input readOnly value={url} onFocus={event => event.target.select()} /></label>)}
  </div>;
}
