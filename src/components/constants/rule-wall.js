import { RULE_CATEGORIES } from './rule-categories.js';
import { RULE_SECTIONS } from './rules-catalog.js';

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

const toggle = '<span class="field-rule-toggle" aria-hidden="true"></span>';

function illustration(id, className) {
  return `<span class="${className}"><img src="/assets/rules/${escapeHtml(id)}.png" alt="" width="256" height="256" loading="lazy" decoding="async"></span>`;
}

function renderRule(rule, open) {
  const teams = rule.teams.filter(team => Object.hasOwn(teamNames, team));
  const badges = teams.map(team =>
    `<span class="field-rule-team field-rule-team--${team}">${teamNames[team]}</span>`
  ).join('');
  const body = rule.body.map(item => `<div class="field-rule-passage">${renderItem(item, teams)}</div>`).join('');
  return `<details class="field-rule-entry" id="rule-${escapeHtml(rule.id)}"${open ? ' open' : ''}>
    <summary class="field-rule-entry-summary"><h3><span>${escapeHtml(rule.title)}</span>${toggle}</h3></summary>
    <div class="field-rule-body">
      ${illustration(rule.id, 'field-rule-detail-art')}
      <div class="field-rule-text">${badges ? `<div class="field-rule-teams">${badges}</div>` : ''}${body}</div>
    </div>
  </details>`;
}

function ruleCount(count) {
  return count === 1 ? '1 rule' : `${count} rules`;
}

function renderCategory(category, rules, open, openIds) {
  return `<details class="field-rule-category" id="category-${escapeHtml(category.id)}"${open ? ' open' : ''}>
    <summary class="field-category-summary"><h2>
      ${illustration(category.imageId, 'field-category-art')}
      <span class="field-category-caption">
        <span class="field-category-title">${escapeHtml(category.title)}</span>
        <span class="field-category-count">${ruleCount(rules.length)}</span>
      </span>${toggle}
    </h2></summary>
    <div class="field-category-body">${rules.map(rule => renderRule(rule, openIds.has('rule-' + rule.id))).join('')}</div>
  </details>`;
}

export function captureRuleWall(root) {
  return { openIds: new Set(Array.from(root?.querySelectorAll('details[open]') || [], item => item.id)) };
}

export function renderRuleWall({ section = '', ruleId = '', openIds = new Set() } = {}) {
  const publishedSection = RULE_SECTIONS.find(item => item.id === section);
  const expanded = new Set(openIds);
  if (ruleId) expanded.add('rule-' + ruleId);

  const groups = RULE_CATEGORIES.map(category => ({
    category,
    rules: publishedSection ? category.rules.filter(rule => rule.sectionId === section) : category.rules,
  })).filter(group => group.rules.length);
  const count = groups.reduce((total, group) => total + group.rules.length, 0);
  const label = publishedSection ? escapeHtml(publishedSection.title) : `${groups.length} categories`;
  const markup = groups.map(({ category, rules }) => {
    const open = !!publishedSection || expanded.has('category-' + category.id) || rules.some(rule => rule.id === ruleId);
    return renderCategory(category, rules, open, expanded);
  }).join('');
  return `<section class="field-rule-wall" data-rule-wall aria-label="Published field rules">
    <p class="field-rule-count">${label} · ${ruleCount(count)}</p>
    <div class="field-rule-grid" id="field-rule-cards" data-rule-grid>${markup}</div>
  </section>`;
}
