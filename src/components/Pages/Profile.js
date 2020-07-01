import React, { Component } from 'react';

import { Container, Row, Col } from 'react-bootstrap/';

import { withFirebase } from '../Firebase';

import './Profile.css';


class Profile extends Component {
    constructor(props) {
        super(props);

        this.state = {};
    }


    render() {
        return (
            <div>
                <Container>
                    <div className="team-single">
                        <Row>
                            <div className="col-lg-4 col-md-5 xs-margin-30px-bottom">
                                <div className="team-single-img">
                                    <img src="https://bootdey.com/img/Content/avatar/avatar7.png" alt="" />
                                </div>
                                <div className="bg-light-gray padding-30px-all md-padding-25px-all sm-padding-20px-all text-center description">
                                    <h4 className="margin-10px-bottom font-size24 md-font-size22 sm-font-size20 font-weight-600">USERNAME HERE</h4>
                                    <p className="sm-width-95 sm-margin-auto">We are proud of child student. We teaching great activities and best program for your kids.</p>
                                    <div className="margin-20px-top team-single-icons">
                                        <ul className="no-margin">
                                            <li><a href="javascript:void(0)"><i className="fab fa-facebook-f"></i></a></li>
                                            <li><a href="javascript:void(0)"><i className="fab fa-twitter"></i></a></li>
                                            <li><a href="javascript:void(0)"><i className="fab fa-google-plus-g"></i></a></li>
                                            <li><a href="javascript:void(0)"><i className="fab fa-instagram"></i></a></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="col-lg-8 col-md-7 stats-desc">
                                <div className="team-single-text padding-50px-left sm-no-padding-left">
                                    <p className="no-margin-bottom">Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum voluptatem.</p>
                                    <div className="contact-info-section margin-40px-tb">
                                        <ul className="list-style9 no-margin">
                                            <li>
                                                <Row>
                                                    <Col>
                                                        <i className="fas fa-graduation-cap text-orange"></i>
                                                        <strong className="margin-10px-left text-orange">Degree:</strong>
                                                    </Col>
                                                    <Col md={7}>
                                                        <p>Master's Degrees</p>
                                                    </Col>
                                                </Row>

                                            </li>
                                            <li>

                                                <Row>
                                                    <Col md={4}>
                                                        <i className="far fa-gem text-yellow"></i>
                                                        <strong className="margin-10px-left text-yellow">Exp.:</strong>
                                                    </Col>
                                                    <Col md={7}>
                                                        <p>4 Year in Education</p>
                                                    </Col>
                                                </Row>

                                            </li>
                                            <li>

                                                <Row>
                                                    <Col md={5}>
                                                        <i className="far fa-file text-lightred"></i>
                                                        <strong className="margin-10px-left text-lightred">Courses:</strong>
                                                    </Col>
                                                    <Col md={7}>
                                                        <p>Design Category</p>
                                                    </Col>
                                                </Row>

                                            </li>
                                            <li>

                                                <Row>
                                                    <Col md={5}>
                                                        <i className="fas fa-map-marker-alt text-green"></i>
                                                        <strong className="margin-10px-left text-green">Address:</strong>
                                                    </Col>
                                                    <Col md={7}>
                                                        <p>Regina ST, London, SK.</p>
                                                    </Col>
                                                </Row>

                                            </li>
                                            <li>

                                                <Row>
                                                    <div className="col-md-5 col-5">
                                                        <i className="fas fa-mobile-alt text-purple"></i>
                                                        <strong className="margin-10px-left xs-margin-four-left text-purple">Phone:</strong>
                                                    </div>
                                                    <div className="col-md-7 col-7">
                                                        <p>(+44) 123 456 789</p>
                                                    </div>
                                                </Row>

                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </Row>
                    </div>
                </Container>


            </div>
        )
    };
};

export default withFirebase(Profile);