import React from 'react';
import '../../App.css';

import { Container, Row, Col } from 'react-bootstrap/';
import { PasswordForgetForm } from '../../passwordForgot';
import PasswordChangeForm from '../../passwordChange';
import { AuthUserContext, withAuthorization } from '../session';

const ProfileSettings = () => (
  <AuthUserContext.Consumer>
    {authUser => (
      <div className="account-page">
        <h1 className="pagePlaceholder">Account Settings</h1>
        <Container>
          <Row>
            <Col md={{ span: 6, offset: 3 }}>
              <PasswordForgetForm />
            </Col>
          </Row>
          <Row>
            <Col md={{ span: 6, offset: 3 }}>
              <PasswordChangeForm />
            </Col>
          </Row>
        </Container>
      </div>
    )}
  </AuthUserContext.Consumer>
);

const condition = authUser => !!authUser;

export default withAuthorization(condition)(ProfileSettings);
