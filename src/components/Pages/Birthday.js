import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import { Container, Col, Breadcrumb } from 'react-bootstrap/';

import { LinkContainer } from 'react-router-bootstrap';

import * as ROLES from '../constants/roles';
import { Helmet } from 'react-helmet-async';

class Birthday extends Component {
    constructor(props) {
        super(props);

        this.state = {
            startDay: 0,
        }
    }

    render() {
        return (
            <div className="background-static-all">
                <Helmet>
                    <title>US Airsoft Field: Birthday</title>
                </Helmet>
                    <Container>
                        <h2 className="admin-header">Calendar - Birthday</h2>
                        <Breadcrumb className="admin-breadcrumb">
                            <LinkContainer to="/admin">
                                <Breadcrumb.Item>Admin</Breadcrumb.Item>
                            </LinkContainer>
                            <Breadcrumb.Item active>Birthday</Breadcrumb.Item>
                        </Breadcrumb>
                        <div className="div-main-birthday">
                            <div className="seven-cols">
                                <Col md={1}>Sunday</Col>
                                <Col md={1}>Monday</Col>
                                <Col md={1}>Tuesday</Col>
                                <Col md={1}>Wednesday</Col>
                                <Col md={1}>Thursday</Col>
                                <Col md={1}>Friday</Col>
                                <Col md={1}>Saturday</Col>
                            </div>
                            <div className="seven-cols">
                                <Col md={1}>Sunday</Col>
                                <Col md={1}>Monday</Col>
                                <Col md={1}>Tuesday</Col>
                                <Col md={1}>Wednesday</Col>
                                <Col md={1}>Thursday</Col>
                                <Col md={1}>Friday</Col>
                                <Col md={1}>Saturday</Col>
                            </div>
                        </div>
                    </Container>
            </div>
        );
    }
}

const condition = authUser =>
  authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default compose(
    withAuthorization(condition),
    withFirebase,
)(Birthday);