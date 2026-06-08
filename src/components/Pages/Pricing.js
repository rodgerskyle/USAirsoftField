import React, { useState } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faClock, faUsers, faShieldAlt, faTicketAlt } from '@fortawesome/free-solid-svg-icons';
import '../../components/constants/pricing.css';

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

const GAMEPLAY_CARDS = [
    {
        name: 'Member Gamepass',
        price: '$30',
        accent: 'red',
        description: 'For current members who already have what they need to play.',
        items: [
            'Full day of gameplay at US Airsoft',
            'Best value for active members',
        ],
    },
    {
        name: 'Non-Member Gamepass',
        price: '$35',
        accent: 'blue',
        description: 'A straightforward option for players coming out for open play.',
        items: [
            'Full day of gameplay at US Airsoft',
            'Great option for first-time or occasional players',
        ],
    },
    {
        name: 'Member Package',
        price: '$65',
        accent: 'red',
        description: 'For members who want field entry plus the basics to play.',
        items: [
            'Full day of gameplay at US Airsoft',
            'Equipment to play with: mask and gun',
        ],
    },
    {
        name: 'Non-Member Package',
        price: '$75',
        accent: 'blue',
        description: 'An easy all-in starting point for new or visiting players.',
        items: [
            'Full day of gameplay at US Airsoft',
            'Equipment to play with: mask and gun',
        ],
    },
];

const RENTAL_CARDS = [
    {
        name: 'Standard Rental',
        price: '$20',
        accent: 'highlight',
        description: 'The main rental price customers should notice first.',
        items: [
            'Updated rental price for customers',
            'Affordable option for new players',
            'Great add-on for private parties and walk-ins',
        ],
    },
    {
        name: 'Popular Rental Options',
        price: 'Loadout Options',
        accent: 'blue',
        description: 'Most commonly requested gear packages.',
        items: [
            '$20 - Regular Rifle (w/ Mask)',
            '$35 - Pistol (w/ Mask)',
            '$45 - Premier Rifle (w/ Mask)',
            '$55 - Regular Rifle and Pistol (w/ Mask)',
        ],
    },
    {
        name: 'Extra Gear & Add-ons',
        price: 'Add-ons',
        accent: 'dark',
        description: 'Additional equipment available to round out your setup.',
        items: [
            '$5 - Extra Magazine for M4',
            '$5 - Sling Rental',
            '$5 - Regular Full Face Mask',
            '$6 - Extra Magazine for 1911 (EF)',
            '$10 - 9.6v Battery 1600mAh',
            '$10 - Dye I4 Mask',
            '$15 - Dye I5 Mask',
            '$15 - Vest Rental (Comes with 2 Magazines)',
        ],
    },
];

const MEMBERSHIP_FEATURES = [
    'Unique identification card',
    '$5 off rental equipment and gameplay',
    'Saved waiver for easier check-in',
    'Stat tracking to show progress and performance',
    'Personal account access',
    'Ability to create and join teams online',
    'Free game for every 450 points earned',
    'US Airsoft velcro patch',
    'US Airsoft rank patch',
];

const PARTY_CARDS = [
    {
        name: 'Weekend Package #1',
        price: '$300',
        accent: 'red',
        description: 'Smaller birthday or group package.',
        items: [
            '6 players',
            '6 rentals with masks',
            '1 large pizza',
            '1 soda (2 liter)',
            '1 US Airsoft birthday patch',
            'Additional players are $50 each',
        ],
    },
    {
        name: 'Weekend Package #2',
        price: '$400',
        accent: 'blue',
        description: 'Balanced option for a medium-sized group.',
        items: [
            '10 players',
            '10 rentals with masks',
            '2 large pizzas',
            '2 sodas (2 liter)',
            '1 US Airsoft birthday patch',
            'Additional players are $40 each',
        ],
    },
    {
        name: 'Weekend Package #3',
        price: '$760',
        accent: 'red',
        description: 'Built for larger parties and bigger groups.',
        items: [
            '20 players',
            '20 rentals with masks',
            '4 large pizzas',
            '4 sodas (2 liter)',
            '1 US Airsoft birthday patch',
            'Additional players are $38 each',
        ],
    },
];

const SECTION_BUTTONS = [
    { key: PRICING_SECTIONS.GAMEPLAY, label: 'Gameplay', icon: faTicketAlt },
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

const SummaryStrip = () => (
    <div className="pricing-modern-summary">
        <div className="pricing-modern-summary-item">
            <span className="pricing-modern-summary-value">$20</span>
            <span className="pricing-modern-summary-label">Standard rental</span>
        </div>
        <div className="pricing-modern-summary-item">
            <span className="pricing-modern-summary-value">$30</span>
            <span className="pricing-modern-summary-label">Member gamepass</span>
        </div>
        <div className="pricing-modern-summary-item">
            <span className="pricing-modern-summary-value">$400</span>
            <span className="pricing-modern-summary-label">Battle Arena private booking</span>
        </div>
    </div>
);

const GameplaySection = () => (
    <div className="pricing-modern-section-body">
        <Row className="g-4">
            {GAMEPLAY_CARDS.map((card) => (
                <Col key={card.name} md={6}>
                    <PricingCard {...card} />
                </Col>
            ))}
        </Row>
    </div>
);

const RentalSection = () => (
    <div className="pricing-modern-section-body">
        <Row className="g-4">
            <Col lg={5}>
                <PricingCard {...RENTAL_CARDS[0]} badge="Most Requested" />
            </Col>
            <Col lg={7}>
                <Row className="g-4">
                    {RENTAL_CARDS.slice(1).map((card) => (
                        <Col key={card.name} md={12}>
                            <PricingCard {...card} />
                        </Col>
                    ))}
                </Row>
            </Col>
        </Row>
    </div>
);

const MembershipSection = () => (
    <div className="pricing-modern-section-body">
        <div className="pricing-modern-membership">
            <div className="pricing-modern-membership-side">
                <p className="pricing-modern-card-name">Annual Membership</p>
                <h3 className="pricing-modern-hero-price">$60</h3>
                <p className="pricing-modern-card-description">
                    Best for returning players who want discounts, stat tracking, easier check-in, and a more complete account experience.
                </p>
                <p className="pricing-modern-renewal-note">Renewals are also $60 per year.</p>
            </div>
            <div className="pricing-modern-membership-main">
                <FeatureList items={MEMBERSHIP_FEATURES} />
            </div>
        </div>
    </div>
);

const PartiesSection = () => (
    <div className="pricing-modern-section-body">
        <div className="pricing-modern-callout">
            <div className="pricing-modern-callout-copy">
                <p className="pricing-modern-callout-eyebrow">Battle Arena</p>
                <h3 className="pricing-modern-callout-title">Private arena booking for Nerf or Airsoft</h3>
                <p className="pricing-modern-card-description">
                    Available Wednesday through Sunday, with a simple private-session format for birthdays and groups.
                </p>
                <div className="pricing-modern-callout-pills">
                    <span>12:30 PM - 4:00 PM</span>
                    <span>Up to 10 players</span>
                    <span>$25 each additional player</span>
                    <span>Rentals available for $20</span>
                </div>
            </div>
            <div className="pricing-modern-callout-price">
                <span className="pricing-modern-callout-amount">$400</span>
                <span className="pricing-modern-callout-caption">Private session</span>
            </div>
        </div>

        <Row className="g-4 mt-1">
            {PARTY_CARDS.map((card) => (
                <Col key={card.name} lg={4}>
                    <PricingCard {...card} />
                </Col>
            ))}
        </Row>
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
    const [activeSection, setActiveSection] = useState(PRICING_SECTIONS.GAMEPLAY);
    const resolvedSection = SECTION_META[activeSection] ? activeSection : PRICING_SECTIONS.GAMEPLAY;
    const activeMeta = SECTION_META[resolvedSection];

    const renderSection = () => {
        switch (resolvedSection) {
            case PRICING_SECTIONS.GAMEPLAY:
                return <GameplaySection />;
            case PRICING_SECTIONS.RENTALS:
                return <RentalSection />;
            case PRICING_SECTIONS.MEMBERSHIP:
                return <MembershipSection />;
            case PRICING_SECTIONS.PARTIES:
                return <PartiesSection />;
            default:
                return <GameplaySection />;
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
                    <p className="pricing-modern-copy">
                        {activeMeta.intro}
                    </p>
                    <SummaryStrip />
                </section>

                <div className="pricing-modern-tabs" role="tablist" aria-label="Pricing sections">
                    {SECTION_BUTTONS.map((section) => (
                        <button
                            key={section.key}
                            type="button"
                            className={resolvedSection === section.key ? 'pricing-modern-tab active' : 'pricing-modern-tab'}
                            onClick={() => setActiveSection(section.key)}
                            aria-pressed={resolvedSection === section.key}
                        >
                            <FontAwesomeIcon icon={section.icon} />
                            <span>{section.label}</span>
                        </button>
                    ))}
                </div>

                <section className="pricing-modern-panel">
                    <div className="pricing-modern-panel-header">
                        <p className="pricing-modern-panel-eyebrow">{activeMeta.eyebrow}</p>
                        <h2 className="pricing-modern-panel-title">{activeMeta.title}</h2>
                    </div>
                    <div>{renderSection()}</div>
                </section>

                <ContactCta />
            </Container>
        </div>
    );
};

export default Pricing;
