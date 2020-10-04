import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { Container, Row, Col, Form, Button } from 'react-bootstrap/';
import SignatureCanvas from 'react-signature-canvas';
import SignedWaiver from './SignedWaiver';
import '../../App.css';

import cardimages from '../constants/cardimgs';
import waiver from '../../assets/Waiver-cutoff.png'

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
        <SignUpForm />
    </Container>
  </div>
);


const INITIAL_STATE = {
    fname: '',
    lname: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipcode: '',
    dob: '',
    passwordOne: '',
    passwordTwo: '',
    roles: [],
    pgname: '',
    pgphone: '',
    //isAdmin: false,
    error: null,
    errorWaiver: null,
    secondaryApp: app.initializeApp(config, "Secondary"),
    cards: cardimages,
    index: 0,
    pageIndex: 0,
    hideWaiver: false,
    agecheck: true,
    age: "",
    participantImg: null,
    pgImg: null,
    pdfBlob: null,
    submitted: false,
    member: true,
    uid: null,
  };

  let sigRef = {};
  let sigRef2 = {};
  //sigRef = React.createRef();
 
class SignUpFormBase extends Component {
  constructor(props) {
    super(props);

    this.completeWaiver = this.completeWaiver.bind(this);
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
        this.setState({uid: authUser.user.uid})
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
        //this.setState({ ...INITIAL_STATE, status: "Completed" });
        this.setState({submitted: true})
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

  checkDOB = event => {
    this.setState({ [event.target.name]: event.target.value }, function() {
      var today = new Date();
      var ageInput = new Date(this.state.dob);
      var age = today.getFullYear() - ageInput.getFullYear();
      var month = today.getMonth() - ageInput.getMonth();
      if (month < 0 || (month === 0 && today.getDate() < ageInput.getDate()))
        age--;
      if (age < 18) {
        this.setState({agecheck: false, age})
      }
      else {
        this.setState({agecheck: true, age})
      }
    });
  };

  // Prop to pass to waiver to call when complete
  completeWaiver = (blob) => {
    this.props.firebase.membersWaivers(`${this.state.uid}.pdf`).put(blob).then(() => {
      this.setState({submitted: false,}, function() {
        this.setState({ ...INITIAL_STATE, status: "Completed"});
      }) 
    })
  }
 
  render() {
    const {
      fname,
      lname,
      email,
      address,
      city,
      state,
      zipcode,
      phone,
      dob,
      pgname,
      pgphone,
      participantImg,
      pgImg,
      passwordOne,
      passwordTwo,
      //isAdmin,
      error,
      errorWaiver,
      status,
      hideWaiver,
      agecheck,
      age,
      member,
      uid,
      submitted,
    } = this.state;

    const myProps = {fname, lname, email, address, city, state, zipcode, phone, dob, pgname, pgphone, participantImg, pgImg, age, member, uid, }

    const isInvalid =
      passwordOne !== passwordTwo ||
      passwordOne === '' ||
      email === '' ||
      fname === '' ||
      lname === '';

 
    return (
      <div>
        <Row className="row-rp">
          { this.state.pageIndex === 0 ? 
          <Col>
            <Row className="row-rp waiver-row-rp">
              <img src={waiver} alt="US Airsoft waiver" className={!hideWaiver ? "waiver-rp" : "waiver-hidden-rp"}/>
              <Row className="text-block-waiver-rp">
                <Button variant="outline-secondary" type="button" 
                onClick={() => {
                  this.setState({hideWaiver: !hideWaiver})
                }}>
                    {hideWaiver ? "Show Agreement" : "Hide Agreement"}
                </Button>
              </Row>
            </Row>
            <Row className={!hideWaiver ? "row-rp" : "row-rp waiver-input-rp"}>
              <h2 className="waiver-header-rp">
                Participant Information: 
              </h2>
            </Row>
            <Row className="row-rp">
            <Form className="waiver-form-rp">
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
              <Col>
                <Form.Group>
                  <Form.Label>Phone Number:</Form.Label>
                  <Form.Control
                    name="phone"
                    value={phone}
                    onChange={this.onChange}
                    type="phone"
                    placeholder="Phone #"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col>
                <Form.Group>
                  <Form.Label>Address:</Form.Label>
                  <Form.Control
                    name="address"
                    value={address}
                    onChange={this.onChange}
                    type="text"
                    placeholder="Address"
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>City:</Form.Label>
                  <Form.Control
                    name="city"
                    value={city}
                    onChange={this.onChange}
                    type="text"
                    placeholder="City"
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>State:</Form.Label>
                  <Form.Control
                    name="state"
                    value={state}
                    onChange={this.onChange}
                    type="text"
                    placeholder="State"
                  />
                </Form.Group>
              </Col>
            </Row>
              <Row>
                <Col>
                  <Form.Group>
                    <Form.Label>Date Of Birth:</Form.Label>
                    <Form.Control
                      name="dob"
                      value={dob}
                      onChange={this.checkDOB}
                      type="date"
                      placeholder="Ex: 03-24-1999"
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group>
                    <Form.Label>Zipcode:</Form.Label>
                    <Form.Control
                      name="zipcode"
                      value={zipcode}
                      onChange={this.onChange}
                      type="text"
                      placeholder="Zipcode"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col>
                  <p className="header-sig-rp">
                    Participant Signature:
                  </p>
                </Col>
              </Row>
              <Row className="row-rp sig-row-rp">
                {!this.state.participantImg ? 
                  <SignatureCanvas penColor='black' ref={(ref) => {this.sigRef = ref}}
                  canvasProps={{width: 750, height: 150, className: 'participant-sig-rp'}} />
                  : <img className="signBox-image-rt" src={this.state.participantImg} alt="signature" />
                }
              </Row>
              <Row className="row-rp">
                <Button variant="secondary" type="button" className="clear-button-rp"
                onClick={() => {
                  this.setState({participantImg: null})
                  if (this.sigRef)
                    this.sigRef.clear();
                }}>
                    Clear
                </Button>
                <Button variant="secondary" type="button" className="save-button-rp"
                onClick={() => {
                    if (!this.sigRef.isEmpty()) {
                    this.setState({
                      participantImg: this.sigRef.getTrimmedCanvas().toDataURL("image/png")
                    })
                  }
                }}>
                    Save
                </Button>
              </Row>
              {!agecheck ? 
              <Col>
              <Row className="row-rp">
                <h2 className="waiver-header-rp">
                  {"Guardian/Parent Information:"}
                </h2>
              </Row>
              <Row>
                <Col>
                  <Form.Group>
                    <Form.Label>Parent/Guardian Full Name:</Form.Label>
                    <Form.Control
                      name="pgname"
                      value={pgname}
                      onChange={this.checkDOB}
                      type="text"
                      placeholder="Full Name"
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group>
                    <Form.Label>Emergency Number:</Form.Label>
                    <Form.Control
                      name="pgphone"
                      value={pgphone}
                      onChange={this.onChange}
                      type="phone"
                      placeholder="Phone"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col>
                  <p className="header-sig-rp">
                    Parent/Guardian Signature:
                  </p>
                </Col>
              </Row>
              <Row className="row-rp sig-row-rp">
                {!this.state.pgImg? 
                  <SignatureCanvas penColor='black' ref={(ref) => {this.sigRef2 = ref}}
                  canvasProps={{width: 750, height: 150, className: 'participant-sig-rp'}} />
                  : <img className="signBox-image-rt" src={this.state.pgImg} alt="signature" />
                }
              </Row>
              <Row className="row-rp">
                <Button variant="secondary" type="button" className="clear-button-rp"
                onClick={() => {
                  this.setState({pgImg: null})
                  if (this.sigRef2)
                    this.sigRef2.clear();
                }}>
                    Clear
                </Button>
                <Button variant="secondary" type="button" className="save-button-rp"
                onClick={() => {
                    if (!this.sigRef2.isEmpty()) {
                    this.setState({
                      pgImg: this.sigRef2.getTrimmedCanvas().toDataURL("image/png")
                    })
                  }
                }}>
                    Save
                </Button>
              </Row>
              </Col>
              : ""}
              </Form>
              </Row>
              <Row className="row-rp">
                {errorWaiver && <p className="error-text-rp">{errorWaiver}</p>}
              </Row>
          </Col>
          :
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
              {submitted ? 
                <SignedWaiver {...myProps} completeWaiver={this.completeWaiver}/> : ""
              }
              </Col>
            </Row>
          </Form>
          }
          </Row>
          <Row className="row-rp nav-row-rp">
            <Button className="prev-button-rp" variant="info" type="button" disabled={this.state.pageIndex===0}
            onClick={() => {
              if (this.state.pageIndex!==0)
                this.setState({pageIndex: this.state.pageIndex-1,})
            }}>
                Previous
            </Button>
            <Button className="next-button-rp" variant="info" type="button" disabled={this.state.pageIndex===1}
            onClick={() => {
              if (address === "" || fname === "" || lname === "" || email === "" || address === "" ||
              city === "" || state === "" || zipcode === "" || phone === "" || dob === "") {
                this.setState({errorWaiver: "Please fill out all boxes with your information."})
              }
              else if ((pgname === "" || pgphone === "") && age < 18) {
                this.setState({errorWaiver: "Please fill out all boxes with your information."})
              }
              else if (this.state.participantImg === null || (this.state.pgImg === null && age < 18)) {
                this.setState({errorWaiver: "Please sign and save the waiver in the box."})
              }
              else if (this.state.pageIndex!==1)
                this.setState({pageIndex: this.state.pageIndex+1})
            }}>
                Next
            </Button>
          </Row>
      </div>
    );
  };
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