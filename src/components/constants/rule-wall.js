import { RULE_CARDS, RULE_SECTIONS } from './rules-catalog.js';

const pageSize = 6;
const sectionNames = new Map(RULE_SECTIONS.map(section => [section.id, section.title]));
const teamNames = { camo: 'Camo · Yellow', solid: 'Solid · Blue' };
const teamTerms = /\b(Camo(?:uflage)?(?: Team)?|Special Ops(?: Team)?|Yellow(?: tape)?|Solid(?: Team)?|Sold\/Blue|Tactical Team|Blue(?: tape)?)\b/gi;
const escapes = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => escapes[character]);
}

function teamText(text, teams) {
  if (!teams.length) return escapeHtml(text);
  return text.split(teamTerms).map((part, index) => {
    const safe = escapeHtml(part);
    if (index % 2 === 0) return safe;
    const team = /^(?:camo|special ops|yellow)/i.test(part) ? 'camo' : 'solid';
    return teams.includes(team) ? `<strong class="field-rule-team field-rule-team--${team}">${safe}</strong>` : safe;
  }).join('');
}

function renderItem({ text, items }, teams) {
  const children = items?.length ? `<ul>${items.map(child => `<li>${renderItem(child, teams)}</li>`).join('')}</ul>` : '';
  return teamText(text, teams) + children;
}

function renderCard(rule, open = false) {
  const teams = rule.teams.filter(team => Object.hasOwn(teamNames, team));
  const badges = teams.map(team =>
    `<span class="field-rule-team field-rule-team--${team}">${teamNames[team]}</span>`
  ).join('');
  const body = rule.body.map(item => `<div class="field-rule-passage">${renderItem(item, teams)}</div>`).join('');
  return `<details class="field-rule-card" id="rule-${escapeHtml(rule.id)}"${open ? ' open' : ''}>
    <summary>
      <h2>
        <span class="field-rule-art"><img src="/assets/rules/${escapeHtml(rule.id)}.png" alt="" width="256" height="256" loading="lazy" decoding="async"></span>
        <span class="field-rule-caption">
          <span class="field-rule-section">${escapeHtml(sectionNames.get(rule.sectionId))}</span>
          <span class="field-rule-title">${escapeHtml(rule.title)}<span class="field-rule-toggle" aria-hidden="true"></span></span>
          ${badges ? `<span class="field-rule-teams">${badges}</span>` : ''}
        </span>
      </h2>
    </summary>
    <div class="field-rule-body">${body}</div>
  </details>`;
}

function cardsIn(section) {
  return sectionNames.has(section) ? RULE_CARDS.filter(card => card.sectionId === section) : RULE_CARDS;
}

function countLabel(shown, total) {
  return `Showing ${shown} of ${total} rules`;
}

export function captureRuleWall(root) {
  if (!root) return {};
  const grid = root.querySelector('[data-rule-grid]');
  return {
    section: root.querySelector('[data-rule-section]').value,
    visibleCount: grid.children.length,
    openIds: new Set(Array.from(grid.querySelectorAll('details[open]'), card => card.id))
  };
}

export function renderRuleWall({ section = '', visibleCount = pageSize, openIds = new Set() } = {}) {
  const cards = cardsIn(section);
  const visible = cards.slice(0, visibleCount);
  const options = RULE_SECTIONS.map(item => `<option value="${escapeHtml(item.id)}"${section === item.id ? ' selected' : ''}>${escapeHtml(item.title)}</option>`).join('');
  return `<section class="field-rule-wall" data-rule-wall aria-label="Published field rules">
    <div class="field-rule-toolbar">
      <label>Rule section<select data-rule-section><option value="">All rules</option>${options}</select></label>
      <p class="field-rule-count" role="status" data-rule-count>${countLabel(visible.length, cards.length)}</p>
    </div>
    <div class="field-rule-grid" id="field-rule-cards" data-rule-grid>${visible.map(card => renderCard(card, openIds.has('rule-' + card.id))).join('')}</div>
    <div class="field-rule-more"><button type="button" data-rule-more aria-controls="field-rule-cards"${visible.length >= cards.length ? ' hidden' : ''}>Load more rules</button></div>
  </section>`;
}

export function bindRuleWall(root) {
  if (!root) return;
  const section = root.querySelector('[data-rule-section]');
  const grid = root.querySelector('[data-rule-grid]');
  const count = root.querySelector('[data-rule-count]');
  const more = root.querySelector('[data-rule-more]');
  let cards = cardsIn(section.value);

  function updateFooter() {
    count.textContent = countLabel(grid.children.length, cards.length);
    more.hidden = grid.children.length >= cards.length;
  }

  section.onchange = () => {
    cards = cardsIn(section.value);
    grid.innerHTML = cards.slice(0, pageSize).map(card => renderCard(card)).join('');
    updateFooter();
  };
  more.onclick = () => {
    const offset = grid.children.length;
    const next = cards.slice(offset, offset + pageSize);
    grid.insertAdjacentHTML('beforeend', next.map(card => renderCard(card)).join(''));
    updateFooter();
    grid.children[offset]?.querySelector('summary')?.focus();
  };
}
