import React, { Component } from 'react';
import logo from '../../assets/usairsoft-small-logo.png';
import { Container, Row, Col, Form, Button, Breadcrumb, Spinner } from 'react-bootstrap/';
import { pdf } from '@react-pdf/renderer';
import { LinkContainer } from 'react-router-bootstrap';
import SignatureCanvas from 'react-signature-canvas';
import SignedWaiver from './SignedWaiver';
import '../../App.css';
import { encode } from 'firebase-encode';
import { Checkbox, FormControlLabel } from '@mui/material';

import waiver from '../../assets/Waiver-cutoff.png'

import { Typeahead } from 'react-bootstrap-typeahead';

import { AuthUserContext, withAuthorization } from '../session';

import { withFirebase } from '../Firebase';
import * as ROLES from '../constants/roles';
import { Helmet } from 'react-helmet-async';
import { uploadBytes } from 'firebase/storage';
import { get, onValue, set, update, ref, push } from 'firebase/database';

// Helper function to convert dataURL to Blob
const dataURLtoBlob = (dataURL) => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

const WaiverPage = () => (
  <AuthUserContext.Consumer>
    {authUser => (
      <div className="background-static-all">
        <Helmet>
          <title>US Airsoft Field: Fill Out Waiver</title>
        </Helmet>
        <Container>
          {/* <Row className="header-rp">
            <img src={logo} alt="US Airsoft logo" className="small-logo-home" />
            <h2 className="page-header">Waiver Form</h2>
          </Row> */}
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
  emailAdded: false,
  acceptEmailSubscription: true,
  loading: false,
  selectedGroup: [],
  submitted: false,
};

class WaiverPageFormBase extends Component {
  constructor(props) {
    super(props);

    //this.completeWaiver = this.completeWaiver.bind(this);
    this.state = { ...INITIAL_STATE, num_waivers: null, groups: null, loading: true, groupIndex: null, groupsObject: null };
  }

  async completeWaiver() {
    try {
      this.setState({ loading: true }); // Only set loading initially

      // More flexible phone validation - strip non-digits and check length
      const cleanPhone = this.state.phone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        this.setState({
          errorWaiver: "Please enter a valid 10-digit phone number",
          loading: false
        });
        return;
      }

      // Format phone number consistently for storage (optional)
      const formattedPhone = cleanPhone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');

      // Validate zipcode
      const zipcodeRegex = /(^\d{5}$)|(^\d{5}-\d{4}$)/;
      if (!zipcodeRegex.test(this.state.zipcode)) {
        this.setState({
          errorWaiver: "Please enter a valid 5-digit zipcode",
          loading: false
        });
        return;
      }

      // Validate state
      if (this.state.state.length !== 2) {
        this.setState({
          errorWaiver: "Please enter a valid 2-letter state code (e.g. CO)",
          loading: false
        });
        return;
      }

      const waiverData = {
        name: `${this.state.fname} ${this.state.lname}`,
        email: this.state.email,
        phone: formattedPhone,
        address: this.state.address,
        city: this.state.city,
        state: this.state.state,
        zipcode: this.state.zipcode,
        dob: this.state.dob,
        age: this.state.age,
        participantSignature: this.state.participantImg,
        timestamp: Date.now(),
        acceptEmailSubscription: this.state.acceptEmailSubscription
      };

      // Add guardian info if exists
      if (this.state.age < 18 && this.state.pgImg) {
        const cleanGuardianPhone = this.state.pgphone.replace(/\D/g, '');
        if (cleanGuardianPhone.length !== 10) {
          this.setState({
            errorWaiver: "Please enter a valid 10-digit guardian phone number",
            loading: false
          });
          return;
        }

        const formattedGuardianPhone = cleanGuardianPhone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');

        waiverData.guardian = {
          name: this.state.pgname,
          phone: formattedGuardianPhone,
          signature: this.state.pgImg
        };
      }

      // Push to digital_waivers
      const digitalWaiversRef = this.props.firebase.digitalWaivers();
      const newWaiverRef = push(digitalWaiversRef);
      await set(newWaiverRef, waiverData);

      // Handle email subscription
      if (this.state.acceptEmailSubscription) {
        const secret = 'm' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
        const emailRef = ref(this.props.firebase.db, `emaillist/${this.state.email.replace(/\./g, ',')}`);
        await set(emailRef, { secret });
      }

      // If there's a selected group, update the group with the participant
      if (this.state.selectedGroup && this.state.selectedGroup.length > 0) {
        const groupName = this.state.selectedGroup[0];
        const groupIndex = this.state.groupIndex?.[groupName];

        if (groupIndex !== undefined) {
          const groupRef = ref(this.props.firebase.db, `rentals/group/${groupIndex}`);
          const groupSnapshot = await get(groupRef);
          const groupData = groupSnapshot.val();

          if (!groupData) {
            this.setState({
              errorWaiver: "Selected group not found",
              loading: false
            });
            return;
          }

          // Check if group is at capacity
          const currentParticipants = groupData.participants || [];
          if (groupData.size && currentParticipants.length >= groupData.size) {
            this.setState({
              errorWaiver: "Selected group is at maximum capacity",
              loading: false
            });
            return;
          }

          // Add participant to group
          const newParticipant = {
            name: `${this.state.fname} ${this.state.lname}`,
            ref: newWaiverRef.key,
            date: Date.now(),
            rentals: []
          };

          await update(groupRef, {
            participants: [...currentParticipants, newParticipant]
          });
        } else {
          this.setState({
            errorWaiver: "Selected group not found",
            loading: false
          });
          return;
        }
      }

      // Only set submitted and show success screen after everything is complete
      this.setState({
        showSuccessScreen: true,
        submitted: true,
        loading: false
      });
    } catch (error) {
      console.error('Error submitting waiver:', error);
      this.setState({
        errorWaiver: 'Failed to submit waiver. Please try again.',
        loading: false
      });
    }
  }

  // Will Check duplicates in list
  checkDuplicates(email) {
    return get(this.props.firebase.emailList(encode(email)), object => {
    }).then((object) => {
      return object.val() === null ? false : true
    })
  }

  componentDidMount() {
    // Listen for waiver numbers
    onValue(this.props.firebase.numWaivers(), snapshot => {
      let num_waivers = snapshot.val()?.total_num || 0;
      this.setState({ num_waivers })
    })

    // Listen for rental groups
    onValue(this.props.firebase.rentalGroups(), obj => {
      const groupsObj = obj.val() || {};

      let groups = [];
      let groupsObject = [];
      let groupIndex = {};

      // Only process if we have groups
      if (Object.keys(groupsObj).length > 0) {
        groupsObject = Object.keys(groupsObj).map(key => ({
          ...groupsObj[key],
          index: key,
        }));

        // Build groups array and index
        Object.entries(groupsObj).forEach(([index, group]) => {
          if (group?.name) {  // Only add if group has a name
            groups.push(group.name);
            groupIndex[group.name] = index;
          }
        });
      }

      this.setState({
        groups,
        loading: false,
        groupsObject,
        groupIndex
      });
    });
  }

  componentWillUnmount() {
    // this.props.firebase.numWaivers().off();
    // this.props.firebase.rentalGroups().off()
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
        set(this.props.firebase.emailList(encode(email.toLowerCase())), ({ secret }));
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
      showSuccessScreen,
      emailAdded,
      loading,
      acceptEmailSubscription,
      submitted
    } = this.state;

    const myProps = { fname, lname, email, address, city, state, zipcode, phone, dob, pgname, pgphone, participantImg, pgImg, age }

    return (
      <div>
        {!showSuccessScreen ?
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
                          <p className="p-groupname-rp">Party Name: (If Applicable)</p>
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
                      <Row className="row-subscribe-email-rp">
                        <Col>
                          <Form.Group>
                            <FormControlLabel label="Subscribe to US Airsoft Newsletter" control={<Checkbox color="primary" checked={acceptEmailSubscription} />}
                              onChange={(e) => {
                                this.setState({ acceptEmailSubscription: !acceptEmailSubscription })
                              }} />
                          </Form.Group>
                        </Col>
                      </Row>
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
                <div>
                  <Row className="nav-row-rp">
                    <Button className="next-button-rp mt-1" variant="info" type="button"
                      disabled={loading}
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
                        else {
                          if (acceptEmailSubscription)
                            this.emailSignUp();
                          this.completeWaiver(myProps)
                        }
                      }}>
                      Submit
                    </Button>
                  </Row>
                  {loading ?
                    <Row className="spinner-standard">
                      <Spinner animation="border" />
                    </Row>
                    : null}
                </div>
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
                      this.setState({ showSuccessScreen: false })
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

const WaiverForm = withAuthorization(condition)(withFirebase(WaiverPageFormBase));

// const WaiverForm = composeHooks(
//   withAuthorization(condition),
//   withFirebase,
// )(WaiverPageFormBase);

export default WaiverPage;

export { WaiverForm };