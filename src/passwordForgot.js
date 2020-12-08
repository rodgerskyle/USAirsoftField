import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import logo from './assets/logo.png';
 
import { withFirebase } from './components/Firebase';
import { Container, Row, Col, Form, Button, InputGroup, FormControl } from 'react-bootstrap/';
 
const INITIAL_STATE = {
  email: '',
  error: null,
};
 
class PasswordForgetFormBase extends Component {
  constructor(props) {
    super(props);
 
    this.state = { ...INITIAL_STATE };
  }
 
  onSubmit = event => {
    const { email } = this.state;
 
    this.props.firebase
      .doPasswordReset(email)
      .then(() => {
        this.setState({ 
          email: '',
          error: "Please check your inbox for further instructions." 
         });
      })
      .catch(error_p => {
        this.setState({ 
          email: '', 
          error: "Please check your inbox for further instructions." 
        });
      });
 
    event.preventDefault();
  };
 
  onChange = event => {
    this.setState({ [event.target.name]: event.target.value });
  };
 
  render() {
    const { email, error } = this.state;
 
    const isInvalid = email === '';
 
    return (
    <div className="background-static-all">
      <Container className="login-container">
        <Col className="login-col">
          <Row className="header-rp">
            <img src={logo} alt="US Airsoft logo" className="small-logo-login"/>
          </Row>
          <Form onSubmit={this.onSubmit}>
            <InputGroup className="mb-1 input-group-forgot-pass">
                <FormControl
                name="email"
                placeholder="Email Address"
                aria-label="Email Address"
                value={this.state.email}
                onChange={this.onChange}
                />
                <InputGroup.Append>
                    <Button variant="primary" type="submit"
                    disabled={isInvalid}
                    >Reset My Password</Button>
                </InputGroup.Append>
            </InputGroup>
            <p className="forgotP">{error}</p>
          </Form>
        </Col>
      </Container>
    </div>
    );
  }
}
 
const PasswordForgetLink = () => (
  <p className="forgotPass">
    <i className="italic-forgot-text">Forgot </i>
    <Link to="/forgotpassword">Password?</Link>
  </p>
);
 
const PasswordForgetForm = withFirebase(PasswordForgetFormBase);
 
export { PasswordForgetForm, PasswordForgetLink };