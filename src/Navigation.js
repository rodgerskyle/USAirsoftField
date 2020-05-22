import React from 'react';
import logo from './assets/us-airsoft-logo.png';
import { Navbar, Nav, Button, NavItem, NavDropdown } from 'react-bootstrap/';
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
        <div className="logobox">
            <img src={logo} alt="US Airsoft logo" className="logo" />
        </div>
        <div className="login">
            <p className="welcome">
                Welcome {authUser.username}!
            </p>
            <NavItem>
                <SignOutButton />
            </NavItem>
        </div>
    </div>
    <div className="navbar">
        <Navbar collapseOnSelect expand="lg" bg="nav" variant="light">
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
        <div className="logobox">
            <img src={logo} alt="US Airsoft logo" className="logo" />
        </div>
        <div className="login">
            <Button variant="outline-secondary">
                <LinkContainer to="/login">
                    <NavItem>Login</NavItem>
                </LinkContainer>
            </Button>
        </div>
    </div>
    <div className="navbar">
        <Navbar collapseOnSelect expand="lg" bg="nav" variant="light">
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