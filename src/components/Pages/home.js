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
      <Row className="justify-content-row">
        <div className="counter hours-home boxes-home boxes-home-nopadbot">
          <Row className="justify-content-row">
            <h2 className="header-about-us">Hours of Operation:</h2>
          </Row>
            <Row>
              <Col lg={4} className="col-hours-header">
                <h5 className="h5-hours-subheader">
                  <b>Arena / Field:<br/></b>
                </h5>
              </Col>
              <Col lg={4} className="col-hours">
                  <dl className="dl-hours-info">
                    <dt className="p-hours-season">Summer</dt>
                    <dt className="dt-hours-info">Friday- 6pm to 11pm</dt>
                    <dt className="dt-hours-info">Saturday- 8am to 2pm</dt>
                    <dt className="dt-hours-info">Sunday- 8am to 2pm</dt>
                  </dl>
              </Col>
              <Col lg={4} className="col-hours">
                  <dl className="dl-hours-info">
                    <dt className="p-hours-season">Winter</dt>
                    <dt className="dt-hours-info">Friday- Closed</dt>
                    <dt className="dt-hours-info">Saturday- 9am to 3pm</dt>
                    <dt className="dt-hours-info">Sunday- 9am to 3pm</dt>
                  </dl>
              </Col>
              <Col lg={4} className="col-hours-header">
                <h5 className="h5-hours-subheader">
                  <b>Tactical Store:<br/></b>
                </h5>
              </Col>
              <Col lg={4} className="col-hours">
                  <dl>
                    <dt className="p-hours-season">Summer</dt>
                    <dt className="dt-hours-info">Monday- Closed</dt>
                    <dt className="dt-hours-info">Tuesday- 9am to 5pm</dt>
                    <dt className="dt-hours-info">Wednesday- 9am to 5pm</dt>
                    <dt className="dt-hours-info">Thursday- 9am to 5pm</dt>
                    <dt className="dt-hours-info">Friday- 9am to 11pm</dt>
                    <dt className="dt-hours-info">Saturday- 8am to 4pm</dt>
                    <dt className="dt-hours-info">Sunday- 8am to 4pm</dt>
                  </dl>
              </Col>
              <Col lg={4} className="col-hours">
                  <dl>
                    <dt className="p-hours-season">Winter</dt>
                    <dt className="dt-hours-info">Monday- Closed</dt>
                    <dt className="dt-hours-info">Tuesday- 9am to 5pm</dt>
                    <dt className="dt-hours-info">Wednesday- 9am to 5pm</dt>
                    <dt className="dt-hours-info">Thursday- 9am to 5pm</dt>
                    <dt className="dt-hours-info">Friday- 9am to 5pm</dt>
                    <dt className="dt-hours-info">Saturday- 9am to 5pm</dt>
                    <dt className="dt-hours-info">Sunday- 9am to 5pm</dt>
                  </dl>
              </Col>
              <Col lg={4}>
              </Col>
              <Col lg={4} className="col-hours">
                <p className="p-hours-season-month">*Summer is June - October.</p>
              </Col>
              <Col md={4} className="col-hours">
                <p className="p-hours-season-month">*Winter is November - May.</p>
              </Col>
            </Row>
              <img src={logo} alt="US Airsoft logo" className="small-logo-home2 hours-logo-home"/>
          </div>
        </Row>
      </Container>
    </div>
  </div>
);

export default Home;