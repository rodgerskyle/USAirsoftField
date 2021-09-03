import React from 'react';
import { Container, Row, Col } from 'react-bootstrap/';
import { Helmet } from 'react-helmet-async';
import BackgroundVideo from '../constants/backgroundvideo';
import MUIButton from '@material-ui/core/Button';

/* Needs to be added in
Closed:

  Mondays, Christmas Day, Thanksgiving Day, & Easter Sunday


Special Arena Days Open:

New Years Day
Presidents' Day
Memorial Day
4th of July
Labor Day
Columbus Day
Veterans' Day
Friday after Thanksgiving Day
Day after Christmas
*/

// Checks date to check for season
function checkSeason() {
  const today = new Date()
  const summerStart = new Date(today.getFullYear(), 4, 1)
  const summerEnd = new Date(today.getFullYear(), 10, 1)
  return ((summerStart.getTime() <= today.getTime()) && (today.getTime() <= summerEnd.getTime()));
}

const Home = () => {
  const [summer, setSummer] = React.useState(checkSeason());
  return (
  <div>
  <Helmet>
    <title>US Airsoft Field</title>
  </Helmet>
  <div className="background-static-all">
    <BackgroundVideo/>
    <Container fluid={true}>
      {/* <Row className="text-center justify-content-row">
        <Col className="col-settings" md={8}>
          <div className="counter boxes-home boxes-home-nopadbot about-div-home">
            <h2 className="header-about-us">About Us:</h2>
            <h5 className="about-us" data-to="1700" data-speed="1500">
              U.S. AIRSOFT is the premier airsoft arena in the U.S. We are located in Anderson, CA - Just outside of Redding.
              We have over 10 acres dedicated to Airsoft. We pride ourselves on being the first arena to provide stat tracking and leaderboards.
            </h5>
            <img src={logo} alt="US Airsoft logo" className="small-logo-home"/>
          </div>
        </Col>
      </Row> */}
      <div>

      <Row className="justify-content-row" style={{marginTop: '3rem'}}>
        <h2 className="header-about-us">Hours of Operation</h2>
      </Row>
      <Row className="season-button-row justify-content-center">
        <Col lg={1} className="justify-content-flex-end-col">
          <MUIButton variant="outlined" className={summer ? "season-button-active" : null} onClick={() => {
            setSummer(true)
            }}>Summer</MUIButton>
        </Col>
        <Col lg={1}>
          <MUIButton variant="outlined" className={!summer ? "season-button-active" : null} onClick={() => {
            setSummer(false)
            }}>Winter</MUIButton>
        </Col>
      </Row>
      <Row className="justify-content-row">
        <Col md={2}>
          <Row className="justify-content-row">
            <h5 className="h5-hours-subheader">
              Arena / Field<br/>
            </h5>
          </Row>
          <Row className="justify-content-row">
            {summer ?
            <dl className="dl-hours-info">
              <dt className="dt-hours-info">FRI: 6PM - 11PM</dt>
              <dt className="dt-hours-info">SAT: 8AM - 2PM</dt>
              <dt className="dt-hours-info">SUN: 8AM - 2PM</dt>
            </dl> :
            <dl className="dl-hours-info">
              <dt className="dt-hours-info">FRI: CLOSED</dt>
              <dt className="dt-hours-info">SAT: 9AM - 3PM</dt>
              <dt className="dt-hours-info">SUN: 9AM - 3PM</dt>
            </dl>
            }
          </Row>
        </Col>
        <Col md={2}>
          <Row className="justify-content-row">
            <h5 className="h5-hours-subheader">
              Tactical Store<br/>
            </h5>
          </Row>
          <Row className="justify-content-row">
            {summer ?
              <dl style={{textAlign: 'center'}}>
                {/* <dt className="dt-hours-info">Monday- Closed</dt> */}
                <dt className="dt-hours-info">MON-THU: 9AM - 5PM</dt>
                <dt className="dt-hours-info">FRI: 9AM - 11PM</dt>
                <dt className="dt-hours-info">SAT: 8AM - 4PM</dt>
                <dt className="dt-hours-info">SUN: 8AM - 4PM</dt>
              </dl> : 
              <dl style={{textAlign: 'center'}}>
                {/* <dt className="dt-hours-info">Monday- Closed</dt> */}
                <dt className="dt-hours-info">MON-FRI: 9AM - 5PM</dt>
                <dt className="dt-hours-info">SAT: 9AM - 5PM</dt>
                <dt className="dt-hours-info">SUN: 9AM - 5PM</dt>
              </dl>
              }
          </Row>
        </Col>
        {/* <div className="counter hours-home boxes-home boxes-home-nopadbot">
          <Row className="justify-content-row">
            <h2 className="header-about-us">Hours of Operation:</h2>
          </Row>
            <Row>
              <Col md={4} className="col-hours-header">
                <h5 className="h5-hours-subheader">
                  <b>Arena / Field:<br/></b>
                </h5>
              </Col>
              <Col md={4} className="col-hours">
                  <dl className="dl-hours-info">
                    <dt className="p-hours-season">Summer</dt>
                    <dt className="dt-hours-info">Friday- 6pm to 11pm</dt>
                    <dt className="dt-hours-info">Saturday- 8am to 2pm</dt>
                    <dt className="dt-hours-info">Sunday- 8am to 2pm</dt>
                  </dl>
              </Col>
              <Col md={4} className="col-hours">
                  <dl className="dl-hours-info">
                    <dt className="p-hours-season">Winter</dt>
                    <dt className="dt-hours-info">Friday- Closed</dt>
                    <dt className="dt-hours-info">Saturday- 9am to 3pm</dt>
                    <dt className="dt-hours-info">Sunday- 9am to 3pm</dt>
                  </dl>
              </Col>
              <Col md={4} className="col-hours-header">
                <h5 className="h5-hours-subheader">
                  <b>Tactical Store:<br/></b>
                </h5>
              </Col>
              <Col md={4} className="col-hours">
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
              <Col md={4} className="col-hours">
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
              <Col md={4}>
              </Col>
              <Col md={4} className="col-hours">
                <p className="p-hours-season-month">*Summer is June - October.</p>
              </Col>
              <Col md={4} className="col-hours">
                <p className="p-hours-season-month">*Winter is November - May.</p>
              </Col>
            </Row>
              <img src={logo} alt="US Airsoft logo" className="small-logo-home2 hours-logo-home"/>
          </div> */}
        </Row>
        <Row className="justify-content-row">
          <p className="p-notice-text-home">{summer ? "01 May - 01 Nov" : "02 Nov - 30 Apr"}</p>
        </Row>
      </div>
      </Container>
    </div>
  </div>
  )
}

export default Home;