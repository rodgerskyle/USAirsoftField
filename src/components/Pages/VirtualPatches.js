import React, { useContext, useEffect, useRef, useState } from 'react';
import { child, get } from 'firebase/database';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { withFirebase } from '../Firebase';
import { AuthUserContext } from '../session';
import { WAIVER } from '../constants/roles';
import { BADGE_CATALOG, badgeById, getBadgeStandings, getMyBadges } from '../constants/playerBadges';
import { getPlayerDisplayNames } from '../constants/playerDisplayNames';
import './VirtualPatches.css';

const STANDINGS_PAGE_SIZE = 25;
const formatCount = new Intl.NumberFormat('en-US');
const secretPatches = BADGE_CATALOG.filter(patch => patch.secret);
const secretPatchArt = `${process.env.PUBLIC_URL || ''}/badges/secret-achievement.png`;

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

function PatchStandings({ badge, firebase }) {
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const visible = result?.page === page && result.attempt === attempt ? result : null;

  useEffect(() => {
    const controller = new AbortController();
    getBadgeStandings(badge.id, { page, signal: controller.signal }).then(async ({ standings, hasMore }) => {
      if (controller.signal.aborted) return;
      const displayNames = standings.length
        ? await getPlayerDisplayNames(standings.map(({ playerId }) => playerId), { signal: controller.signal })
          .catch(() => ({}))
        : {};
      if (controller.signal.aborted) return;
      const players = await Promise.all(standings.map(async player => {
        const alias = displayNames[player.playerId];
        return {
          ...player,
          name: typeof alias === 'string' ? alias : await publicPlayerName(firebase, player.playerId),
        };
      }));
      if (!controller.signal.aborted) setResult({ page, attempt, players, hasMore });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ page, attempt, error: true });
    });
    return () => controller.abort();
  }, [attempt, badge.id, firebase, page]);

  return (
    <div className="virtual-patches__standings" aria-busy={!visible}>
      <h3 id="virtual-patch-standings-title">All-time leaderboard</h3>
      {!visible ? (
        <p className="virtual-patches__notice" role="status">Loading standings…</p>
      ) : visible.error ? (
        <div className="virtual-patches__notice">
          <p role="alert">Patch standings are temporarily unavailable.</p>
          <button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button>
        </div>
      ) : visible.players.length === 0 ? (
        <p className="virtual-patches__notice">
          {page === 1 ? 'No players have earned this patch yet.' : 'No players on this page.'}
        </p>
      ) : (
        <table className="virtual-patches__table" aria-labelledby="virtual-patch-standings-title">
          <thead>
            <tr>
              <th scope="col">Place</th>
              <th scope="col">Player</th>
              <th scope="col">Times earned</th>
            </tr>
          </thead>
          <tbody>
            {visible.players.map(({ playerId, name, earnedCount }, index) => (
              <tr key={playerId}>
                <td>{formatCount.format((page - 1) * STANDINGS_PAGE_SIZE + index + 1)}</td>
                <th scope="row"><Link to={`/profilelookup/${encodeURIComponent(playerId)}`}>{name}</Link></th>
                <td>{formatCount.format(earnedCount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {(page > 1 || visible?.hasMore) && (
        <nav className="virtual-patches__pagination" aria-label="Badge leaderboard pages">
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
  const requestedBadge = badgeById[params.get('badge')] || secretPatches[Number(params.get('secret')) - 1];
  const badge = requestedBadge || BADGE_CATALOG[0];
  const waiverOnly = Boolean(authUser?.roles?.[WAIVER]);
  const memberId = waiverOnly ? null : authUser?.uid;
  const counts = useOwnPatchCounts(firebase, memberId);
  const displayedBadge = patchDisplay(badge, counts?.[badge.id]);
  const detailHeading = useRef(null);
  const catalogHeading = useRef(null);

  useEffect(() => {
    if (requestedBadge) detailHeading.current?.focus();
  }, [requestedBadge]);

  return (
    <main className="virtual-patches" aria-labelledby="virtual-patches-title">
      <Helmet>
        <title>Virtual Patches | US Airsoft World</title>
        <meta name="description" content="Explore the USAW virtual patch collection and see the all-time leaderboard for each award." />
      </Helmet>
      <header className="virtual-patches__hero">
        <div className="virtual-patches__wrap">
          <Link className="virtual-patches__back" to={waiverOnly ? '/dashboard' : '/player-hub'}>
            <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /> {waiverOnly ? 'Dashboard' : 'Player Hub'}
          </Link>
          <h1 id="virtual-patches-title">Virtual Patches</h1>
          <p>Select a patch for its award criteria and all-time standings.</p>
          <p className="virtual-patches__membership">
            Anyone can browse. An active USAW membership is required to earn patches.{' '}
            <Link to="/pricing?section=membership">See membership pricing</Link>
          </p>
        </div>
      </header>
      <div className="virtual-patches__wrap virtual-patches__content">
        <section aria-labelledby="virtual-patch-catalog">
          <div className="virtual-patches__catalog-heading">
            <h2 id="virtual-patch-catalog" tabIndex={-1} ref={catalogHeading}>Patch collection</h2>
            {memberId && <Link className="virtual-patches__return" to="/account?section=badges">Manage featured badge</Link>}
          </div>
          <ul className="virtual-patches__wall">
            {BADGE_CATALOG.map(patch => {
              const display = patchDisplay(patch, counts?.[patch.id]);
              return (
                <li key={patch.id}>
                  <button className="virtual-patches__tile" type="button" aria-pressed={badge.id === patch.id}
                    aria-controls="virtual-patch-detail"
                    onClick={() => {
                      if (requestedBadge === patch) detailHeading.current?.focus();
                      else if (display.secretSlot) setParams({ secret: display.secretSlot });
                      else setParams({ badge: patch.id });
                    }}>
                    <img src={display.artUrl} alt="" width="144" height="144" loading="lazy" decoding="async" />
                    <strong>{display.name}</strong>
                    {counts && (
                      <span className="virtual-patches__personal-count" data-earned={Boolean(counts[patch.id])}>
                        {counts[patch.id] ? `Earned ×${formatCount.format(counts[patch.id])}` : 'Not yet earned'}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="virtual-patches__detail" id="virtual-patch-detail" aria-labelledby="virtual-patch-detail-title">
          <header className="virtual-patches__brief">
            <img src={displayedBadge.artUrl} alt="" width="144" height="144" decoding="async" />
            <div>
              <h2 id="virtual-patch-detail-title" tabIndex={-1} ref={detailHeading}>{displayedBadge.name}</h2>
              <p>{displayedBadge.description}</p>
            </div>
          </header>
          {!displayedBadge.secretSlot && <PatchStandings key={badge.id} badge={badge} firebase={firebase} />}
          <button className="virtual-patches__return" type="button" onClick={() => catalogHeading.current?.focus()}>
            Back to patch collection
          </button>
        </section>
      </div>
    </main>
  );
}

export default withFirebase(VirtualPatches);
