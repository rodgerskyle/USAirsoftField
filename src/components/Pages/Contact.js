import React, { useState } from 'react';
import '../../App.css';
import store_front from '../../assets/store_front.jpg';
import { Row, Container, Col } from 'react-bootstrap/';
import GMap from './GoogleMap';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import useFieldResources from '../constants/useFieldResources';
import { breakdown, estimateParty, money, partyPackages } from '../constants/partyEstimate';
import {
    FontAwesomeIcon
} from '@fortawesome/react-fontawesome';
import { faPhone, faMapMarkerAlt, faEnvelope } from '@fortawesome/free-solid-svg-icons';

import './contact.css';

function PartyInquiry({ name, players }) {
    const { resources, failed } = useFieldResources();
    const [date, setDate] = useState('');
    if (!resources && !failed) return <p role="status">Loading your party estimate…</p>;
    const pack = partyPackages(resources?.pricing?.parties).find(item => item.name === name);
    const quote = estimateParty(pack, players);
    if (!quote) return <p role="status">For a current estimate, <Link to="/pricing?section=parties">choose your party package</Link> or call the field.</p>;

    const subject = `Party inquiry for ${quote.players} ${quote.players === 1 ? 'player' : 'players'}`;
    const body = [
        'Hi USAW,', '',
        `I would like to check availability for ${pack.name} with ${quote.players} ${quote.players === 1 ? 'player' : 'players'}.`,
        ...(date ? [`Our preferred date is ${date}.`] : []),
        `Estimated total: ${money(quote.total)} (${breakdown(pack, quote)}).`, '',
        'Please let me know the next steps to book. Thank you!',
    ].join('\r\n');
    const mail = `mailto:support@usairsoft.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return <section className="contact-party-inquiry" aria-labelledby="party-inquiry-title">
        <h2 id="party-inquiry-title">Your party inquiry</h2>
        <p><strong>{pack.name}</strong> · {quote.players} {quote.players === 1 ? 'player' : 'players'}</p>
        <p>Estimated total <strong>{money(quote.total)}</strong> · {breakdown(pack, quote)}</p>
        <label>Preferred date (optional)<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
        <p>Send your details to the field to confirm availability and book.</p>
        <a className="btn btn-primary" href={mail}>Open email with booking request</a>
    </section>;
}

const Contact = () => {
    const [showMap] = useState(true);
    const [params] = useSearchParams();

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

                    {params.has('party') && <PartyInquiry name={params.get('party')} players={params.get('players')} />}
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
