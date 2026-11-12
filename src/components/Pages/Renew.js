import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { AuthUserContext, withAuthorization } from '../session';
import { withRouter } from '../constants/withRouter';


import SignedWaiver from './SignedWaiver';
import SignatureCanvas from 'react-signature-canvas';
import waiver from '../../assets/Waiver-cutoff.png'

import logo from '../../assets/usairsoft-small-logo.png';

import { pdf } from '@react-pdf/renderer';

import { Button, Form, Container, Card, Row, Col, Breadcrumb, Spinner } from 'react-bootstrap/';

import * as ROLES from '../constants/roles';
import { LinkContainer } from 'react-router-bootstrap';
import { Helmet } from 'react-helmet-async';
import { onValue, update } from 'firebase/database';
import { uploadBytes } from 'firebase/storage';

const INITIAL_STATE = {
    value: '',
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
    uid: null,
    saveButton: true,
    saveButton2: true,
    submitted: false,
}

function renewalDisplay(value) {
    if (typeof value === 'string' && value.trim() === 'N/A') {
        return { renewal: 'N/A', renewalOrder: 0 };
    }
    const parts = typeof value === 'string' && /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(value.trim());
    if (parts) {
        const [, month, day, year] = parts;
        const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
        if (date.getUTCFullYear() === Number(year) && date.getUTCMonth() + 1 === Number(month) && date.getUTCDate() === Number(day)) {
            return {
                renewal: `${month.padStart(2, '0')}-${day.padStart(2, '0')}-${year}`,
                renewalOrder: Number(year) * 10000 + Number(month) * 100 + Number(day),
            };
        }
    }
    return { renewal: 'Unknown', renewalOrder: 0 };
}

class RenewSubscription extends Component {
    constructor(props) {
        super(props);

        const uid = props.router.params.id || null;
        this.state = {
            ...INITIAL_STATE,
            uid,
            showWaiver: Boolean(uid),
            loading: true,
            directoryUnavailable: false,
            users: [],
        };
        this.completeWaiver = this.completeWaiver.bind(this);
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(event) {
        this.setState({ value: event.target.value });
    }

    componentWillUnmount() {
        this.unsubscribeUsers?.();
    }

    componentDidMount() {
        this.unsubscribeUsers = onValue(this.props.firebase.users(), snapshot => {
            const users = Object.entries(snapshot.val() ?? {})
                .filter(([, user]) => user && typeof user === 'object' && !Array.isArray(user))
                .map(([uid, user]) => {
                    const username = typeof user.username === 'string' ? user.username.trim() : '';
                    const name = typeof user.name === 'string' ? user.name.trim() : '';
                    return {
                        uid,
                        name: name || username || 'Unnamed member',
                        username,
                        ...renewalDisplay(user.renewal),
                    };
                });
            this.setState({
                users,
                loading: false,
                directoryUnavailable: false,
            });
        }, () => {
            this.setState({ users: [], loading: false, directoryUnavailable: true });
        });
    }

    componentDidUpdate(previousProps) {
        if (previousProps.router.params.id !== this.props.router.params.id) {
            const uid = this.props.router.params.id || null;
            this.setState({
                ...INITIAL_STATE,
                uid,
                showWaiver: Boolean(uid),
            });
        }
    }

    async completeWaiver(myProps) {
        const blob = await pdf((
            <SignedWaiver {...myProps} />
        )).toBlob();
        uploadBytes(this.props.firebase.membersWaivers(`${this.state.uid}.pdf`), blob).then(() => {
            this.setState({ showLander: true })
            const renewal = (new Date().getMonth() + 1) + "-" + (new Date().getDate()) + "-" + (new Date().getFullYear() + 1);
            update(this.props.firebase.user(this.state.uid), ({
                renewal
            }));
        })
    }

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

    updateUser = (uid) => {
        //Show waiver and set uid in state
        this.setState({ showWaiver: true, uid })
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
            saveButton,
            saveButton2,
            showLander,
            showWaiver,
            uid,
            users,
            loading,
            directoryUnavailable,
            submitted,
        } = this.state
        const selectedUser = uid ? users.find((user) => user.uid === uid) : null;
        let directoryStatus = null;
        if (loading) {
            directoryStatus = (
                <div className="d-flex align-items-center gap-2" role="status">
                    <Spinner animation="border" size="sm" aria-hidden="true" />
                    <span>Loading members…</span>
                </div>
            );
        } else if (directoryUnavailable) {
            directoryStatus = <p className="mb-0" role="alert">Could not load the member directory. Reload this page to try again.</p>;
        } else if (showWaiver && !selectedUser) {
            directoryStatus = (
                <div role="alert">
                    <p>This member could not be found.</p>
                    <Button type="button" variant="secondary" onClick={() => this.setState({ ...INITIAL_STATE })}>
                        Back to member list
                    </Button>
                </div>
            );
        }
        const myProps = { fname, lname, email, address, city, state, zipcode, phone, dob, pgname, pgphone, participantImg, pgImg, age }
        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div className="admin-container admin-compact-page admin-renew-page">
                        <Helmet>
                            <title>US Airsoft Field: Renewal</title>
                        </Helmet>
                        {!showLander ?
                            <Container className="admin-content">
                                <div className="admin-page-header">
                                <h2 className="admin-header">Renew Member</h2>
                                {selectedUser && <p className="admin-page-subtitle admin-renew-member-name">{selectedUser.name}</p>}
                                {authUser?.roles?.[ROLES.ADMIN] ?
                                    <Breadcrumb className="admin-breadcrumb admin-page-breadcrumb">
                                        <LinkContainer to="/admin">
                                            <Breadcrumb.Item>Admin</Breadcrumb.Item>
                                        </LinkContainer>
                                        <Breadcrumb.Item active>Renew Member</Breadcrumb.Item>
                                    </Breadcrumb>
                                    : null}
                                </div>
                                <Row className="waiver-row-renew">
                                    <Col>
                                        <Card className="waiver-cards admin-panel-card admin-renew-card">
                                            {!showWaiver && !directoryStatus ?
                                                <Card.Header>
                                                    <Form className="team-manage-text" onSubmit={e => { e.preventDefault(); }}>
                                                        <Form.Group controlId="input1">
                                                            <Form.Label className="search-label-admin">Search by username or name:</Form.Label>
                                                            <Form.Control
                                                                type="name"
                                                                name="search"
                                                                placeholder="ex: JohnDoe"
                                                                value={this.state.search}
                                                                autoComplete="off"
                                                                onChange={(e) => {
                                                                    this.onChange(e);
                                                                }}
                                                            />
                                                        </Form.Group>
                                                    </Form>
                                                </Card.Header>
                                                : null
                                            }
                                            {directoryStatus ?
                                                <Card.Body>{directoryStatus}</Card.Body>
                                                : !showWaiver ?
                                                <UserBox users={users} search={this.state.search} update={this.updateUser} />
                                                :
                                                <div className="admin-renew-detail">
                                                    <div className="admin-renew-layout">
                                                        <div className="admin-renew-preview-panel">
                                                            <div className="admin-renew-panel-header">
                                                                <div>
                                                                    <h3 className="admin-renew-panel-title">Renewal Agreement</h3>
                                                                    <p className="admin-renew-panel-copy">Review the waiver and update any participant details before submitting the renewal.</p>
                                                                </div>
                                                                <Button variant="outline-secondary" type="button" className="admin-renew-toggle"
                                                                    onClick={() => {
                                                                        this.setState({ hideWaiver: !hideWaiver })
                                                                    }}>
                                                                    {hideWaiver ? "Show Agreement" : "Hide Agreement"}
                                                                </Button>
                                                            </div>
                                                            {!hideWaiver ?
                                                                <div className="admin-renew-waiver-image-shell">
                                                                    <img src={waiver} alt="US Airsoft waiver" className="waiver-rp" />
                                                                </div>
                                                                : null}
                                                        </div>
                                                        <div className="admin-renew-form-panel">
                                                            <div className="admin-renew-panel-header">
                                                                <div>
                                                                    <h2 className="waiver-header-rp admin-renew-panel-title">
                                                                        Participant Information
                                                                    </h2>
                                                                    <p className="admin-renew-panel-copy">Confirm the player information and collect fresh signatures for the updated waiver.</p>
                                                                </div>
                                                            </div>
                                                            <Form className="waiver-form-rp admin-renew-form-grid">
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
                                                                                    canvasProps={{ className: 'participant-sig-rp' }} />
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
                                                                        <div className="admin-renew-guardian-section">
                                                                            <Row className="row-renew">
                                                                                <h2 className="waiver-header-rp admin-renew-panel-title">
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
                                                                            <Row className="row-renew sig-row-rp">
                                                                                <Col className="justify-content-center-col sig-col-rp">
                                                                                    {!this.state.pgImg ?
                                                                                        <SignatureCanvas penColor='black' ref={(ref) => { this.sigRef2 = ref }}
                                                                                            canvasProps={{ className: 'participant-sig-rp' }} />
                                                                                        : <img className="signBox-image-rt" src={this.state.pgImg} alt="signature" />
                                                                                    }
                                                                                </Col>
                                                                            </Row>
                                                                            <Row className="row-renew button-row-rp2">
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
                                                            <Row className="row-renew">
                                                                {errorWaiver && <p className="error-text-rp">{errorWaiver}</p>}
                                                            </Row>
                                                        </div>
                                                    </div>
                                                    <Row className="nav-row-rp admin-renew-nav">
                                                        <Button className="next-button-rp" variant="info" type="button" disabled={this.state.pageIndex === 1 || submitted}
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
                                                                else if (this.state.pageIndex !== 1) {
                                                                    this.setState({ submitted: true })
                                                                    this.completeWaiver(myProps)
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
                            <Container className="notice-text-container">
                                <Row className="row-success-rp">
                                    <Col className="col-rp">
                                        <Row className="row-notice">
                                            <h2 className="page-header">Successful Member Renewal.</h2>
                                        </Row>
                                        <Row className="row-notice">
                                            <p className="notice-text-g">Please let your U.S. Airsoft employee know that you have finished.</p>
                                        </Row>
                                        <Row className="justify-content-row">
                                            <Button className="next-button-rp" variant="info" type="button"
                                                onClick={() => {
                                                    this.setState({ ...INITIAL_STATE })
                                                }}>Return</Button>
                                        </Row>
                                        <Row className="row-notice">
                                            <img src={logo} alt="US Airsoft logo" className="small-logo-home" />
                                        </Row>
                                    </Col>
                                </Row>
                            </Container>
                        }
                    </div>
                )}
            </AuthUserContext.Consumer>
        );
    }
}

function UserBox({ users, search, update }) {
    const query = search.trim().toLowerCase();
    const matches = users
        .filter((user) => user.username.toLowerCase().includes(query) || user.name.toLowerCase().includes(query))
        .sort((a, b) => b.renewalOrder - a.renewalOrder);

    return (
        <Card.Body className="status-card-body-renew-admin">
            {matches.length === 0 && (
                <p className="mb-0 py-2" role="status">
                    {users.length ? 'No members match that search.' : 'No members found.'}
                </p>
            )}
            {matches.map((user, index) => (
                <Row className={index % 2 === 0 ? 'row-fg' : 'status-card-offrow-admin-fg'} key={user.uid}>
                    <Col className="col-name-fg" md={5}>
                        <Card.Text>{`(${index + 1}) ${user.name}`}</Card.Text>
                    </Col>
                    <Col className="col-name-fg" md={5}>
                        {`Renewal Date: ${user.renewal}`}
                    </Col>
                    <Col md={2}>
                        <Button className="button-submit-admin2" onClick={() => update(user.uid)} type="button" variant="success">
                            Renew
                        </Button>
                    </Col>
                </Row>
            ))}
        </Card.Body>
    );
}

const condition = authUser =>
    !!(authUser?.roles?.[ROLES.ADMIN] || authUser?.roles?.[ROLES.WAIVER]);

export default withRouter(withAuthorization(condition)(withFirebase(RenewSubscription)));

// export default composeHooks(
//     withAuthorization(condition),
//     withFirebase,
// )(RenewSubscription);
