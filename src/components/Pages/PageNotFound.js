
import React, { Component } from 'react';

import { Container, Row, Col } from 'react-bootstrap/';
import { Helmet } from 'react-helmet-async';

import logo from '../../assets/usairsoft-small-logo.png';

class PageNotFound extends Component {
    constructor(props) {
        super(props);

        this.state = {
        };
    }

    render() {
        return (
            <div className="background-static-all">
                <Helmet>
                    <title>US Airsoft Field: 404</title>
                </Helmet>
                <Container className="notice-text-container">
                    <Row className="row-success-rp">
                        <Col className="col-rp">
                            <Row className="row-notice">
                                <h2 className="page-header">404 Error:</h2>
                            </Row>
                            <Row className="row-notice">
                                <p className="notice-text">The page you are looking for does not exist or you do not have sufficient privileges.</p>
                            </Row>
                            <Row className="row-notice">
                                <img src={logo} alt="US Airsoft logo" className="small-logo-home"/>
                            </Row>
                        </Col>
                    </Row>
                </Container> 
            </div>
        );
    }
}


export default PageNotFound;