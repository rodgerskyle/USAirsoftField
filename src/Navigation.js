import React, { useState, Component } from 'react';
import logo from './assets/usairsoft-wide-logo.png';
import default_profile from './assets/default.png';
import { NavDropdown } from 'react-bootstrap/';
import {
    MDBNavbar, MDBNavbarBrand, MDBNavbarNav, MDBNavItem, MDBNavLink, MDBNavbarToggler, MDBCollapse,
    MDBDropdown, MDBDropdownToggle, MDBDropdownMenu, MDBDropdownItem
} from "mdbreact";
import { compose } from 'recompose';
import MUIButton from '@material-ui/core/Button';
import { Row } from 'react-bootstrap/';
import { Link } from "react-router-dom";
import { LinkContainer } from "react-router-bootstrap";
import * as ROLES from './components/constants/roles';
import { withFirebase } from './components/Firebase';
import { Collapse } from '@material-ui/core';

class Navigation extends Component {
    constructor(props) {
        super(props);

        this.state = {
            profilePic: default_profile,
            authUser: null,
        };
    }

    //Get image function for profile image = uid
    getProfile(uid) {
        this.props.firebase.pictures(`${uid}/profilepic.png`).getDownloadURL().then((url) => {
            this.setState({profilePic: url})
        })
    }

    componentDidMount() {
        this.authSubscription = 
            this.props.firebase.onAuthUserListener((user) => {
                if (user) {
                    this.setState({authUser: user})
                    this.getProfile(user.uid)
            }
        }, 
        () => {
                this.setState({authUser: null, profilePic: default_profile})
            },
        )
    }

    componentWillUnmount() {
        this.authSubscription()
    }

    render() {
        const { authUser } = this.state
        return(
            <div>
                {
                     authUser ? !!authUser.roles[ROLES.WAIVER] ? <NavigationWaiver authUser={authUser} profilePic={this.state.profilePic}/>
                    : <NavigationAuth authUser={authUser} profilePic={this.state.profilePic}/> : <NavigationNonAuth />
                }
            </div>
        )
    }
}

const NavigationWaiver = ({ authUser, profilePic }) => {
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
                <Row className="row-nav-auth">
                    <div className="col-mobile-profile-nav">
                    {/* Mobile only feature*/}
                        {!!authUser.roles[ROLES.STATIC] ? null :
                            <MDBDropdown className="nav-item-profile-nav">
                                <MDBDropdownToggle nav>
                                    <MUIButton
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        type="button">
                                        {<img src={profilePic} alt={"personal profile"}/>}
                                    </MUIButton>
                                </MDBDropdownToggle> 
                                <MDBDropdownMenu className="dropdown-default">
                                    <LinkContainer to="/logout">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Logout</MDBDropdownItem>
                                    </LinkContainer>
                                </MDBDropdownMenu>
                            </MDBDropdown> }
                    </div>
                    <div className="div-hamburger">
                        <MDBNavbarToggler onClick={() => setTimeout(() => { setExpanded(!expanded) }, 150)} />
                    </div>
                </Row>
                <MDBCollapse isOpen={expanded} navbar>
                    <MDBNavbarNav left >
                        <MDBNavItem>
                            <MDBNavLink as={Link} className="nav-link" to="/dashboard" 
                            onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Dashboard
                            </MDBNavLink>
                        </MDBNavItem>
                    </MDBNavbarNav>
                    {!!authUser.roles[ROLES.STATIC] ? null :
                    <MDBNavbarNav right className="mdb-nav-not-mobile-profile">
                        <MDBNavItem className="nav-item-profile-nav">
                            <MDBDropdown>
                                <MDBDropdownToggle nav>
                                    <MUIButton
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        startIcon={<img src={profilePic} alt={"personal profile"}/>}
                                        type="button">
                                        {authUser.username}
                                    </MUIButton>
                                </MDBDropdownToggle> 
                                <MDBDropdownMenu className="dropdown-default">
                                    <LinkContainer to="/logout">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Logout</MDBDropdownItem>
                                    </LinkContainer>
                                </MDBDropdownMenu>
                            </MDBDropdown>
                        </MDBNavItem>
                    </MDBNavbarNav> }
                </MDBCollapse>
            </MDBNavbar>
        </div>
    )
}

const NavigationAuth = ({ authUser, profilePic}) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div>
            <MDBNavbar dark expand={"xl"} className="bg-nav">
                <MDBNavbarNav left>
                    <MDBNavbarBrand className="navitem-img">
                        <Link to="/home" className="link-img-nav"
                        onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                            <img src={logo} alt="US Airsoft logo" className="img-fluid logo" />
                        </Link>
                    </MDBNavbarBrand>
                </MDBNavbarNav>
                <Row className="row-nav-auth">
                    <div className="col-mobile-profile-nav">
                    {/* Mobile only feature*/}
                            <MDBDropdown className="nav-item-profile-nav">
                                <MDBDropdownToggle nav>
                                    <MUIButton
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        type="button">
                                        {<img src={profilePic} alt={"personal profile"}/>}
                                    </MUIButton>
                                </MDBDropdownToggle> 
                                <MDBDropdownMenu className="dropdown-default">
                                    <LinkContainer to="/account">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>My Profile</MDBDropdownItem>
                                    </LinkContainer>
                                    <LinkContainer to="/profilesettings">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Settings</MDBDropdownItem>
                                    </LinkContainer>
                                    <NavDropdown.Divider />
                                    <LinkContainer to="/logout">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Logout</MDBDropdownItem>
                                    </LinkContainer>
                                </MDBDropdownMenu>
                            </MDBDropdown>
                    </div>
                    <div className="div-hamburger">
                        <MDBNavbarToggler onClick={() => setTimeout(() => { setExpanded(!expanded) }, 150)} />
                    </div>
                </Row>
                <Collapse in={expanded} className="navbar-collapse">
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
                            <a className="nav-link" href="https://www.usairsoft.com" target="_blank" rel="noopener noreferrer">Store</a>
                        </MDBNavItem>
                        <MDBNavItem>
                            <MDBNavLink as={Link} className="nav-link" to="/teams" onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Teams</MDBNavLink>
                        </MDBNavItem>
                        {/* <MDBNavItem>
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
                        </MDBNavItem> */}

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
                                    <LinkContainer to="/media/instagram">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Instagram</MDBDropdownItem>
                                    </LinkContainer>
                                    <NavDropdown.Divider />
                                    <LinkContainer to="/media/videos">
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
                                <MDBDropdownToggle nav caret>
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
                    <MDBNavbarNav right className="mdb-nav-not-mobile-profile">
                        <MDBNavItem className="nav-item-profile-nav">
                            <MDBDropdown>
                                <MDBDropdownToggle nav>
                                    <MUIButton
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        startIcon={<img src={profilePic} alt={"personal profile"}/>}
                                        type="button">
                                        {authUser.username}
                                    </MUIButton>
                                </MDBDropdownToggle> 
                                <MDBDropdownMenu className="dropdown-default">
                                    <LinkContainer to="/account">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>My Profile</MDBDropdownItem>
                                    </LinkContainer>
                                    <LinkContainer to="/profilesettings">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Settings</MDBDropdownItem>
                                    </LinkContainer>
                                    <NavDropdown.Divider />
                                    <LinkContainer to="/logout">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Logout</MDBDropdownItem>
                                    </LinkContainer>
                                </MDBDropdownMenu>
                            </MDBDropdown>
                        </MDBNavItem>
                    </MDBNavbarNav>
                </Collapse>
            </MDBNavbar>
        </div>
    );
}

const NavigationNonAuth = () => {
    const [expanded, setExpanded] = useState(false);
    const profilePic = default_profile
    return (
        <div>
            <MDBNavbar dark expand={"xl"} className="bg-nav">
                <MDBNavbarNav left>
                    <MDBNavbarBrand className="navitem-img">
                        <Link to="/home" className="link-img-nav"
                        onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                            <img src={logo} alt="US Airsoft logo" className="img-fluid logo" />
                        </Link>
                    </MDBNavbarBrand>
                </MDBNavbarNav>
                <Row className="row-nav-auth">
                    <div className="col-mobile-profile-nav">
                    {/* Mobile only feature*/}
                            <MDBDropdown className="nav-item-profile-nav">
                                <MDBDropdownToggle nav>
                                    <MUIButton
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        type="button">
                                        {<img src={profilePic} className="img-profile-pic-nav" alt={"personal profile"}/>}
                                    </MUIButton>
                                </MDBDropdownToggle> 
                                <MDBDropdownMenu className="dropdown-default">
                                    <LinkContainer to="/login">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Login</MDBDropdownItem>
                                    </LinkContainer>
                                </MDBDropdownMenu>
                            </MDBDropdown>
                    </div>
                    <div className="div-hamburger">
                        <MDBNavbarToggler onClick={() => setTimeout(() => { setExpanded(!expanded) }, 150)} />
                    </div>
                </Row>
                {/* <MDBNavbarToggler onClick={() => setTimeout(() => { setExpanded(!expanded) }, 150)} /> */}
                <Collapse in={expanded} className="navbar-collapse">
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
                            <a className="nav-link" href="https://www.usairsoft.com" target="_blank" rel="noopener noreferrer">Store</a>
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
                                    <LinkContainer to="/media/instagram">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Instagram</MDBDropdownItem>
                                    </LinkContainer>
                                    <NavDropdown.Divider />
                                    <LinkContainer to="/media/videos">
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
                                <MDBDropdownToggle nav caret>
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
                    <MDBNavbarNav right className="mdb-nav-not-mobile-profile">
                        <MDBNavItem className="nav-item-loggedout nav-item-profile-nav">
                            <MDBDropdown>
                                <MDBDropdownToggle nav>
                                    <MUIButton
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        startIcon={<img src={profilePic} className="img-profile-pic-nav" alt={"personal profile"}/>}
                                        type="button">
                                    </MUIButton>
                                </MDBDropdownToggle> 
                                <MDBDropdownMenu className="dropdown-default">
                                    <LinkContainer to="/login">
                                        <MDBDropdownItem onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Login</MDBDropdownItem>
                                    </LinkContainer>
                                </MDBDropdownMenu>
                            </MDBDropdown>
                        </MDBNavItem>
                    </MDBNavbarNav>
                </Collapse>
            </MDBNavbar>
        </div>
    );
}

export default compose(
    withFirebase,
    )(Navigation);