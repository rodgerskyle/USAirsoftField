import React, { useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';
import { bindRuleWall, renderRuleWall } from '../constants/rule-wall';
import rulesDocument from './rules.pdf';
import './Rules.css';

export default function Rules() {
  const { hash } = useLocation();
  const wall = useRef(null);
  // Previous versions linked directly to sections of the published text.
  const initialSection = hash.startsWith('#rules-') ? hash.slice(7) : '';
  const markup = useMemo(() => ({ __html: renderRuleWall({ section: initialSection }) }), [initialSection]);
  useEffect(() => {
    bindRuleWall(wall.current);
    if (initialSection || hash === '#complete-rules') wall.current?.scrollIntoView?.();
  }, [initialSection, hash]);

  return (
    <main className="field-rule-guide field-rule-guide--website">
      <Helmet><title>Field Rules | US Airsoft World</title></Helmet>
      <header className="field-rule-header">
        <div>
          <h1>Field rules</h1>
          <p>Select a card to read the full rule.</p>
          <small>Published rules updated <time dateTime="2020-01-01">January 1, 2020</time></small>
        </div>
        <div className="field-rule-links">
          <Link to="/information/rules/classic">Classic view</Link>
          <a href={rulesDocument} target="_blank" rel="noopener noreferrer">Rules PDF</a>
        </div>
      </header>
      <div id="complete-rules" ref={wall} dangerouslySetInnerHTML={markup} />
    </main>
  );
}
