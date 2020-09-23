import React from 'react';
import banner from '../../assets/banner.png';
import logo from '../../assets/logo.png';
import { Carousel } from 'react-bootstrap/';
import { Container, Row, Col } from 'react-bootstrap/';
import BackgroundVideo from '../constants/backgroundvideo';

const Home = () => (
  <div>
  <BackgroundVideo/>
    <div className="banner">
      <Carousel>
        <Carousel.Item>
          <img src={banner} alt="US Airsoft logo with player" className="bannerimg" />
        </Carousel.Item>
      </Carousel>
    </div>
  <div className="background-static-all">
    <Container fluid={true}>
      <Row className="text-center stat-box">
        <Col className="col-settings">
          <div className="counter boxes-home boxes-home-nopadbot">
            <h2>About Us:</h2>
            <h5 className="about-us" data-to="1700" data-speed="1500">
              U.S. AIRSOFT WORLD is the premier airsoft arena in the U.S. We are located in Anderson, CA - Just outside of Redding.
              We have over 10 acres dedicated to Airsoft. We pride ourselves on being the first arena to provide stat tracking and leaderboards.
            </h5>
            <img src={logo} alt="US Airsoft logo" className="small-logo-home"/>
          </div>
        </Col>
        <Col className="col-settings">
          <div className="counter video-box-home boxes-home">
            <iframe title="Video" src="https://player.vimeo.com/video/84006688" width="340" height="233.83" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen></iframe>
          </div>
        </Col>
      </Row>
      <Row className="text-center stat-box hours-row-home">
        <div className="counter hours-home boxes-home boxes-home-nopadbot">
          <h2>Hours of Operation:</h2>
          <Row>
            <Col>
              <h5 data-to="1700" data-speed="1500">
                <b>Arena / Field:<br/></b>
              </h5>
                <br/>
                Summer - (June through October)
                <dl>
                  <dt>Friday- 6pm to 11pm</dt>
                  <dt>Saturday- 8am to 2pm</dt>
                  <dt>Sunday- 8am to 2pm</dt>
                </dl>
                  Winter - (November through May)
                  <dl>
                    <dt>Friday- Closed</dt>
                    <dt>Saturday- 9am to 3pm</dt>
                    <dt>Sunday- 9am to 3pm</dt>
                  </dl>
            </Col>
            <Col>
              <h5 data-to="1700" data-speed="1500">
                <b>Tactical Store:<br/></b>
              </h5>
                <br/>
                Summer - (June through October)
                <dl>
                  <dt>Friday- 6pm to 11pm</dt>
                  <dt>Saturday- 8am to 2pm</dt>
                  <dt>Sunday- 8am to 2pm</dt>
                </dl>
                Winter - (November through May)
                <dl>
                  <dt>Friday- Closed</dt>
                  <dt>Saturday- 9am to 3pm</dt>
                  <dt>Sunday- 9am to 3pm</dt>
                </dl>
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