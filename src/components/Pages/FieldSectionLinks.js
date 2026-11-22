import React from 'react';
import './FieldSectionLinks.css';

export default function FieldSectionLinks({ label, items }) {
  function jump(event, id) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    if (target.tagName === 'SUMMARY') target.parentElement.open = true;
    target.focus({ preventScroll: true });
    target.scrollIntoView?.({ block: 'start' });
  }

  return <nav className="field-section-links" aria-label={label}>
    {items.map(([id, name]) => <a key={id} href={'#' + id} onClick={event => jump(event, id)}>{name}</a>)}
  </nav>;
}
