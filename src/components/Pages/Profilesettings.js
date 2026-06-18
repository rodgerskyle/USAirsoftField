import React from 'react';
import '../../App.css';

import { Container, Row, Col } from 'react-bootstrap/';
import AccountChangeForm from '../../AccountChange';
import { AuthUserContext, withAuthentication, withAuthorization } from '../session';
import ImageUpload from './ImageUpload';



import * as ROLES from '../constants/roles';
import { Helmet } from 'react-helmet-async';
import { Paper, Tab, Tabs } from '@mui/material';

const ProfileSettings = () => {

  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <AuthUserContext.Consumer>
      {authUser => (
        <div className="background-static-all">
          <Helmet>
            <title>US Airsoft Field: Account Settings</title>
          </Helmet>
          <Container className="container-settings">
            <div className="settings-hero-card">
              <p className="p-header-about settings-page-title">Account Settings</p>
              <p className="settings-page-copy">
                Update your profile photo, account details, and password from one place.
              </p>
            </div>
            <Paper square className="settings-tabs-shell">
              <Tabs
                value={value}
                indicatorColor="primary"
                textColor="primary"
                onChange={handleChange}
              >
                <Tab label="Account" />
              </Tabs>
            </Paper>
            {value === 0 ?
              <Row className="row-parent-settings settings-content-card">
                <Col md={4}>
                  <ImageUpload />
                </Col>
                <Col md={8}>
                  <AccountChangeForm authUser={authUser} />
                </Col>
              </Row>
              : null}
            {value === 1 ?
              <div>
              </div>
              : null}
          </Container>
        </div>
      )}
    </AuthUserContext.Consumer>
  );
}

const condition = authUser => !!authUser && !(!!authUser.roles[ROLES.WAIVER]);

export default withAuthorization(condition)(withAuthentication(ProfileSettings));

// export default composeHooks(
//   withAuthorization(condition),
//   withAuthentication,
//   )(ProfileSettings);
