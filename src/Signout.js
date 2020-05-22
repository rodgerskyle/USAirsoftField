import React from 'react';
import { Button } from 'react-bootstrap/';
 
import { withFirebase } from './components/Firebase';
 
const SignOutButton = ({ firebase }) => (
  <Button variant="outline-secondary" onClick={firebase.doSignOut}>
    Sign Out
  </Button>
);
 
export default withFirebase(SignOutButton);