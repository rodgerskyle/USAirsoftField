import React, { useState } from 'react';
import logo from './assets/us-airsoft-logo.png';
import { Button, NavItem, NavDropdown } from 'react-bootstrap/';
import {
    MDBNavbar, MDBNavbarBrand, MDBNavbarNav, MDBNavItem, MDBNavLink, MDBNavbarToggler, MDBCollapse,
    MDBDropdown, MDBDropdownToggle, MDBDropdownMenu, MDBDropdownItem
} from "mdbreact";
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
                authUser ? !!authUser.roles[ROLES.WAIVER] ? <NavigationWaiver authUser={authUser} />
                    : <NavigationAuth authUser={authUser} /> : <NavigationNonAuth />
            }
        </AuthUserContext.Consumer>
    </div>
);

const NavigationWaiver = ({ authUser }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div>
            <MDBNavbar dark expand={"xl"} className="bg-nav">
                <MDBNavbarNav left>
                    <MDBNavbarBrand className="navitem-img">
                        <Link to="/dashboard" onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                            <img src={logo} alt="US Airsoft logo" className="img-fluid logo" />
                        </Link>
                    </MDBNavbarBrand>
                </MDBNavbarNav>
                <MDBNavbarToggler onClick={() => setTimeout(() => { setExpanded(!expanded) }, 150)} />
                <MDBCollapse isOpen={expanded} navbar>
                    <MDBNavbarNav left >
                        <MDBNavItem>
                            <MDBNavLink as={Link} className="nav-link" to="/dashboard" 
                            onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Dashboard
                            </MDBNavLink>
                        </MDBNavItem>
                    </MDBNavbarNav>
                    <MDBNavbarNav right>
                        <MDBNavItem>
                            <Row className="logout">
                                <p className="welcome">
                                    Welcome {authUser.username}!
                                </p>
                            </Row>
                            <Row className="logout">
                                <SignOutButton />
                            </Row>
                        </MDBNavItem>
                    </MDBNavbarNav>
                </MDBCollapse>
            </MDBNavbar>
        </div>
    )
}

const NavigationAuth = ({ authUser }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div>
            <MDBNavbar dark expand={"xl"} className="bg-nav">
                <MDBNavbarNav left>
                    <MDBNavbarBrand className="navitem-img">
                        <Link to="/home" onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                            <img src={logo} alt="US Airsoft logo" className="img-fluid logo" />
                        </Link>
                    </MDBNavbarBrand>
                </MDBNavbarNav>
                <MDBNavbarToggler onClick={() => setTimeout(() => { setExpanded(!expanded) }, 150)} />
                <MDBCollapse isOpen={expanded} navbar>
                    <MDBNavbarNav left >
                        <MDBNavItem>
                            <MDBNavLink as={Link} className="nav-link" to="/home" 
                            onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Home
                            </MDBNavLink>
                        </MDBNavItem>
                        <MDBNavItem>
                            <MDBNavLink as={Link} className="nav-link" to="/leaderboard" onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Leaderboard</MDBNavLink>
                        </MDBNavItem>
                        <MDBNavItem>
                            <MDBNavLink as={Link} className="nav-link" to="/teams" onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Teams</MDBNavLink>
                        </MDBNavItem>
                        <MDBNavItem>
                            <MDBDropdown>
                                <MDBDropdownToggle nav caret>
                                    <span>Account</span>
                                </MDBDropdownToggle> 
                                <MDBDropdownMenu className="dropdown-default">
                                    <LinkContainer to="/account">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>My Profile</MDBDropdownItem>
                                    </LinkContainer>
                                    <NavDropdown.Divider />
                                    <LinkContainer to="/profilesettings">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Settings</MDBDropdownItem>
                                    </LinkContainer>
                                </MDBDropdownMenu>
                            </MDBDropdown>
                        </MDBNavItem>

                        {!!authUser.roles[ROLES.ADMIN] && (
                            <MDBNavItem>
                                <MDBNavLink as={Link} className="nav-link" to="/admin" onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Admin</MDBNavLink>
                            </MDBNavItem>
                        )}
                        <MDBNavItem>
                            <MDBDropdown>
                                <MDBDropdownToggle nav caret>
                                    <span>Media</span>
                                </MDBDropdownToggle> 
                                <MDBDropdownMenu className="dropdown-default">
                                    <LinkContainer to="/instagram">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Instagram</MDBDropdownItem>
                                    </LinkContainer>
                                    <NavDropdown.Divider />
                                    <LinkContainer to="/videos">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Videos</MDBDropdownItem>
                                    </LinkContainer>
                                </MDBDropdownMenu>
                            </MDBDropdown>
                        </MDBNavItem>
                        <MDBNavItem>
                            <MDBNavLink as={Link} className="nav-link" to="/waiver" onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Waiver</MDBNavLink>
                        </MDBNavItem>
                        <MDBNavItem>
                            <MDBNavLink as={Link} className="nav-link" to="/map" onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Map</MDBNavLink>
                        </MDBNavItem>
                        <MDBNavItem>
                            <MDBDropdown>
                                <MDBDropdownToggle nav caret color="dark">
                                    <span>Information</span>
                                </MDBDropdownToggle> 
                                <MDBDropdownMenu className="dropdown-default">
                                    <LinkContainer to="/rules">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Rules</MDBDropdownItem>
                                    </LinkContainer>
                                    <LinkContainer to="/gametypes">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Gametypes</MDBDropdownItem>
                                    </LinkContainer>
                                    <LinkContainer to="/pricing">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Pricing</MDBDropdownItem>
                                    </LinkContainer>
                                    <NavDropdown.Divider />
                                    <LinkContainer to="/contact">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Contact Us</MDBDropdownItem>
                                    </LinkContainer>
                                </MDBDropdownMenu>
                            </MDBDropdown>
                        </MDBNavItem>
                    </MDBNavbarNav>
                    <MDBNavbarNav right>
                        <MDBNavItem>
                            <Row className="logout">
                                <p className="welcome">
                                    Welcome {authUser.username}!
                                </p>
                            </Row>
                            <Row className="logout">
                                <SignOutButton />
                            </Row>
                        </MDBNavItem>
                    </MDBNavbarNav>
                </MDBCollapse>
            </MDBNavbar>
        </div>
    );
}

const NavigationNonAuth = () => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div>
            <MDBNavbar dark expand={"xl"} className="bg-nav">
                <MDBNavbarNav left>
                    <MDBNavbarBrand className="navitem-img">
                        <Link to="/home" onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                            <img src={logo} alt="US Airsoft logo" className="img-fluid logo" />
                        </Link>
                    </MDBNavbarBrand>
                </MDBNavbarNav>
                <MDBNavbarToggler onClick={() => setTimeout(() => { setExpanded(!expanded) }, 150)} />
                <MDBCollapse isOpen={expanded} navbar>
                    <MDBNavbarNav left >
                        <MDBNavItem>
                            <MDBNavLink as={Link} className="nav-link" to="/home" 
                            onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Home
                            </MDBNavLink>
                        </MDBNavItem>
                        <MDBNavItem>
                            <MDBNavLink as={Link} className="nav-link" to="/leaderboard" onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Leaderboard</MDBNavLink>
                        </MDBNavItem>
                        <MDBNavItem>
                            <MDBNavLink as={Link} className="nav-link" to="/teams" onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Teams</MDBNavLink>
                        </MDBNavItem>
                        <MDBNavItem>
                            <MDBDropdown>
                                <MDBDropdownToggle nav caret>
                                    <span>Media</span>
                                </MDBDropdownToggle> 
                                <MDBDropdownMenu className="dropdown-default">
                                    <LinkContainer to="/instagram">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Instagram</MDBDropdownItem>
                                    </LinkContainer>
                                    <NavDropdown.Divider />
                                    <LinkContainer to="/videos">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Videos</MDBDropdownItem>
                                    </LinkContainer>
                                </MDBDropdownMenu>
                            </MDBDropdown>
                        </MDBNavItem>
                        <MDBNavItem>
                            <MDBNavLink as={Link} className="nav-link" to="/waiver" onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Waiver</MDBNavLink>
                        </MDBNavItem>
                        <MDBNavItem>
                            <MDBNavLink as={Link} className="nav-link" to="/map" onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Map</MDBNavLink>
                        </MDBNavItem>
                        <MDBNavItem>
                            <MDBDropdown>
                                <MDBDropdownToggle nav caret color="dark">
                                    <span>Information</span>
                                </MDBDropdownToggle> 
                                <MDBDropdownMenu className="dropdown-default">
                                    <LinkContainer to="/rules">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Rules</MDBDropdownItem>
                                    </LinkContainer>
                                    <LinkContainer to="/gametypes">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Gametypes</MDBDropdownItem>
                                    </LinkContainer>
                                    <LinkContainer to="/pricing">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Pricing</MDBDropdownItem>
                                    </LinkContainer>
                                    <NavDropdown.Divider />
                                    <LinkContainer to="/contact">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Contact Us</MDBDropdownItem>
                                    </LinkContainer>
                                </MDBDropdownMenu>
                            </MDBDropdown>
                        </MDBNavItem>
                    </MDBNavbarNav>
                    <MDBNavbarNav right>
                        <Button variant="outline-secondary" className="login-button-nav">
                            <NavItem>
                                <Link className="nav-link" to="/login" onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Login</Link>
                            </NavItem>
                        </Button>
                    </MDBNavbarNav>
                </MDBCollapse>
            </MDBNavbar>
        </div>
    );
}

export default Navigation;