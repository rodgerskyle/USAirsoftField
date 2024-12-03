import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Fade } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import GradientButton from '../constants/gradientbutton';
import { Helmet } from 'react-helmet-async';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import '../../components/constants/pricing.css';

const BirthdaySection = () => (
    <div className="pricing-section">
        <Row>
            <Col sm={4}>
                <Card className="pricing-card">
                    <Card.Header className="text-center weekend-card-header">WEEKEND PACKAGE #1</Card.Header>
                    <Card.Body>
                        <Card.Title className="text-center price-title">$300.00</Card.Title>
                        <ul className="pricing-features">
                            {[
                                '6 Players',
                                '6 Rentals (w/ Masks)',
                                '1x Large Pizza',
                                '1x Soda (2 Liter)',
                                '1x US Airsoft Birthday Patch',
                                'Additional players are $50 each'
                            ].map((feature, index) => (
                                <li key={index} className="pricing-feature">
                                    <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </Card.Body>
                </Card>
            </Col>
            <Col sm={4}>
                <Card className="pricing-card">
                    <Card.Header className="text-center weekend-card-header">WEEKEND PACKAGE #2</Card.Header>
                    <Card.Body>
                        <Card.Title className="text-center price-title">$400.00</Card.Title>
                        <ul className="pricing-features">
                            {[
                                '10 Players',
                                '10 Rentals (w/ Masks)',
                                '2x Large Pizza',
                                '2x Soda (2 Liter)',
                                '1x US Airsoft Birthday Patch',
                                'Additional players are $40 each'
                            ].map((feature, index) => (
                                <li key={index} className="pricing-feature">
                                    <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </Card.Body>
                </Card>
            </Col>
            <Col sm={4}>
                <Card className="pricing-card">
                    <Card.Header className="text-center weekend-card-header">WEEKEND PACKAGE #3</Card.Header>
                    <Card.Body>
                        <Card.Title className="text-center price-title">$760.00</Card.Title>
                        <ul className="pricing-features">
                            {[
                                '20 Players',
                                '20 Rentals (w/ Masks)',
                                '4x Large Pizza',
                                '4x Soda (2 Liter)',
                                '1x US Airsoft Birthday Patch',
                                'Additional players are $38 each'
                            ].map((feature, index) => (
                                <li key={index} className="pricing-feature">
                                    <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </Card.Body>
                </Card>
            </Col>
        </Row>

        <Row className="mt-4">
            <Col sm={4}>
                <Card className="pricing-card">
                    <Card.Header className="text-center weekday-card-header">WEEKDAY PACKAGE #1</Card.Header>
                    <Card.Body>
                        <Card.Title className="text-center price-title">$1000.00</Card.Title>
                        <ul className="pricing-features">
                            {[
                                '30 Players',
                                'No Rental Equipment Distributed',
                                'Additional players are $40 each',
                                'Game Time: 4 Hours'
                            ].map((feature, index) => (
                                <li key={index} className="pricing-feature">
                                    <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </Card.Body>
                </Card>
            </Col>
            <Col sm={4}>
                <Card className="pricing-card">
                    <Card.Header className="text-center weekday-card-header">WEEKDAY PACKAGE #2</Card.Header>
                    <Card.Body>
                        <Card.Title className="text-center price-title">$1200.00</Card.Title>
                        <ul className="pricing-features">
                            {[
                                '20 Players',
                                'Rental Equipment Distributed',
                                'Additional players are $60 each',
                                'Game Time: 4 Hours'
                            ].map((feature, index) => (
                                <li key={index} className="pricing-feature">
                                    <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </Card.Body>
                </Card>
            </Col>
            <Col sm={4}>
                <Card className="pricing-card">
                    <Card.Header className="text-center weekday-card-header">WEEKDAY PACKAGE #3</Card.Header>
                    <Card.Body>
                        <Card.Title className="text-center price-title">$2200.00</Card.Title>
                        <ul className="pricing-features">
                            {[
                                '40 Players',
                                'Rental Equipment Distributed',
                                'Additional players are $55 each',
                                'Game Time: 4 Hours'
                            ].map((feature, index) => (
                                <li key={index} className="pricing-feature">
                                    <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
        <Row className="mt-4">
            <Col sm={12}>
                <Card className="pricing-card">
                    <Card.Body>
                        <h3 className="text-center" style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>
                            Ready to Book or Have Questions?
                        </h3>
                        <p className="text-center" style={{ color: 'var(--text-gray)' }}>
                            Whether you're planning a birthday party, corporate event, or just have questions about our packages,
                            our team is here to help!
                        </p>
                        <p className="text-center" style={{ color: 'var(--text-gray)' }}>
                            Contact us to schedule your event, place a deposit, or get answers to any pricing inquiries.
                        </p>
                        <div className="text-center mt-4">
                            <Link to="/contact">
                                <Button className="contact-button">Contact Us to Book</Button>
                            </Link>
                        </div>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    </div>
);

const PartiesAndEvents = () => {
    const title = "Parties and Events";

    return (
        <div className="pricing-page">
            <Helmet>
                <title>US Airsoft Field: Pricing</title>
                <meta name="description" content="View our competitive pricing for airsoft gameplay, equipment rentals, memberships, and birthday packages." />
            </Helmet>

            <Container>
                <h2 className="pricing-header">{title}</h2>

                <Fade in={true}>
                    <div>
                        <BirthdaySection />
                    </div>
                </Fade>
            </Container>
        </div>
    );
};

export default PartiesAndEvents;