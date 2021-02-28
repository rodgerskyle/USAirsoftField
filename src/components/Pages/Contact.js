import React, { Component } from 'react';
import '../../App.css';
import store_front from '../../assets/store_front.jpg';
import { Row, Container, Button, Col } from 'react-bootstrap/';
import GMap from './GoogleMap';
import { Helmet } from 'react-helmet-async';

class Contact extends Component {
    constructor(props) {
        super(props);

        this.state = {
            showMap: false,
        };
    }


    render() {
    const location = {
        address: '4506 Panorama Point Road, Anderson, California',
        lat: 40.41987,
        lng: -122.25496,
      }
        return (
            <div className="background-static-all">
                <Helmet>
                    <title>US Airsoft Field: Contact Us</title>
                </Helmet>
                <Container>
                    <Row className="justify-content-row">
                        <Col md={10}>
                            <p className="p-header-about">Contact Us</p>
                        </Col>
                    </Row>
                    <Row className="row-contact">
                        <Col className="text-col-contact" md={4}>
                            <Row className="text-row-contact">
                                <Col>
                                    <Row>
                                        <h2>US Airsoft</h2>
                                    </Row>
                                    <Row>
                                        <p><i>4506 Panorama Point Road</i></p>
                                    </Row>
                                    <Row>
                                        <p><i>Anderson, CA, 96007</i></p>
                                    </Row>
                                    <Row>
                                        <p><i>(530)365-1000</i></p>
                                    </Row>
                                    <Row>
                                        <Button variant="primary" onClick={() => {this.setState({showMap: !this.state.showMap})}}>
                                            {!this.state.showMap ? 'Show map' : 'Show store'}</Button>
                                    </Row>
                                </Col>
                            </Row>
                        </Col>
                        <Col md={6}>
                            {!this.state.showMap ?
                            <Row className="img-row-contact">
                                <img src={store_front} alt="US Airsoft store front" className="img-contact"/>
                            </Row>
                            : 
                                <GMap location={location} zoomLevel={17}/>
                            }
                        </Col>
                    </Row>
                </Container>
            </div>
        );
    }
}


export default Contact;