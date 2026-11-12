import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { onValue } from 'firebase/database';
import { getDownloadURL } from 'firebase/storage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faChevronRight, faPeopleGroup } from '@fortawesome/free-solid-svg-icons';

import defaultProfile from '../../assets/default.png';
import rankImages from '../constants/rankimgs';
import rankNames from '../constants/ranks';
import rankIncrements from '../constants/rankincrements';
import * as ROLES from '../constants/roles';
import { badgeById, getFeaturedBadges, getMyBadges, setFeaturedBadge } from '../constants/playerBadges';
import SharePageLink from '../constants/SharePageLink';
import PlayerBadgeCollection from './PlayerBadgeCollection';
import './PlayerProfileView.css';

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'progression', label: 'Progression' },
  { id: 'game-feed', label: 'Game feed' },
];

const numberFormat = new Intl.NumberFormat('en-US');
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function getBadge(id) {
  const badge = badgeById[id];
  return badge?.id === id ? badge : undefined;
}

function useProfileBadges(firebase, playerId, account, eligible) {
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const request = useRef(null);

  useEffect(() => {
    if (!eligible || !playerId) return undefined;
    const controller = new AbortController();
    request.current = controller;
    const options = { signal: controller.signal };
    const result = account
      ? getMyBadges(firebase, options)
      : getFeaturedBadges([playerId], options).then((featured) => ({ featuredBadgeId: featured[playerId] }));
    result.then((data) => {
      if (!controller.signal.aborted) setRecord(data);
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(failure.message || 'Badge information is temporarily unavailable.');
    });
    return () => controller.abort();
  }, [account, attempt, eligible, firebase, playerId]);

  function retry() {
    setError('');
    setRecord(null);
    setFeedback(null);
    setAttempt((value) => value + 1);
  }

  async function chooseBadge(badgeId) {
    const current = request.current;
    if (!account || !eligible || !current || current.signal.aborted || saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const { featuredBadgeId } = await setFeaturedBadge(firebase, badgeId);
      if (current.signal.aborted) return;
      setRecord((previous) => ({ ...previous, featuredBadgeId }));
      setFeedback({ message: featuredBadgeId ? 'Featured badge updated.' : 'Featured badge removed.' });
    } catch (failure) {
      if (!current.signal.aborted) {
        setFeedback({ error: true, message: failure.message || 'Could not save your selection. Try again.' });
      }
    } finally {
      if (!current.signal.aborted) setSaving(false);
    }
  }

  return { record, error, feedback, saving, retry, chooseBadge };
}

function count(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getGameDays(games) {
  return Object.entries(games || {}).map(([key, day]) => {
    const [year, month, date] = key.split('-').map(Number);
    // The match record stores the zero-based month from Date#getMonth.
    const time = Date.UTC(year, month, date);
    const wins = count(day?.wins);
    const losses = count(day?.losses);

    return {
      key,
      time,
      date: Number.isFinite(time) ? dateFormat.format(time) : key,
      wins,
      losses,
      points: wins * 10 + losses * 3,
    };
  }).sort((first, second) => (second.time || 0) - (first.time || 0));
}

function useProfileImage(firebase, playerId, hasProfilePicture) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (!hasProfilePicture || !playerId) return undefined;

    let active = true;
    getDownloadURL(firebase.pictures(`${playerId}/profilepic.png`))
      .then((url) => { if (active) setImage({ playerId, url }); })
      .catch(() => { if (active) setImage(null); });

    return () => { active = false; };
  }, [firebase, playerId, hasProfilePicture]);

  return hasProfilePicture && image?.playerId === playerId ? image.url : defaultProfile;
}

function ProfileTeamCard({ firebase, team }) {
  const teamId = team.toLowerCase();
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');

  useEffect(() => {
    if (/[.#$[\]/]/.test(teamId)) return undefined;
    let active = true;
    const unsubscribe = onValue(firebase.team(teamId), (snapshot) => {
      const teamName = snapshot.val()?.name;
      if (active) setName(typeof teamName === 'string' ? teamName.trim() : '');
    }, () => { if (active) setName(''); });

    getDownloadURL(firebase.teamsPictures(`${teamId}.png`))
      .then((url) => { if (active) setLogo(url); })
      .catch(() => { if (active) setLogo(''); });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [firebase, teamId]);

  return (
    <Link className="player-profile__team-card" to={`/teams/${encodeURIComponent(team)}`}>
      <span className="player-profile__team-logo">
        {logo ? <img src={logo} alt="" decoding="async" onError={() => setLogo('')} />
          : <FontAwesomeIcon icon={faPeopleGroup} aria-hidden="true" />}
      </span>
      <span>
        <span className="player-profile__label">Team</span>
        <strong>{name || team}</strong>
      </span>
      <FontAwesomeIcon className="player-profile__team-arrow" icon={faChevronRight} aria-hidden="true" />
    </Link>
  );
}

export function ProfileState({ loading, missing }) {
  return (
    <main className="player-profile">
      <div className="player-profile__wrap player-profile__body">
        <section className="player-profile__panel player-profile__state" role={loading ? 'status' : undefined}>
          <h1>{loading ? 'Loading player profile…' : missing ? 'Player profile not found' : 'Player profile unavailable'}</h1>
          {!loading && (
            <Link className="player-profile__link" to="/leaderboard">
              <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /> Back to leaderboard
            </Link>
          )}
        </section>
      </div>
    </main>
  );
}

function RankProgress({ points, rank }) {
  const next = rank + 1;
  const hasNextRank = next < rankNames.length;
  const needed = hasNextRank ? rankIncrements[next] - points : 0;
  const progress = hasNextRank
    ? Math.max(0, (points - rankIncrements[rank]) / (rankIncrements[next] - rankIncrements[rank]) * 100)
    : 100;

  return (
    <section className="player-profile__panel">
      <div className="player-profile__panel-header">
        <div>
          <p className="player-profile__label">{hasNextRank ? 'Next rank' : 'Highest rank'}</p>
          <h2>{rankNames[hasNextRank ? next : rank]}</h2>
        </div>
        <img className="player-profile__progress-emblem" src={rankImages[hasNextRank ? next : rank]} alt="" />
      </div>
      <progress className="player-profile__progress" value={progress} max="100" aria-label="Rank progress" />
      <div className="player-profile__progress-caption">
        <span>{Math.round(progress)}% complete</span>
        <span>{hasNextRank ? `${numberFormat.format(needed)} points to go` : 'Maximum rank reached'}</span>
      </div>
    </section>
  );
}

function RankGroup({ title, start, end, currentRank }) {
  return (
    <section className="player-profile__panel">
      <h2>{title}</h2>
      <ol className="player-profile__rank-list" start={start + 1}>
        {rankNames.slice(start, end).map((name, offset) => {
          const index = start + offset;
          return (
            <li key={name} aria-current={index === currentRank ? 'true' : undefined}>
              <img src={rankImages[index]} alt="" loading="lazy" />
              <strong>{name}</strong>
              <span>{numberFormat.format(rankIncrements[index])} points</span>
              {index === currentRank && <span className="player-profile__current-rank">Current rank</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function GameFeed({ games }) {
  const days = getGameDays(games);
  const earned = days.reduce((total, day) => total + day.points, 0);

  return (
    <section className="player-profile__panel">
      <div className="player-profile__panel-header">
        <h2>Game feed</h2>
        {days.length > 0 && (
          <p className="player-profile__muted">
            {numberFormat.format(days.length)} {days.length === 1 ? 'game day' : 'game days'} · {numberFormat.format(earned)} points earned
          </p>
        )}
      </div>
      {days.length ? (
        <div className="player-profile__table-wrap">
          <table className="player-profile__table" aria-label="Game history">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Wins</th>
                <th scope="col">Losses</th>
                <th scope="col">Points</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.key}>
                  <th scope="row">{day.date}</th>
                  <td>{numberFormat.format(day.wins)}</td>
                  <td>{numberFormat.format(day.losses)}</td>
                  <td>{numberFormat.format(day.points)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="player-profile__empty">Game results will appear here after they’re recorded.</p>}
    </section>
  );
}

export default function PlayerProfileView({ firebase, user, playerId, account = false }) {
  const [section, setSection] = useState('overview');
  const profileImage = useProfileImage(firebase, playerId, user.profilepic);
  const badgeEligible = !user.roles?.[ROLES.WAIVER];
  const canManageBadges = account && badgeEligible;
  const badges = useProfileBadges(firebase, playerId, canManageBadges, badgeEligible);
  const featuredBadge = getBadge(badges.record?.featuredBadgeId);
  const profileSections = canManageBadges ? [...sections, { id: 'badges', label: 'Badges' }] : sections;
  const displayName = user.username || user.name || 'USAW player';
  const team = typeof user.team === 'string' ? user.team.trim() : '';
  const points = count(user.points);
  const wins = count(user.wins);
  const losses = count(user.losses);
  const winRate = wins + losses > 0 ? Math.ceil(wins / (wins + losses) * 100) : 0;
  const nextRank = rankIncrements.findIndex((threshold) => points < threshold);
  const rank = nextRank === -1 ? rankNames.length - 1 : Math.max(0, nextRank - 1);
  const stats = [
    ['Points', points],
    ['Wins', wins],
    ['Losses', losses],
    ['Win rate', `${winRate}%`],
    ['Free games', count(user.freegames)],
  ];
  const title = account ? 'US Airsoft Field: Account' : `US Airsoft Field: ${displayName} Profile`;

  return (
    <main className="player-profile" aria-labelledby="player-profile-title">
      <Helmet>
        <title>{title}</title>
        {!account && <meta property="og:title" content={title} />}
        {!account && <meta property="og:image" content={profileImage} />}
      </Helmet>
      <header className="player-profile__hero">
        <div className="player-profile__wrap">
          <nav className="player-profile__hero-nav" aria-label="Profile links">
            <Link className="player-profile__link" to="/leaderboard">
              <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /> Leaderboard
            </Link>
            {account && !user.roles?.[ROLES.WAIVER] && (
              <Link className="player-profile__link" to="/profilesettings">Profile settings</Link>
            )}
            {!account && (
              <SharePageLink className="player-profile__link" title={title} label="Share profile" />
            )}
          </nav>
          <div className="player-profile__hero-grid">
            <img className="player-profile__avatar" src={profileImage} alt="" />
            <div className="player-profile__identity">
              <p className="player-profile__label">{account ? 'My profile' : 'Player profile'}</p>
              <h1 id="player-profile-title">{displayName}</h1>
              {user.name && user.name !== displayName && <p className="player-profile__real-name">{user.name}</p>}
              {team && <ProfileTeamCard key={team} firebase={firebase} team={team} />}
              {(!team || user.renewal) && (
                <dl className="player-profile__metadata">
                  {!team && <div><dt>Team</dt><dd>Unaffiliated</dd></div>}
                  {user.renewal && <div><dt>Renewal</dt><dd>{user.renewal}</dd></div>}
                </dl>
              )}
            </div>
            <div className="player-profile__honors">
              <div className="player-profile__rank">
                <img src={rankImages[rank]} alt="" />
                <div>
                  <p className="player-profile__label">Current rank</p>
                  <strong>{rankNames[rank]}</strong>
                </div>
              </div>
              {featuredBadge && (
                <div className="player-profile__featured-badge">
                  <img src={featuredBadge.artUrl} alt="" width="68" height="68" decoding="async" />
                  <div>
                    <p className="player-profile__label">Featured badge</p>
                    <strong>{featuredBadge.name}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="player-profile__wrap player-profile__body">
        <div
          className={`player-profile__sections${canManageBadges ? ' player-profile__sections--with-badges' : ''}`}
          role="group"
          aria-label="Profile sections"
        >
          {profileSections.map(({ id, label }) => (
            <button key={id} type="button" aria-pressed={section === id} onClick={() => setSection(id)}>
              {label}
            </button>
          ))}
        </div>
        {section === 'overview' && (
          <div className="player-profile__overview">
            <section className="player-profile__panel">
              <h2>Game record</h2>
              <dl className="player-profile__stats">
                {stats.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{typeof value === 'number' ? numberFormat.format(value) : value}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <RankProgress points={points} rank={rank} />
          </div>
        )}
        {section === 'progression' && (
          <div className="player-profile__panels">
            <RankProgress points={points} rank={rank} />
            <RankGroup title="Enlisted ranks" start={0} end={12} currentRank={rank} />
            <RankGroup title="Officer ranks" start={12} end={rankNames.length} currentRank={rank} />
          </div>
        )}
        {section === 'game-feed' && <GameFeed games={user.games} />}
        {section === 'badges' && canManageBadges && (
          <PlayerBadgeCollection
            awards={badges.record?.awards || []}
            featuredBadgeId={featuredBadge?.id}
            getBadge={getBadge}
            loading={!badges.record && !badges.error}
            error={badges.error}
            onRetry={badges.retry}
            onFeature={badges.chooseBadge}
            saving={badges.saving}
            feedback={badges.feedback}
          />
        )}
      </div>
    </main>
  );
}
