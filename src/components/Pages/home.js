import React from 'react';
import logo from '../../assets/logo.png';
import { Container, Row, Col } from 'react-bootstrap/';
import BackgroundVideo from '../constants/backgroundvideo';

const Home = () => (
  <div>
  <BackgroundVideo/>
  <div className="background-static-all">
    <Container fluid={true}>
      <Row className="text-center">
        <Col className="col-settings">
          <div className="counter boxes-home boxes-home-nopadbot about-div-home">
            <h2 className="header-about-us">About Us:</h2>
            <h5 className="about-us" data-to="1700" data-speed="1500">
              U.S. AIRSOFT WORLD is the premier airsoft arena in the U.S. We are located in Anderson, CA - Just outside of Redding.
              We have over 10 acres dedicated to Airsoft. We pride ourselves on being the first arena to provide stat tracking and leaderboards.
            </h5>
            <img src={logo} alt="US Airsoft logo" className="small-logo-home"/>
          </div>
        </Col>
      </Row>
      <Row className="text-center hours-row-home">
        <div className="counter hours-home boxes-home boxes-home-nopadbot">
          <h2 className="header-about-us">Hours of Operation:</h2>
          <Row className="left-row-hours">
            <Col className="col-hours-header">
              <h5 className="h5-hours-subheader">
                <b>Arena / Field:<br/></b>
              </h5>
            </Col>
            <Col className="col-hours">
                <p className="p-hours-season">Summer</p>
                <dl className="dl-hours-info">
                  <dt>Friday- 6pm to 11pm</dt>
                  <dt>Saturday- 8am to 2pm</dt>
                  <dt>Sunday- 8am to 2pm</dt>
                </dl>
            </Col>
            <Col className="col-hours winter-hours-col">
                <p className="p-hours-season">Winter</p>
                <dl className="dl-hours-info">
                  <dt>Friday- Closed</dt>
                  <dt>Saturday- 9am to 3pm</dt>
                  <dt>Sunday- 9am to 3pm</dt>
                </dl>
            </Col>
          </Row>
          <Row className="right-row-hours">
            <Col className="col-hours-header">
              <h5 className="h5-hours-subheader">
                <b>Tactical Store:<br/></b>
              </h5>
            </Col>
            <Col className="col-hours">
                <p className="p-hours-season">Summer</p>
                <dl className="dl-hours-info">
                  <dt>Monday- Closed</dt>
                  <dt>Tuesday- 9am to 5pm</dt>
                  <dt>Wednesday- 9am to 5pm</dt>
                  <dt>Thursday- 9am to 5pm</dt>
                  <dt>Friday- 9am to 11pm</dt>
                  <dt>Saturday- 8am to 4pm</dt>
                  <dt>Sunday- 8am to 4pm</dt>
                </dl>
            </Col>
            <Col className="col-hours">
                <p className="p-hours-season">Winter</p>
                <dl className="dl-hours-info">
                  <dt>Monday- Closed</dt>
                  <dt>Tuesday- 9am to 5pm</dt>
                  <dt>Wednesday- 9am to 5pm</dt>
                  <dt>Thursday- 9am to 5pm</dt>
                  <dt>Friday- 9am to 5pm</dt>
                  <dt>Saturday- 9am to 5pm</dt>
                  <dt>Sunday- 9am to 5pm</dt>
                </dl>
            </Col>
          </Row>
          <Row className="last-row-hours">
            <Col>
            </Col>
            <Col className="col-hours">
              <p className="p-hours-season-month">*Summer is June - October.</p>
            </Col>
            <Col className="col-hours">
              <p className="p-hours-season-month">*Winter is November - May.</p>
            </Col>
          </Row>
          <img src={logo} alt="US Airsoft logo" className="small-logo-home2"/>
        </div>
      </Row>
      </Container>
    </div>
  </div>
);

export default Home;