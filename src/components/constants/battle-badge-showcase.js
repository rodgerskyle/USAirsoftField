import { battleBadgeArtUrl, colorBadges } from './battleBadgeArt.js';

function earnedBadge(id, label, count) {
  const caption = count === undefined ? label : label + (count === 1 ? '' : 's');
  return `<li class="battle-showcase__badge battle-showcase__badge--${id}">
    <img src="${battleBadgeArtUrl(id)}" width="68" height="76" alt="" decoding="async">
    <span>${count === undefined ? '' : count.toLocaleString('en-US') + ' '}${caption}</span></li>`;
}

function renderProgress(progress) {
  if (!progress || typeof progress.towerOfPower !== 'boolean' ||
      ![progress.totalAwards, progress.colorBadgeCount, progress.silverStars, progress.goldStars]
        .every(value => Number.isSafeInteger(value) && value >= 0) || progress.colorBadgeCount > colorBadges.length) {
    throw new Error('Invalid Battle Badge progress.');
  }
  if (!progress.totalAwards) return '<p class="battle-showcase__message">No Battle Badges earned yet.</p>';
  const items = colorBadges.slice(0, progress.colorBadgeCount).map(([id, label]) => earnedBadge(id, label));
  if (progress.towerOfPower) items.push(earnedBadge('tower-of-power', 'Tower of Power'));
  if (progress.silverStars) items.push(earnedBadge('silver-star', 'Silver Star', progress.silverStars));
  if (progress.goldStars) items.push(earnedBadge('gold-star', 'Gold Star', progress.goldStars));
  return `<p class="battle-showcase__total">${progress.totalAwards.toLocaleString('en-US')} MVP ${progress.totalAwards === 1 ? 'day' : 'days'}</p>
    <ul class="battle-showcase__rack" aria-label="Earned Battle Badges and stars">${items.join('')}</ul>`;
}

export function bindBattleBadgeShowcase(host, { playerId, request, signal }) {
  if (!host || signal.aborted) return;
  const content = host.querySelector('[data-battle-badge-progress]');
  const active = () => !signal.aborted && content.isConnected;
  async function load() {
    if (!active()) return;
    content.innerHTML = '<p class="battle-showcase__message" role="status">Loading Battle Badges…</p>';
    try {
      const result = await request('/api/battle-badges?playerId=' + encodeURIComponent(playerId), signal);
      if (active()) content.innerHTML = renderProgress(result.progress);
    } catch {
      if (!active()) return;
      content.innerHTML = '<p class="battle-showcase__message" role="status">Battle Badges are temporarily unavailable. <button type="button">Try again</button></p>';
      content.querySelector('button').addEventListener('click', load, { once: true });
    }
  }
  return load();
}
