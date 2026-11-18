import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import Gametypes from './Gametypes';

const fieldModes = [
  'The Enemy within', 'Medic!', 'Bottle Domination', 'Flag Domination “Downtown”',
  'Flag Domination “Full Map”', 'Sticky Bomb', 'Capture the Flag', 'Battle Buddy', 'Downed Pilot',
  'Interrogation', 'Pilot Rescue', 'Wolf', 'General', 'Team Death Match', 'VIP Rescue',
  'Bomb Disarmament “Bridge”', 'Multiple Bomb Disarmament', 'Red City Siege', 'The Purge',
  'Countdown', 'P.F.R.C. “Pod Fired Rocket Cluster”', 'Ring the Bell - Operation Alamo',
  'ICBM “First Strike”', 'Demolition', 'Sabotage', 'Operation Airstrike', 'Broken Arrow',
  'Level 4 Biohazard', 'Operation First Strike', 'Detonation', 'Zombie Attack', 'Money Bag',
  'Fuel Depot “Demolition”',
];
const additionalModes = [
  '3 Flag', 'Power Struggle', '3 Bomb', 'Battle Flag', 'Scrambled Eggs', 'Progressive Countdown',
  'Downtown 2-Flag', 'Light Domination', 'Power Rush', 'Blackout Protocol', 'Six Flag', 'Center Flag',
];
const playtestModes = [
  'Horseshoes and Hand Grenades', 'Warm-Up Team Death Match', 'Flag Procurement', 'Fondle the Cone',
  'King of the Flag', 'Ribbon Flag', 'Icy Killers', 'Hidden VIP Extraction', 'Search and Destroy',
  'Fallout', 'HVT', 'Amoeba', 'Blackout Protocol: Grid Restoration',
];

function show() {
  return render(<HelmetProvider><Gametypes /></HelmetProvider>);
}

test('the original 33 modes come first, followed by each Companion addition with its own tab and number', () => {
  show();
  const names = [...fieldModes, ...additionalModes, ...playtestModes];
  const tabs = screen.getAllByRole('tab');
  expect(screen.getByRole('status')).toHaveTextContent('58 modes found');
  expect(tabs.map(tab => tab.textContent)).toEqual(names);
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  const panelIds = tabs.map(tab => tab.getAttribute('aria-controls'));
  expect(new Set(panelIds).size).toBe(names.length);
  tabs.forEach((tab, index) => {
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    expect(panel.querySelector('ol.ol-rules').start).toBe(index + 1);
    if (index >= fieldModes.length) {
      const rows = Array.from(panel.querySelectorAll('.li-content-rules > ul > li'), row => row.textContent.split(' – '));
      expect(rows.map(([label]) => label)).toEqual(['General Information', 'The Goal', 'Respawn/HQ', 'Needs', 'Game Time', 'Area of play', 'Review overall']);
      expect(rows.every(([, text]) => text?.trim())).toBe(true);
    }
    if (playtestModes.includes(names[index])) {
      const info = Array.from(panel.querySelectorAll('ul > li')).find(item => /general information/i.test(item.textContent));
      expect(info).toHaveTextContent(/staff playtest/i);
    }
  });
});

test('aliases find the right format and clearing an empty search restores the list and focus', () => {
  show();
  const field = screen.getByRole('searchbox', { name: 'Find a game mode' });
  for (const [alias, title] of [['TTCS Center Flag', 'Center Flag'], ['Destroy the Source', 'Search and Destroy']]) {
    fireEvent.change(field, { target: { value: alias } });
    expect(screen.getByRole('status')).toHaveTextContent('1 mode found');
    expect(screen.getByRole('tab', { name: title })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent(title);
  }
  fireEvent.change(field, { target: { value: 'no-such-format-999' } });
  expect(screen.getByRole('status')).toHaveTextContent('0 modes found');
  expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(field).toHaveFocus();
  expect(field).toHaveValue('');
  expect(screen.getByRole('status')).toHaveTextContent('58 modes found');
});

test('players can switch between similarly named variants in filtered results', () => {
  show();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Blackout Protocol' } });
  expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual([
    'Blackout Protocol', 'Blackout Protocol: Grid Restoration',
  ]);
  fireEvent.click(screen.getByRole('tab', { name: 'Blackout Protocol: Grid Restoration' }));
  expect(screen.getByRole('tabpanel').querySelector('ol').start).toBe(58);
  expect(screen.getByRole('tabpanel')).toHaveTextContent(/staff playtest/i);
  fireEvent.click(screen.getByRole('tab', { name: 'Blackout Protocol', exact: true }));
  expect(screen.getByRole('tabpanel').querySelector('ol').start).toBe(43);
});
