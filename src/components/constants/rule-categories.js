import { RULE_CARDS } from './rules-catalog.js';

// The published sections remain the source of the rule text and its original
// section links. These categories organize the same rules for players.
const categories = [
  {
    id: 'check-in',
    title: 'Check-in & waivers',
    imageId: 'facility-sign-the-field-waiver',
    section: 'safety-meeting',
    include: [
      'facility-sign-the-field-waiver',
      'facility-minimum-player-age',
      'facility-parent-or-guardian-waiver',
      'facility-attend-the-field-safety-briefing',
      'facility-arena-entrance-checks',
    ],
  },
  {
    id: 'protective-gear',
    title: 'Protective gear',
    imageId: 'personal-safety-keep-approved-eyewear-on-throughout-play',
    section: 'personal-safety',
    include: [
      'facility-wear-face-protection-in-the-arena',
      'facility-full-face-protection-for-minors',
      'facility-keep-eye-protection-on-and-call-for-help-if-you-cannot-see',
    ],
  },
  {
    id: 'teams',
    title: 'Teams & uniforms',
    imageId: 'facility-identify-your-team-by-sleeve-or-tape',
    include: [
      'facility-choose-your-team-at-registration',
      'facility-team-assignments-and-sleeve-colors',
      'facility-identify-your-team-by-sleeve-or-tape',
      'facility-camo-team-identification',
      'facility-solid-team-identification',
      'facility-team-dress-and-identification',
      'personal-safety-field-clothing-and-team-uniform-options',
      'facility-pants-helmets-and-vests',
    ],
  },
  {
    id: 'gameplay',
    title: 'Gameplay rules',
    imageId: 'facility-call-your-hits',
    section: 'facility',
    include: [
      'equipment-underhand-grenade-tosses',
      'equipment-grenade-height-limit',
      'equipment-call-out-before-using-a-grenade',
      'equipment-grenade-hits-in-a-room',
    ],
  },
  {
    id: 'equipment',
    title: 'Replicas & equipment',
    imageId: 'equipment-chronograph-inspection-and-approval-tag',
    section: 'equipment',
    include: [
      'facility-bring-replicas-into-the-facility-in-a-case',
      'facility-clear-your-replica-before-leaving-the-arena',
      'safety-meeting-equipment-checks-during-play',
      'safety-meeting-velocity-spot-checks',
    ],
  },
  {
    id: 'conduct',
    title: 'Conduct & referees',
    imageId: 'officials-referee-responsibilities',
    section: 'officials',
    include: [
      'facility-respect-players-and-staff',
      'facility-family-friendly-conduct',
      'facility-language-on-the-field',
      'facility-sportsmanship-and-recognition',
      'facility-rude-or-inappropriate-behavior',
      'facility-physical-contact',
      'facility-referee-authority-on-safety',
      'facility-referee-patrols-in-the-arena',
      'facility-referee-decisions',
      'facility-report-a-safety-or-rules-violation',
      'facility-consequences-of-rule-violations',
    ],
  },
  {
    id: 'play-days',
    title: 'Play days & events',
    imageId: 'play-days-open-play-days-and-eligibility',
    section: 'play-days',
  },
  {
    id: 'membership',
    title: 'Membership & rewards',
    imageId: 'membership-member-id-cards-and-replacements',
    section: 'membership',
  },
];

const categoryByRule = new Map(categories.flatMap(({ id, include = [] }) =>
  include.map(ruleId => [ruleId, id])
));
const categoryBySection = new Map(categories
  .filter(category => category.section)
  .map(({ id, section }) => [section, id])
);

export const RULE_CATEGORIES = categories.map(({ id, title, imageId }) => ({
  id, title, imageId,
  rules: RULE_CARDS.filter(rule =>
    (categoryByRule.get(rule.id) || categoryBySection.get(rule.sectionId)) === id
  ),
}));
