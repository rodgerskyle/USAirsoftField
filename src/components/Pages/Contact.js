import React, { useState } from 'react';
import '../../App.css';
import store_front from '../../assets/store_front.jpg';
import { Row, Container, Button, Col, Card, Form } from 'react-bootstrap/';
import GMap from './GoogleMap';
import { Helmet } from 'react-helmet-async';
import {
    FontAwesomeIcon
} from '@fortawesome/react-fontawesome';
import { faPhone, faMapMarkerAlt, faEnvelope } from '@fortawesome/free-solid-svg-icons';

import './contact.css';

const Contact = () => {
    const [showMap, setShowMap] = useState(true);

    const location = {
        address: '4506 Panorama Point Road, Anderson, California',
        lat: 40.41987,
        lng: -122.25496,
    };

    return (
        <div className="contact-page-wrapper">
            <Helmet>
                <title>US Airsoft Field: Contact Us</title>
            </Helmet>
            <Container>
                <h1 className="contact-page-title">Contact Us</h1>

                <Row className="contact-content-wrapper">
                    <Col lg={6} className="contact-info-section">
                        <Card className="contact-card">
                            <Card.Body>
                                <h2 className="contact-card-title">US Airsoft</h2>
                                <div className="contact-details">
                                    <div className="contact-item">
                                        <FontAwesomeIcon icon={faMapMarkerAlt} className="contact-icon" />
                                        <div>
                                            <p>4506 Panorama Point Road</p>
                                            <p>Anderson, CA, 96007</p>
                                        </div>
                                    </div>
                                    <div className="contact-item">
                                        <FontAwesomeIcon icon={faPhone} className="contact-icon" />
                                        <a href="tel:5303651000" className="contact-link">(530) 365-1000</a>
                                    </div>
                                    <div className="contact-item">
                                        <FontAwesomeIcon icon={faEnvelope} className="contact-icon" />
                                        <a href="mailto:support@usairsoft.com" className="contact-link">support@usairsoft.com</a>
                                    </div>
                                </div>
                                {/* <Button
                                    variant="primary"
                                    className="location-toggle-btn mt-3"
                                    onClick={() => setShowMap(!showMap)}
                                >
                                    {!showMap ? 'View on Map' : 'Show Store'}
                                </Button> */}
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={6} className="contact-visual-section">
                        <div className="contact-visual-wrapper">
                            {!showMap ? (
                                <img
                                    src={store_front}
                                    alt="US Airsoft store front"
                                    className="store-image"
                                />
                            ) : (
                                <GMap location={location} zoomLevel={17} />
                            )}
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Contact;