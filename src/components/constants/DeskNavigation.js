import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { fieldStaffPaths } from './fieldStaffApi';

const gameDay = [
  ['Player Check-In', fieldStaffPaths.checkIn], ['Manage Groups', fieldStaffPaths.groups],
  ['Rentals', '/admin/rentalform'], ['Wins & Losses', '/admin/scores'], ['Round Controls', fieldStaffPaths.rounds],
];
const membership = [
  ['Find a waiver', 'waiverlookup'], ['New member', 'signup'], ['Renew member', 'renewal'],
  ['Sign waiver', 'waiverform'], ['Party calendar', 'birthday'],
];
const operations = [
  ['Verify membership', fieldStaffPaths.membership], ['Rotation & briefings', fieldStaffPaths.missionTools],
  ['Team reports', fieldStaffPaths.reports], ['Player feedback', fieldStaffPaths.feedback], ['Barracks TV', fieldStaffPaths.tv],
];

export default function DeskNavigation({ admin = false, base = '/admin' }) {
  const { pathname } = useLocation();
  const memberLinks = membership.map(([name, route]) => [name, base + '/' + route]);
  const primary = admin ? gameDay : [...memberLinks.slice(0, 3), ['Rentals', base + '/rentalform']];
  const extra = admin ? [...memberLinks, ...operations] : memberLinks.slice(3);
  const currentExtra = extra.find(([, to]) => pathname === to || pathname.startsWith(to + '/'));

  function links(items) {
    return items.map(([name, to]) => <NavLink key={to} to={to}>{name}</NavLink>);
  }
  return (
    <nav className="desk-navigation" aria-label="Desk shortcuts">
      {links(primary)}
      <details key={pathname}>
        <summary>{currentExtra ? currentExtra[0] : 'More tools'}</summary>
        <div className="desk-navigation__menu">{links(extra)}</div>
      </details>
    </nav>
  );
}
