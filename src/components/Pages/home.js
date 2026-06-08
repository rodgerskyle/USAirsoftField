import React from 'react';
import { Container, Row, Col } from 'react-bootstrap/';
import { Helmet } from 'react-helmet-async';
import BackgroundVideo from '../constants/backgroundvideo';
import MUIButton from '@mui/material/Button';

function checkSeason() {
  const today = new Date();
  const summerStart = new Date(today.getFullYear(), 4, 1);
  const summerEnd = new Date(today.getFullYear(), 10, 1);
  return summerStart.getTime() <= today.getTime() && today.getTime() <= summerEnd.getTime();
}

const HOURS = {
  summer: {
    label: '01 May - 01 Nov',
    arena: [
      'Mon: Closed',
      'Tue: Closed',
      'Wed: Closed',
      'Thu: Closed',
      'Fri: 6PM - 11PM',
      'Sat: 8AM - 2PM',
      'Sun: 8AM - 2PM',
    ],
    store: [
      'Mon: Closed',
      'Tue: Closed',
      'Wed: 9:30AM - 6PM',
      'Thu: 9:30AM - 6PM',
      'Fri: 9:30AM - 11PM',
      'Sat: 8AM - 4PM',
      'Sun: 8AM - 4PM',
    ],
  },
  winter: {
    label: '02 Nov - 30 Apr',
    arena: [
      'Fri: Closed',
      'Sat: 9AM - 3PM',
      'Sun: 9AM - 3PM',
    ],
    store: [
      'Mon-Fri: 9AM - 5PM',
      'Sat: 9AM - 5PM',
      'Sun: 9AM - 5PM',
    ],
  },
};

const HoursCard = ({ title, subtitle, hours }) => (
  <div className="home-hours-card">
    <div className="home-hours-card-header">
      <h3 className="home-hours-card-title">{title}</h3>
      <p className="home-hours-card-subtitle">{subtitle}</p>
    </div>
    <dl className="home-hours-list">
      {hours.map((item) => (
        <div key={item} className="home-hours-row">
          <dt className="home-hours-item">{item}</dt>
        </div>
      ))}
    </dl>
  </div>
);

const Home = () => {
  const [summer, setSummer] = React.useState(checkSeason());
  const seasonKey = summer ? 'summer' : 'winter';
  const season = HOURS[seasonKey];

  return (
    <div>
      <Helmet>
        <title>US Airsoft Field</title>
      </Helmet>
      <div className="background-static-all">
        <BackgroundVideo />
        <Container fluid={true} className="public-page-shell">
          <section className="public-section home-hours-section">
            <div className="public-section-heading">
              <p className="public-section-kicker">Plan Your Visit</p>
              <h2 className="public-section-title">Hours of Operation</h2>
              <p className="public-section-copy">
                Current field and store hours for the {summer ? 'summer' : 'winter'} season.
              </p>
            </div>

            <Row className="justify-content-center season-button-row home-season-toggle">
              <Col xs={6} sm={4} md={3} lg={2}>
                <MUIButton
                  variant="outlined"
                  className={summer ? 'season-button-active' : null}
                  onClick={() => setSummer(true)}
                >
                  Summer
                </MUIButton>
              </Col>
              <Col xs={6} sm={4} md={3} lg={2}>
                <MUIButton
                  variant="outlined"
                  className={!summer ? 'season-button-active' : null}
                  onClick={() => setSummer(false)}
                >
                  Winter
                </MUIButton>
              </Col>
            </Row>

            <div className="home-hours-grid">
              <HoursCard
                title="Arena / Field"
                subtitle="Open play hours"
                hours={season.arena}
              />
              <HoursCard
                title="Tactical Store"
                subtitle="Storefront hours"
                hours={season.store}
              />
            </div>

            <p className="home-hours-season-label">{season.label}</p>
          </section>
        </Container>
      </div>
    </div>
  );
};

export default Home;
