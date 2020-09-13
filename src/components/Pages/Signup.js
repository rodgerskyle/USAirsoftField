import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import '../../App.css';

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
    <div className="pagePlaceholder">
      <h1>SignUp</h1>
      <SignUpForm />
    </div>
  </div>
);


const INITIAL_STATE = {
    name: '',
    email: '',
    passwordOne: '',
    passwordTwo: '',
    roles: [],
    isAdmin: false,
    error: null,
    secondaryApp: app.initializeApp(config, "Secondary"),
  };
 
class SignUpFormBase extends Component {
  constructor(props) {
    super(props);

    this.state = { ...INITIAL_STATE };
  }

    onChangeCheckbox = event => {
        this.setState({ [event.target.name]: event.target.checked });
    };
 
  onSubmit = event => {
    const { name, email, passwordOne, isAdmin } = this.state;
    const points = 50;
    const wins = 0;
    const losses = 0;
    const previousmonth = 0
    const currentmonth = 0
    const renewal = (new Date().getMonth() + 1) + "-" + (new Date().getDate()) + "-" + (new Date().getFullYear()+1);
    var tempuser = '';
    for (var i=0; i<name.length; i++) {
      if (name[i]!==" ") {
        tempuser+=name[i];
      }
    }
    const username = tempuser.toLowerCase();
    //We need to check if username exists
    const freegames = 0;
    const team = '';
    const roles = [];
    if (isAdmin) {
    roles.push(ROLES.ADMIN);
    }
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
            previousmonth,
            currentmonth,
            renewal
          });
      })
      .then(authUser => {
        this.setState({ ...INITIAL_STATE });
        window.location.href="/signup";
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
      name,
      email,
      passwordOne,
      passwordTwo,
      isAdmin,
      error,
    } = this.state;

    const isInvalid =
      passwordOne !== passwordTwo ||
      passwordOne === '' ||
      email === '' ||
      name === '';

 
    return (
      <form onSubmit={this.onSubmit}>
        <input
          name="name"
          value={name}
          onChange={this.onChange}
          type="text"
          placeholder="Full Name"
        />
        <input
          name="email"
          value={email}
          onChange={this.onChange}
          type="text"
          placeholder="Email Address"
        />
        <input
          name="passwordOne"
          value={passwordOne}
          onChange={this.onChange}
          type="password"
          placeholder="Password"
        />
        <input
          name="passwordTwo"
          value={passwordTwo}
          onChange={this.onChange}
          type="password"
          placeholder="Confirm Password"
        />
        <label>
            Admin:
            <input
            name="isAdmin"
            type="checkbox"
            checked={isAdmin}
            onChange={this.onChangeCheckbox}
            />
        </label>
        <button disabled={isInvalid} type="submit">
            Sign Up
        </button>
 
        {error && <p>{error.message}</p>}
      </form>
    );
  }
}
 
const SignUpLink = () => (
  <p>
    Don't have an account? <Link to={"/register"}>Sign Up</Link>
  </p>
);

const condition = authUser =>
authUser && !!authUser.roles[ROLES.ADMIN];

const SignUpForm = compose(
    withAuthorization(condition),
    withFirebase,
    )(SignUpFormBase);

export default SignUpPage;
 
export { SignUpForm, SignUpLink };