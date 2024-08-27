import React, { useState, Component, useEffect } from 'react';
import logo from './assets/usairsoft-wide-logo.png';
import default_profile from './assets/default.png';
import { Nav, Navbar, NavDropdown } from 'react-bootstrap/';
import MUIButton from '@mui/material/Button';
import { Row, Col } from 'react-bootstrap/';
import { Link } from "react-router-dom";
import * as ROLES from './components/constants/roles';
import { withFirebase } from './components/Firebase';
import { Collapse, IconButton } from '@mui/material';
import Preheader from './components/constants/Preheader';
import { getDownloadURL } from 'firebase/storage';
import MenuIcon from '@mui/icons-material/Menu';


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
        getDownloadURL(this.props.firebase.pictures(`${uid}/profilepic.png`)).then((url) => {
            this.setState({ profilePic: url })
        })
    }

    componentDidMount() {
        if (window.location.href.indexOf("admin") > -1) {
            this.setState({ showNav: false })
        }
        this.authSubscription =
            this.props.firebase.onAuthUserListener((user) => {
                if (user) {
                    this.setState({ authUser: user })
                    this.getProfile(user.uid)
                }
            },
                () => {
                    this.setState({ authUser: null, profilePic: default_profile })
                },
            )
    }

    componentWillUnmount() {
        this.authSubscription()
    }

    render() {
        const { authUser } = this.state
        return (
            <div>
                {
                    authUser ? !!authUser.roles[ROLES.WAIVER] ? <NavigationWaiver authUser={authUser} profilePic={this.state.profilePic} />
                        : <NavigationAuth authUser={authUser} profilePic={this.state.profilePic} /> : <NavigationNonAuth />
                }
            </div>
        )
    }
}

const NavigationWaiver = ({ authUser, profilePic }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div>
            <Navbar expand={"xl"} className="bg-nav">
                <Nav>
                    <Navbar.Brand className="navitem-img">
                        <Link to="/dashboard" onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                            <img src={logo} alt="US Airsoft logo" className="img-fluid logo" />
                        </Link>
                    </Navbar.Brand>
                </Nav>
                <Row className="row-nav-auth">
                    <Col className="col-mobile-profile-nav">
                        {/* Mobile only feature*/}
                        {!!authUser.roles[ROLES.STATIC] ? null :
                            <Nav>
                                <NavDropdown className="nav-item-profile-nav" title={
                                    <MUIButton
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        startIcon={<img src={profilePic} alt={"personal profile"} />}
                                        type="button">
                                    </MUIButton>
                                }>
                                    <NavDropdown.Item className="NavDropdown-default">
                                        <Nav.Link as={Link} className="nav-link" to="/logout" onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Logout</Nav.Link>
                                    </NavDropdown.Item>
                                </NavDropdown>
                            </Nav>}
                    </Col>
                    <Col className="div-hamburger">
                        <IconButton
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={() => setTimeout(() => { setExpanded(!expanded) }, 150)}
                            type="button">
                            <MenuIcon />
                        </IconButton>
                    </Col>
                </Row>
                <Collapse isOpen={expanded} navbar>
                    <Nav>
                        <Nav.Link as={Link} className="nav-link" to="/dashboard" onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Dashboard</Nav.Link>
                    </Nav>
                    {!!authUser.roles[ROLES.STATIC] ? null :
                        <Nav className="mdb-nav-not-mobile-profile">
                            <NavDropdown className="nav-item-profile-nav" title={
                                <MUIButton
                                    variant="contained"
                                    color="primary"
                                    size="large"
                                    startIcon={<img src={profilePic} alt={"personal profile"} />}
                                    type="button">
                                    {authUser.username}
                                </MUIButton>
                            }>
                                <NavDropdown.Item className="NavDropdown-default">
                                    <Nav.Link as={Link} className="nav-link" to="/logout" onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Logout</Nav.Link>
                                </NavDropdown.Item>
                            </NavDropdown>
                        </Nav>}
                </Collapse>
            </Navbar>
        </div>
    )
}

const NavigationAuth = ({ authUser, profilePic }) => {
    const [expanded, setExpanded] = useState(false);

    const [key, setKey] = useState("");

    useEffect(() => {
        var url = window.location.pathname;
        if (url === "/" || url === "/home") {
            setKey(0);
        }
        else if (url === "/leaderboard") {
            setKey(1);
        }
        else if (url === "/schedule") {
            setKey(2);
        }
        else if (url === "/teams") {
            setKey(3);
        }
        else if (url === "/admin") {
            setKey(4);
        }
        else if (url === "/media") {
            setKey(5);
        }
        else if (url === "/media/instagram") {
            setKey(5.1);
        }
        else if (url === "/media/youtube") {
            setKey(5.2);
        }
        else if (url === "/waiver") {
            setKey(6);
        }
        else if (url === "/map") {
            setKey(7);
        }
        else if (url === "/information") {
            setKey(8);
        }
        else if (url.includes("/information/rules")) {
            setKey(8.1);
        }
        else if (url.includes("/information/gametypes")) {
            setKey(8.2);
        }
        else if (url.includes("/information/pricing")) {
            setKey(8.3);
        }
        else if (url.includes("/information/contact")) {
            setKey(8.4);
        }
        else if (url === "/account") {
            setKey(9.1);
        }
        else if (url === "/profilesettings") {
            setKey(9.2)
        }
    }, [])

    function handleSelect(key) {
        setKey(key);
    }

    function checkKey(val) {
        return (key - val) < 1 && (key - val) > 0 ? true : false;
    }

    return (
        <div>
            <Preheader />
            <Navbar collapseOnSelect expand={"xl"} className="bg-nav" variant="dark">
                <Nav>
                    <Navbar.Brand className="navitem-img">
                        <Link to="/home" className="link-img-nav"
                            onClick={() => {
                                setKey(0);
                                setTimeout(() => { setExpanded(false) }, 150);
                            }
                            }>
                            <img src={logo} alt="US Airsoft logo" className="img-fluid logo" />
                        </Link>
                    </Navbar.Brand>
                </Nav>
                <Row className="row-nav-auth">
                    <Col className="col-mobile-profile-nav">
                        {/* Mobile only feature*/}
                        <Nav onSelect={handleSelect} activeKey={key}>
                            <NavDropdown className="nav-item-profile-nav"
                                title={
                                    <MUIButton
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        startIcon={<img src={profilePic} alt={"personal profile"} />}
                                        type="button">
                                    </MUIButton>
                                }>
                                <NavDropdown.Item className="NavDropdown-default" as={Link} to="/account" eventKey={9.1}
                                    onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                    My Profile
                                </NavDropdown.Item>
                                <NavDropdown.Item className="NavDropdown-default" as={Link} to="/profilesettings" eventKey={9.2}
                                    onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                    Settings
                                </NavDropdown.Item>
                                <NavDropdown.Divider />
                                <NavDropdown.Item className="NavDropdown-default" as={Link} to="/logout" eventKey={9.3}
                                    onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                    Logout
                                </NavDropdown.Item>
                            </NavDropdown>
                        </Nav>
                    </Col>
                    <Col className="div-hamburger">
                        <IconButton
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={() => setTimeout(() => { setExpanded(!expanded) }, 150)}
                            type="button">
                            <MenuIcon />
                        </IconButton>
                    </Col>
                </Row>
                <Navbar.Collapse in={expanded} className="navbar-collapse">
                    <Nav onSelect={handleSelect} activeKey={key}>
                        <Nav.Link as={Link} className="nav-link" to="/home" eventKey={0}
                            onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                            Home
                        </Nav.Link>
                        <Nav.Link as={Link} className="nav-link" to="/leaderboard" eventKey={1}
                            onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Leaderboard</Nav.Link>
                        <Nav.Link as={Link} className="nav-link" to="/schedule" eventKey={2}
                            onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Schedule</Nav.Link>
                        <Nav.Link as={Link} className="nav-link" to="/teams" eventKey={3}
                            onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Teams</Nav.Link>
                        {!!authUser.roles[ROLES.ADMIN] && (
                            <Nav.Link as={Link} className="nav-link" to="/admin" eventKey={4}
                                onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Admin</Nav.Link>
                        )}
                        <NavDropdown title="Media" active={checkKey(5)}>
                            <NavDropdown.Item className="NavDropdown-default" as={Link} to="/media/instagram" eventKey={5.1}
                                onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Instagram
                            </NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item className="NavDropdown-default" as={Link} to="/media/youtube" eventKey={5.2}
                                onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Youtube
                            </NavDropdown.Item>
                        </NavDropdown>
                        <Nav.Link as={Link} className="nav-link" to="/waiver" eventKey={6}
                            onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Waiver</Nav.Link>
                        <Nav.Link as={Link} className="nav-link" to="/map" eventKey={7}
                            onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Map</Nav.Link>
                        <NavDropdown title="Information" active={checkKey(8)}>
                            <NavDropdown.Item className="NavDropdown-default" as={Link} to="/information/rules" eventKey={8.1}
                                onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Rules
                            </NavDropdown.Item>
                            <NavDropdown.Item className="NavDropdown-default" as={Link} to="/information/gametypes" eventKey={8.2}
                                onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Gametypes
                            </NavDropdown.Item>
                            <NavDropdown.Item className="NavDropdown-default" as={Link} to="/information/pricing" eventKey={8.3}
                                onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Pricing
                            </NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item className="NavDropdown-default" as={Link} to="/information/contact" eventKey={8.4}
                                onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Contact Us
                            </NavDropdown.Item>
                        </NavDropdown>
                    </Nav>
                    <Nav className="mdb-nav-not-mobile-profile" onSelect={handleSelect} activeKey={key}>
                        <NavDropdown className="nav-item-profile-nav"
                            title={
                                <MUIButton
                                    variant="contained"
                                    color="primary"
                                    size="large"
                                    startIcon={<img src={profilePic} alt={"personal profile"} />}
                                    type="button">
                                    {authUser.username}
                                </MUIButton>
                            }>
                            <NavDropdown.Item className="NavDropdown-default" as={Link} to="/account" eventKey={9.1}
                                onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                My Profile
                            </NavDropdown.Item>
                            <NavDropdown.Item className="NavDropdown-default" as={Link} to="/profilesettings" eventKey={9.2}
                                onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Settings
                            </NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item className="NavDropdown-default" as={Link} to="/logout" eventKey={9.3}
                                onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Logout
                            </NavDropdown.Item>
                        </NavDropdown>
                    </Nav>
                </Navbar.Collapse>
            </Navbar>
        </div>
    );
}

const NavigationNonAuth = () => {
    const [expanded, setExpanded] = useState(false);
    const profilePic = default_profile

    const [key, setKey] = useState("");

    useEffect(() => {
        var url = window.location.pathname;
        if (url === "/" || url === "/home") {
            setKey(0);
        }
        else if (url === "/leaderboard") {
            setKey(1);
        }
        else if (url === "/schedule") {
            setKey(2);
        }
        else if (url === "/teams") {
            setKey(3);
        }
        else if (url === "/admin") {
            setKey(4);
        }
        else if (url === "/media") {
            setKey(5);
        }
        else if (url === "/media/instagram") {
            setKey(5.1);
        }
        else if (url === "/media/youtube") {
            setKey(5.2);
        }
        else if (url === "/waiver") {
            setKey(6);
        }
        else if (url === "/map") {
            setKey(7);
        }
        else if (url === "/information") {
            setKey(8);
        }
        else if (url.includes("/information/rules")) {
            setKey(8.1);
        }
        else if (url.includes("/information/gametypes")) {
            setKey(8.2);
        }
        else if (url.includes("/information/pricing")) {
            setKey(8.3);
        }
        else if (url.includes("/information/contact")) {
            setKey(8.4);
        }
        else if (url === "/login") {
            setKey(9.1);
        }
    }, [])

    function handleSelect(key) {
        setKey(key);
    }

    function checkKey(val) {
        return (key - val) < 1 && (key - val) > 0 ? true : false;
    }

    return (
        <div>
            <Preheader />
            <Navbar collapseOnSelect expand={"xl"} className="bg-nav" variant="dark">
                <Nav>
                    <Navbar.Brand className="navitem-img">
                        <Link to="/home" className="link-img-nav"
                            onClick={() => {
                                setKey(0);
                                setTimeout(() => { setExpanded(false) }, 150);
                            }
                            }>
                            <img src={logo} alt="US Airsoft logo" className="img-fluid logo" />
                        </Link>
                    </Navbar.Brand>
                </Nav>
                <Row className="row-nav-auth">
                    <Col className="col-mobile-profile-nav">
                        {/* Mobile only feature*/}
                        <Nav onSelect={handleSelect} activeKey={key}>
                            <NavDropdown className="nav-item-profile-nav"
                                title={
                                    <MUIButton
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        startIcon={<img src={profilePic} alt={"personal profile"} />}
                                        type="button">
                                    </MUIButton>
                                }>
                                <NavDropdown.Item className="NavDropdown-default" as={Link} to="/login" eventKey={9.1}
                                    onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                    Login
                                </NavDropdown.Item>
                            </NavDropdown>
                        </Nav>
                    </Col>
                    <Col className="div-hamburger">
                        <IconButton
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={() => setTimeout(() => { setExpanded(!expanded) }, 150)}
                            type="button">
                            <MenuIcon />
                        </IconButton>
                    </Col>
                </Row>
                <Navbar.Collapse in={expanded} className="navbar-collapse">
                    <Nav onSelect={handleSelect} activeKey={key}>
                        <Nav.Link as={Link} className="nav-link" to="/home" eventKey={0}
                            onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                            Home
                        </Nav.Link>
                        <Nav.Link as={Link} className="nav-link" to="/leaderboard" eventKey={1}
                            onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Leaderboard</Nav.Link>
                        <Nav.Link as={Link} className="nav-link" to="/schedule" eventKey={2}
                            onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Schedule</Nav.Link>
                        <Nav.Link as={Link} className="nav-link" to="/teams" eventKey={3}
                            onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Teams</Nav.Link>
                        <NavDropdown title="Media" active={checkKey(5)}>
                            <NavDropdown.Item className="NavDropdown-default" as={Link} to="/media/instagram" eventKey={5.1}
                                onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Instagram
                            </NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item className="NavDropdown-default" as={Link} to="/media/youtube" eventKey={5.2}
                                onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Youtube
                            </NavDropdown.Item>
                        </NavDropdown>
                        <Nav.Link as={Link} className="nav-link" to="/waiver" eventKey={6}
                            onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Waiver</Nav.Link>
                        <Nav.Link as={Link} className="nav-link" to="/map" eventKey={7}
                            onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>Map</Nav.Link>
                        <NavDropdown title="Information" active={checkKey(8)}>
                            <NavDropdown.Item className="NavDropdown-default" as={Link} to="/information/rules" eventKey={8.1}
                                onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Rules
                            </NavDropdown.Item>
                            <NavDropdown.Item className="NavDropdown-default" as={Link} to="/information/gametypes" eventKey={8.2}
                                onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Gametypes
                            </NavDropdown.Item>
                            <NavDropdown.Item className="NavDropdown-default" as={Link} to="/information/pricing" eventKey={8.3}
                                onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Pricing
                            </NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item className="NavDropdown-default" as={Link} to="/information/contact" eventKey={8.4}
                                onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Contact Us
                            </NavDropdown.Item>
                        </NavDropdown>
                    </Nav>
                    <Nav className="mdb-nav-not-mobile-profile" onSelect={handleSelect} activeKey={key}>
                        <NavDropdown className="nav-item-profile-nav" title={
                            <MUIButton
                                variant="contained"
                                color="primary"
                                size="large"
                                startIcon={<img src={profilePic} alt={"personal profile"} />}
                                type="button">
                            </MUIButton>
                        }>
                            <NavDropdown.Item className="NavDropdown-default" as={Link} to="/login" eventKey={9.1}
                                onClick={() => setTimeout(() => { setExpanded(false) }, 150)}>
                                Login
                            </NavDropdown.Item>
                        </NavDropdown>
                        {/* </NavItem> */}
                    </Nav>
                </Navbar.Collapse>
            </Navbar>
        </div>
    );
}

export default withFirebase(Navigation);

// export default composeHooks(
//     withFirebase,
//     )(Navigation);