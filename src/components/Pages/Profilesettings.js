import React from 'react';
import '../../App.css';

import { Container, Row, Col } from 'react-bootstrap/';
import { Link } from 'react-router-dom';
import AccountChangeForm from '../../AccountChange';
import { AuthUserContext, withAuthorization } from '../session';
import ImageUpload from './ImageUpload';
import DisplayNameForm from './DisplayNameForm';



import * as ROLES from '../constants/roles';
import { Helmet } from 'react-helmet-async';
import { Paper, Tab, Tabs } from '@mui/material';

const ProfileSettings = ({ firebase }) => {

  const [value, setValue] = React.useState(0);
  const playerId = firebase.auth.currentUser?.uid;

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
                Update your public display name, profile photo, email, or password.
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
                  {playerId && <DisplayNameForm key={playerId} firebase={firebase} playerId={playerId} />}
                  {playerId && <Link className="btn btn-outline-light mb-3" to="/account?section=badges">Choose a featured badge</Link>}
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

const condition = authUser => !!authUser && !authUser.roles?.[ROLES.WAIVER];

export default withAuthorization(condition)(ProfileSettings);
