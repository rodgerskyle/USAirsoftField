import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Fade } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import GradientButton from '../constants/gradientbutton';
import { Helmet } from 'react-helmet-async';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import '../../components/constants/pricing.css';

const PRICING_SECTIONS = {
    MEMBERSHIP: 0,
    ADMISSION: 1,
    RENTAL: 2,
};

const SECTION_TITLES = {
    [PRICING_SECTIONS.MEMBERSHIP]: "Membership Pricing",
    [PRICING_SECTIONS.ADMISSION]: "Admission Pricing",
    [PRICING_SECTIONS.RENTAL]: "Rental Pricing",
};

const MembershipSection = () => (
    <Row className="justify-content-center">
        <Col sm={6}>
            <Card className="pricing-card">
                <Card.Header className="text-center premium-card-header">MEMBERSHIP</Card.Header>
                <Card.Body>
                    <Card.Title className="text-center price-title">$60.00</Card.Title>
                    <ul className="pricing-features">
                        {[
                            'Unique Identification Card',
                            '$5.00 off rental equipment and gameplay',
                            'Saved waiver for easy check-in',
                            'Stat tracking to display performance and progress',
                            'Your own personal account',
                            'Ability to create/join teams online',
                            'Free game for every 450 points earned',
                            'US Airsoft Velcro Patch',
                            'US Airsoft Rank Patch'
                        ].map((feature, index) => (
                            <li key={index} className="pricing-feature">
                                <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                {feature}
                            </li>
                        ))}
                    </ul>
                    <p className="text-center mt-4">
                        Memberships last a year and will be $60 on renewal.
                    </p>
                </Card.Body>
            </Card>
        </Col>
    </Row>
);

const AdmissionSection = () => (
    <div className="pricing-section">
        <Row className="pricing-row">
            <Col sm={6}>
                <Card className="pricing-card">
                    <Card.Header className="text-center member-card-header">MEMBER GAMEPASS</Card.Header>
                    <Card.Body>
                        <Card.Title className="text-center price-title">$30.00</Card.Title>
                        <ul className="pricing-features">
                            <li className="pricing-feature">
                                <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                Full day of Gameplay at US Airsoft
                            </li>
                        </ul>
                    </Card.Body>
                </Card>
            </Col>
            <Col sm={6}>
                <Card className="pricing-card">
                    <Card.Header className="text-center non-member-card-header">NON-MEMBER GAMEPASS</Card.Header>
                    <Card.Body>
                        <Card.Title className="text-center price-title">$35.00</Card.Title>
                        <ul className="pricing-features">
                            <li className="pricing-feature">
                                <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                Full day of Gameplay at US Airsoft
                            </li>
                        </ul>
                    </Card.Body>
                </Card>
            </Col>
        </Row>

        <Row className="pricing-row mt-4">
            <Col sm={6}>
                <Card className="pricing-card">
                    <Card.Header className="text-center member-card-header">MEMBER PACKAGE</Card.Header>
                    <Card.Body>
                        <Card.Title className="text-center price-title">$65.00</Card.Title>
                        <ul className="pricing-features">
                            <li className="pricing-feature">
                                <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                Full day of Gameplay at US Airsoft
                            </li>
                            <li className="pricing-feature">
                                <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                Equipment to play with (Mask & Gun)
                            </li>
                        </ul>
                    </Card.Body>
                </Card>
            </Col>
            <Col sm={6}>
                <Card className="pricing-card">
                    <Card.Header className="text-center non-member-card-header">NON-MEMBER PACKAGE</Card.Header>
                    <Card.Body>
                        <Card.Title className="text-center price-title">$75.00</Card.Title>
                        <ul className="pricing-features">
                            <li className="pricing-feature">
                                <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                Full day of Gameplay at US Airsoft
                            </li>
                            <li className="pricing-feature">
                                <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                Equipment to play with (Mask & Gun)
                            </li>
                        </ul>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    </div>
);

const RentalSection = () => (
    <div className="pricing-section">
        <Row>
            <Col sm={6}>
                <Card className="pricing-card">
                    <Card.Header className="text-center member-card-header">MEMBER RENTAL</Card.Header>
                    <Card.Body>
                        <ul className="pricing-features">
                            {[
                                '$35.00 - Regular Rifle (w/ Mask)',
                                '$30.00 - Pistol (w/ Mask)',
                                '$45.00 - Premier Rifle (w/ Mask)',
                                '$55.00 - Regular Rifle and Pistol (w/ Mask)'
                            ].map((item, index) => (
                                <li key={index} className="pricing-feature">
                                    <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </Card.Body>
                </Card>
            </Col>
            <Col sm={6}>
                <Card className="pricing-card">
                    <Card.Header className="text-center non-member-card-header">NON-MEMBER RENTAL</Card.Header>
                    <Card.Body>
                        <ul className="pricing-features">
                            {[
                                '$40.00 - Regular Rifle (w/ Mask)',
                                '$35.00 - Pistol (w/ Mask)',
                                '$50.00 - Premier Rifle (w/ Mask)',
                                '$60.00 - Regular Rifle and Pistol (w/ Mask)'
                            ].map((item, index) => (
                                <li key={index} className="pricing-feature">
                                    <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                    {item}
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
                    <Card.Header className="text-center premium-card-header">OTHER RENTAL EQUIPMENT</Card.Header>
                    <Card.Body>
                        <ul className="pricing-features">
                            {[
                                '$5.00 - Extra Magazine for M4',
                                '$5.00 - Sling Rental',
                                '$5.00 - Regular Full Face Mask',
                                '$6.00 - Extra Magazine for 1911 (EF)',
                                '$10.00 - 9.6v Battery 1600mAh',
                                '$10.00 - Dye I4 Mask',
                                '$15.00 - Dye I5 Mask',
                                '$15.00 - Vest Rental (Comes with 2 Magazines)'
                            ].map((item, index) => (
                                <li key={index} className="pricing-feature">
                                    <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </Card.Body>
                    <Card.Footer>
                        <div className="text-center" style={{ color: 'var(--text-gray)' }}>
                            Have questions about our rental equipment?
                        </div>
                        <div className="text-center mt-3">
                            <Link to="/contact">
                                <Button className="contact-button">Contact Us</Button>
                            </Link>
                        </div>
                    </Card.Footer>
                </Card>
            </Col>
        </Row>
    </div>
);

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

const Pricing = () => {
    const [activeSection, setActiveSection] = useState(PRICING_SECTIONS.MEMBERSHIP);
    const [title, setTitle] = useState(SECTION_TITLES[PRICING_SECTIONS.MEMBERSHIP]);

    const handleSectionChange = (section) => {
        setActiveSection(section);
        setTitle(SECTION_TITLES[section]);
    };

    const renderSection = () => {
        switch (activeSection) {
            case PRICING_SECTIONS.MEMBERSHIP:
                return <MembershipSection />;
            case PRICING_SECTIONS.ADMISSION:
                return <AdmissionSection />;
            case PRICING_SECTIONS.RENTAL:
                return <RentalSection />;
            default:
                return <MembershipSection />;
        }
    };

    return (
        <div className="pricing-page">
            <Helmet>
                <title>US Airsoft Field: Pricing</title>
                <meta name="description" content="View our competitive pricing for airsoft gameplay, equipment rentals, memberships, and birthday packages." />
            </Helmet>

            <Container>
                <h2 className="pricing-header">{title}</h2>

                <Row className="pricing-nav">
                    {Object.entries(PRICING_SECTIONS).map(([key, value]) => (
                        <Col key={key} md={3} className="mb-3">
                            <GradientButton
                                className="w-100"
                                color={activeSection === value ? "silver-black" : "black-silver"}
                                onClick={() => handleSectionChange(value)}
                            >
                                {key.charAt(0) + key.slice(1).toLowerCase()}
                            </GradientButton>
                        </Col>
                    ))}
                </Row>

                <Fade in={true}>
                    <div>
                        {renderSection()}
                    </div>
                </Fade>
            </Container>
        </div>
    );
};

export default Pricing;