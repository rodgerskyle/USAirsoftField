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
    BIRTHDAY: 3
};

const SECTION_TITLES = {
    [PRICING_SECTIONS.MEMBERSHIP]: "Membership Pricing",
    [PRICING_SECTIONS.ADMISSION]: "Admission Pricing",
    [PRICING_SECTIONS.RENTAL]: "Rental Pricing",
    [PRICING_SECTIONS.BIRTHDAY]: "Birthday Pricing"
};

const MembershipSection = () => (
    <Row className="justify-content-center">
        <Col sm={6}>
            <Card className="pricing-card">
                <Card.Header className="text-center premium-card-header">NEW MEMBERSHIP</Card.Header>
                <Card.Body>
                    <Card.Title className="text-center price-title">$40.00*</Card.Title>
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
                        *$30 annually after the initial $40.
                    </p>
                    <p className="text-center">
                        Please contact us to further inquire about signing up for a membership.
                    </p>
                </Card.Body>
                <Card.Footer className="text-center">
                    <Link to="/contact">
                        <Button variant="primary" className="contact-button">Contact Us</Button>
                    </Link>
                </Card.Footer>
            </Card>
        </Col>
    </Row>
);

const AdmissionSection = () => (
    <div className="pricing-section">
        <Row className="justify-content-center">
            <Col sm={4}>
                <Card className="pricing-card highlight-card">
                    <Card.Header className="text-center new-player-card-header">NEW PLAYER PACKAGE</Card.Header>
                    <Card.Body>
                        <Card.Title className="text-center price-title">$55.00</Card.Title>
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

        <Row className="pricing-row mt-4">
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
    </div>
);

const RentalSection = () => (
    <div className="pricing-section">
        <Row className="justify-content-center">
            <Col sm={6}>
                <Card className="pricing-card">
                    <Card.Header className="text-center standard-card-header-pricing">STANDARD RENTAL PACKAGE</Card.Header>
                    <Card.Body>
                        <Card.Title className="text-center price-title">$25.00</Card.Title>
                        <ul className="pricing-features">
                            <li className="pricing-feature">
                                <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                Full Face Mask
                            </li>
                            <li className="pricing-feature">
                                <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                Electric Gun (AEG)
                            </li>
                            <li className="pricing-feature">
                                <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                Battery & Charger
                            </li>
                            <li className="pricing-feature">
                                <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                Magazine & BBs
                            </li>
                        </ul>
                        <p className="text-center mt-3">
                            *Members receive $5.00 off rental packages
                        </p>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    </div>
);

const BirthdaySection = () => (
    <div className="pricing-section">
        <Row className="justify-content-center">
            <Col sm={8}>
                <Card className="pricing-card">
                    <Card.Header className="text-center birthday-card-header">BIRTHDAY PARTY PACKAGE</Card.Header>
                    <Card.Body>
                        <Card.Title className="text-center price-title">Starting at $299.99</Card.Title>
                        <ul className="pricing-features">
                            <li className="pricing-feature">
                                <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                2 Hours of Private Field Time
                            </li>
                            <li className="pricing-feature">
                                <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                Equipment for up to 10 Players
                            </li>
                            <li className="pricing-feature">
                                <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                Private Party Room
                            </li>
                            <li className="pricing-feature">
                                <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                Dedicated Game Master
                            </li>
                            <li className="pricing-feature">
                                <FontAwesomeIcon icon={faCheck} className="feature-icon text-green" />
                                Special Gift for Birthday Player
                            </li>
                        </ul>
                        <p className="text-center mt-4">
                            Additional players can be added for $25 each (up to 20 total players)
                        </p>
                        <p className="text-center">
                            Contact us for custom packages and additional options
                        </p>
                    </Card.Body>
                    <Card.Footer className="text-center">
                        <Link to="/contact">
                            <Button variant="primary" className="contact-button">Book Now</Button>
                        </Link>
                    </Card.Footer>
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
            case PRICING_SECTIONS.BIRTHDAY:
                return <BirthdaySection />;
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