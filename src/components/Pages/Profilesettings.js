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
            <p className="p-header-about">Account Settings</p>
            <Paper square>
              <Tabs
                value={value}
                indicatorColor="primary"
                textColor="primary"
                onChange={handleChange}
              >
                <Tab label="Account" />
                <Tab label="Information" />
              </Tabs>
            </Paper>
            {value === 0 ?
              <Row className="row-parent-settings">
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
