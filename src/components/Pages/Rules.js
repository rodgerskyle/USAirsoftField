import React, { useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';
import { renderRuleWall } from '../constants/rule-wall';
import { RULE_SECTIONS } from '../constants/rules-catalog';
import rulesDocument from './rules.pdf';
import './Rules.css';

export default function Rules() {
  const { hash } = useLocation();
  const wall = useRef(null);
  // Previous versions linked directly to sections of the published text.
  const section = RULE_SECTIONS.find(item => hash === '#rules-' + item.id);
  const ruleId = hash.startsWith('#rule-') ? hash.slice(6) : '';
  const markup = useMemo(() => ({ __html: renderRuleWall({ section: section?.id, ruleId }) }), [section, ruleId]);
  useEffect(() => {
    if (ruleId) document.getElementById('rule-' + ruleId)?.scrollIntoView?.();
    else if (section || hash === '#complete-rules') wall.current?.scrollIntoView?.();
  }, [section, ruleId, hash]);

  return (
    <main className="field-rule-guide field-rule-guide--website">
      <Helmet><title>Field Rules | US Airsoft World</title></Helmet>
      <header className="field-rule-header">
        <div>
          <h1>Field rules</h1>
          <p>Choose a category, then open a rule to read it.</p>
          <small>Published rules updated <time dateTime="2020-01-01">January 1, 2020</time></small>
        </div>
        <div className="field-rule-links">
          <Link to="/information/rules/classic">Classic view</Link>
          <a href={rulesDocument} target="_blank" rel="noopener noreferrer">Rules PDF</a>
        </div>
      </header>
      {section && <Link to="/information/rules" className="field-all-categories">All categories</Link>}
      <div id="complete-rules" ref={wall} dangerouslySetInnerHTML={markup} />
    </main>
  );
}
