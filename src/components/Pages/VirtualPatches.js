import React, { useContext, useEffect, useRef, useState } from 'react';
import { child, get } from 'firebase/database';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { withFirebase } from '../Firebase';
import { AuthUserContext } from '../session';
import { WAIVER } from '../constants/roles';
import { BADGE_CATALOG, badgeById, getBadgeStandings, getMyBadges, getPatchLeaderboard } from '../constants/playerBadges';
import { getPlayerDisplayNames } from '../constants/playerDisplayNames';
import { PATCH_DIFFICULTIES } from '../constants/patchDifficulty';
import './VirtualPatches.css';

const STANDINGS_PAGE_SIZE = 25;
const formatCount = new Intl.NumberFormat('en-US');
const secretPatches = BADGE_CATALOG.filter(patch => patch.secret);
const secretPatchArt = `${process.env.PUBLIC_URL || ''}/badges/secret-achievement.png`;
const patchWalls = PATCH_DIFFICULTIES.map(tier => ({
  ...tier,
  patches: BADGE_CATALOG.filter(patch => patch.difficultyFactor === tier.factor),
}));

function patchDisplay(patch, earnedCount) {
  if (!patch.secret || earnedCount) return patch;
  const secretSlot = secretPatches.indexOf(patch) + 1;
  return {
    name: `Secret Achievement ${secretSlot}`,
    artUrl: secretPatchArt,
    description: 'Earn this patch to reveal its artwork and unlock condition.',
    secretSlot,
  };
}

function useOwnPatchCounts(firebase, memberId) {
  const [record, setRecord] = useState(null);

  useEffect(() => {
    if (!memberId) return undefined;
    const controller = new AbortController();
    getMyBadges(firebase, { signal: controller.signal }).then(({ awards }) => {
      if (controller.signal.aborted) return;
      const counts = Object.fromEntries(awards.map(award => [award.badgeId, award.earnedCount || 1]));
      setRecord({ memberId, counts });
    }).catch(() => {
      if (!controller.signal.aborted) setRecord(null);
    });
    return () => controller.abort();
  }, [firebase, memberId]);

  return record && record.memberId === memberId ? record.counts : null;
}

async function publicPlayerName(firebase, playerId) {
  async function read(field) {
    try {
      const value = (await get(child(firebase.user(playerId), field))).val();
      return typeof value === 'string' ? value.trim() : '';
    } catch {
      return '';
    }
  }

  return await read('username') || await read('name') || 'USAW player';
}

async function standingsPage(badgeId, firebase, page, signal) {
  if (!badgeId) {
    const { standings, hasMore } = await getPatchLeaderboard({ page, signal });
    const players = standings.map(({ playerId, name, rank, totalPatches }) => ({
      playerId,
      name: typeof name === 'string' && name.trim() ? name.trim() : 'USAW player',
      rank,
      earnedCount: totalPatches,
    }));
    return { players, hasMore };
  }

  const { standings, hasMore } = await getBadgeStandings(badgeId, { page, signal });
  if (signal.aborted) return null;
  const displayNames = standings.length
    ? await getPlayerDisplayNames(standings.map(({ playerId }) => playerId), { signal }).catch(() => ({}))
    : {};
  if (signal.aborted) return null;
  const players = await Promise.all(standings.map(async ({ playerId, earnedCount }, index) => ({
    playerId,
    earnedCount,
    rank: (page - 1) * STANDINGS_PAGE_SIZE + index + 1,
    name: typeof displayNames[playerId] === 'string' ? displayNames[playerId] : await publicPlayerName(firebase, playerId),
  })));
  return { players, hasMore };
}

function PatchStandings({ badge, firebase, overallHeading }) {
  const badgeId = badge?.id;
  const overall = !badgeId;
  const titleId = overall ? 'virtual-patch-overall-title' : 'virtual-patch-standings-title';
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const visible = result?.page === page && result.attempt === attempt ? result : null;

  useEffect(() => {
    const controller = new AbortController();
    standingsPage(badgeId, firebase, page, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ page, attempt, ...data });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ page, attempt, error: true });
    });
    return () => controller.abort();
  }, [attempt, badgeId, firebase, page]);

  return (
    <div className="virtual-patches__standings" aria-busy={!visible}>
      {overall ? (
        <>
          <h2 id={titleId} tabIndex={-1} ref={overallHeading}>Overall patch leaderboard</h2>
          <p className="virtual-patches__standings-intro">All-time totals include repeat awards.</p>
        </>
      ) : <h3 id={titleId}>All-time leaderboard</h3>}
      {!visible ? (
        <p className="virtual-patches__notice" role="status">Loading standings…</p>
      ) : visible.error ? (
        <div className="virtual-patches__notice">
          <p role="alert">Patch standings are temporarily unavailable.</p>
          <button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button>
        </div>
      ) : visible.players.length === 0 ? (
        <p className="virtual-patches__notice">
          {page > 1 ? 'No players on this page.' : overall ? 'No patches have been earned yet.' : 'No players have earned this patch yet.'}
        </p>
      ) : (
        <table className="virtual-patches__table" aria-labelledby={titleId}>
          <thead>
            <tr>
              <th scope="col">Place</th>
              <th scope="col">Player</th>
              <th scope="col">{overall ? 'Total patches' : 'Times earned'}</th>
            </tr>
          </thead>
          <tbody>
            {visible.players.map(({ playerId, name, earnedCount, rank }) => (
              <tr key={playerId}>
                <td>{formatCount.format(rank)}</td>
                <th scope="row"><Link to={`/profilelookup/${encodeURIComponent(playerId)}`}>{name}</Link></th>
                <td>{formatCount.format(earnedCount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {(page > 1 || visible?.hasMore) && (
        <nav className="virtual-patches__pagination" aria-label={overall ? 'Overall patch leaderboard pages' : 'Badge leaderboard pages'}>
          <button type="button" onClick={() => setPage(value => value - 1)} disabled={page === 1}>
            <FontAwesomeIcon icon={faChevronLeft} aria-hidden="true" /> Previous
          </button>
          <span aria-live="polite">Page {formatCount.format(page)}</span>
          <button type="button" onClick={() => setPage(value => value + 1)} disabled={!visible?.hasMore}>
            Next <FontAwesomeIcon icon={faChevronRight} aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}

function VirtualPatches({ firebase }) {
  const authUser = useContext(AuthUserContext);
  const [params, setParams] = useSearchParams();
  const [difficulty, setDifficulty] = useState('');
  const overall = params.get('view') === 'leaderboard';
  const catalogParams = new URLSearchParams(params);
  catalogParams.delete('view');
  const standingsParams = new URLSearchParams(catalogParams);
  standingsParams.set('view', 'leaderboard');
  const requestedBadge = badgeById[params.get('badge')] || secretPatches[Number(params.get('secret')) - 1];
  const badge = requestedBadge || BADGE_CATALOG[0];
  const waiverOnly = Boolean(authUser?.roles?.[WAIVER]);
  const memberId = waiverOnly ? null : authUser?.uid;
  const counts = useOwnPatchCounts(firebase, overall ? null : memberId);
  const displayedBadge = patchDisplay(badge, counts?.[badge.id]);
  const detailHeading = useRef(null);
  const catalogHeading = useRef(null);
  const overallHeading = useRef(null);
  const walls = difficulty ? patchWalls.filter(wall => String(wall.factor) === difficulty) : patchWalls;

  useEffect(() => {
    if (overall) overallHeading.current?.focus();
    else if (requestedBadge) detailHeading.current?.focus();
  }, [overall, requestedBadge]);

  function selectPatch(patch, secretSlot) {
    if (requestedBadge === patch) detailHeading.current?.focus();
    else if (secretSlot) setParams({ secret: secretSlot });
    else setParams({ badge: patch.id });
  }

  return (
    <main className="virtual-patches" aria-labelledby="virtual-patches-title">
      <Helmet>
        <title>Virtual Patches | US Airsoft World</title>
        <meta name="description" content="Explore the USAW virtual patch collection and see each award's standings or the overall patch leaderboard." />
      </Helmet>
      <header className="virtual-patches__hero">
        <div className="virtual-patches__wrap">
          <Link className="virtual-patches__back" to={waiverOnly ? '/dashboard' : '/player-hub'}>
            <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /> {waiverOnly ? 'Dashboard' : 'Player Hub'}
          </Link>
          <h1 id="virtual-patches-title">Virtual Patches</h1>
          <p>Explore award criteria, individual patch standings, and the overall patch leaderboard.</p>
          <p className="virtual-patches__membership">
            Anyone can browse. An active USAW membership is required to earn patches.{' '}
            <Link to="/pricing?section=membership">See membership pricing</Link>
          </p>
        </div>
      </header>
      <div className="virtual-patches__wrap virtual-patches__content">
        <nav className="virtual-patches__views" aria-label="Virtual Patches views">
          <Link to={{ search: catalogParams.toString() }} aria-current={overall ? undefined : 'page'}>Patch collection</Link>
          <Link to={{ search: standingsParams.toString() }} aria-current={overall ? 'page' : undefined}>Overall patch leaderboard</Link>
        </nav>
        {overall ? (
          <section className="virtual-patches__detail virtual-patches__overall" aria-labelledby="virtual-patch-overall-title">
            <PatchStandings key="overall" overallHeading={overallHeading} />
          </section>
        ) : (
          <>
            <section aria-labelledby="virtual-patch-catalog">
              <div className="virtual-patches__catalog-heading">
                <h2 id="virtual-patch-catalog" tabIndex={-1} ref={catalogHeading}>Patch collection</h2>
                {memberId && <Link className="virtual-patches__return" to="/account?section=badges">Manage featured badge</Link>}
                <label className="virtual-patches__difficulty-filter">
                  Prestige difficulty
                  <select value={difficulty} onChange={event => setDifficulty(event.target.value)}>
                    <option value="">All difficulty levels</option>
                    {PATCH_DIFFICULTIES.map(tier => (
                      <option key={tier.factor} value={tier.factor}>Factor {tier.factor} · {tier.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="virtual-patches__walls">
                {walls.map(({ factor, name, patches }) => (
                  <section className="virtual-patches__board" key={factor} data-factor={factor}
                    aria-labelledby={`virtual-patch-factor-${factor}`}>
                    <header className="virtual-patches__board-heading">
                      <h3 id={`virtual-patch-factor-${factor}`}>Factor {factor} · {name}</h3>
                      <span>{formatCount.format(patches.length)} {patches.length === 1 ? 'patch' : 'patches'}</span>
                    </header>
                    <ul className="virtual-patches__wall">
                      {patches.map(patch => {
                        const count = counts?.[patch.id];
                        const display = patchDisplay(patch, count);
                        return (
                          <li key={patch.id}>
                            <button className="virtual-patches__tile" type="button" aria-pressed={badge.id === patch.id}
                              aria-controls="virtual-patch-detail" onClick={() => selectPatch(patch, display.secretSlot)}>
                              <img src={display.artUrl} alt="" width="144" height="144" loading="lazy" decoding="async" />
                              <strong>{display.name}</strong>
                              {counts && (
                                <span className="virtual-patches__personal-count" data-earned={Boolean(count)}>
                                  {count ? `Earned ×${formatCount.format(count)}` : 'Not yet earned'}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            </section>
            <section className="virtual-patches__detail" id="virtual-patch-detail" aria-labelledby="virtual-patch-detail-title">
              <header className="virtual-patches__brief">
                <img src={displayedBadge.artUrl} alt="" width="144" height="144" decoding="async" />
                <div>
                  <h2 id="virtual-patch-detail-title" tabIndex={-1} ref={detailHeading}>{displayedBadge.name}</h2>
                  <p className="virtual-patches__difficulty">Factor {badge.difficultyFactor} · {badge.difficultyName}</p>
                  <p>{displayedBadge.description}</p>
                </div>
              </header>
              {!displayedBadge.secretSlot && <PatchStandings key={badge.id} badge={badge} firebase={firebase} />}
              <button className="virtual-patches__return" type="button" onClick={() => catalogHeading.current?.focus()}>
                Back to patch collection
              </button>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default withFirebase(VirtualPatches);
