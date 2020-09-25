import React from 'react';
import { Button } from 'react-bootstrap/';
 
import { withFirebase } from './components/Firebase';
 
const SignOutButton = ({ firebase }) => (
  <Button className="logout-button-nav" variant="outline-secondary" onClick={firebase.doSignOut}>
    Sign Out
  </Button>
);
 
export default withFirebase(SignOutButton);