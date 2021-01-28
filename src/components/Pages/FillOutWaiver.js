import React, { Component } from 'react';
import logo from '../../assets/logo.png';
import { Container, Row, Col, Form, Button, Breadcrumb, Spinner } from 'react-bootstrap/';
import { pdf } from '@react-pdf/renderer';
import { LinkContainer } from 'react-router-bootstrap';
import SignatureCanvas from 'react-signature-canvas';
import SignedWaiver from './SignedWaiver';
import '../../App.css';
import { encode } from 'firebase-encode';

import waiver from '../../assets/Waiver-cutoff.png'

import { Typeahead } from 'react-bootstrap-typeahead';

import { AuthUserContext, withAuthorization } from '../session';
import { compose } from 'recompose';
import { withFirebase } from '../Firebase';
import * as ROLES from '../constants/roles';

const WaiverPage = () => (
  <AuthUserContext.Consumer>
    {authUser => (
      <div className="background-static-all">
        <Container>
          <Row className="header-rp">
            <img src={logo} alt="US Airsoft logo" className="small-logo-home" />
            <h2 className="page-header">Waiver Form</h2>
          </Row>
          {authUser && !!authUser.roles[ROLES.ADMIN] ?
            <Breadcrumb className="admin-breadcrumb">
              <LinkContainer to="/admin">
                <Breadcrumb.Item>Admin</Breadcrumb.Item>
              </LinkContainer>
              <Breadcrumb.Item active>Fill Out Waiver</Breadcrumb.Item>
            </Breadcrumb>
            : null}
          <WaiverForm />
        </Container>
      </div>
    )}
  </AuthUserContext.Consumer>
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
  pgname: '',
  pgphone: '',
  hideWaiver: false,
  errorWaiver: null,
  agecheck: true,
  age: "",
  participantImg: null,
  pgImg: null,
  pdfBlob: null,
  member: true,
  uid: null,
  saveButton: true,
  saveButton2: true,
  showLander: false,
  emailAdded: false,
  loading: false,
  selectedGroup: [],
};

class WaiverPageFormBase extends Component {
  constructor(props) {
    super(props);

    //this.completeWaiver = this.completeWaiver.bind(this);
    this.state = { ...INITIAL_STATE, num_waivers: null, groups: null, loading: true, groupIndex: null, groupsObject: null };
  }

  async completeWaiver(myProps) {
    const { fname, lname, selectedGroup, groupsObject, groupIndex } = this.state;
    const blob = await pdf((
      <SignedWaiver {...myProps} />
    )).toBlob();
    var date = (new Date().getMonth() + 1) + "-" + (new Date().getDate()) + "-" + (new Date().getFullYear()) + ":" +
      (new Date().getHours()) + ":" + (new Date().getMinutes()) + ":" + (new Date().getSeconds()) + ":" + (new Date().getMilliseconds());
    this.props.firebase.nonmembersWaivers(`${fname} ${lname}(${date}).pdf`).put(blob).then(() => {
      if (selectedGroup.length !== 0) {
        if (typeof groupsObject[groupIndex[selectedGroup[0]]].participants === 'undefined') {
          // Push participant into new array and set it
          let participants = []
          let obj = {name: `${fname} ${lname}(${date})`, gamepass: false}
          participants.push(obj)
          this.props.firebase.rentalGroup(groupIndex[selectedGroup[0]]).update({participants})
        }
        else if (groupsObject[groupIndex[selectedGroup[0]]].participants.length < groupsObject[groupIndex[selectedGroup[0]]].size) {
          // Push participant into existing array and set it
          let participants = groupsObject[groupIndex[selectedGroup[0]]].participants
          let obj = {name: `${fname} ${lname}(${date})`, gamepass: false}
          participants.push(obj)
          this.props.firebase.rentalGroup(groupIndex[selectedGroup[0]]).update({participants})
        }
        // Make sure length and size are not equal
        // Push new user to participants table
      }
      this.setState({ showLander: true, loading: false })
      let total_num = this.state.num_waivers + 1
      this.props.firebase.numWaivers().update({ total_num })
    })
  }

  // Will Check duplicates in list
  checkDuplicates(email) {
    return this.props.firebase.emailList(encode(email)).once("value", object => {
    }).then((object) => {
      return object.val() === null ? false : true
    })
  }

  componentDidMount() {
    this.props.firebase.numWaivers().on('value', snapshot => {
      let num_waivers = snapshot.val().total_num;
      this.setState({ num_waivers })
    })
    this.props.firebase.rentalGroups().on('value', obj => {
      const groupsObj = obj.val()

      let groups = []
      let groupsObject;
      let groupIndex = {}

      if (groupsObj) {
        groupsObject = Object.keys(groupsObj).map(key => ({
            ...groupsObj[key],
            index: key,
        }))
        for (let i = 0; i < groupsObj.length; i++) {
          groups[i] = groupsObj[i].name
          groupIndex[groupsObj[i].name] = i
        }
      }

      this.setState({ groups, loading: false, groupsObject, groupIndex })
    })
  }

  componentWillUnmount() {
    this.props.firebase.numWaivers().off();
    this.props.firebase.rentalGroups().off()
  }

  onChangeCheckbox = event => {
    this.setState({ [event.target.name]: event.target.checked });
  };

  onChange = event => {
    this.setState({ [event.target.name]: event.target.value });
  };

  checkDOB = event => {
    this.setState({ [event.target.name]: event.target.value }, function () {
      var today = new Date();
      var ageInput = new Date(this.state.dob);
      var age = today.getFullYear() - ageInput.getFullYear();
      var month = today.getMonth() - ageInput.getMonth();
      if (month < 0 || (month === 0 && today.getDate() < ageInput.getDate()))
        age--;
      if (age < 18) {
        this.setState({ agecheck: false, age })
      }
      else {
        this.setState({ agecheck: true, age })
      }
    });
  };

  // Complete email sign up to email list 
  emailSignUp = () => {
    var { email } = this.state;
    email = email.toLowerCase();
    // Check for duplicate email
    this.checkDuplicates(email).then((response) => {
      if (response === false) {
        // Use below to generate random uid for signing up and filling out waivers
        var secret = 'n' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
        this.props.firebase.emailList(encode(email.toLowerCase())).set({ secret })
      }
      this.setState({ emailAdded: true })
    })
  }

  // Function to test email input with regex
  validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
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
      errorWaiver,
      hideWaiver,
      agecheck,
      age,
      saveButton,
      saveButton2,
      showLander,
      emailAdded,
      loading,
    } = this.state;

    const myProps = { fname, lname, email, address, city, state, zipcode, phone, dob, pgname, pgphone, participantImg, pgImg, age }

    return (
      <div>
        { !showLander ?
          !loading ?
            <div>
              <Row className="justify-content-row">
                <Col className="col-waiver">
                  <Row className="justify-content-row waiver-row-rp">
                    <img src={waiver} alt="US Airsoft waiver" className={!hideWaiver ? "waiver-rp" : "waiver-hidden-rp"} />
                    <Row className="text-block-waiver-rp">
                      <Button variant="outline-secondary" type="button" className={hideWaiver ? "button-hidden-rp" : ""}
                        onClick={() => {
                          this.setState({ hideWaiver: !hideWaiver })
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
                          <p className="p-groupname-rp">Rental Group Name: (If Applicable)</p>
                        </Col>
                      </Row>
                      <Row className="row-typeahead-rp">
                        <Col>
                          <Typeahead
                            labelKey="Groupname"
                            id="group-join"
                            onChange={(val) => {
                              this.setState({ selectedGroup: val });
                            }}
                            options={this.state.groups}
                            selected={this.state.selectedGroup}
                          />
                        </Col>
                      </Row>
                      <Row>
                        <Col>
                          <Form.Group>
                            <Form.Label>First Name:</Form.Label>
                            <Form.Control
                              name="fname"
                              value={fname}
                              onChange={this.onChange}
                              type="text"
                              autoComplete="off"
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
                              autoComplete="off"
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
                              autoComplete="off"
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
                              autoComplete="off"
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
                              autoComplete="off"
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
                              autoComplete="off"
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
                              autoComplete="off"
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
                              autoComplete="off"
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
                              autoComplete="off"
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
                      <Row className="sig-row-rp">
                        <Col className="justify-content-center-col sig-col-rp">
                          {!this.state.participantImg ?
                            <SignatureCanvas penColor='black' ref={(ref) => { this.sigRef = ref }}
                              canvasProps={{ className: 'participant-sig-rp' }} clearOnResize={false} />
                            : <img className="signBox-image-rt" src={this.state.participantImg} alt="signature" />
                          }
                        </Col>
                      </Row>
                      <Row className="button-row-rp2">
                        <Button variant="secondary" type="button" className="clear-button-rp"
                          onClick={() => {
                            this.setState({ participantImg: null })
                            if (this.sigRef)
                              this.sigRef.clear();
                            this.setState({ saveButton: true })
                          }}>
                          Clear
                </Button>
                        <Button variant="secondary" type="button" className="save-button-rp" disabled={!saveButton}
                          onClick={() => {
                            if (!this.sigRef.isEmpty()) {
                              this.setState({
                                participantImg: this.sigRef.getTrimmedCanvas().toDataURL("image/png"), saveButton: false,
                              })
                            }
                          }}>
                          Save
                </Button>
                      </Row>
                      {!agecheck ?
                        <div>
                          <Row className="justify-content-row">
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
                                  autoComplete="off"
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
                                  autoComplete="off"
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
                            <Col className="justify-content-center-col sig-col-rp">
                              {!this.state.pgImg ?
                                <SignatureCanvas penColor='black' ref={(ref) => { this.sigRef2 = ref }}
                                  canvasProps={{ className: 'participant-sig-rp' }} />
                                : <img className="signBox-image-rt" src={this.state.pgImg} alt="signature" />
                              }
                            </Col>
                          </Row>
                          <Row className="button-row-rp2">
                            <Button variant="secondary" type="button" className="clear-button-rp"
                              onClick={() => {
                                this.setState({ pgImg: null })
                                if (this.sigRef2)
                                  this.sigRef2.clear();
                                this.setState({ saveButton2: true })
                              }}>
                              Clear
                </Button>
                            <Button variant="secondary" type="button" className="save-button-rp" disabled={!saveButton2}
                              onClick={() => {
                                if (!this.sigRef2.isEmpty()) {
                                  this.setState({
                                    pgImg: this.sigRef2.getTrimmedCanvas().toDataURL("image/png"), saveButton2: false,
                                  })
                                }
                              }}>
                              Save
                </Button>
                          </Row>
                        </div>
                        : null}
                    </Form>
                  </Row>
                  {loading ?
                    <Row className="row-rp spinner-row-rp">
                      <Spinner animation="border" />
                    </Row>
                    : null}
                  <Row className="row-rp">
                    {errorWaiver && <p className="error-text-rp">{errorWaiver}</p>}
                  </Row>
                </Col>
              </Row>
              {!loading ?
                <Row className="nav-row-rp">
                  <Button className="next-button-rp" variant="info" type="button" disabled={this.state.pageIndex === 1}
                    onClick={() => {
                      if (address === "" || fname === "" || lname === "" || email === "" || address === "" ||
                        city === "" || state === "" || zipcode === "" || phone === "" || dob === "") {
                        this.setState({ errorWaiver: "Please fill out all boxes with your information." })
                      }
                      else if ((pgname === "" || pgphone === "") && age < 18) {
                        this.setState({ errorWaiver: "Please fill out all boxes with your information." })
                      }
                      else if (this.state.participantImg === null || (this.state.pgImg === null && age < 18)) {
                        this.setState({ errorWaiver: "Please sign and save the signature in the box." })
                      }
                      else if (age < 8) {
                        this.setState({ errorWaiver: "Participant must be older than 8 years." })
                      }
                      else if (age > 85) {
                        this.setState({ errorWaiver: "Participant must be younger than 85 years." })
                      }
                      else if (!this.validateEmail(email)) {
                        this.setState({ errorWaiver: "Email must be a valid email." })
                      }
                      else if (this.state.pageIndex !== 1) {
                        this.setState({ submitted: true })
                        this.emailSignUp();
                        this.completeWaiver(myProps)
                      }
                    }}>
                    Submit
            </Button>
                </Row>
                : null}
            </div> :
            <Row className="spinner-standard">
              <Spinner animation="border" />
            </Row>
          :
          <Container className="notice-text-container">
            <Row className="row-success-rp">
              <Col className="col-rp">
                <Row className="row-notice">
                  <h2 className="page-header">Successful Waiver Registration.</h2>
                </Row>
                <Row className="row-notice">
                  <p className="notice-text-g">Please let your U.S. Airsoft employee know that you have finished.</p>
                </Row>
                <Row className="justify-content-row">
                  <Button className="next-button-rp" variant="info" type="button"
                    disabled={!emailAdded} onClick={() => {
                      this.setState({ showLander: false })
                      this.setState({ ...INITIAL_STATE, status: "Completed" });
                    }}>Sign Another</Button>
                </Row>
                <Row className="row-notice">
                  <img src={logo} alt="US Airsoft logo" className="small-logo-home" />
                </Row>
              </Col>
            </Row>
          </Container>
        }
      </div>
    );
  };
}

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
  authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

const WaiverForm = compose(
  withAuthorization(condition),
  withFirebase,
)(WaiverPageFormBase);

export default WaiverPage;

export { WaiverForm };