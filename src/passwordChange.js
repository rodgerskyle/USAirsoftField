import React, { Component } from 'react';

import { Button, Form, Container } from 'react-bootstrap/';
 
import { withFirebase } from './components/Firebase';
 
const INITIAL_STATE = {
  passwordOne: '',
  passwordTwo: '',
  error: null,
};
 
class PasswordChangeForm extends Component {
  constructor(props) {
    super(props);
 
    this.state = { ...INITIAL_STATE };
  }
 
  onSubmit = event => {
    const { passwordOne } = this.state;
 
    this.props.firebase
      .doPasswordUpdate(passwordOne)
      .then(() => {
        this.setState({ ...INITIAL_STATE });
      })
      .catch(error => {
        this.setState({ error });
      });
 
    event.preventDefault();
  };
 
  onChange = event => {
    this.setState({ [event.target.name]: event.target.value });
  };
 
  render() {
    const { passwordOne, passwordTwo, error } = this.state;
 
    const isInvalid =
      passwordOne !== passwordTwo || passwordOne === '';
 
    return (
      <Container>
      <Form className="password-change-form" onSubmit={this.onSubmit}>
          <Form.Group>
            <Form.Label>Password:</Form.Label>
            <Form.Control
              name="passwordOne"
              value={passwordOne}
              onChange={this.onChange}
              type="password"
              placeholder="New Password"
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Password:</Form.Label>
            <Form.Control
              name="passwordTwo"
              value={passwordTwo}
              onChange={this.onChange}
              type="password"
              placeholder="Confirm New Password"
            />
          </Form.Group>
          <Button disabled={isInvalid} type="submit"
            variant="outline-success" className="password-forgot-button">
            Reset
          </Button>
        {error && <p>{error.message}</p>}
      </Form>
      </Container>
    );
  }
}
 
export default withFirebase(PasswordChangeForm);