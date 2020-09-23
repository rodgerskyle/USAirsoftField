import React from 'react';
import logo from './assets/us-airsoft-logo.png';
import { Navbar, Nav, Button, NavItem, NavDropdown } from 'react-bootstrap/';
import { Row } from 'react-bootstrap/';
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
        <div>
            <Navbar collapseOnSelect expand="sm" bg="nav" variant="dark" className="navbar-all">
                <Nav className="mr-auto">
                    <NavItem>
                        <Link to="/">
                            <img src={logo} alt="US Airsoft logo" className="img-fluid logo" />
                        </Link>
                    </NavItem>
                </Nav>
                <Navbar.Toggle aria-controls="responsive-navbar-nav" />
                <Navbar.Collapse id="responsive-navbar-nav">
                    <Nav className="mr-auto">
                        <NavItem>
                            <Link className="nav-link" to="/">Home</Link>
                        </NavItem>
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
                    <Nav className="ml-auto">
                        <NavItem className="logout">
                            <Row>
                                <p className="welcome">
                                    Welcome {authUser.username}!
                                </p>
                            </Row>
                            <Row>
                                <SignOutButton />
                            </Row>
                        </NavItem>
                    </Nav>
                </Navbar.Collapse>
            </Navbar>
        </div>
);

const NavigationNonAuth = () => (
        <div>
            <Navbar collapseOnSelect expand="sm" bg="nav" variant="dark" className="navbar-all">
                <Nav className="mr-auto">
                    <NavItem>
                        <Link to="/">
                            <img src={logo} alt="US Airsoft logo" className="img-fluid logo" />
                        </Link>
                    </NavItem>
                </Nav>
                <Navbar.Toggle aria-controls="responsive-navbar-nav" />
                <Navbar.Collapse id="responsive-navbar-nav">
                    <Nav className="mr-auto">
                        <NavItem>
                            <Link className="nav-link" to="/">Home</Link>
                        </NavItem>
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
                    <Nav className="ml-auto">
                        <Button variant="outline-secondary" className="login-button-nav">
                            <NavItem>
                                <Link className="nav-link" to="/login">Login</Link>
                            </NavItem>
                        </Button>
                    </Nav>
                </Navbar.Collapse>
            </Navbar>
        </div>
);

export default Navigation;