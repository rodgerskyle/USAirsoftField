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
                    <div class="team-single">
                        <Row>
                            <div class="col-lg-4 col-md-5 xs-margin-30px-bottom">
                                <div class="team-single-img">
                                    <img src="https://bootdey.com/img/Content/avatar/avatar7.png" alt="" />
                                </div>
                                <div class="bg-light-gray padding-30px-all md-padding-25px-all sm-padding-20px-all text-center">
                                    <h4 class="margin-10px-bottom font-size24 md-font-size22 sm-font-size20 font-weight-600">Class Teacher</h4>
                                    <p class="sm-width-95 sm-margin-auto">We are proud of child student. We teaching great activities and best program for your kids.</p>
                                    <div class="margin-20px-top team-single-icons">
                                        <ul class="no-margin">
                                            <li><a href="javascript:void(0)"><i class="fab fa-facebook-f"></i></a></li>
                                            <li><a href="javascript:void(0)"><i class="fab fa-twitter"></i></a></li>
                                            <li><a href="javascript:void(0)"><i class="fab fa-google-plus-g"></i></a></li>
                                            <li><a href="javascript:void(0)"><i class="fab fa-instagram"></i></a></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div class="col-lg-8 col-md-7">
                                <div class="team-single-text padding-50px-left sm-no-padding-left">
                                    <h4 class="font-size38 sm-font-size32 xs-font-size30">Buckle Giarza</h4>
                                    <p class="no-margin-bottom">Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum voluptatem.</p>
                                    <div class="contact-info-section margin-40px-tb">
                                        <ul class="list-style9 no-margin">
                                            <li>
                                                <Row>
                                                    <Col>
                                                        <i class="fas fa-graduation-cap text-orange"></i>
                                                        <strong class="margin-10px-left text-orange">Degree:</strong>
                                                    </Col>
                                                    <Col md={7}>
                                                        <p>Master's Degrees</p>
                                                    </Col>
                                                </Row>

                                            </li>
                                            <li>

                                                <Row>
                                                    <Col md={4}>
                                                        <i class="far fa-gem text-yellow"></i>
                                                        <strong class="margin-10px-left text-yellow">Exp.:</strong>
                                                    </Col>
                                                    <Col md={7}>
                                                        <p>4 Year in Education</p>
                                                    </Col>
                                                </Row>

                                            </li>
                                            <li>

                                                <Row>
                                                    <Col md={5}>
                                                        <i class="far fa-file text-lightred"></i>
                                                        <strong class="margin-10px-left text-lightred">Courses:</strong>
                                                    </Col>
                                                    <Col md={7}>
                                                        <p>Design Category</p>
                                                    </Col>
                                                </Row>

                                            </li>
                                            <li>

                                                <Row>
                                                    <Col md={5}>
                                                        <i class="fas fa-map-marker-alt text-green"></i>
                                                        <strong class="margin-10px-left text-green">Address:</strong>
                                                    </Col>
                                                    <Col md={7}>
                                                        <p>Regina ST, London, SK.</p>
                                                    </Col>
                                                </Row>

                                            </li>
                                            <li>

                                                <Row>
                                                    <div class="col-md-5 col-5">
                                                        <i class="fas fa-mobile-alt text-purple"></i>
                                                        <strong class="margin-10px-left xs-margin-four-left text-purple">Phone:</strong>
                                                    </div>
                                                    <div class="col-md-7 col-7">
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