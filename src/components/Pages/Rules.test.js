import React from 'react';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { fireEvent, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import Rules from './Rules';
import RulesClassicPage from './RulesClassicPage';
import { RULE_CARDS, RULE_SECTIONS } from '../constants/rules-catalog';

function show(Component, route = '/information/rules') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Component />
      </MemoryRouter>
    </HelmetProvider>
  );
}

function passageText({ text, items = [] }) {
  return text + items.map(passageText).join('');
}

function artworkDigest(image) {
  const src = image.getAttribute('src');
  expect(src).toMatch(/^\/assets\/rules\/[a-z0-9-]+\.png$/);
  const file = readFileSync(path.join(__dirname, '../../../public', src));
  expect(file.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return createHash('sha256').update(file).digest('hex');
}

test('the original rules backup is preserved byte for byte', () => {
  const source = readFileSync(path.join(__dirname, 'RulesClassic.js'));
  expect(createHash('sha256').update(source).digest('hex'))
    .toBe('ef88cdc191bdc6b5e79a65f679002c1068e362950cd466cf0d8fb04a1c89e38b');
});

test('eight illustrated categories expose the full catalog once, with the published text and individual artwork', () => {
  const { container } = show(Rules);
  const categories = Array.from(container.querySelectorAll('details.field-rule-category'));
  expect(categories).toHaveLength(8);
  expect(screen.getByRole('link', { name: 'Classic view' })).toHaveAttribute('href', '/information/rules/classic');
  expect(screen.getByRole('link', { name: 'Rules PDF' })).toHaveAttribute('target', '_blank');
  expect(screen.queryByRole('button', { name: /load more rules/i })).not.toBeInTheDocument();
  const catalog = new Map(RULE_CARDS.map(rule => ['rule-' + rule.id, rule]));
  const displayedIds = [];
  const categoryImages = [];
  const ruleImages = [];

  for (const category of categories) {
    const summary = category.querySelector('summary');
    expect(category.open).toBe(false);
    expect(summary).toBeVisible();
    categoryImages.push(artworkDigest(summary.querySelector('img')));
    fireEvent.click(summary);
    expect(category.open).toBe(true);
    const entries = category.querySelectorAll('details.field-rule-entry');
    expect(entries.length).toBeGreaterThan(0);
    expect(summary.querySelector('.field-category-count').textContent).toBe(
      entries.length === 1 ? '1 rule' : entries.length + ' rules'
    );
    for (const entry of entries) {
      const rule = catalog.get(entry.id);
      expect(rule).toBeDefined();
      expect(entry.querySelector('summary h3')).toHaveTextContent(rule.title);
      expect(entry.open).toBe(false);
      const passages = Array.from(entry.querySelectorAll('.field-rule-passage'), el => el.textContent.replace(/\s+/g, ''));
      expect(passages).toEqual(rule.body.map(item => passageText(item).replace(/\s+/g, '')));
      displayedIds.push(entry.id);
      ruleImages.push(artworkDigest(entry.querySelector('.field-rule-detail-art img')));
    }
  }
  expect(displayedIds).toHaveLength(96);
  expect(displayedIds.sort()).toEqual(Array.from(catalog.keys()).sort());
  expect(new Set(categoryImages).size).toBe(categories.length);
  expect(new Set(ruleImages).size).toBe(RULE_CARDS.length);
});

test('opening a category and rule reveals the team designations and full nested descriptions', () => {
  const { container } = show(Rules);
  const category = container.querySelector('#category-teams');
  fireEvent.click(category.querySelector('summary'));
  const team = category.querySelector('#rule-facility-identify-your-team-by-sleeve-or-tape');
  expect(team.querySelector('summary')).toBeVisible();
  const body = team.querySelector('.field-rule-body');
  expect(body).not.toBeVisible();
  fireEvent.click(team.querySelector('summary'));
  expect(body).toBeVisible();
  expect(body).toHaveTextContent(/outer shirt or jacket sleeves/);
  expect(team.querySelector('.field-rule-team--camo')).toHaveTextContent('Camo · Yellow');
  expect(team.querySelector('.field-rule-team--solid')).toHaveTextContent('Solid · Blue');
  expect(body.querySelector('.field-rule-passage .field-rule-team--camo')).toBeInTheDocument();
  expect(body.querySelector('.field-rule-passage .field-rule-team--solid')).toBeInTheDocument();
  const uniform = category.querySelector('#rule-personal-safety-field-clothing-and-team-uniform-options');
  fireEvent.click(uniform.querySelector('summary'));
  expect(uniform.querySelectorAll('.field-rule-body ul ul').length).toBeGreaterThan(0);
  fireEvent.click(category.querySelector('summary'));
  expect(body).not.toBeVisible();
});

test.each(RULE_SECTIONS)('the legacy $id section link includes exactly its published rules', ({ id }) => {
  const { container } = show(Rules, '/information/rules#rules-' + id);
  const expected = RULE_CARDS.filter(rule => rule.sectionId === id).map(rule => 'rule-' + rule.id);
  const visibleSection = Array.from(container.querySelectorAll('.field-rule-entry'), el => el.id);
  expect(visibleSection.sort()).toEqual(expected.sort());
  const all = screen.getByRole('link', { name: 'All categories' });
  expect(all).toHaveAttribute('href', '/information/rules');
  fireEvent.click(all);
  expect(container.querySelectorAll('.field-rule-category')).toHaveLength(8);
  expect(container.querySelectorAll('.field-rule-entry')).toHaveLength(RULE_CARDS.length);
});

test('classic route retains the original tabbed page and returns to the illustrated view', () => {
  show(RulesClassicPage);
  expect(screen.getByRole('heading', { name: 'Game and Safety Rules' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Illustrated view' })).toHaveAttribute('href', '/information/rules');
  expect(screen.getByRole('tab', { name: 'Facility Rules' })).toBeInTheDocument();
});
