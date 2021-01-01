import React, { Component } from 'react';

import { Button, Form, Row, Col } from 'react-bootstrap/';
 
import { withFirebase } from './components/Firebase';
 
const INITIAL_STATE = {
  passwordOne: '',
  passwordTwo: '',
  error: null,
  status: null,
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
        this.setState({ status: "Successfully Updated.", error: null }, () => {
          setTimeout(() => {
              this.setState({ ...INITIAL_STATE})
          }, 5000)
        });
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
    const { passwordOne, passwordTwo, error, status } = this.state;
 
    const isInvalid =
      passwordOne !== passwordTwo || passwordOne === '';
 
    return (
        <Row className="justify-content-row">
          <Col sm={4}>
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
                <Row className="passch-row-button">
                  <Button disabled={isInvalid} type="submit"
                    variant="outline-success" className="password-forgot-button">
                    Reset
                  </Button>
                </Row>
              {error && <p>{error.message}</p>}
              {status &&
                <Row className="row-loading-passch">
                    <p className="p-status-passch">{status}</p>
                </Row>}
            </Form>
          </Col>
        </Row>
    );
  }
}
 
export default withFirebase(PasswordChangeForm);