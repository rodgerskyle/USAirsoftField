import React from 'react';
import '../../App.css';

import { AuthUserContext, withAuthorization } from '../session';
import Profile from './Profile';

const AccountPage = () => (
  <AuthUserContext.Consumer>
    {authUser => (
      <div className="account-page">
        <Profile />
      </div>
    )}
  </AuthUserContext.Consumer>
);

const condition = authUser => !!authUser;

export default withAuthorization(condition)(AccountPage);