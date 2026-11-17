import React from 'react';
import { render } from '@testing-library/react';
import {
  ArenaPlayDays, Equipment, FacilityRules, MembershipPointsRanking,
  PersonalSafety, SafetyMeeting, USAirsoftOfficials,
} from '../Pages/RulesSections';
import { RULE_CARDS, RULE_SECTIONS } from './rules-catalog';

const originalSections = {
  facility: FacilityRules,
  'personal-safety': PersonalSafety,
  equipment: Equipment,
  'safety-meeting': SafetyMeeting,
  officials: USAirsoftOfficials,
  'play-days': ArenaPlayDays,
  membership: MembershipPointsRanking,
};

function originalItem(li) {
  const text = Array.from(li.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent).join('');
  const items = Array.from(li.children)
    .flatMap(list => Array.from(list.children, originalItem));
  return { text, items };
}

// Compare complete paths so a requirement cannot lose an exception, move to
// the wrong section, or acquire a different parent instruction during editing.
function descriptions(items, context = []) {
  return items.flatMap(item => {
    const path = [...context, item.text.trim().replace(/\s+/g, ' ')];
    return item.items?.length ? descriptions(item.items, path) : JSON.stringify(path);
  });
}

test.each(Object.entries(originalSections))('%s cards preserve all published requirements and their context', (id, Original) => {
  const { container } = render(<Original />);
  const source = Array.from(container.querySelector('ol').children, originalItem);
  const cards = RULE_CARDS.filter(card => card.sectionId === id);
  const expected = [...new Set(descriptions(source))].sort();
  const actual = cards.flatMap(card => descriptions(card.body)).sort();
  expect(actual).toEqual(expected);
});

test('cards have stable unique IDs and include the team designations used in their text', () => {
  expect(new Set(RULE_CARDS.map(card => card.id)).size).toBe(RULE_CARDS.length);
  expect(RULE_SECTIONS.map(section => section.id)).toEqual(Object.keys(originalSections));
  for (const card of RULE_CARDS) {
    const text = descriptions(card.body).join(' ');
    for (const team of ['camo', 'solid']) {
      if (new RegExp('\\b' + team + '\\b', 'i').test(text)) expect(card.teams).toContain(team);
    }
  }
});
