import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import rulesDocument from './rules.pdf';
import {
  FacilityRules, PersonalSafety, Equipment, SafetyMeeting,
  USAirsoftOfficials, ArenaPlayDays, MembershipPointsRanking,
} from './RulesSections';
import './Rules.css';

const essentials = [
  {
    id: 'eye-protection', image: 'eye-protection', title: 'Eye protection stays on', section: 'personal-safety',
    text: 'DO NOT REMOVE your EYE PROTECTION while in the arena “Goggle on Area” In no circumstance shall eye protection be removed.',
  },
  {
    id: 'safe-zone', image: 'safe-zone', title: 'Leave the field safely', section: 'equipment',
    text: 'The removal of all magazines, clearing all airsoft guns, airsoft guns on safety and placing the barrel sock on the gun is required when leaving the arena area “Goggle on Area”.',
  },
  {
    id: 'call-hit', image: 'call-hit', title: 'Call your hits', section: 'facility',
    text: 'This is a sport of integrity and honor, call your shots, gun hits count.',
  },
  {
    id: 'referee', image: 'referee', title: 'Attend the safety briefing', section: 'safety-meeting',
    text: 'All players must attend and participate in the safety briefing prior to play, conducted by the US Airsoft World referee.',
  },
  {
    id: 'distance', image: 'distance', title: 'Know your engagement distance', section: 'equipment',
    text: 'The on-site safety briefing determines current limits, engagement distances, and game rules.',
  },
  {
    id: 'grenades', image: 'grenades', title: 'Underhand deployment', section: 'equipment',
    text: 'Must be approved for use by US Airsoft prior to play. Underhand toss method only for deployment. No overhand throws allowed.',
  },
];

const sections = [
  { id: 'facility', title: 'Facility rules', Content: FacilityRules },
  { id: 'personal-safety', title: 'Personal safety equipment requirements', Content: PersonalSafety },
  { id: 'equipment', title: 'Equipment', Content: Equipment },
  { id: 'safety-meeting', title: 'Safety meeting brief', Content: SafetyMeeting },
  { id: 'officials', title: 'US Airsoft World officials', Content: USAirsoftOfficials },
  { id: 'play-days', title: 'Arena play days', Content: ArenaPlayDays },
  { id: 'membership', title: 'Membership, points and ranking', Content: MembershipPointsRanking },
];

function revealRequirements(section) {
  const details = document.getElementById(`rules-${section}`);
  if (details) details.open = true;
}

export default function Rules() {
  return (
    <main className="illustrated-rules">
      <Helmet><title>Field Rules | US Airsoft World</title></Helmet>
      <header className="illustrated-rules__heading">
        <div>
          <p className="illustrated-rules__eyebrow">US Airsoft World · Player guide</p>
          <h1>Know the rules.<br /><span>Play the field.</span></h1>
          <p>See the essentials at a glance, then review the complete published rules before play.</p>
        </div>
        <div className="illustrated-rules__actions">
          <a href="#complete-rules" className="rules-action rules-action--primary">Read the full rules</a>
          <Link to="/information/rules/classic" className="rules-action">Classic view</Link>
          <a href={rulesDocument} className="rules-action" target="_blank" rel="noopener noreferrer">Rules PDF</a>
        </div>
      </header>
      <section className="illustrated-rules__essentials" aria-label="Rules at a glance">
        {essentials.map(rule => (
          <article className="illustrated-rule" key={rule.id}>
            <div className="illustrated-rule__art"><img src={`/assets/rules/${rule.image}.png`} alt="" width="224" height="224" decoding="async" /></div>
            <div className="illustrated-rule__copy">
              <h2>{rule.title}</h2><p>{rule.text}</p>
              <a href={`#rules-${rule.section}`} onClick={() => revealRequirements(rule.section)}>Read the full requirements <span aria-hidden="true">↗</span></a>
            </div>
          </article>
        ))}
      </section>
      <section className="illustrated-rules__complete" id="complete-rules" aria-labelledby="complete-rules-title">
        <header><div><p className="illustrated-rules__eyebrow">Before you enter the arena</p><h2 id="complete-rules-title">Complete published rules</h2></div>
          <p>Last updated 1/1/2020</p></header>
        <p className="illustrated-rules__briefing">US Airsoft World referee shall have the final say on all issues pertaining to safety.</p>
        <div className="illustrated-rules__sections">
          {sections.map(({ id, title, Content }) => (
            <details id={`rules-${id}`} key={id}>
              <summary>{title}</summary>
              <div className="illustrated-rules__full-text"><Content /></div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
