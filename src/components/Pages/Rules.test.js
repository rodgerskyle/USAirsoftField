import React from 'react';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { fireEvent, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import Rules from './Rules';
import RulesClassicPage from './RulesClassicPage';
import { RULE_CARDS } from '../constants/rules-catalog';

function show(Component) {
  return render(<HelmetProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Component /></MemoryRouter></HelmetProvider>);
}

test('the original rules backup is preserved byte for byte', () => {
  const source = readFileSync(path.join(__dirname, 'RulesClassic.js'));
  expect(createHash('sha256').update(source).digest('hex'))
    .toBe('ef88cdc191bdc6b5e79a65f679002c1068e362950cd466cf0d8fb04a1c89e38b');
});

test('each card expands independently and the entire catalog can be reached in batches', () => {
  const { container } = show(Rules);
  const cards = () => Array.from(container.querySelectorAll('.field-rule-card'));
  expect(cards()).toHaveLength(6);
  expect(screen.getByRole('link', { name: 'Classic view' })).toHaveAttribute('href', '/information/rules/classic');
  expect(screen.getByRole('link', { name: 'Rules PDF' })).toHaveAttribute('target', '_blank');
  const team = screen.getByText('Identify your team by sleeve or tape').closest('details');
  expect(team.open).toBe(false);
  fireEvent.click(team.querySelector('summary'));
  expect(team.open).toBe(true);
  expect(team.querySelector('.field-rule-body')).toHaveTextContent(/outer shirt or jacket sleeves/);
  expect(team.querySelector('.field-rule-team--camo')).toHaveTextContent('Camo · Yellow');
  expect(team.querySelector('.field-rule-team--solid')).toHaveTextContent('Solid · Blue');
  expect(team.querySelector('.field-rule-body .field-rule-team--camo')).toBeInTheDocument();
  expect(team.querySelector('.field-rule-body .field-rule-team--solid')).toBeInTheDocument();

  const more = screen.getByRole('button', { name: 'Load more rules' });
  fireEvent.click(more);
  expect(cards()).toHaveLength(12);
  expect(team.open).toBe(true);
  expect(document.activeElement).toBe(cards()[6].querySelector('summary'));
  for (let i = 12; i < RULE_CARDS.length; i += 6) fireEvent.click(more);
  expect(cards().map(card => card.id)).toEqual(RULE_CARDS.map(rule => 'rule-' + rule.id));
  expect(more).not.toBeVisible();
});

test('section selection resets the count and preserves nested rules in the selected cards', () => {
  const { container } = show(Rules);
  const select = screen.getByRole('combobox');
  fireEvent.change(select, { target: { value: 'personal-safety' } });
  expect(screen.getByRole('status')).toHaveTextContent('Showing 6 of 10 rules');
  fireEvent.click(screen.getByRole('button', { name: 'Load more rules' }));
  const uniform = screen.getByText('Field clothing and team uniform options').closest('details');
  fireEvent.click(uniform.querySelector('summary'));
  expect(uniform.querySelectorAll('.field-rule-body ul ul').length).toBeGreaterThan(0);
  expect(uniform.querySelector('.field-rule-body')).toHaveTextContent(/Camo/i);
  expect(uniform.querySelector('.field-rule-body')).toHaveTextContent(/Solid/i);
  fireEvent.change(select, { target: { value: 'play-days' } });
  expect(container.querySelectorAll('.field-rule-card')).toHaveLength(4);
  expect(screen.queryByRole('button', { name: 'Load more rules' })).toBeNull();
  fireEvent.change(select, { target: { value: '' } });
  expect(container.querySelectorAll('.field-rule-card')).toHaveLength(6);
  expect(screen.getByRole('button', { name: 'Load more rules' })).toBeVisible();
});

test('classic route retains the original tabbed page and returns to the illustrated view', () => {
  show(RulesClassicPage);
  expect(screen.getByRole('heading', { name: 'Game and Safety Rules' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Illustrated view' })).toHaveAttribute('href', '/information/rules');
  expect(screen.getByRole('tab', { name: 'Facility Rules' })).toBeInTheDocument();
});
