import React from 'react';
import logo from '../../assets/us-airsoft-logo.png';
import { Navbar, Nav, Button, NavItem, NavDropdown, Container, Row, Col } from 'react-bootstrap/';
import { Link } from "react-router-dom";
import { LinkContainer } from "react-router-bootstrap";
import { AuthUserContext } from '../session';
import * as ROLES from '../constants/roles';
import fblogo from '../../assets/SocialMedia/facebook.png';
import twlogo from '../../assets/SocialMedia/twitter.png';
import iglogo from '../../assets/SocialMedia/instagram.png';
import ytlogo from '../../assets/SocialMedia/youtube.png';

const Footer = () => (
    <AuthUserContext.Consumer>
        {authUser =>
            authUser ? <FooterAuth authUser={authUser} /> : <FooterNonAuth />
        }
    </AuthUserContext.Consumer>
);

const FooterAuth = ({ authUser }) => (
        <div className="topdiv-footer">
            <Container>
                <Row>
                    <Col className="all-cols-footer">
                        <Row>
                            <h3 className="header-footer">About US Airsoft</h3>
                        </Row>
                        <Row>
                            <Col xs="auto" className="about-col-left-footer">
                                <Row>
                                    <Link to="contact">Contact Us</Link>
                                </Row>
                                <Row>
                                    <Link to="rules">Our Rules</Link>
                                </Row>
                                <Row>
                                    <Link to="photos">Photos</Link>
                                </Row>
                            </Col>
                            <Col className="about-col-right-footer">
                                <Row>
                                    <Link to="videos">Videos</Link>
                                </Row>
                                <Row>
                                    <Link to="leaderboards">Leaderboards</Link>
                                </Row>
                                <Row>
                                    <Link to="waiver">Waiver</Link>
                                </Row>
                            </Col>
                        </Row>
                    </Col>
                    <Col className="all-cols-footer">
                        <Row>
                            <h3 className="header-footer">My Account</h3>
                        </Row>
                        <Row className="profile-row-footer">
                            <Col xs="auto" className="about-col-left-footer">
                                <Row>
                                    <Link to="account">Profile</Link>
                                </Row>
                                <Row>
                                    <Link to="profilesettings">Settings</Link>
                                </Row>
                            </Col>
                        </Row>
                    </Col>
                </Row>
                <Row>
                    <div className="divider-footer"/>
                </Row>
                <Row className="all-cols-footer">
                    <a href="https://www.facebook.com/USAirsoftworld/">
                        <img src={fblogo} alt="Facebook Logo" className="socials-icons-footer" href/>
                    </a>
                    <a href="https://www.instagram.com/usairsoftworld/">
                        <img src={iglogo} alt="Instagram Logo" className="socials-icons-footer"/>
                    </a>
                    <a href="https://twitter.com/usairsoftworld">
                        <img src={twlogo} alt="Twitter Logo" className="socials-icons-footer"/>
                    </a>
                    <a href="https://www.youtube.com/user/USAirsoftWorldInc">
                        <img src={ytlogo} alt="Youtube Logo" className="socials-icons-footer"/>
                    </a>
                </Row>
            </Container>
        </div>
);

const FooterNonAuth = () => (
    <div className="topdiv-footer">
        <Container>
        </Container>
    </div>
);



export default Footer;