import React, { Component, useState } from 'react';
import { Container, Row, Col, InputGroup, FormControl, Button } from 'react-bootstrap/';
import { Link } from "react-router-dom";
import { AuthUserContext } from '../session';
import { withFirebase } from '../Firebase';
import * as ROLES from "../constants/roles";
import fblogo from '../../assets/SocialMedia/facebook.png';
import twlogo from '../../assets/SocialMedia/twitter.png';
import iglogo from '../../assets/SocialMedia/instagram.png';
import ytlogo from '../../assets/SocialMedia/youtube.png';
import { encode } from 'firebase-encode';


class Footer extends Component {
    constructor(props) {
        super(props);

        this.state = {
            
        };
    }
    render() {
        return (
        <AuthUserContext.Consumer>
            {authUser =>
                authUser ? !!authUser.roles[ROLES.WAIVER] ? null : <FooterAuth authUser={authUser} /> : <FooterNonAuth emailMenu={this.props.firebase.emailOptMenu()}/>
            }
        </AuthUserContext.Consumer>
        );
    }
}

const FooterAuth = () => (
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
                                    <Link className="link-footer" to="contact">Contact Us</Link>
                                </Row>
                                <Row>
                                    <Link className="link-footer" to="rules">Our Rules</Link>
                                </Row>
                                <Row>
                                    <Link className="link-footer" to="Instagram">Instagram</Link>
                                </Row>
                            </Col>
                            <Col className="about-col-right-footer">
                                <Row>
                                    <Link className="link-footer" to="videos">Videos</Link>
                                </Row>
                                <Row>
                                    <Link className="link-footer" to="leaderboard">Leaderboard</Link>
                                </Row>
                                <Row>
                                    <Link className="link-footer" to="waiver">Waiver</Link>
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
                                    <Link className="link-footer" to="account">Profile</Link>
                                </Row>
                                <Row>
                                    <Link className="link-footer" to="profilesettings">Settings</Link>
                                </Row>
                            </Col>
                        </Row>
                    </Col>
                </Row>
                <Row>
                    <div className="divider-footer"/>
                </Row>
                <Row className="socials-icons-row"> 
                    <a href="https://www.facebook.com/USAirsoftworld/">
                        <img src={fblogo} alt="Facebook Logo" className="socials-icons-footer"/>
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

// Function to test email input with regex
function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

function subscribe(event, passed_email, emailMenu, setStatus) {
    event.preventDefault()

    if (passed_email === "") {
        setStatus("Please enter an email!")
        setTimeout(function(){
            setStatus("");
        }, 10000);
    }
    else if (!validateEmail(passed_email)) {
        setStatus("Email is not properly formatted.")
        setTimeout(function(){
            setStatus("");
        }, 10000);
    }
    else {
        emailMenu({secret: null, email: encode(passed_email.toLowerCase()), choice: "in"}).then((result) => {
            if (result) {
                setStatus(result.data.status);
                setTimeout(function(){
                    setStatus("");
               }, 10000);
            }
        }).catch(error => {
            console.log(error)
        })
    }
}

function FooterNonAuth ({emailMenu}) {
    const [Status, setStatus] = useState( null );
    const [Value, setValue] = useState( "" );
    return (
    <div className="topdiv-footer">
        <Container>
            <Row className="row-header-footer">
                <h3 className="header-footer">About US Airsoft</h3> 
            </Row>
            <Row className="row-header-footer">
                <Col className="col-nonauth-footer">
                    <Row>
                        <Col xs="auto" className="about-col-left-footer">
                            <Row>
                                <Link className="link-footer" to="contact">Contact Us</Link>
                            </Row>
                            <Row>
                                <Link className="link-footer" to="rules">Our Rules</Link>
                            </Row>
                            <Row>
                                <Link className="link-footer" to="Instagram">Photos</Link>
                            </Row>
                        </Col>
                        <Col className="about-col-right-footer">
                            <Row>
                                <Link className="link-footer" to="videos">Videos</Link>
                            </Row>
                            <Row>
                                <Link className="link-footer" to="leaderboard">Leaderboard</Link>
                            </Row>
                            <Row>
                                <Link className="link-footer" to="waiver">Waiver</Link>
                            </Row>
                        </Col>
                    </Row>
                </Col>
            </Row>
            <Row>
                <div className="divider-footer"/>
            </Row>
            <Row className="row-header-footer">
                <InputGroup className="mb-1 input-group-footer">
                    <FormControl
                    placeholder="Subscribe to our mailing list!"
                    aria-label="Subscribe to our mailing list!"
                    className="footer-text"
                    value={Value}
                    onChange={(e) => setValue(e.target.value)}
                    />
                    <InputGroup.Append>
                        <Button variant="outline-primary" className="footer-text"
                        onClick={(e) => {
                                subscribe(e, Value, emailMenu, setStatus)
                                setValue("");
                            }
                        }
                        >Subscribe</Button>
                    </InputGroup.Append>
                </InputGroup>
            </Row>
            {Status ? <Row className="status-row-footer">{Status}</Row> : null}
            <Row className="socials-icons-row"> 
                <a href="https://www.facebook.com/USAirsoftworld/">
                    <img src={fblogo} alt="Facebook Logo" className="socials-icons-footer"/>
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
    )
   };



export default withFirebase(Footer);