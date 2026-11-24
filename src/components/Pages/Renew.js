import { waiverAge } from '../utils/waiverAge';
import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { AuthUserContext, withAuthorization } from '../session';
import { withRouter } from '../constants/withRouter';


import { renewalCheckInReturn } from '../constants/checkInHandoff';
import { memberWaiverSaver } from './saveMemberWaiver';
import MembershipWaiverCheck, { membershipWaiverRequest } from './MembershipWaiverCheck';
import { memberWaiverDocument } from '../utils/memberWaiverDocument';
import SignatureCanvas from 'react-signature-canvas';
import waiver from '../../assets/Waiver-cutoff.png'

import logo from '../../assets/usairsoft-small-logo.png';


import { Button, Form, Container, Card, Row, Col, Breadcrumb, Spinner } from 'react-bootstrap/';

import * as ROLES from '../constants/roles';
import { LinkContainer } from 'react-router-bootstrap';
import { Helmet } from 'react-helmet-async';
import { onValue, update } from 'firebase/database';

const INITIAL_STATE = {
    value: '',
    statusBox: [],
    search: "",
    showLander: false,
    showWaiver: false,
    waiverMethod: 'check',
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
                .filter(([, user]) => user && typeof user === 'object' && !Array.isArray(user) && !user.accountRemovedAt)
                .map(([uid, user]) => {
                    const username = typeof user.username === 'string' ? user.username.trim() : '';
                    const name = typeof user.name === 'string' ? user.name.trim() : '';
                    return {
                        uid,
                        registeredName: name,
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

    async useCurrentWaiver(selected, identity) {
        if (this.renewing) return;
        this.renewing = true;
        this.setState({ submitted: true, errorWaiver: null });
        const uid = this.state.uid;
        try {
            const body = selected.ref
                ? { action: 'link', memberId: uid, dob: identity.dob, ...selected }
                : { action: 'current', memberId: uid };
            const { check } = await membershipWaiverRequest(this.props.firebase, body);
            if (check.status !== 'signed' || check.signedAt !== selected.signedAt) {
                throw new Error('The waiver changed. Check again or sign a new waiver.');
            }
            await this.saveRenewal(uid);
        } catch (error) {
            this.setState({ submitted: false, errorWaiver: error.message || 'Could not finish renewal. Retry the waiver check.' });
        } finally {
            this.renewing = false;
        }
    }

    async saveRenewal(uid) {
        const now = new Date();
        const renewal = (now.getMonth() + 1) + "-" + now.getDate() + "-" + (now.getFullYear() + 1);
        await update(this.props.firebase.user(uid), { renewal });
        this.setState({ showLander: true, submitted: false });
    }

    saveSignedWaiver = memberWaiverSaver();

    async completeWaiver(myProps) {
        if (this.renewing) return;
        this.renewing = true;
        const uid = this.state.uid;
        try {
            const signed = memberWaiverDocument(myProps);
            const registeredName = this.state.users.find(user => user.uid === uid)?.registeredName;
            const normalize = text => text.trim().replace(/\s+/g, ' ').toLowerCase();
            if (!registeredName || normalize(signed.name) !== normalize(registeredName)) {
                throw new Error('Enter the registered participant name for this member, or update their account before renewing.');
            }
            await this.saveSignedWaiver(this.props.firebase, uid, signed);
            await this.saveRenewal(uid);
        } catch (error) {
            this.setState({ submitted: false, errorWaiver: error.message || 'Unable to save the signed renewal.' });
        } finally {
            this.renewing = false;
        }
    }

    checkDOB = event => {
        this.setState({ [event.target.name]: event.target.value }, function () {
            const age = waiverAge(this.state.dob);
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
        this.setState({ ...INITIAL_STATE, search: this.state.search, showWaiver: true, uid })
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
        const returnToCheckIn = renewalCheckInReturn(uid, this.props.router.location.search);
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
                                {returnToCheckIn && !submitted && <a className="btn btn-outline-secondary" href={returnToCheckIn}>Back to player check-in</a>}
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
                                                                type="text"
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
                                                : this.state.waiverMethod === 'check' ?
                                                <MembershipWaiverCheck key={uid} firebase={this.props.firebase} member={selectedUser}
                                                    busy={submitted} error={errorWaiver} onBack={() => {
                                                        if (this.props.router.params.id) this.props.router.navigate('/admin/renewal');
                                                        else this.setState({ ...INITIAL_STATE, search: this.state.search });
                                                    }}
                                                    onUse={(selected, identity) => this.useCurrentWaiver(selected, identity)}
                                                    onNew={({dob}) => {
                                                        const names = selectedUser.registeredName.split(/\s+/);
                                                        const age = waiverAge(dob);
                                                        this.setState({ waiverMethod: 'new', fname: names.shift(), lname: names.join(' '),
                                                            dob, age, agecheck: age === null || age >= 18, errorWaiver: '' });
                                                    }} />
                                                :
                                                <div className="admin-renew-detail">
                                                    <Button variant="outline-secondary" type="button" disabled={submitted}
                                                        onClick={() => this.setState({ waiverMethod: 'check', errorWaiver: '' })}>Check existing waiver</Button>
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
                                                                            <Form.Group controlId="renew-member-fname">
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
                                                                            <Form.Group controlId="renew-member-lname">
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
                                                                            <Form.Group controlId="renew-member-email">
                                                                                <Form.Label>Email:</Form.Label>
                                                                                <Form.Control
                                                                                    name="email"
                                                                                    value={email}
                                                                                    onChange={this.onChange}
                                                                                    type="text" inputMode="email"
                                                                                    autoComplete="off"
                                                                                    placeholder="Email Address"
                                                                                />
                                                                            </Form.Group>
                                                                        </Col>
                                                                        <Col>
                                                                            <Form.Group controlId="renew-member-phone">
                                                                                <Form.Label>Phone Number:</Form.Label>
                                                                                <Form.Control
                                                                                    name="phone"
                                                                                    value={phone}
                                                                                    onChange={this.onChange}
                                                                                    type="tel"
                                                                                    autoComplete="off"
                                                                                    placeholder="Phone #"
                                                                                />
                                                                            </Form.Group>
                                                                        </Col>
                                                                    </Row>
                                                                    <Row>
                                                                        <Col>
                                                                            <Form.Group controlId="renew-member-address">
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
                                                                            <Form.Group controlId="renew-member-city">
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
                                                                            <Form.Group controlId="renew-member-state">
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
                                                                            <Form.Group controlId="renew-member-dob">
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
                                                                            <Form.Group controlId="renew-member-zipcode">
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
                                                                                    <Form.Group controlId="renew-member-pgname">
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
                                                                                    <Form.Group controlId="renew-member-pgphone">
                                                                                        <Form.Label>Emergency Number:</Form.Label>
                                                                                        <Form.Control
                                                                                            name="pgphone"
                                                                                            value={pgphone}
                                                                                            onChange={this.onChange}
                                                                                            type="tel"
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
                                                                {errorWaiver && <p role="alert" className="error-text-rp">{errorWaiver}</p>}
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
                                            <p className="notice-text-g">{returnToCheckIn ? 'Return to check-in to see the updated membership and waiver.' : 'Please let your U.S. Airsoft employee know that you have finished.'}</p>
                                        </Row>
                                        <Row className="justify-content-row">
                                            {returnToCheckIn ? <a className="btn btn-primary" href={returnToCheckIn}>Return to player check-in</a> : <Button className="next-button-rp" variant="info" type="button"
                                                onClick={() => {
                                                    this.setState({ ...INITIAL_STATE })
                                                }}>Return</Button>}
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
