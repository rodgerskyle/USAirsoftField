import React from 'react';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { fireEvent, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import Rules from './Rules';
import RulesClassicPage from './RulesClassicPage';

function show(Component) {
  return render(<HelmetProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Component /></MemoryRouter></HelmetProvider>);
}

test('the original rules backup is preserved byte for byte', () => {
  const source = readFileSync(path.join(__dirname, 'RulesClassic.js'));
  expect(createHash('sha256').update(source).digest('hex'))
    .toBe('ef88cdc191bdc6b5e79a65f679002c1068e362950cd466cf0d8fb04a1c89e38b');
});

test('illustrated rules retain complete published sections, document access and a classic view', () => {
  const { container } = show(Rules);
  expect(screen.getByRole('heading', { name: 'Know the rules. Play the field.' })).toBeInTheDocument();
  expect(container.querySelectorAll('.illustrated-rule__art img')).toHaveLength(6);
  expect(container.querySelectorAll('.illustrated-rules__sections details')).toHaveLength(7);
  expect(screen.getByRole('link', { name: 'Classic view' })).toHaveAttribute('href', '/information/rules/classic');
  expect(screen.getByRole('link', { name: 'Rules PDF' })).toHaveAttribute('target', '_blank');
  expect(screen.getByText('Underhand toss method only for deployment. No overhand throws allowed.', { selector: 'li' })).toBeInTheDocument();
  expect(screen.getByText('Free game day pass with each 450 points earned.')).toBeInTheDocument();
  expect(screen.getByText(/This is an honor game, be respectful, honest and CALL YOUR HITS/)).toBeInTheDocument();
  expect(screen.getByText('Last updated 1/1/2020')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('link', { name: 'Read the full requirements' })[0]);
  expect(container.querySelector('#rules-personal-safety')).toHaveAttribute('open');
});

test('classic route retains the original tabbed page and returns to the illustrated view', () => {
  show(RulesClassicPage);
  expect(screen.getByRole('heading', { name: 'Game and Safety Rules' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Illustrated view' })).toHaveAttribute('href', '/information/rules');
  expect(screen.getByRole('tab', { name: 'Facility Rules' })).toBeInTheDocument();
});
