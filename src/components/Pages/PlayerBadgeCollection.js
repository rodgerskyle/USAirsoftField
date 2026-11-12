import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';

const awardDateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles',
});
const countFormat = new Intl.NumberFormat('en-US');

function FeatureBadgeControl({ badges, featuredBadgeId, onFeature, saving }) {
  const currentBadgeId = featuredBadgeId || '';
  const [selection, setSelection] = useState(currentBadgeId);

  function submit(event) {
    event.preventDefault();
    if (!saving && selection !== currentBadgeId) onFeature(selection || null);
  }

  return (
    <form className="player-profile__badge-picker" onSubmit={submit}>
      <label htmlFor="featured-badge-select">Featured badge</label>
      <p id="featured-badge-help">Your selection appears on your public profile and next to your rank on the leaderboard.</p>
      <div className="player-profile__badge-controls">
        <select
          id="featured-badge-select"
          value={selection}
          onChange={(event) => setSelection(event.target.value)}
          aria-describedby="featured-badge-help"
          disabled={saving}
        >
          <option value="">No featured badge</option>
          {badges.map(({ badge }) => <option key={badge.id} value={badge.id}>{badge.name}</option>)}
        </select>
        <button type="submit" className="player-profile__badge-save" disabled={saving || selection === currentBadgeId}>
          {saving ? 'Saving…' : 'Save selection'}
        </button>
      </div>
    </form>
  );
}

function EarnedBadge({ award, badge, featured }) {
  const date = award.awardedAt ? new Date(award.awardedAt) : null;
  const awardDate = date && Number.isFinite(date.getTime()) ? awardDateFormat.format(date) : null;
  const earnedCount = countFormat.format(award.earnedCount || 1);

  return (
    <li>
      <details className="player-profile__badge-card">
        <summary>
          <span className="player-profile__badge-mount">
            <img src={badge.artUrl} alt="" width="144" height="144" loading="lazy" decoding="async" />
          </span>
          <span className="player-profile__badge-count">
            <span aria-hidden="true">×{earnedCount}</span>
            <span className="visually-hidden">Earned {earnedCount} {award.earnedCount > 1 ? 'times' : 'time'}</span>
          </span>
          <span className="player-profile__badge-name">
            <strong>{badge.name}</strong>
            <FontAwesomeIcon icon={faChevronDown} aria-hidden="true" />
          </span>
          {featured && <span className="player-profile__badge-featured-label">Featured</span>}
        </summary>
        <div className="player-profile__badge-detail">
          <p>{award.reason || badge.description}</p>
          {awardDate && <time dateTime={award.awardedAt}>First awarded {awardDate}</time>}
        </div>
      </details>
    </li>
  );
}

export default function PlayerBadgeCollection({
  awards, featuredBadgeId, getBadge, loading, error, membershipExpired, onRetry, onFeature, saving, feedback,
}) {
  const badges = awards.flatMap((award) => {
    const badge = getBadge(award.badgeId);
    return badge ? [{ award, badge }] : [];
  });
  let content = <p className="player-profile__empty">Badges awarded by USAW staff will appear here.</p>;

  if (loading) {
    content = <p className="player-profile__empty" role="status">Loading your badges…</p>;
  } else if (error) {
    content = (
      <div className="player-profile__badge-error">
        <p className="player-profile__empty" role="alert">{error}</p>
        {membershipExpired && <Link className="player-profile__link" to="/membership">Membership information</Link>}
        <button type="button" className="player-profile__link" onClick={onRetry}>
          {membershipExpired ? 'Check membership again' : 'Try again'}
        </button>
      </div>
    );
  } else if (badges.length) {
    content = (
      <>
        <FeatureBadgeControl
          key={featuredBadgeId || ''}
          badges={badges}
          featuredBadgeId={featuredBadgeId}
          onFeature={onFeature}
          saving={saving}
        />
        {feedback && (
          <p className="player-profile__badge-feedback" role={feedback.error ? 'alert' : 'status'}>
            {feedback.message}
          </p>
        )}
        <ul className="player-profile__badge-wall">
          {badges.map(({ award, badge }) => (
            <EarnedBadge key={badge.id} award={award} badge={badge} featured={badge.id === featuredBadgeId} />
          ))}
        </ul>
      </>
    );
  }

  return (
    <section className="player-profile__panel player-profile__badges" aria-labelledby="player-profile-badges-title">
      <div className="player-profile__panel-header player-profile__badge-header">
        <h2 id="player-profile-badges-title">Earned badges</h2>
        <Link className="player-profile__link" to="/virtual-patches">Explore Virtual Patches</Link>
      </div>
      {content}
    </section>
  );
}
