import React, { useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  faArrowDown,
  faArrowRight,
  faCalendarAlt,
  faClipboardList,
  faMapMarkedAlt,
  faTags,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import BackgroundVideo from '../constants/backgroundvideo';
import useFieldResources from '../constants/useFieldResources';
import './home.css';

const VISIT_LINKS = [
  {
    title: 'Pricing & rentals',
    detail: 'Admission and gear rentals',
    to: '/pricing',
    icon: faTags,
  },
  {
    title: 'Game schedule',
    detail: 'Upcoming play days and events',
    to: '/schedule',
    icon: faCalendarAlt,
  },
  {
    title: 'Field map',
    detail: 'Explore the arena layout',
    to: '/map',
    icon: faMapMarkedAlt,
  },
  {
    title: 'Field rules',
    detail: 'Safety and gameplay rules',
    to: '/information/rules',
    icon: faClipboardList,
  },
];

function currentSeason() {
  const today = new Date();
  const summerStart = new Date(today.getFullYear(), 4, 1);
  const winterStart = new Date(today.getFullYear(), 10, 2);
  return today >= summerStart && today < winterStart ? 'summer' : 'winter';
}

const Home = () => {
  const [seasonKey, setSeasonKey] = useState(currentSeason);
  const { resources, failed } = useFieldResources();
  const season = resources?.hours[seasonKey];
  const hoursHeading = useRef(null);

  const showHours = () => {
    hoursHeading.current?.focus({ preventScroll: true });
    hoursHeading.current?.scrollIntoView({ block: 'center' });
  };

  return (
    <main className="field-home">
      <Helmet>
        <title>US Airsoft Field | Anderson, California</title>
        <meta name="description" content="Plan an indoor or outdoor airsoft visit at US Airsoft Field in Anderson, California. Find pricing, rentals, field hours, and player resources." />
      </Helmet>

      <section className="field-home__hero" aria-labelledby="field-home-title">
        <div className="field-home__wrap field-home__hero-inner">
          <div className="field-home__hero-copy">
            <p className="field-home__eyebrow">Anderson, California</p>
            <h1 id="field-home-title">US Airsoft <span>Field</span></h1>
            <p className="field-home__hero-description">
              Open play indoors and outdoors. Bring your own gear or rent a setup at the field.
            </p>
            <div className="field-home__hero-actions">
              <Link className="field-home__button field-home__button--primary" to="/pricing">
                Plan a visit <FontAwesomeIcon icon={faArrowRight} />
              </Link>
              <Link className="field-home__button field-home__button--outline" to="/waiver">Sign a waiver</Link>
            </div>
          </div>
        </div>
        <BackgroundVideo />
      </section>

      <section className="field-home__wrap field-home__section" aria-labelledby="field-home-visit">
        <div className="field-home__section-heading">
          <h2 id="field-home-visit">Game-day essentials</h2>
          <button className="field-home__hours-shortcut" type="button" onClick={showHours}>
            Field &amp; store hours <FontAwesomeIcon icon={faArrowDown} />
          </button>
        </div>
        <ul className="field-home__visit-grid">
          {VISIT_LINKS.map(({ title, detail, to, icon }) => (
            <li key={to}>
              <Link className="field-home__visit-link" to={to}>
                <span className="field-home__icon"><FontAwesomeIcon icon={icon} /></span>
                <span className="field-home__visit-copy">
                  <span className="field-home__visit-title">{title}</span>
                  <span className="field-home__visit-detail">{detail}</span>
                </span>
                <FontAwesomeIcon className="field-home__visit-arrow" icon={faArrowRight} />
              </Link>
            </li>
          ))}
        </ul>

        <div className="field-home__hub">
          <span className="field-home__hub-icon"><FontAwesomeIcon icon={faUsers} /></span>
          <div>
            <h3>Player Hub</h3>
            <p>Check rankings, find teams, and access your player account.</p>
          </div>
          <Link className="field-home__button field-home__button--outline" to="/player-hub">
            Open Player Hub <FontAwesomeIcon icon={faArrowRight} />
          </Link>
        </div>
      </section>

      <section className="field-home__hours" aria-labelledby="field-home-hours">
        <div className="field-home__wrap field-home__section">
          <div className="field-home__section-heading">
            <div>
              <p className="field-home__eyebrow">Plan your day</p>
              <h2 id="field-home-hours" ref={hoursHeading} tabIndex={-1}>Hours of operation</h2>
              <p className="field-home__hours-season" id="field-home-season" aria-live="polite">{season?.label}</p>
            </div>
            <div className="field-home__seasons" role="group" aria-label="Choose season">
              <button type="button" aria-pressed={seasonKey === 'summer'} onClick={() => setSeasonKey('summer')}>Summer</button>
              <button type="button" aria-pressed={seasonKey === 'winter'} onClick={() => setSeasonKey('winter')}>Winter</button>
            </div>
          </div>

          <div className="field-home__hours-frame">
            <table className="field-home__hours-table" aria-label="Field and store hours" aria-describedby="field-home-season">
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Arena / Field</th>
                  <th scope="col">Tactical Store</th>
                </tr>
              </thead>
              <tbody>
                {season?.rows.map(([day, field, store]) => (
                  <tr key={day}>
                    <th scope="row">{day}</th>
                    <td>{field}</td>
                    <td>{store}</td>
                  </tr>
                ))}
                {!season && <tr><td colSpan={3} role="status">{failed ? 'Hours are unavailable. Call (530) 365-1000 to confirm.' : 'Loading field and store hours…'}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;
