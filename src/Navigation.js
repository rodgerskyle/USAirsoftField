import React, { useState } from 'react';
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
                authUser ? !!authUser.roles[ROLES.WAIVER] ? <NavigationWaiver authUser={authUser}/> 
                : <NavigationAuth authUser={authUser} /> : <NavigationNonAuth />
            }
        </AuthUserContext.Consumer>
    </div>
);

const NavigationWaiver = ({ authUser }) => (
        <div>
            <Navbar collapseOnSelect expand="xl" bg="nav" variant="dark" className="navbar-all">
                 <Nav className="mr-auto">
                    <NavItem className="navitem-img">
                        <Link to="/dashboard">
                            <img src={logo} alt="US Airsoft logo" className="img-fluid logo" />
                        </Link>
                    </NavItem>
                </Nav>
                <Navbar.Toggle aria-controls="responsive-navbar-nav" />
                <Navbar.Collapse className="justify-content-end" id="responsive-navbar-nav">
                    <Nav className="mr-auto" defaultActiveKey={1}>
                        <Row>
                            <Nav.Link as={Link} className="nav-link" to="/dashboard" eventKey={1}>Dashboard</Nav.Link>
                        </Row>
                    </Nav>
                    <Nav className="ml-auto">
                        <NavItem> 
                            <Row className="logout">
                                <p className="welcome">
                                    Welcome {authUser.username}!
                                </p>
                            </Row>
                            <Row className="logout">
                                <SignOutButton />
                            </Row>
                        </NavItem>
                    </Nav>
                </Navbar.Collapse>
            </Navbar>
        </div>
)

const NavigationAuth = ({ authUser }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div>
            <Navbar expanded={expanded} onToggle={() => setExpanded(!expanded)} expand="xl" bg="nav" variant="dark" className="navbar-all">
                <Nav className="mr-auto">
                    <NavItem className="navitem-img">
                        <Link to="/">
                            <img src={logo} alt="US Airsoft logo" className="img-fluid logo" />
                        </Link>
                    </NavItem>
                </Nav>
                <Navbar.Toggle aria-controls="responsive-navbar-nav"/>
                <Navbar.Collapse id="responsive-navbar-nav">
                    <Nav className="mr-auto center-navbar-nav" defaultActiveKey={1}>
                        <Nav.Link as={Link} className="nav-link" to="/" eventKey={1} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Home</Nav.Link>
                        <Nav.Link as={Link} className="nav-link" to="/leaderboard" eventKey={2} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Leaderboard</Nav.Link>
                        <Nav.Link as={Link} className="nav-link" to="/teams" eventKey={3} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Teams</Nav.Link>
                        <NavItem>
                            <NavDropdown title="Account" id="nav-dropdown">
                                <LinkContainer to="/account">
                                    <NavDropdown.Item eventKey={1.1} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>My Profile</NavDropdown.Item>
                                </LinkContainer>
                                <NavDropdown.Divider />
                                <LinkContainer to="/profilesettings">
                                    <NavDropdown.Item eventKey={1.2} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Settings</NavDropdown.Item>
                                </LinkContainer>
                            </NavDropdown>
                        </NavItem>

                        {!!authUser.roles[ROLES.ADMIN] && (
                        <Nav.Link as={Link} className="nav-link" to="/admin" eventKey={4} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Admin</Nav.Link>
                        )}
                        <NavItem>
                            <NavDropdown title="Media" id="nav-dropdown">
                                <LinkContainer to="/pictures">
                                    <NavDropdown.Item eventKey={3.1} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Pictures</NavDropdown.Item>
                                </LinkContainer>
                                <NavDropdown.Divider />
                                <LinkContainer to="/videos">
                                    <NavDropdown.Item eventKey={3.2} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Videos</NavDropdown.Item>
                                </LinkContainer>
                            </NavDropdown>
                        </NavItem>
                        <Nav.Link as={Link} className="nav-link" to="/waiver" eventKey={5} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Waiver</Nav.Link>
                        <Nav.Link as={Link} className="nav-link" to="/map" eventKey={6} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Map</Nav.Link>
                        <NavItem>
                            <NavDropdown title="Information" id="nav-dropdown">
                                <LinkContainer to="/rules">
                                    <NavDropdown.Item eventKey={4.1} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Rules</NavDropdown.Item>
                                </LinkContainer>
                                <LinkContainer to="/gametypes">
                                    <NavDropdown.Item eventKey={4.2} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Gametypes</NavDropdown.Item>
                                </LinkContainer>
                                <LinkContainer to="/membership">
                                    <NavDropdown.Item eventKey={4.3} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Membership</NavDropdown.Item>
                                </LinkContainer>
                                <LinkContainer to="/pricing">
                                    <NavDropdown.Item eventKey={4.4} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Pricing</NavDropdown.Item>
                                </LinkContainer>
                                <NavDropdown.Divider />
                                <LinkContainer to="/contact">
                                    <NavDropdown.Item eventKey={4.5} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Contact Us</NavDropdown.Item>
                                </LinkContainer>
                            </NavDropdown>
                        </NavItem>
                    </Nav>
                    <Nav className="ml-auto">
                        <NavItem> 
                            <Row className="logout">
                                <p className="welcome">
                                    Welcome {authUser.username}!
                                </p>
                            </Row>
                            <Row className="logout">
                                <SignOutButton />
                            </Row>
                        </NavItem>
                    </Nav>
                </Navbar.Collapse>
            </Navbar>
        </div>
    );
}

const NavigationNonAuth = () => {
    const [expanded, setExpanded] = useState(false);
    return(
        <div>
            <Navbar expanded={expanded} onToggle={() => setExpanded(!expanded)} expand="xl" bg="nav" variant="dark" className="navbar-all">
                 <Nav className="mr-auto" >
                    <NavItem className="navitem-img">
                        <Link to="/">
                            <img src={logo} alt="US Airsoft logo" className="img-fluid logo" />
                        </Link>
                    </NavItem>
                </Nav>
                <Navbar.Toggle aria-controls="responsive-navbar-nav"/>
                <Navbar.Collapse id="responsive-navbar-nav">
                    <Nav className="mr-auto center-navbar-nav" defaultActiveKey={1}>
                        <Nav.Link as={Link} className="nav-link" to="/" eventKey={1} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Home</Nav.Link>
                        <Nav.Link as={Link} className="nav-link" to="/leaderboard" eventKey={2} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Leaderboard</Nav.Link>
                        <Nav.Link as={Link} className="nav-link" to="/teams" eventKey={3} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Teams</Nav.Link>
                        <NavItem>
                            <NavDropdown title="Media" id="nav-dropdown">
                                <LinkContainer to="/pictures">
                                    <NavDropdown.Item eventKey={1.1} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Pictures</NavDropdown.Item>
                                </LinkContainer>
                                <NavDropdown.Divider />
                                <LinkContainer to="/videos">
                                    <NavDropdown.Item eventKey={1.2} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Videos</NavDropdown.Item>
                                </LinkContainer>
                            </NavDropdown>
                        </NavItem>
                        <Nav.Link as={Link} className="nav-link" to="/waiver" eventKey={5} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Waiver</Nav.Link>
                        <Nav.Link as={Link} className="nav-link" to="/map" eventKey={6} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Map</Nav.Link>
                        <NavItem>
                            <NavDropdown title="Information" id="nav-dropdown">
                                <LinkContainer to="/rules">
                                    <NavDropdown.Item eventKey={2.1} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Rules</NavDropdown.Item>
                                </LinkContainer>
                                <LinkContainer to="/gametypes">
                                    <NavDropdown.Item eventKey={2.2} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Gametypes</NavDropdown.Item>
                                </LinkContainer>
                                <LinkContainer to="/membership">
                                    <NavDropdown.Item eventKey={2.3} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Membership</NavDropdown.Item>
                                </LinkContainer>
                                <LinkContainer to="/pricing">
                                    <NavDropdown.Item eventKey={2.4} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Pricing</NavDropdown.Item>
                                </LinkContainer>
                                <NavDropdown.Divider />
                                <LinkContainer to="/contact">
                                    <NavDropdown.Item eventKey={2.5} onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Contact Us</NavDropdown.Item>
                                </LinkContainer>
                            </NavDropdown>
                        </NavItem>
                    </Nav>
                    <Nav className="ml-auto">
                        <Button variant="outline-secondary" className="login-button-nav">
                            <NavItem>
                                <Link className="nav-link" to="/login" onClick={() => setTimeout(() => {setExpanded(false)}, 150)}>Login</Link>
                            </NavItem>
                        </Button>
                    </Nav>
                </Navbar.Collapse>
            </Navbar>
        </div>
    );
}

export default Navigation;