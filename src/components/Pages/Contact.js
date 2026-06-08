import React, { useState } from 'react';
import '../../App.css';
import store_front from '../../assets/store_front.jpg';
import { Row, Container, Col } from 'react-bootstrap/';
import GMap from './GoogleMap';
import { Helmet } from 'react-helmet-async';
import {
    FontAwesomeIcon
} from '@fortawesome/react-fontawesome';
import { faPhone, faMapMarkerAlt, faEnvelope } from '@fortawesome/free-solid-svg-icons';

import './contact.css';

const Contact = () => {
    const [showMap] = useState(true);

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
            <Container fluid className="public-page-shell">
                <section className="public-section contact-modern-section">
                    <div className="public-section-heading">
                        <p className="public-section-kicker">Reach Out</p>
                        <h1 className="public-section-title">Contact Us</h1>
                        <p className="public-section-copy">
                            Questions about gameplay, pricing, parties, or your visit? Here is the fastest way to reach the team.
                        </p>
                    </div>

                    <Row className="contact-content-wrapper">
                        <Col lg={5} className="contact-info-section">
                            <div className="contact-card">
                                <div className="contact-card-body">
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
                                </div>
                            </div>
                        </Col>

                        <Col lg={7} className="contact-visual-section">
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
                </section>
            </Container>
        </div>
    );
};

export default Contact;
