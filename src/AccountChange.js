import React, { Component } from 'react';

import { Form, Row, Col } from 'react-bootstrap/';

import { Button } from '@material-ui/core';

import { Modal, Fade, Backdrop } from '@material-ui/core';

import { withFirebase } from './components/Firebase';

import Verification from "./components/Pages/Verification";

import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';

const INITIAL_STATE = {
  passwordOne: '',
  passwordTwo: '',
  email: '',
  error: null,
  status: null,
  updating: false,
};

class AccountChangeForm extends Component {
  constructor(props) {
    super(props);

    this.state = { ...INITIAL_STATE };

    this.onSubmit = this.onSubmit.bind(this)
  }


  // Function to test email input with regex
  validateEmail(email) {
      const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test(String(email).toLowerCase());
  }

  verifyInputs = () => {
    const { email, passwordOne, passwordTwo } = this.state;
    let error = false;
    if (email !== "") {
      if (email === this.props.authUser.email) {
        error = true;
        this.setState({error: {message: "Email cannot be the same as the original."}})
      }
      else if (!this.validateEmail) {
        error = true;
        this.setState({error: {message: "Email must be a valid email (example@example.com)."}})
      }
    }
    if (passwordOne !== "") {
      if (passwordOne !== passwordTwo) {
        error = true;
        this.setState({error: {message: "The new password in both input boxes must match."}})
      }
      else if (passwordOne.length < 8) {
        error = true;
        this.setState({error: {message: "The password must be greater than 8 characters."}})
      }
    }

    if (email === "" && passwordOne === "") {
      error = true;
      this.setState({error: {message: "No changes were made, nothing to update."}})
    }

    // Check if error has occurred
    if (!error)
      this.setState({updating: true})
  }

  onSubmit = () => {
    const { passwordOne, email } = this.state;
    this.setState({updating: false})

    if (passwordOne !== "") {
      this.props.firebase
        .doPasswordUpdate(passwordOne)
        .then(() => {
          this.setState({ 
            status: "Successfully Updated.", error: null, 
            passwordOne: "", passwordTwo: "" 
          });
        })
        .catch(error => {
          this.setState({ error });
        });
    }
    if (email !== "") {
      this.props.firebase
        .doEmailUpdate(email)
        .then(() => {
          this.setState({ 
            status: "Please check your current email for further instruction.", error: null,
            email: "" 
          });
        })
        .catch(error => {
          this.setState({ error });
        });
      }

  };

  onChange = event => {
    this.setState({ [event.target.name]: event.target.value });
  };

  render() {
    const { passwordOne, passwordTwo, error, status, email } = this.state;

    const verify = this.onSubmit

    return (
      <div className="div-account-inputs-settings">
        <Form className="password-change-form" onSubmit={this.onSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Current Email:</Form.Label>
                <Form.Control
                  value={this.props.authUser.email}
                  type="text"
                  className="form-control-cur-email-settings"
                  disabled
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>New Email:</Form.Label>
                <Form.Control
                  name="email"
                  value={email}
                  type="text"
                  onChange={this.onChange}
                  autoComplete="new-email"
                  placeholder="New Email"
                />
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>New Password:</Form.Label>
                <Form.Control
                  name="passwordOne"
                  value={passwordOne}
                  onChange={this.onChange}
                  type="password"
                  autoComplete="new-password"
                  placeholder="New Password"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Confirm Password:</Form.Label>
                <Form.Control
                  name="passwordTwo"
                  value={passwordTwo}
                  onChange={this.onChange}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm New Password"
                />
              </Form.Group>
            </Col>
          </Row>
        </Form>
        <Snackbar open={status !== null} autoHideDuration={6000} onClose={() => this.setState({ status: null })}>
          <Alert onClose={() => this.setState({ status: null })} severity="success">
            {status}
          </Alert>
        </Snackbar>
        <Snackbar open={error !== null} autoHideDuration={6000} onClose={() => this.setState({ error: null })}>
          <Alert onClose={() => this.setState({ error: null })} severity="error">
            {error?.message}
          </Alert>
        </Snackbar>
        <Row className="passch-row-button">
          <Col className="col-update-button-settings">
            <Button type="button" color="primary" onClick={() => {
              this.verifyInputs()
            }}
              variant="contained" className="password-forgot-button">
              Update
            </Button>
          </Col>
        </Row>
        <Modal
          aria-labelledby="Account Update Verification"
          className={"modal-ef"}
          open={this.state.updating}
          onClose={() => this.setState({ updating: false })}
          closeAfterTransition
          BackdropComponent={Backdrop}
          BackdropProps={{
            timeout: 500,
          }}>
          <Fade in={this.state.updating}>
            <div className={"paper-ef"}>
              <Verification verify={verify}/>
            </div>
          </Fade>
        </Modal>
      </div>
    );
  }
}

export default withFirebase(AccountChangeForm);