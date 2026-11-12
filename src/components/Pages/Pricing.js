import React, { useState } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faClock, faUsers, faShieldAlt, faTicketAlt } from '@fortawesome/free-solid-svg-icons';
import '../../components/constants/pricing.css';
import useFieldResources from '../constants/useFieldResources';

const PRICING_SECTIONS = {
    GAMEPLAY: 'gameplay',
    RENTALS: 'rentals',
    MEMBERSHIP: 'membership',
    PARTIES: 'parties',
};

const SECTION_META = {
    [PRICING_SECTIONS.GAMEPLAY]: {
        title: 'Admission Pricing',
        eyebrow: 'Open Play',
        intro: 'Choose the best fit for regular gameplay, whether you already have gear or need a full starter package.',
    },
    [PRICING_SECTIONS.RENTALS]: {
        title: 'Rental Pricing',
        eyebrow: 'Rental Gear',
        intro: 'Simple rental pricing for new players, plus upgrade and add-on options for a better day at the field.',
    },
    [PRICING_SECTIONS.MEMBERSHIP]: {
        title: 'Membership Pricing',
        eyebrow: 'Membership',
        intro: 'Membership is built for returning players who want better value, easier check-in, and long-term progression.',
    },
    [PRICING_SECTIONS.PARTIES]: {
        title: 'Pricing & Parties',
        eyebrow: 'Private Events',
        intro: 'Birthday packages and private arena bookings are organized here so customers can compare options quickly.',
    },
};

const SECTION_BUTTONS = [
    { key: PRICING_SECTIONS.GAMEPLAY, label: 'Open Play', icon: faTicketAlt },
    { key: PRICING_SECTIONS.RENTALS, label: 'Rentals', icon: faShieldAlt },
    { key: PRICING_SECTIONS.MEMBERSHIP, label: 'Membership', icon: faUsers },
    { key: PRICING_SECTIONS.PARTIES, label: 'Parties', icon: faClock },
];

const FeatureList = ({ items }) => (
    <ul className="pricing-modern-list">
        {items.map((item) => (
            <li key={item} className="pricing-modern-list-item">
                <FontAwesomeIcon icon={faCheck} className="pricing-modern-list-icon" />
                <span>{item}</span>
            </li>
        ))}
    </ul>
);

const PricingCard = ({ name, price, accent, description, items, badge }) => (
    <div className={`pricing-modern-card pricing-modern-card-${accent}`}>
        <div className="pricing-modern-card-top">
            {badge ? <span className="pricing-modern-badge">{badge}</span> : null}
            <p className="pricing-modern-card-name">{name}</p>
            <h3 className="pricing-modern-card-price">{price}</h3>
            <p className="pricing-modern-card-description">{description}</p>
        </div>
        <FeatureList items={items} />
    </div>
);

const GameplaySection = ({ cards }) => (
    <div className="pricing-modern-section-body">
        <Row className="g-4">
            {cards.map((card) => (
                <Col key={card.name} md={6}>
                    <PricingCard {...card} />
                </Col>
            ))}
        </Row>
    </div>
);

const RentalSection = ({ cards }) => (
    <div className="pricing-modern-section-body">
        <Row className="g-4">
            <Col lg={5}>
                <PricingCard {...cards[0]} badge="Most Requested" />
            </Col>
            <Col lg={7}>
                <Row className="g-4">
                    {cards.slice(1).map((card) => (
                        <Col key={card.name} md={12}>
                            <PricingCard {...card} />
                        </Col>
                    ))}
                </Row>
            </Col>
        </Row>
    </div>
);

const MembershipSection = ({ membership }) => (
    <div className="pricing-modern-section-body">
        <div className="pricing-modern-membership">
            <div className="pricing-modern-membership-side">
                <p className="pricing-modern-card-name">Annual Membership</p>
                <h3 className="pricing-modern-hero-price">{membership.price}</h3>
                <p className="pricing-modern-card-description">
                    Best for returning players who want discounts, stat tracking, easier check-in, and a more complete account experience.
                </p>
                <p className="pricing-modern-renewal-note">Renewals are {membership.price === membership.renewalPrice ? 'also ' : ''}{membership.renewalPrice} per year.</p>
            </div>
            <div className="pricing-modern-membership-main">
                <FeatureList items={membership.features} />
            </div>
        </div>
    </div>
);

const PartiesSection = ({ parties }) => (
    <div className="pricing-modern-section-body">
        <div className="pricing-modern-callout">
            <div className="pricing-modern-callout-copy">
                <p className="pricing-modern-callout-eyebrow">Nerf Arena</p>
                <h3 className="pricing-modern-callout-title">Private Nerf arena booking</h3>
                <p className="pricing-modern-card-description">
                    {parties.nerf.description}
                </p>
                <div className="pricing-modern-callout-pills">
                    {parties.nerf.details.map((detail) => <span key={detail}>{detail}</span>)}
                </div>
            </div>
            <div className="pricing-modern-callout-price">
                <span className="pricing-modern-callout-amount">{parties.nerf.price}</span>
                <span className="pricing-modern-callout-caption">Private session</span>
            </div>
        </div>

        <Row className="g-4 mt-1">
            {parties.weekend.map((card) => (
                <Col key={card.name} lg={4}>
                    <PricingCard {...card} />
                </Col>
            ))}
        </Row>

        <div className="pricing-modern-subsection">
            <div className="pricing-modern-subsection-header">
                <p className="pricing-modern-callout-eyebrow">Weekday Packages</p>
                <h3 className="pricing-modern-callout-title">Weekday private event options</h3>
            </div>
            <Row className="g-4 mt-1">
                {parties.weekday.map((card) => (
                    <Col key={card.name} lg={4}>
                        <PricingCard {...card} />
                    </Col>
                ))}
            </Row>
        </div>
    </div>
);

const ContactCta = () => (
    <div className="pricing-modern-cta">
        <div>
            <p className="pricing-modern-cta-eyebrow">Questions or booking help</p>
            <h3 className="pricing-modern-cta-title">Need help choosing the right option?</h3>
            <p className="pricing-modern-cta-copy">
                Contact the team to book a party, ask about rentals, or get help picking the best option for your group.
            </p>
        </div>
        <Link to="/contact">
            <Button className="contact-button pricing-modern-cta-button">Contact Us</Button>
        </Link>
    </div>
);

const Pricing = () => {
    const [activeSection, setActiveSection] = useState(null);
    const activeMeta = SECTION_META[activeSection];
    const { resources, failed } = useFieldResources();

    const renderSection = () => {
        if (!resources) {
            return <p className="pricing-modern-copy" role="status">{failed ? 'Pricing is unavailable. Call (530) 365-1000 for current rates.' : 'Loading pricing…'}</p>;
        }
        switch (activeSection) {
            case PRICING_SECTIONS.GAMEPLAY:
                return <GameplaySection cards={resources.pricing.gameplay} />;
            case PRICING_SECTIONS.RENTALS:
                return <RentalSection cards={resources.pricing.rentals} />;
            case PRICING_SECTIONS.MEMBERSHIP:
                return <MembershipSection membership={resources.pricing.membership} />;
            case PRICING_SECTIONS.PARTIES:
                return <PartiesSection parties={resources.pricing.parties} />;
            default:
                return null;
        }
    };

    return (
        <div className="pricing-page">
            <Helmet>
                <title>US Airsoft Field: Pricing</title>
                <meta
                    name="description"
                    content="View pricing for gameplay, rentals, memberships, and private parties at US Airsoft Field."
                />
            </Helmet>

            <Container className="pricing-modern-shell">
                <section className="pricing-modern-hero">
                    <h1 className="pricing-modern-title">Pricing</h1>
                    <p className="pricing-modern-copy">Choose a category to see rates and what’s included.</p>
                </section>

                <div className="pricing-modern-tabs" role="group" aria-label="Pricing categories">
                    {SECTION_BUTTONS.map((section) => (
                        <button
                            key={section.key}
                            type="button"
                            className={activeSection === section.key ? 'pricing-modern-tab active' : 'pricing-modern-tab'}
                            onClick={() => setActiveSection(section.key)}
                            aria-pressed={activeSection === section.key}
                            aria-controls="pricing-details"
                        >
                            <FontAwesomeIcon icon={section.icon} />
                            <span>{section.label}</span>
                        </button>
                    ))}
                </div>

                <div id="pricing-details">
                    {activeMeta && (
                        <section className="pricing-modern-panel" aria-labelledby="pricing-details-title">
                            <div className="pricing-modern-panel-header">
                                <p className="pricing-modern-panel-eyebrow">{activeMeta.eyebrow}</p>
                                <h2 className="pricing-modern-panel-title" id="pricing-details-title">{activeMeta.title}</h2>
                                <p className="pricing-modern-copy">{activeMeta.intro}</p>
                            </div>
                            {renderSection()}
                        </section>
                    )}
                </div>

                <ContactCta />
            </Container>
        </div>
    );
};

export default Pricing;
