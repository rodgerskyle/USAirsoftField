import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import './PlayerHub.css';

const STORAGE_KEY = 'usaw-player-hub-v1';
const MAX_LOADOUTS = 24;
const MAX_ITEMS = 80;
const EMPTY_PLANNER = { loadouts: [], activeId: '' };
const STARTER_ITEMS = ['Eye and face protection', 'Barrel cover', 'Magazines and BBs', 'Battery or gas', 'Water'];

const FIELD_LINKS = [
  { to: '/schedule', icon: 'calendar', title: 'Field schedule', copy: 'See upcoming events and open play.' },
  { to: '/map', icon: 'map', title: 'Field map', copy: 'Get your bearings before the briefing.' },
  { to: '/information/rules', icon: 'shield', title: 'Field rules', copy: 'Know the safety rules and equipment requirements.' },
  { to: '/information/gametypes', icon: 'flag', title: 'Game modes', copy: 'Learn the objectives for each game.' },
  { to: '/leaderboard', icon: 'trophy', title: 'Leaderboard', copy: 'Look up official player standings.' },
  { to: '/teams', icon: 'team', title: 'Teams', copy: 'Explore the USAW team directory.' },
];

const ICONS = {
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  calendar: 'M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  map: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Zm6-3v15m6-12v15',
  shield: 'm12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7Zm-3 9 2 2 4-4',
  flag: 'M5 22V4m0 0c4-4 10 4 15 0v11c-5 4-11-4-15 0',
  trophy: 'M8 3h8v6a4 4 0 0 1-8 0Zm0 2H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 2v7m-4 0h8',
  team: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8m8 0a4 4 0 0 1 0 8',
  pack: 'M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v11H5Zm0 5h14m-9 0v3m4-3v3',
  remove: 'M6 6l12 12M6 18 18 6',
};

function Icon({ name, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

function makeId() {
  return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function readSavedData() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  try {
    const data = JSON.parse(stored);
    return data?.version === 1 ? data : {};
  } catch {
    return {};
  }
}

function readPlanner() {
  const data = readSavedData();
  const loadouts = (Array.isArray(data.loadouts) ? data.loadouts : [])
    .slice(0, MAX_LOADOUTS)
    .filter(loadout => loadout && cleanText(loadout.id, 80) && cleanText(loadout.name, 50))
    .map(loadout => ({
      id: cleanText(loadout.id, 80),
      name: cleanText(loadout.name, 50),
      items: (Array.isArray(loadout.items) ? loadout.items : [])
        .slice(0, MAX_ITEMS)
        .filter(item => item && cleanText(item.id, 80) && cleanText(item.name, 80))
        .map(item => ({ id: cleanText(item.id, 80), name: cleanText(item.name, 80), packed: item.packed === true })),
    }));

  const activeId = loadouts.some(loadout => loadout.id === data.activeId) ? data.activeId : loadouts[0]?.id || '';
  return { loadouts, activeId };
}

function initialPlanner() {
  try {
    return readPlanner();
  } catch {
    return EMPTY_PLANNER;
  }
}

function Loadouts({ planner, updatePlanner, storageError }) {
  const [newName, setNewName] = useState('');
  const [itemName, setItemName] = useState('');
  const [message, setMessage] = useState('');
  const { loadouts, activeId } = planner;
  const active = loadouts.find(loadout => loadout.id === activeId);
  const packed = active?.items.filter(item => item.packed).length || 0;
  const total = active?.items.length || 0;

  function updateActive(change) {
    updatePlanner({
      ...planner,
      loadouts: loadouts.map(loadout => loadout.id === activeId ? change(loadout) : loadout),
    });
  }

  function createLoadout(name, withStarterItems = false) {
    if (!name) {
      setMessage('Enter a name for your loadout.');
      return;
    }
    if (loadouts.some(loadout => loadout.name.toLowerCase() === name.toLowerCase())) {
      setMessage('You already have a loadout with that name.');
      return;
    }
    if (loadouts.length >= MAX_LOADOUTS) {
      setMessage(`You can save up to ${MAX_LOADOUTS} loadouts. Remove one before adding another.`);
      return;
    }
    const id = makeId();
    const items = withStarterItems ? STARTER_ITEMS.map(item => ({ id: makeId(), name: item, packed: false })) : [];
    updatePlanner({ ...planner, activeId: id, loadouts: [...loadouts, { id, name, items }] });
    setNewName('');
    setItemName('');
    setMessage(`${name} is ready to pack.`);
  }

  function addItem(event) {
    event.preventDefault();
    const name = cleanText(itemName, 80);
    if (!name) {
      setMessage('Enter a gear item to add.');
      return;
    }
    if (total >= MAX_ITEMS) {
      setMessage(`Each loadout can hold up to ${MAX_ITEMS} items.`);
      return;
    }
    if (active.items.some(item => item.name.toLowerCase() === name.toLowerCase())) {
      setMessage('That item is already on this list.');
      return;
    }
    updateActive(loadout => ({ ...loadout, items: [...loadout.items, { id: makeId(), name, packed: false }] }));
    setItemName('');
    setMessage(`Added ${name}.`);
  }

  function removeLoadout() {
    if (!window.confirm(`Delete "${active.name}" and its packing list from this browser?`)) return;
    const remaining = loadouts.filter(loadout => loadout.id !== activeId);
    updatePlanner({ ...planner, activeId: remaining[0]?.id || '', loadouts: remaining });
    setItemName('');
    setMessage('Loadout removed.');
  }

  function addStarterItems() {
    if (!active) {
      createLoadout('Weekend kit', true);
      return;
    }
    const existing = new Set(active.items.map(item => item.name.toLowerCase()));
    const additions = STARTER_ITEMS.filter(name => !existing.has(name.toLowerCase()));
    if (!additions.length) {
      setMessage('The starter items are already on this list.');
      return;
    }
    if (total + additions.length > MAX_ITEMS) {
      setMessage('Remove some items to make room for the starter checklist.');
      return;
    }
    updateActive(loadout => ({
      ...loadout,
      items: [...loadout.items, ...additions.map(name => ({ id: makeId(), name, packed: false }))],
    }));
    setMessage('Starter items added.');
  }

  return (
    <section id="player-loadouts" tabIndex={-1} className="ph-card" aria-labelledby="player-loadouts-heading">
      <header className="ph-card-header">
        <span className="ph-icon"><Icon name="pack" /></span>
        <div>
          <p className="ph-kicker">Game-day prep</p>
          <h2 id="player-loadouts-heading">Loadouts &amp; packing</h2>
        </div>
      </header>
      <p className="ph-description">Build a checklist for each kit, then check off your gear as you pack. Loadouts are saved in this browser.</p>
      {storageError && <p className="ph-storage-error" role="alert">This browser couldn’t save your changes. Keep this tab open to continue using your packing lists.</p>}
      <form className="ph-inline-form" onSubmit={event => {
        event.preventDefault();
        createLoadout(cleanText(newName, 50));
      }}>
        <label>
          New loadout name
          <input required maxLength={50} value={newName} placeholder="e.g. Weekend kit"
            onChange={event => setNewName(event.target.value)} />
        </label>
        <button className="ph-button ph-button-primary" type="submit">Create loadout</button>
      </form>
      {active ? (
        <div className="ph-checklist">
          <label>
            Current loadout
            <select value={activeId} onChange={event => {
              updatePlanner({ ...planner, activeId: event.target.value });
              setItemName('');
              setMessage('');
            }}>
              {loadouts.map(loadout => <option key={loadout.id} value={loadout.id}>{loadout.name}</option>)}
            </select>
          </label>
          <div className="ph-progress-label">
            <strong>Packing progress</strong>
            <span>{packed} of {total} packed</span>
          </div>
          <progress value={packed} max={Math.max(total, 1)} aria-label={`${active.name} packing progress`} />
          {total > 0 ? (
            <ul className="ph-items">
              {active.items.map(item => (
                <li key={item.id}>
                  <label className={item.packed ? 'ph-packed' : undefined}>
                    <input type="checkbox" checked={item.packed} onChange={event => {
                      const isPacked = event.target.checked;
                      updateActive(loadout => ({
                        ...loadout,
                        items: loadout.items.map(entry => entry.id === item.id ? { ...entry, packed: isPacked } : entry),
                      }));
                    }} />
                    <span>{item.name}</span>
                  </label>
                  <button className="ph-icon-button" type="button" aria-label={`Remove ${item.name}`} onClick={() => {
                    updateActive(loadout => ({ ...loadout, items: loadout.items.filter(entry => entry.id !== item.id) }));
                    setMessage(`Removed ${item.name}.`);
                  }}>
                    <Icon name="remove" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="ph-empty">No gear yet. Add your own items or start with the essentials.</p>}
          <form className="ph-inline-form" onSubmit={addItem}>
            <label>
              Gear item
              <input required maxLength={80} value={itemName} placeholder="e.g. Spare battery"
                onChange={event => setItemName(event.target.value)} />
            </label>
            <button className="ph-button ph-button-secondary" type="submit">Add gear</button>
          </form>
          <div className="ph-actions ph-checklist-actions">
            {total === 0 && <button className="ph-text-button" type="button" onClick={addStarterItems}>Add starter items</button>}
            <button className="ph-text-button" type="button" disabled={!packed} onClick={() => {
              updateActive(loadout => ({ ...loadout, items: loadout.items.map(item => ({ ...item, packed: false })) }));
              setMessage('Packing boxes reset.');
            }}>Reset packed items</button>
            <button className="ph-text-button ph-remove" type="button" onClick={removeLoadout}>Delete loadout</button>
          </div>
        </div>
      ) : (
        <div className="ph-empty">
          <p>Start from scratch or use a checklist with five common essentials.</p>
          <button className="ph-text-button" type="button" onClick={addStarterItems}>Use starter checklist <Icon name="arrow" size={16} /></button>
        </div>
      )}
      <p className="ph-feedback" role="status">{message}</p>
    </section>
  );
}

function focusLoadouts() {
  const tool = document.getElementById('player-loadouts');
  if (!tool) return;
  tool.focus({ preventScroll: true });
  tool.scrollIntoView();
}

export default function PlayerHub() {
  const [planner, setPlanner] = useState(initialPlanner);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    function syncStorage(event) {
      if (event.key === STORAGE_KEY || event.key === null) setPlanner(initialPlanner());
    }
    window.addEventListener('storage', syncStorage);
    return () => window.removeEventListener('storage', syncStorage);
  }, []);

  function updatePlanner(next) {
    setPlanner(next);
    try {
      // Preserve other fields saved by earlier versions of the hub.
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readSavedData(), ...next, version: 1 }));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  return (
    <main className="player-hub">
      <Helmet>
        <title>Player Hub | US Airsoft World</title>
        <meta name="description" content="Plan your USAW game day, find official field information, and build a packing checklist." />
      </Helmet>
      <header className="ph-hero">
        <div className="ph-wrap ph-hero-inner">
          <p className="ph-kicker">US Airsoft World <span>·</span> Anderson, CA</p>
          <h1>Player Hub</h1>
          <p className="ph-hero-copy">Plan your next visit and pack your kit for game day.</p>
          <div className="ph-actions">
            <button className="ph-button ph-button-primary" type="button" onClick={focusLoadouts}>Pack your kit <Icon name="arrow" size={18} /></button>
          </div>
        </div>
      </header>
      <div className="ph-wrap ph-content">
        <section aria-labelledby="player-field-links">
          <div className="ph-section-header">
            <p className="ph-kicker">At the field</p>
            <h2 id="player-field-links">Game-day essentials</h2>
          </div>
          <div className="ph-links">
            {FIELD_LINKS.map(link => (
              <Link className="ph-link-card" to={link.to} key={link.to}>
                <span className="ph-icon"><Icon name={link.icon} /></span>
                <span className="ph-link-copy"><strong>{link.title}</strong><span>{link.copy}</span></span>
                <Icon name="arrow" size={17} />
              </Link>
            ))}
          </div>
        </section>
        <section className="ph-account" aria-labelledby="player-account-heading">
          <div>
            <p className="ph-kicker">USAW player account</p>
            <h2 id="player-account-heading">Your profile and membership</h2>
            <p>Use your existing USAW account to view your official player record.</p>
          </div>
          <div className="ph-actions">
            <Link className="ph-button ph-button-primary" to="/account">My account <Icon name="arrow" size={18} /></Link>
            <Link className="ph-button ph-button-on-dark" to="/login">Sign in</Link>
          </div>
        </section>
        <Loadouts planner={planner} updatePlanner={updatePlanner} storageError={storageError} />
      </div>
    </main>
  );
}
