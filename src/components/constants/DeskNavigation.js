import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faGrip, faHouse, faMedal, faUser, faUsers } from '@fortawesome/free-solid-svg-icons';
import { adminToolGroups, waiverToolGroups } from './deskTools';

const waiverShortcuts = ['waiverlookup', 'signup', 'renewal', 'rentalform'];

function ToolLink({ tool, current }) {
  return <Link to={tool.path} aria-current={tool === current ? 'page' : undefined} className={tool === current ? 'active' : undefined}>
    <FontAwesomeIcon icon={tool.icon} fixedWidth aria-hidden="true" />
    <span>{tool.shortTitle || tool.title}</span>
  </Link>;
}

export default function DeskNavigation({ admin = false, base = '/admin' }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const nav = useRef(null);
  const trigger = useRef(null);
  const groups = admin ? adminToolGroups : waiverToolGroups(base);
  const tools = groups.flatMap(group => group.actions);
  const quick = admin ? groups[0].actions : waiverShortcuts.map(route =>
    tools.find(tool => tool.path === base + '/' + route));
  const view = new URLSearchParams(location.search).get('view');
  const current = tools.find(tool => tool.path === location.pathname + '?view=' + view)
    || tools.find(tool => location.pathname === tool.path || location.pathname.startsWith(tool.path + '/'));
  const title = current?.shortTitle || current?.title || (location.pathname.startsWith('/admin/useroptions/') ? 'Player account' : 'Staff tools');
  const quickSelected = quick.includes(current);
  const overviewPath = admin ? '/admin' : '/dashboard';

  useEffect(() => { setOpen(false); }, [location]);
  useEffect(() => {
    if (!open) return;
    function outside(event) {
      if (!nav.current?.contains(event.target)) setOpen(false);
    }
    function escape(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <nav ref={nav} className="desk-navigation" aria-label="Desk shortcuts">
      <div className="desk-navigation__inner">
        <div className="desk-navigation__bar">
          <div className="desk-navigation__quick">
            {quick.map(tool => <ToolLink key={tool.path} tool={tool} current={current} />)}
          </div>
          <span className="desk-navigation__current">
            <FontAwesomeIcon icon={current?.icon || faUser} fixedWidth aria-hidden="true" />
            {title}
          </span>
          <button type="button" ref={trigger} className="desk-navigation__toggle"
            aria-controls="desk-all-tools" aria-expanded={open} onClick={() => setOpen(value => !value)}>
            <FontAwesomeIcon icon={faGrip} aria-hidden="true" />
            <span>All tools{!quickSelected && <span className="desk-navigation__selected-tool" aria-hidden="true">{title}</span>}</span>
            <FontAwesomeIcon className="desk-navigation__chevron" icon={faChevronDown} aria-hidden="true" />
          </button>
        </div>
        <div id="desk-all-tools" className="desk-navigation__menu" hidden={!open}
          onClick={event => { if (event.target.closest('a')) setOpen(false); }}>
          <div className="desk-navigation__groups">
            {groups.map(group => <div key={group.id} className="desk-navigation__group">
              <h2>{group.title}</h2>
              <ul>{group.actions.map(tool => <li key={tool.path}><ToolLink tool={tool} current={current} /></li>)}</ul>
            </div>)}
          </div>
          <div className="desk-navigation__footer">
            <Link to={overviewPath}><FontAwesomeIcon icon={faHouse} aria-hidden="true" />{admin ? 'Staff overview' : 'Waiver dashboard'}</Link>
            {admin && <>
              <Link to="/admin#staff-directory"><FontAwesomeIcon icon={faUsers} aria-hidden="true" />Find a player</Link>
              <Link to="/admin#admin-knife-kills"><FontAwesomeIcon icon={faMedal} aria-hidden="true" />Knife kill recorder</Link>
              <Link to="/admin#admin-badges-title"><FontAwesomeIcon icon={faMedal} aria-hidden="true" />Award badges</Link>
            </>}
          </div>
        </div>
      </div>
    </nav>
  );
}
