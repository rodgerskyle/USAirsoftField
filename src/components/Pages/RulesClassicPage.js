import React from 'react';
import { Link } from 'react-router-dom';
import RulesClassic from './RulesClassic';
import './Rules.css';

export default function RulesClassicPage() {
  return (
    <>
      <nav className="rules-view-switch" aria-label="Rules display">
        <Link to="/information/rules">Illustrated view</Link>
        <span aria-current="page">Classic view</span>
      </nav>
      <RulesClassic />
    </>
  );
}
