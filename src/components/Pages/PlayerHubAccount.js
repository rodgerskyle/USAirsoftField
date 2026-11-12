import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { onValue } from 'firebase/database';

import { withFirebase } from '../Firebase';
import { getPlayerDisplayNames } from '../constants/playerDisplayNames';
import { prestigeCyclePoints, profileRank, usePlayerPrestige } from '../constants/playerPrestige';
import { teamPagePath, usePlayerTeam } from '../constants/teamDirectory';
import rankImages from '../constants/rankimgs';
import rankNames from '../constants/ranks';
import { PrestigeEmblem } from './PlayerPrestige';

const numberFormat = new Intl.NumberFormat('en-US');

function readText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function count(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function playerRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
  return {
    name: readText(record.name),
    username: readText(record.username),
    team: readText(record.team),
    renewal: readText(record.renewal),
    points: count(record.points),
    wins: count(record.wins),
    losses: count(record.losses),
  };
}

function usePlayerAccount(firebase) {
  const [account, setAccount] = useState(undefined);

  useEffect(() => {
    let stopRecord;
    let request;
    const stopAuth = firebase.auth.onAuthStateChanged(user => {
      stopRecord?.();
      request?.abort();
      if (!user) {
        setAccount(null);
        return;
      }

      request = new AbortController();
      const { signal } = request;
      const { uid } = user;
      setAccount({ uid, fallbackName: readText(user.displayName), loading: true });

      function update(fields) {
        if (signal.aborted || firebase.auth.currentUser?.uid !== uid) return;
        setAccount(previous => previous?.uid === uid ? { ...previous, ...fields } : previous);
      }

      stopRecord = onValue(firebase.user(uid), snapshot => {
        update({ record: playerRecord(snapshot.val()), loading: false });
      }, () => update({ record: null, loading: false }));
      getPlayerDisplayNames([uid], { signal })
        .then(names => update({ displayName: readText(names[uid]) }))
        .catch(() => {});
    });

    return () => {
      stopAuth();
      stopRecord?.();
      request?.abort();
    };
  }, [firebase]);

  // A transition between sessions must never display the previous player's card.
  return account && account.uid !== firebase.auth.currentUser?.uid ? undefined : account;
}

function PlayerCard({ account }) {
  const { record } = account;
  const { record: prestige } = usePlayerPrestige(account.uid);
  const { team } = usePlayerTeam(record ? account.uid : null, record?.team);
  const displayName = account.displayName || record?.username || record?.name || account.fallbackName || 'USAW player';
  const rank = record ? profileRank(prestigeCyclePoints(record.points, prestige)) : 0;
  const winRate = record && record.wins + record.losses > 0
    ? Math.ceil(record.wins / (record.wins + record.losses) * 100) : 0;

  return (
    <section className="ph-account ph-player-card" aria-labelledby="player-account-heading">
      <div className="ph-player-identity">
        {record && <span className="ph-player-emblem"><img src={rankImages[rank]} alt="" /></span>}
        <div>
          <p className="ph-kicker">Your player card</p>
          <h2 id="player-account-heading">{displayName}</h2>
          {record && <span className="ph-player-rank">{rankNames[rank]}</span>}
          {prestige?.prestigeCount > 0 && (
            <span className="ph-player-prestige">
              <PrestigeEmblem count={prestige.prestigeCount} />
              Prestige {numberFormat.format(prestige.prestigeCount)}
            </span>
          )}
        </div>
      </div>
      {record ? (
        <>
          <dl className="ph-player-stats">
            <div><dt>Points</dt><dd>{numberFormat.format(record.points)}</dd></div>
            <div className="ph-player-wins"><dt>Wins</dt><dd>{numberFormat.format(record.wins)}</dd></div>
            <div className="ph-player-losses"><dt>Losses</dt><dd>{numberFormat.format(record.losses)}</dd></div>
            <div><dt>Win rate</dt><dd>{winRate}%</dd></div>
          </dl>
          {(team || record.renewal) && (
            <dl className="ph-player-meta">
              {team && (
                <div>
                  <dt>Team</dt>
                  <dd>{team.source === 'companion' ? <Link to={teamPagePath(team)}>{team.name}</Link> : team.name}</dd>
                </div>
              )}
              {record.renewal && <div><dt>Membership renewal</dt><dd>{record.renewal}</dd></div>}
            </dl>
          )}
        </>
      ) : <p role="status">Your player stats are currently unavailable.</p>}
    </section>
  );
}

function PlayerHubAccount({ firebase }) {
  const account = usePlayerAccount(firebase);

  if (account === undefined || account?.loading) {
    return <section className="ph-account ph-account-loading" aria-label="Player account" role="status">Loading your player card…</section>;
  }
  if (account) return <PlayerCard account={account} />;

  return (
    <section className="ph-account" aria-labelledby="player-account-heading">
      <div>
        <p className="ph-kicker">USAW player account</p>
        <h2 id="player-account-heading">Your profile and membership</h2>
        <p>Sign in to see your USAW player card and stats.</p>
      </div>
      <Link className="ph-button ph-button-primary" to="/login">Sign in</Link>
    </section>
  );
}

export default withFirebase(PlayerHubAccount);
