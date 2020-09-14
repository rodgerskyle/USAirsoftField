import React, { Component } from 'react';

import { Container, Row, Col } from 'react-bootstrap/';
 
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
      <form onSubmit={this.onSubmit}>
        <Row>
          <Col>
            <p className="password-text">Password :</p>
          </Col>
          <Col>
            <input
              name="passwordOne"
              value={passwordOne}
              onChange={this.onChange}
              type="password"
              placeholder="New Password"
            />
          </Col>
        </Row>
        <Row>
          <Col>
            <p className="password-text">Confirm Password :</p>
          </Col>
          <Col>
            <input
              name="passwordTwo"
              value={passwordTwo}
              onChange={this.onChange}
              type="password"
              placeholder="Confirm New Password"
            />
          </Col>
        </Row>
        <button disabled={isInvalid} type="submit">
          Reset My Password
        </button>
 
        {error && <p>{error.message}</p>}
      </form>
    );
  }
}
 
export default withFirebase(PasswordChangeForm);