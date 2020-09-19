import React from 'react';
import logo from './assets/us-airsoft-logo.png';
import { Navbar, Nav, Button, NavItem, NavDropdown } from 'react-bootstrap/';
import { Container, Row, Col } from 'react-bootstrap/';
import { Link } from "react-router-dom";
import { LinkContainer } from "react-router-bootstrap";
import SignOutButton from './Signout';
import { AuthUserContext } from './components/session';
import * as ROLES from './components/constants/roles';

const Navigation = ({ authUser }) => (
    <div>
        <AuthUserContext.Consumer>
            {authUser =>
                authUser ? <NavigationAuth authUser={authUser} /> : <NavigationNonAuth />
            }
        </AuthUserContext.Consumer>
    </div>
);

const NavigationAuth = ({ authUser }) => (
    <div className="staticBG">
        <div className="App-header">
            <Container fluid>
                <Row className="header-row">
                    <Col className="align-self-start">
                        <Link to="/">
                            <img src={logo} alt="US Airsoft logo" className="img-fluid logo" />
                        </Link>
                    </Col>
                    <Col className="align-self-end">
                            <NavItem className="logout">
                                <SignOutButton />
                            </NavItem>
                            <p className="welcome">
                                Welcome {authUser.username}!</p>
                    </Col>
                </Row>
            </Container>
            <div className="logobox">
            </div>
            <div className="login">
            </div>
        </div>
        <div>
            <Navbar collapseOnSelect expand="sm" bg="nav" variant="dark" className="navbar-all">
                <Nav className="mr-auto">
                    <NavItem>
                        <Link className="nav-link" to="/">Home</Link>
                    </NavItem>
                </Nav>
                <Navbar.Toggle aria-controls="responsive-navbar-nav" />
                <Navbar.Collapse id="responsive-navbar-nav">
                    <Nav className="mr-auto">
                        <NavItem>
                            <Link className="nav-link" to="/leaderboard">Leaderboard</Link>
                        </NavItem>
                        <NavItem>
                            <Link className="nav-link" to="/teams">Teams</Link>
                        </NavItem>
                        <NavItem>
                            <NavDropdown title="Account" id="nav-dropdown">
                                <LinkContainer to="/account">
                                    <NavDropdown.Item eventKey={1.1}>My Profile</NavDropdown.Item>
                                </LinkContainer>
                                <NavDropdown.Divider />
                                <LinkContainer to="/profilesettings">
                                    <NavDropdown.Item eventKey={1.2}>Settings</NavDropdown.Item>
                                </LinkContainer>
                            </NavDropdown>
                        </NavItem>

                        {!!authUser.roles[ROLES.ADMIN] && (
                            <NavDropdown title="Admin" id="nav-dropdown">
                                <LinkContainer to="/enterwins">
                                    <NavDropdown.Item eventKey={2.1}>Update Wins</NavDropdown.Item>
                                </LinkContainer>
                                <LinkContainer to="/enterlosses">
                                    <NavDropdown.Item eventKey={2.2}>Update Losses</NavDropdown.Item>
                                </LinkContainer>
                                <LinkContainer to="/signup">
                                    <NavDropdown.Item eventKey={2.3}>Register</NavDropdown.Item>
                                </LinkContainer>
                                <NavDropdown.Divider />
                                <LinkContainer to="/admin">
                                    <NavDropdown.Item eventKey={2.4}>Testing</NavDropdown.Item>
                                </LinkContainer>
                            </NavDropdown>
                        )}
                        <NavItem>
                            <NavDropdown title="Media" id="nav-dropdown">
                                <LinkContainer to="/pictures">
                                    <NavDropdown.Item eventKey={3.1}>Pictures</NavDropdown.Item>
                                </LinkContainer>
                                <NavDropdown.Divider />
                                <LinkContainer to="/videos">
                                    <NavDropdown.Item eventKey={3.2}>Videos</NavDropdown.Item>
                                </LinkContainer>
                            </NavDropdown>
                        </NavItem>
                        <NavItem>
                            <Link className="nav-link" to="/waiver">Waiver</Link>
                        </NavItem>
                        <NavItem>
                            <Link className="nav-link" to="/map">Map</Link>
                        </NavItem>
                        <NavItem>
                            <NavDropdown title="Information" id="nav-dropdown">
                                <LinkContainer to="/rules">
                                    <NavDropdown.Item eventKey={4.1}>Rules</NavDropdown.Item>
                                </LinkContainer>
                                <LinkContainer to="/gametypes">
                                    <NavDropdown.Item eventKey={4.2}>Gametypes</NavDropdown.Item>
                                </LinkContainer>
                                <LinkContainer to="/membership">
                                    <NavDropdown.Item eventKey={4.3}>Membership</NavDropdown.Item>
                                </LinkContainer>
                                <LinkContainer to="/pricing">
                                    <NavDropdown.Item eventKey={4.4}>Pricing</NavDropdown.Item>
                                </LinkContainer>
                                <NavDropdown.Divider />
                                <LinkContainer to="/contact">
                                    <NavDropdown.Item eventKey={4.5}>Contact Us</NavDropdown.Item>
                                </LinkContainer>
                            </NavDropdown>
                        </NavItem>
                    </Nav>
                </Navbar.Collapse>
            </Navbar>
        </div>
    </div>
);

const NavigationNonAuth = () => (
    <div className="staticBG">
        <div className="App-header">
            <Container fluid>
                <Row className="header-row">
                    <Col className="align-self-start">
                        <Link to="/">
                            <img src={logo} alt="US Airsoft logo" className="img-fluid logo" />
                        </Link>
                    </Col>
                    <Col className="align-self-end">
                        <div className="login">
                            <Button variant="outline-secondary" className="login-button-nav">
                                <LinkContainer to="/login">
                                    <NavItem>Login</NavItem>
                                </LinkContainer>
                            </Button>
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
        <div>
            <Navbar collapseOnSelect expand="sm" bg="nav" variant="dark" className="navbar-all">
                <Nav className="mr-auto">
                    <NavItem>
                        <Link className="nav-link" to="/">Home</Link>
                    </NavItem>
                </Nav>
                <Navbar.Toggle aria-controls="responsive-navbar-nav" />
                <Navbar.Collapse id="responsive-navbar-nav">
                    <Nav className="mr-auto">
                        <NavItem>
                            <Link className="nav-link" to="/leaderboard">Leaderboard</Link>
                        </NavItem>
                        <NavItem>
                            <Link className="nav-link" to="/teams">Teams</Link>
                        </NavItem>
                        <NavItem>
                            <NavDropdown title="Media" id="nav-dropdown">
                                <LinkContainer to="/pictures">
                                    <NavDropdown.Item eventKey={1.1}>Pictures</NavDropdown.Item>
                                </LinkContainer>
                                <NavDropdown.Divider />
                                <LinkContainer to="/videos">
                                    <NavDropdown.Item eventKey={1.2}>Videos</NavDropdown.Item>
                                </LinkContainer>
                            </NavDropdown>
                        </NavItem>
                        <NavItem>
                            <Link className="nav-link" to="/waiver">Waiver</Link>
                        </NavItem>
                        <NavItem>
                            <Link className="nav-link" to="/map">Map</Link>
                        </NavItem>
                        <NavItem>
                            <NavDropdown title="Information" id="nav-dropdown">
                                <LinkContainer to="/rules">
                                    <NavDropdown.Item eventKey={2.1}>Rules</NavDropdown.Item>
                                </LinkContainer>
                                <LinkContainer to="/gametypes">
                                    <NavDropdown.Item eventKey={2.2}>Gametypes</NavDropdown.Item>
                                </LinkContainer>
                                <LinkContainer to="/membership">
                                    <NavDropdown.Item eventKey={2.3}>Membership</NavDropdown.Item>
                                </LinkContainer>
                                <LinkContainer to="/pricing">
                                    <NavDropdown.Item eventKey={2.4}>Pricing</NavDropdown.Item>
                                </LinkContainer>
                                <NavDropdown.Divider />
                                <LinkContainer to="/contact">
                                    <NavDropdown.Item eventKey={2.5}>Contact Us</NavDropdown.Item>
                                </LinkContainer>
                            </NavDropdown>
                        </NavItem>
                    </Nav>
                </Navbar.Collapse>
            </Navbar>
        </div>
    </div>
);

export default Navigation;