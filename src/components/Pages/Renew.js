import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { AuthUserContext, withAuthorization } from '../session';
import { compose } from 'recompose';

import SignedWaiver from './SignedWaiver';
import SignatureCanvas from 'react-signature-canvas';
import waiver from '../../assets/Waiver-cutoff.png'

import { Button, Form, Container, Card, Row, Col, Breadcrumb } from 'react-bootstrap/';

import * as ROLES from '../constants/roles';
import { LinkContainer } from 'react-router-bootstrap';

const INITIAL_STATE = {
    value: '',
    loading: false,
    statusBox: [],
    search: "",
    showLander: false,
    showWaiver: false,
    member: true,
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
    submitted: false,
    uid: null,
    saveButton: true,
    saveButton2: true,
}

class RenewSubscription extends Component {
    constructor(props) {
        super(props);

    this.state = { 
        ...INITIAL_STATE, 
        users: [],
        UpdateUserState: this.updateUser,
    };
    this.completeWaiver = this.completeWaiver.bind(this);
    this.handleChange = this.handleChange.bind(this);

    }
      
    handleChange(event) {
        this.setState({ value: event.target.value });
    }

    componentWillUnmount() {
        this.props.firebase.users().off();
    }

    // Checks date of users list to see which ones are expired
    checkDate(date) {
        if (date === "N/A") return false;
        var split = date.split('-')
        var today = (new Date().getMonth() + 1) + "-" + (new Date().getDate()) + "-" + (new Date().getFullYear());
        today = today.split('-')
        // Year
        if (split[2] < today[2]) return true;
        else if (split[2] > today[2]) return false;
        else {
            if (split[0] < today[0]) return true;
            else if (split[0] > today[0]) return false;
            else {
                if (split[1] < today[1]) return true;
                else if (split[1] > today[1]) return false;
                else return true;
            }
        }
    }

    componentDidMount() {
        this.setState({ loading: true });

        this.props.firebase.users().on('value', snapshot => {
            const usersObject = snapshot.val()

            const usersList = Object.keys(usersObject).map(key => ({
                ...usersObject[key],
                uid: key,
            }));
            const filteredList = usersList.filter(obj => this.checkDate(obj.renewal));

            this.setState({
                users: filteredList,
                loading: false,
            });
        });
    }

    // Prop to pass to waiver to call when complete
    completeWaiver = (blob) => {
        this.props.firebase.membersWaivers(`${this.state.uid}.pdf`).put(blob).then(() => {
        this.setState({submitted: false, showLander: true})
        const renewal = (new Date().getMonth() + 1) + "-" + (new Date().getDate()) + "-" + (new Date().getFullYear() + 1);
        this.props.firebase.user(this.state.uid).update({
                renewal
            });
        })
    }

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

    updateUser = (uid, username) => {
        //Show waiver and set uid in state
        this.setState({showWaiver: true, uid, username})
    }

    onChange = event => {
        this.setState({ [event.target.name]: event.target.value });
    };

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
            submitted,
            saveButton,
            saveButton2,
            showLander,
            showWaiver,
        } = this.state
        const myProps = {fname, lname, email, address, city, state, zipcode, phone, dob, pgname, pgphone, participantImg, pgImg, age }
        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div className="background-static-all">
                        {!showLander ?
                        <Container>
                            <h2 className="admin-header">Subscription Renewal</h2>
                            <Breadcrumb className="admin-breadcrumb">
                                {authUser && !!authUser.roles[ROLES.ADMIN] ? 
                                <LinkContainer to="/admin">
                                    <Breadcrumb.Item>Admin</Breadcrumb.Item>
                                </LinkContainer>
                                :
                                <LinkContainer to="/dashboard">
                                    <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
                                </LinkContainer> 
                                }
                                <Breadcrumb.Item active>Subscription Renewal</Breadcrumb.Item>
                            </Breadcrumb>
                            <Row>
                                <Col>
                                    <Card className="admin-cards">
                                        {!showWaiver ?
                                        <Card.Header>
                                            <Form className="team-manage-text">
                                                <Form.Group controlId="input1">
                                                    <Form.Label className="search-label-admin">Search by Username:</Form.Label>
                                                    <Form.Control
                                                        type="name"
                                                        name="search"
                                                        placeholder="ex: JohnDoe"
                                                        value={this.state.search}
                                                        onChange={(e) => {
                                                            this.onChange(e);
                                                        }}
                                                    />
                                                </Form.Group>
                                            </Form>
                                        </Card.Header>
                                        : null
                                        }
                                        {!showWaiver ? 
                                            <UserBox users={this.state.users} index={0} length={this.state.users.length}
                                            search={this.state.search} update={this.state.UpdateUserState} loading={this.state.loading}/>
                                            :
                                            <div>
                                                <Row className="row-renew">
                                                    <Col>
                                                        <Row className="row-renew waiver-row-rp">
                                                        <img src={waiver} alt="US Airsoft waiver" className={!hideWaiver ? "waiver-rp" : "waiver-hidden-rp"}/>
                                                            <Row className="text-block-waiver-rp">
                                                                <Button variant="outline-secondary" type="button" className={hideWaiver ? "button-hidden-rp" : ""} 
                                                                onClick={() => {
                                                                this.setState({hideWaiver: !hideWaiver})
                                                                }}>
                                                                    {hideWaiver ? "Show Agreement" : "Hide Agreement"}
                                                                </Button>
                                                            </Row>
                                                        </Row>
                                                        <Row className={!hideWaiver ? "row-renew" : "row-renew waiver-input-rp"}>
                                                            <h2 className="waiver-header-rp">
                                                                Participant Information: 
                                                            </h2>
                                                        </Row>
                                                        <Row className="row-renew">
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
                                                    <Row className="sig-row-rp">
                                                        {!this.state.participantImg ? 
                                                        <SignatureCanvas penColor='black' ref={(ref) => {this.sigRef = ref}}
                                                        canvasProps={{width: 750, height: 150, className: 'participant-sig-rp'}} />
                                                        : <img className="signBox-image-rt" src={this.state.participantImg} alt="signature" />
                                                        }
                                                    </Row>
                                                    <Row className="button-row-rp2">
                                                        <Button variant="secondary" type="button" className="clear-button-rp"
                                                        onClick={() => {
                                                        this.setState({participantImg: null})
                                                        if (this.sigRef)
                                                            this.sigRef.clear();
                                                            this.setState({saveButton: true})
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
                                                    <Col>
                                                        <Row className="row-renew">
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
                                                        <Row className="row-renew sig-row-rp">
                                                            {!this.state.pgImg? 
                                                            <SignatureCanvas penColor='black' ref={(ref) => {this.sigRef2 = ref}}
                                                            canvasProps={{width: 750, height: 150, className: 'participant-sig-rp'}} />
                                                            : <img className="signBox-image-rt" src={this.state.pgImg} alt="signature" />
                                                            }
                                                        </Row>
                                                        <Row className="row-renew">
                                                            <Button variant="secondary" type="button" className="clear-button-rp"
                                                            onClick={() => {
                                                            this.setState({pgImg: null})
                                                            if (this.sigRef2)
                                                                this.sigRef2.clear();
                                                                this.setState({saveButton2: true})
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
                                                    </Col>
                                                    : ""}
                                                    </Form>
                                                    </Row>
                                                    <Row className="row-renew">
                                                        {errorWaiver && <p className="error-text-rp">{errorWaiver}</p>}
                                                    </Row>
                                                    <Row className="row-renew text-fow">
                                                    {submitted ? 
                                                        <SignedWaiver {...myProps} completeWaiver={this.completeWaiver}/> : ""
                                                    }
                                                    </Row>
                                                </Col>
                                                </Row>
                                                <Row className="nav-row-rp">
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
                                                    else if (age < 8) {
                                                        this.setState({errorWaiver: "Participant must be older than 8 years."})
                                                    }
                                                    else if (age > 85) {
                                                        this.setState({errorWaiver: "Participant must be younger than 85 years."})
                                                    }
                                                    else if (this.state.pageIndex!==1) {
                                                        this.setState({submitted: true})
                                                    }
                                                    }}>
                                                        Submit
                                                    </Button>
                                                </Row>
                                            </div>
                                        }
                                    </Card>
                                </Col>
                            </Row>
                        </Container>
                        : 
                        <Container>
                            <Row className="row-success-rp">
                            <Col className="col-rp">
                                <h2 className="page-header">Successful Membership Renewal.</h2>
                                <p className="page-header">Please let your U.S. Airsoft employee know that you have finished.</p>
                            </Col>
                            </Row>
                            <Row className="row-success-rp">
                                <Button className="next-button-rp" variant="info" type="button" 
                                onClick={() => {
                                    this.setState({...INITIAL_STATE})
                                }}>Return</Button>
                            </Row>
                        </Container>
                        }
                    </div>
                )}
            </AuthUserContext.Consumer>
        );
    }
}

function UserBox({users, index, search, update, loading}) {
    return (
        <Card.Body className="status-card-body-renew-admin">
            {!loading ?
            users.map((user, i) => (
                search !== "" ? // Search query case
                    user.name.toLowerCase().includes(search.toLowerCase()) ? 
                            index++ % 2 === 0 ? 
                            <Row className="row-fg" key={index}>
                                <Col className="col-name-fg">
                                    <Card.Text>
                                        {"(" + index + ") " + user.name}
                                    </Card.Text>
                                </Col>
                                <Col>
                                    <Row>
                                        <Col className="col-name-fg">
                                            {"Renewal Date: " + user.renewal}
                                        </Col>
                                            <Col>
                                                <Button className="button-submit-admin2" onClick={() => {
                                                    update(user.uid);
                                                }}
                                                type="submit" id="update" variant="success">
                                                    Renew 
                                                </Button>
                                            </Col>
                                    </Row>
                                </Col>
                            </Row>
                                : 
                            <Row className="status-card-offrow-admin-fg" key={index}>
                                <Col className="col-name-fg">
                                    <Card.Text>
                                            {"(" + index + ") " + user.name}
                                    </Card.Text>
                                </Col>
                                <Col>
                                    <Row>
                                         <Col className="col-name-fg">
                                            {"Renewal Date: " + user.renewal}
                                        </Col>
                                            <Col>
                                                <Button className="button-submit-admin2" onClick={() => {
                                                    update(user.uid);
                                                }}
                                                type="submit" id="update" variant="success">
                                                    Renew 
                                                </Button>
                                            </Col>
                                    </Row>
                                </Col>
                            </Row>
                    : ""
                :
                        index++ % 2 === 0 ? 
                        <Row className="row-fg" key={index}>
                            <Col className="col-name-fg">
                                <Card.Text>
                                    {"(" + index + ") " + user.name}
                                </Card.Text>
                            </Col>
                            <Col>
                                <Row>
                                     <Col className="col-name-fg">
                                            {"Renewal Date: " + user.renewal}
                                    </Col>
                                        <Col>
                                            <Button className="button-submit-admin2" onClick={() => {
                                                    update(user.uid);
                                                }}
                                                type="submit" id="update" variant="success">
                                                    Renew
                                            </Button>
                                        </Col>
                                </Row>
                            </Col>
                        </Row>
                            : 
                        <Row className="status-card-offrow-admin-fg" key={index}>
                            <Col className="col-name-fg">
                                <Card.Text>
                                        {"(" + index + ") " + user.name}
                                </Card.Text>
                            </Col>
                            <Col>
                                <Row>
                                    <Col className="col-name-fg">
                                            {"Renewal Date: " + user.renewal}
                                    </Col>
                                        <Col>
                                            <Button className="button-submit-admin2" onClick={() => {
                                                    update(user.uid);
                                                }}
                                                type="submit" id="update" variant="success">
                                                    Renew 
                                            </Button>
                                        </Col>
                                </Row>
                            </Col>
                        </Row>
            ))
            : <h2 className="pagePlaceholder">Loading...</h2>}
        </Card.Body>
    )
};

const condition = authUser =>
  authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default compose(
    withAuthorization(condition),
    withFirebase,
)(RenewSubscription);