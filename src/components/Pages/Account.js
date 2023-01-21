import React from 'react';
import '../../App.css';

import { AuthUserContext, withAuthorization } from '../session';
import Profile from './Profile';
import { Helmet } from 'react-helmet-async';

const AccountPage = () => (
  <AuthUserContext.Consumer>
    {authUser => (
      <div className="account-page">
        <Helmet>
            <title>US Airsoft Field: Account</title>
        </Helmet>
        <Profile />
      </div>
    )}
  </AuthUserContext.Consumer>
);

const condition = authUser => !!authUser;

export default withAuthorization(condition)(AccountPage)

// export default composeHooks(
//   withAuthorization(condition),
//   )(AccountPage);