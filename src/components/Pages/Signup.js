import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { Container, Row, Col, Form, Button } from 'react-bootstrap/';
import '../../App.css';

import cardimages from '../constants/cardimgs';

import { withAuthorization } from '../session';
import { compose } from 'recompose';
import { withFirebase } from '../Firebase';
import * as ROLES from '../constants/roles';


//For creating a second reference to Firebase
import app from 'firebase/app';
require('dotenv').config();
const config = {
    apiKey: process.env.REACT_APP_API_KEY,
    authDomain: process.env.REACT_APP_AUTH_DOMAIN,
    databaseURL: process.env.REACT_APP_DATABASE_URL,
    projectId: process.env.REACT_APP_PROJECT_ID,
    storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_APP_ID,
    measurementId: process.env.REACT_APP_MEASUREMENT_ID
};

 
const SignUpPage = () => (
  <div className="background-static-all">
    <Container>
      <Row className="header-rp">
        <img src={logo} alt="US Airsoft logo" className="small-logo-home"/>
        <h2 className="page-header">Membership Form</h2>
      </Row>
      <Row className="row-rp">
        <SignUpForm />
      </Row>
    </Container>
  </div>
);


const INITIAL_STATE = {
    fname: '',
    lname: '',
    email: '',
    passwordOne: '',
    passwordTwo: '',
    roles: [],
    //isAdmin: false,
    error: null,
    secondaryApp: app.initializeApp(config, "Secondary"),
    cards: cardimages,
    index: 0,
  };
 
class SignUpFormBase extends Component {
  constructor(props) {
    super(props);

    this.state = { ...INITIAL_STATE, status: "", };
  }

    onChangeCheckbox = event => {
        this.setState({ [event.target.name]: event.target.checked });
    };
 
  onSubmit = event => {
    event.preventDefault();
    const { email, passwordOne, fname, lname } = this.state;
    const points = 50;
    const wins = 0;
    const losses = 0;
    const cmwins = 0;
    const cmlosses = 0;
    const pmwins = 0;
    const pmlosses = 0;
    const renewal = (new Date().getMonth() + 1) + "-" + (new Date().getDate()) + "-" + (new Date().getFullYear()+1);
    const username = (fname+lname).replace(/\s/, "").toLowerCase();
    const name = fname + " " + lname;
    //We need to check if username exists
    const freegames = 0;
    const team = '';
    const roles = [];
    //if (isAdmin) {
    //roles.push(ROLES.ADMIN);
    //}
    this.state.secondaryApp.auth().createUserWithEmailAndPassword(email, passwordOne).then(authUser => {
        // Create a user in your Firebase realtime database
        return this.props.firebase
          .user(authUser.user.uid)
          .set({
            name,
            email,
            roles,
            points,
            wins,
            losses,
            freegames,
            username,
            team,
            cmwins,
            cmlosses,
            pmwins,
            pmlosses,
            renewal
          });
      })
      .then(authUser => {
        this.setState({ ...INITIAL_STATE, status: "Completed" });
        //window.location.href="/signup";
        //this.props.history.push("/");
      })
      .catch(error => {
        this.setState({ error });
      });
  this.state.secondaryApp.auth().signOut();
  event.preventDefault();
  }
 
  onChange = event => {
    this.setState({ [event.target.name]: event.target.value });
  };
 
  render() {
    const {
      fname,
      lname,
      email,
      passwordOne,
      passwordTwo,
      //isAdmin,
      error,
      status,
    } = this.state;

    const isInvalid =
      passwordOne !== passwordTwo ||
      passwordOne === '' ||
      email === '' ||
      fname === '' ||
      lname === '';

 
    return (
      <Form className="form-rp" onSubmit={this.onSubmit}>
        <Row>
          <Col>
            <Row className="row-rp">
              <h5>Card Preview:</h5>
            </Row>
            <Row className="row-rp card-row-rp">
              <img src={this.state.cards[this.state.index]} alt="US Airsoft cards" className="card-rp"/>
              <Row className={this.state.fname === "" && this.state.lname === "" ? "text-block-empty-rp" : "text-block-card-rp"}>
                  {this.state.fname + " " + this.state.lname}
              </Row>
            </Row>
            <Row className="row-rp nav-row-rp">
            <Button className="prev-button-rp" variant="info" type="button" disabled={this.state.index===0}
            onClick={() => {
              if (this.state.index!==0)
                this.setState({index: this.state.index-1,})
            }}>
                Previous
            </Button>
            <Button className="next-button-rp" variant="info" type="button" disabled={this.state.index===12}
            onClick={() => {
              if (this.state.index!==12)
                this.setState({index: this.state.index+1})
            }}>
                Next
            </Button>
            </Row>
          </Col>
          <Col>
        <Row>
          <Col>
            <Form.Group>
              <Form.Label>First Name:</Form.Label>
              <Form.Control
                name="fname"
                value={fname}
                onChange={this.onChange}
                type="text"
                placeholder="First Name"
              />
            </Form.Group>
          </Col>
          <Col>
            <Form.Group>
              <Form.Label>Last Name:</Form.Label>
              <Form.Control
                name="lname"
                value={lname}
                onChange={this.onChange}
                type="text"
                placeholder="Last Name"
              />
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col>
            <Form.Group>
              <Form.Label>Email:</Form.Label>
              <Form.Control
                name="email"
                value={email}
                onChange={this.onChange}
                type="text"
                placeholder="Email Address"
              />
            </Form.Group>
          </Col>
        </Row>
          <Row>
            <Col>
              <Form.Group>
                <Form.Label>Password:</Form.Label>
                <Form.Control
                  name="passwordOne"
                  value={passwordOne}
                  onChange={this.onChange}
                  type="password"
                  placeholder="Password"
                />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group>
                <Form.Label>Confirm Password:</Form.Label>
                <Form.Control
                  name="passwordTwo"
                  value={passwordTwo}
                  onChange={this.onChange}
                  type="password"
                  placeholder="Confirm Password"
                />
              </Form.Group>
            </Col>
          </Row>
          <Row className="button-row-rp">
            <Col>
              <Button variant={isInvalid ? "danger" : "success"} disabled={isInvalid} type="submit"
              className="button-signup-rp">
                  Sign Up
              </Button>
            </Col>
          </Row>
          <Row>
            {status && <p>{status}</p>}
            {error && <p>{error.message}</p>}
          </Row>
          </Col>
        </Row>
      </Form>
    );
  }
}
 
const SignUpLink = () => (
  <p>
    Don't have an account? <Link to={"/register"}>Sign Up</Link>
  </p>
);

/* 
  <label>
      Admin:
      <input
      name="isAdmin"
      type="checkbox"
      checked={isAdmin}
      onChange={this.onChangeCheckbox}
      />
  </label>
*/

const condition = authUser =>
authUser && !!authUser.roles[ROLES.ADMIN];

const SignUpForm = compose(
    withAuthorization(condition),
    withFirebase,
    )(SignUpFormBase);

export default SignUpPage;
 
export { SignUpForm, SignUpLink };