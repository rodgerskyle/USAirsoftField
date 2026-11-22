import React, { Component } from 'react';
import { withRouter } from './components/constants/withRouter';
import logo from './assets/usairsoft-small-logo.png';

import { get } from 'firebase/database';
import { withFirebase } from './components/Firebase';
import { PasswordForgetLink } from './passwordForgot';
import ThemedCaptcha from './components/ThemedCaptcha';
import { Container, Row, Col, Form, Button } from 'react-bootstrap/';

import { walkOnAfterLogin } from './components/constants/groupRentalLink';
import * as ROLES from './components/constants/roles';
import { Helmet } from 'react-helmet-async';

//import { SignUpLink } from './components/Pages/Signup';
//    <SignUpLink /> 

const SignInPage = () => (
  <div className="background-static-all">
    <Container className="login-container">
      <Col className="login-col">
        <Row className="header-rp">
          <img src={logo} alt="US Airsoft logo" className="small-logo-login" />
        </Row>
        <SignInForm />
      </Col>
    </Container>
  </div>
);


const INITIAL_STATE = {
  email: '',
  password: '',
  error: null,
  robot: true
};

class SignInFormBase extends Component {
  constructor(props) {
    super(props);

    this.handleCaptchaResponseChange = this.handleCaptchaResponseChange.bind(this);
    this.state = { ...INITIAL_STATE };
  }

  //Recaptcha stuff
  handleCaptchaResponseChange(response) {
    if (!response) return this.expireCaptcha();
    const widget = this.recaptcha;
    let checkRecaptcha = this.props.firebase.checkRecaptcha();
    checkRecaptcha({ response }).then((result) => {
      if (!widget || this.recaptcha !== widget || widget.getValue() !== response) return;
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
        console.log(code + " " + message)
        // ...
      })
  }

  //Recaptcha Expired
  expireCaptcha = () => {
    this.setState({ robot: true })
  }

  onSubmit = event => {
    event.preventDefault();
    if (!this.state.robot) {
      const { email, password } = this.state;
      this.recaptcha.reset();

      this.props.firebase
        .doSignInWithEmailAndPassword(email, password)
        .then(async ({ user }) => {
          const snapshot = await get(this.props.firebase.user(user.uid));
          const userObject = snapshot.val();
          if (!userObject || userObject.accountRemovedAt) {
            await this.props.firebase.doSignOut();
            this.setState({ ...INITIAL_STATE, error: 'This USAW player account is unavailable. Contact the field for help.' });
            return;
          }
          this.setState({ ...INITIAL_STATE });

          const roles = ROLES.officialAccountRoles(userObject.roles);
          const rental = ROLES.canUseRentalDesk(roles) &&
            walkOnAfterLogin(this.props.router.location.search, Boolean(roles.ADMIN));
          if (rental) {
            this.props.history.replace(rental);
          } else if (userObject.roles && !!userObject.roles[ROLES.WAIVER]) {
            this.props.history.push("/dashboard");
          } else {
            const team = new URLSearchParams(this.props.router.location.search).get('team');
            this.props.history.push(team ? `/jointeam?${new URLSearchParams({ team })}` : "/");
          }
        })
        .catch(error_p => {
          console.log(error_p);
          this.setState({ error: "The Email or Password is incorrect", robot: true });
        });
    }
  };

  onChange = event => {
    this.setState({ [event.target.name]: event.target.value });
  };

  render() {
    const { email, password, error, robot } = this.state;

    const isInvalid = password === '' || email === '' || robot === true;

    return (
      <div>
        <Helmet>
          <title>US Airsoft Field: Login</title>
        </Helmet>
        <Form className="login-form" onSubmit={this.onSubmit}>
          <Form.Group>
            <Form.Label className="form-label-login">Email:</Form.Label>
            <Form.Control
              name="email"
              value={email}
              onChange={this.onChange}
              type="text"
              autoComplete="email"
              placeholder="Email Address"
            />
          </Form.Group>
          <Form.Group>
            <Form.Label className="form-label-login">Password:</Form.Label>
            <Form.Control
              name="password"
              value={password}
              onChange={this.onChange}
              type="password"
              autoComplete="current-password"
              placeholder="Enter Password"
            />
          </Form.Group>
          <Button disabled={isInvalid} type="submit" block>
            Sign In
          </Button>
          <PasswordForgetLink />
          {error && <p>{error.message}</p>}
          <p className="text-align-center">{this.state.error}</p>
        </Form>
        <Container>
          <Row className="align-items-center justify-content-center">
            <Col className="recap">
              <ThemedCaptcha
                ref={(el) => { this.recaptcha = el; }}
                sitekey={process.env.REACT_APP_RECAPTCHA_V2_SITE_KEY}
                onChange={this.handleCaptchaResponseChange}
                onExpired={this.expireCaptcha} />
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}

const SignInForm = withRouter(withFirebase(SignInFormBase))

// const SignInForm = composeHooks(
//   withRouter,
//   withFirebase,
// )(SignInFormBase);

export default SignInPage;

export { SignInForm };
