import React from 'react';
import '../../App.css';

import { Container, Row } from 'react-bootstrap/';
import PasswordChangeForm from '../../passwordChange';
import { AuthUserContext, withAuthorization } from '../session';
import ImageUpload from './ImageUpload';

import { compose } from 'recompose';

import * as ROLES from '../constants/roles';
import { Helmet } from 'react-helmet-async';

const ProfileSettings = () => (
  <AuthUserContext.Consumer>
    {authUser => (
      <div className="background-static-all">
        <Helmet>
          <title>US Airsoft Field: Account Settings</title>
        </Helmet>
        <h2 className="page-header">Account Settings</h2>
        <Container>
          <Row className="row-settings">
              <ImageUpload />
          </Row>
              <PasswordChangeForm authUser={authUser}/>
        </Container>
      </div>
    )}
  </AuthUserContext.Consumer>
);

const condition = authUser => !!authUser && !(!!authUser.roles[ROLES.WAIVER]);

export default compose(
  withAuthorization(condition),
  )(ProfileSettings);
