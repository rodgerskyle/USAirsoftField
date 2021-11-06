import React, { Component } from 'react';
import { Container, Row, Col } from 'react-bootstrap/';
import logowbg from '../../assets/usairsoft-square-logo.png';
import { Helmet } from 'react-helmet-async';
class About extends Component {
    constructor(props) {
        super(props);

        this.state = {
        };
    }
    render() {
        return (
            <div className="background-static-all">
                <Helmet>
                    <title>US Airsoft Field: About Us</title>
                </Helmet>
                <Container>
                    <Row className="row-title-about">
                        <p className="p-header-about">About Us</p>
                    </Row>
                    <Row>
                        <Col md={6} className="col-center-middle">
                            <div>
                                <p className="p-description-about">
                                    U.S. AIRSOFT is the premier airsoft arena in the U.S. 
                                </p>
                                <p className="p-description-about">
                                    We are located in Anderson, CA - Just outside of Redding.
                                </p>
                                <p className="p-description-about">
                                    We have over 10 acres dedicated to Airsoft. 
                                </p>
                                <p className="p-description-about">
                                    We pride ourselves on being the first arena to provide stat tracking and leaderboards.
                                </p>
                            </div>
                        </Col>
                        <Col md={6}>
                            <div>
                                <img src={logowbg} alt="US Airsoft logo"/>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>
        );
    }
}

export default About;