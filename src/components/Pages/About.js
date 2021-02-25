import React, { Component } from 'react';
import { Container, Row, Col, InputGroup, FormControl, Button } from 'react-bootstrap/';
import logowbg from '../../assets/usairsoftwbg.png';
import { Link } from "react-router-dom";
import { AuthUserContext } from '../session';
import { withFirebase } from '../Firebase';
import * as ROLES from "../constants/roles";
import fblogo from '../../assets/SocialMedia/facebook.png';
import twlogo from '../../assets/SocialMedia/twitter.png';
import iglogo from '../../assets/SocialMedia/instagram.png';
import ytlogo from '../../assets/SocialMedia/youtube.png';
import { encode } from 'firebase-encode';
import logo from '../../assets/logo.png';


class About extends Component {
    constructor(props) {
        super(props);

        this.state = {
        };
    }
    render() {
        return (
            <div className="background-static-all">
                <Container>
                    <Row>
                        <p className="p-header-about">About Us</p>
                    </Row>
                    <Row>
                        <Col md={6} className="col-center-middle">
                            <div>
                                <p className="p-description-about">
                                    U.S. AIRSOFT is the premier airsoft arena in the U.S. 
                                </p>
                                <p className="p-description-about">
                                    We are located in Anderson, CA - Just outside of Redding.
                                </p>
                                <p className="p-description-about">
                                    We have over 10 acres dedicated to Airsoft. 
                                </p>
                                <p className="p-description-about">
                                    We pride ourselves on being the first arena to provide stat tracking and leaderboards.
                                </p>
                            </div>
                        </Col>
                        <Col md={6}>
                            <div>
                                <img src={logowbg} alt="US Airsoft logo"/>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>
        );
    }
}

export default About;