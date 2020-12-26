import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import logo from './assets/logo.png';
 
import { withFirebase } from './components/Firebase';
import { Container, Row, Col, Form, Button, InputGroup, FormControl } from 'react-bootstrap/';

import ReCAPTCHA from 'react-google-recaptcha';
 
const INITIAL_STATE = {
  email: '',
  error: null,
  robot: true,
};
 
class PasswordForgetFormBase extends Component {
  constructor(props) {
    super(props);
 
    this.handleCaptchaResponseChange = this.handleCaptchaResponseChange.bind(this);
    this.state = { ...INITIAL_STATE };
  }

//Recaptcha stuff
  handleCaptchaResponseChange(response) {
    let checkRecaptcha = this.props.firebase.checkRecaptcha();
    checkRecaptcha({response}).then((result) => {
      if (result.data && result.data.status === "success.") {
        this.setState({
          robot: false, error: null
        });
      }
      else {
        this.recaptcha.reset();
        this.setState({ error: "Please retry the ReCAPTCHA." })
      }
    })
    .catch((error) => {
    // Getting the Error details.
    var code = error.code;
    var message = error.message;
    console.log (code + " " + message)
    // ...
    })
  }

  //Recaptcha Expired
  expireCaptcha = () => {
    this.setState({ robot: true })
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
    const { email, error, robot } = this.state;
 
    const isInvalid = email === '' || robot === true;
 
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
          <Row className="align-items-center justify-content-center">
            <Col className="recap">
              <ReCAPTCHA
                ref={(el) => { this.recaptcha = el; }}
                sitekey="6Lc0JPsUAAAAAGfLV1lzptnyO2V1dTU7GfR5_5h5"
                theme={'dark'}
                onChange={this.handleCaptchaResponseChange} 
                onExpired={this.expireCaptcha} />
            </Col>
          </Row>
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