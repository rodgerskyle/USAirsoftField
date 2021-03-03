import React, { Component } from 'react';
import { Container, Breadcrumb } from 'react-bootstrap';

import '../../App.css';

import { AuthUserContext, withAuthorization } from "../session";

import { compose } from 'recompose';
import CameraModule from '../constants/CameraModule';

import { LinkContainer } from 'react-router-bootstrap';

import { withFirebase } from '../Firebase';

import * as ROLES from '../constants/roles';
import { Helmet } from 'react-helmet-async';

class ScanWaiver extends Component {
    constructor(props) {
        super(props);

        this.state = {
        };
    }

    render() {
        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div className="background-static-all">
                        <Helmet>
                            <title>US Airsoft Field: Scan Waiver</title>
                        </Helmet>
                        <Container>
                            <h2 className="admin-header">Scan Waiver</h2>
                            <Breadcrumb className="admin-breadcrumb">
                                {authUser && !!authUser.roles[ROLES.ADMIN] ?
                                    <LinkContainer to="/admin">
                                        <Breadcrumb.Item>Admin</Breadcrumb.Item>
                                    </LinkContainer>
                                    :
                                    <LinkContainer to="/dashboard">
                                        <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
                                    </LinkContainer>
                                }
                                <Breadcrumb.Item active>Scan Waiver</Breadcrumb.Item>
                            </Breadcrumb>
                            <CameraModule />
                        </Container>
                    </div>
                )}
            </AuthUserContext.Consumer>
        )
    }
}

const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default compose(
    withAuthorization(condition),
    withFirebase,
)(ScanWaiver);