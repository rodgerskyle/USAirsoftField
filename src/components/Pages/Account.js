import React from 'react';
import '../../App.css';

import { Container, Row, Col } from 'react-bootstrap/';
import { PasswordForgetForm } from '../../passwordForgot';
import PasswordChangeForm from '../../passwordChange';
import { AuthUserContext, withAuthorization } from '../session';
import Profile from './Profile';

const AccountPage = () => (
  <AuthUserContext.Consumer>
    {authUser => (
      <div>
        <h1 className="pagePlaceholder">Account Page</h1>
        <Profile />
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

export default withAuthorization(condition)(AccountPage);