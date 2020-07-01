import React from 'react';
import logo from './assets/us-airsoft-logo.png';
import { Navbar, Nav, Button, NavItem, NavDropdown, image } from 'react-bootstrap/';
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
    <div>
        <div className="App-header">
            <Container fluid>
                <Row>
                    <Col md={4}>
                        <img src={logo} alt="US Airsoft logo" className="img-fluid logo" />
                    </Col>
                    <Col md={{ span: 4, offset: 4 }}>
                            <p className="welcome">
                                Welcome {authUser.username}!</p>
                            <NavItem>
                                <SignOutButton />
                            </NavItem>
                    </Col>
                </Row>
            </Container>
            <div className="logobox">
            </div>
            <div className="login">
            </div>
        </div>
        <div className="navbar">
            <Navbar collapseOnSelect expand="lg" bg="nav" variant="dark">
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
                            <Link className="nav-link" to="/pricing">Pricing</Link>
                        </NavItem>
                        <NavItem>
                            <Link className="nav-link" to="/account">My Account</Link>
                        </NavItem>

                        {!!authUser.roles[ROLES.ADMIN] && (
                            <NavDropdown title="Admin" id="nav-dropdown">
                                <LinkContainer to="/enterwins">
                                    <NavDropdown.Item eventKey={4.1}>Update Wins</NavDropdown.Item>
                                </LinkContainer>
                                <LinkContainer to="/enterlosses">
                                    <NavDropdown.Item eventKey={4.2}>Update Losses</NavDropdown.Item>
                                </LinkContainer>
                                <NavDropdown.Divider />
                                <LinkContainer to="/admin">
                                    <NavDropdown.Item eventKey={4.3}>Testing</NavDropdown.Item>
                                </LinkContainer>
                            </NavDropdown>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Navbar>
        </div>
    </div>
);

const NavigationNonAuth = () => (
    <div>
        <div className="App-header">
            <Container fluid>
                <Row>
                    <Col md={4}>
                        <img src={logo} alt="US Airsoft logo" className="img-fluid logo" />
                    </Col>
                    <Col md={{ span: 4, offset: 4 }}>
                        <div className="login">
                            <Button variant="outline-secondary">
                                <LinkContainer to="/login">
                                    <NavItem>Login</NavItem>
                                </LinkContainer>
                            </Button>
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
        <div className="navbar">
            <Navbar collapseOnSelect expand="lg" bg="nav" variant="dark">
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
                            <Link className="nav-link" to="/pricing">Pricing</Link>
                        </NavItem>
                    </Nav>
                </Navbar.Collapse>
            </Navbar>
        </div>
    </div>
);

export default Navigation;