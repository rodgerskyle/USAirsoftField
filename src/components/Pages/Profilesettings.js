import React from 'react';
import '../../App.css';

import { Container, Row } from 'react-bootstrap/';
import PasswordChangeForm from '../../passwordChange';
import { AuthUserContext, withAuthorization } from '../session';
import ImageUpload from './ImageUpload';

const ProfileSettings = () => (
  <AuthUserContext.Consumer>
    {authUser => (
      <div className="background-static-all">
        <h2 className="page-header">Account Settings</h2>
        <Container>
          <Row className="row-settings">
              <ImageUpload />
          </Row>
              <PasswordChangeForm />
        </Container>
      </div>
    )}
  </AuthUserContext.Consumer>
);

const condition = authUser => !!authUser;

export default withAuthorization(condition)(ProfileSettings);
