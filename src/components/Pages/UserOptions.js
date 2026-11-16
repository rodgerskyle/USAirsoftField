import React, { Component } from 'react';
import '../../App.css';

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/lab/Alert';

import { withAuthorization, AuthUserContext } from '../session';


import { Button, Form, Container, Row, Col, Breadcrumb } from 'react-bootstrap/';

import default_profile from '../../assets/default.png';

import * as ROLES from '../constants/roles';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';
import { LinkContainer } from 'react-router-bootstrap';
import { Link } from 'react-router-dom';

import { encode } from 'firebase-encode';
import { Helmet } from 'react-helmet-async';
import { get, onValue, update } from 'firebase/database';
import { getDownloadURL } from 'firebase/storage';
import './UserOptions.css';

class UserOptions extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            user: null,
            username: "",
            name: "",
            profileicon: null,
            wins: 0,
            losses: 0,
            points: 0,
            freegames: 0,
            profilepic: false,
            renewal: "",
            email: "",
            password: "",
            removeImg: false,
            super_status: null,
            status: null,
            error: null,
            notification: null,
            removing: false,
            removeOpen: false,
            removeConfirm: '',
            removeError: null,
        };
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(event) {
        this.setState({ value: event.target.value });
    }

    loadAccount() {
        this.unsubscribeUser?.();
        this.setState({ loading: true, user: null, error: null, password: '', removing: false, removeOpen: false, removeConfirm: '', removeError: null });
        this.unsubscribeUser = onValue(this.props.firebase.user(this.props.router.params.id), snapshot => {
            const userObject = snapshot.val();
            if (!userObject || userObject.accountRemovedAt) {
                this.setState({ loading: false, user: userObject });
                return;
            }

            this.setState({
                loading: false,
                user: userObject,
                username: userObject.username ?? '',
                name: userObject.name ?? '',
                team: userObject.team?.toUpperCase() ?? '',
                wins: userObject.wins,
                losses: userObject.losses,
                points: userObject.points,
                freegames: userObject.freegames,
                profilepic: userObject.profilepic,
                renewal: userObject.renewal ?? '',
                email: userObject.email ?? '',
                oldEmail: userObject.email ?? '',
            }, function () {
                //After setstate, then grab points and profile
                if (userObject.profilepic)
                    this.getProfile(`${this.props.router.params.id}/profilepic`);
                else
                    this.setState({ profileicon: default_profile })
            });
        }, () => this.setState({ loading: false, user: null, error: 'The player account is temporarily unavailable.' }));
    }

    componentDidMount() {
        this.loadAccount();
    }

    componentDidUpdate(previousProps) {
        if (previousProps.router.params.id !== this.props.router.params.id) {
            this.removeRequest?.abort();
            this.loadAccount();
        }
    }

    componentWillUnmount() {
        this.unsubscribeUser?.();
        this.removeRequest?.abort();
    }

    removeAccount = async (event, actorId) => {
        event.preventDefault();
        const playerId = this.props.router.params.id;
        const { removeConfirm, removing, user } = this.state;
        if (removing || this.removeRequest || !user || removeConfirm !== playerId || actorId === playerId) return;
        const request = new AbortController();
        this.removeRequest = request;
        this.setState({ removing: true, removeError: null });
        try {
            const result = await requestStaffFieldTool(this.props.firebase, actorId, '/api/staff-player-accounts', {
                method: 'POST', body: { playerId, confirmation: removeConfirm }, signal: request.signal,
            });
            if (request.signal.aborted) return;
            if (!result.removed || result.playerId !== playerId) throw new Error('Account removal could not be confirmed.');
            this.setState(current => ({
                user: { ...current.user, accountRemovedAt: true }, removing: false, removeOpen: false,
            }));
        } catch (error) {
            if (!request.signal.aborted) this.setState({ removing: false, removeError: error.message });
        } finally {
            if (this.removeRequest === request) this.removeRequest = null;
        }
    };

    renderAccountRemoval(authUser) {
        const playerId = this.props.router.params.id;
        const { user, removeOpen, removeConfirm, removeError, removing } = this.state;
        if (!user || !authUser || authUser.uid === playerId || Object.values(user.roles ?? {}).some(Boolean)) return null;
        return (
            <section className="admin-account-removal" aria-labelledby="admin-account-removal-title">
                <h3 id="admin-account-removal-title">Remove player account</h3>
                <p>Blocks access to this player account in the website and Companion. Signed waivers and historical records are retained.</p>
                {!removeOpen ? (
                    <Button variant="outline-danger" onClick={() => this.setState({ removeOpen: true })}>Review removal</Button>
                ) : (
                    <Form onSubmit={event => this.removeAccount(event, authUser.uid)}>
                        <p><strong>{user.name || user.username || 'Player'}</strong> {user.email && <span>({user.email})</span>}</p>
                        <Form.Group controlId="admin-remove-player-confirmation">
                            <Form.Label>Type the player ID <code>{playerId}</code> to confirm.</Form.Label>
                            <Form.Control autoFocus autoComplete="off" autoCapitalize="none" spellCheck={false} required
                                value={removeConfirm} disabled={removing}
                                onChange={event => this.setState({ removeConfirm: event.target.value, removeError: null })} />
                        </Form.Group>
                        {removeError && <p role="alert">{removeError}</p>}
                        <div className="admin-account-removal__actions">
                            <Button type="submit" variant="danger" disabled={removing || removeConfirm !== playerId}>
                                {removing ? 'Removing account…' : 'Remove account'}
                            </Button>
                            <Button type="button" variant="outline-secondary" disabled={removing}
                                onClick={() => this.setState({ removeOpen: false, removeConfirm: '', removeError: null })}>Cancel</Button>
                        </div>
                    </Form>
                )}
            </section>
        );
    }

    //Get image function for profile image = uid
    getProfile(uid) {
        getDownloadURL(this.props.firebase.pictures(`${uid}.png`)).then((url) => {
            this.setState({ profileicon: url })
        }).catch((error) => {
            // Handle any errors
            this.setState({ profileicon: default_profile })
        })
    }

    // Updates User's privilege level
    updatePrivilege = (choice) => {
        if (choice === "admin" || choice === "waiver" || choice === "clear" || choice === "check") {
            this.setState({ status: null, error: null })
            let user = this.props.router.params.id

            // Update token for the firebase uid
            const upgrade = this.props.firebase.createPrivilegedUser();
            upgrade({
                uid: user, privilege: choice
            }).then((result) => {
                //If complete finish loading
                if (result) this.setState({ super_status: result.data.status })
            }).catch((error) => {
                this.setState({ ul_error: "Error: " + error })
            });

            if (choice !== "check") {
                // Update user database role for admin/waiver/clearing
                get(this.props.firebase.user(user), object => {
                    const roles = {};
                    let pin = "";
                    if (choice === "waiver") {
                        roles[ROLES.WAIVER] = ROLES.WAIVER;
                    }
                    else if (choice === "admin")
                        roles[ROLES.ADMIN] = ROLES.ADMIN;
                    update(this.props.firebase.user(user), ({ roles, pin }));
                })
            }
        }
    }

    // Reset settings to default
    resetOptions() {
        this.setState({
            username: this.state.user.username,
            name: this.state.user.name,
            team: this.state.user.team?.toUpperCase() ?? '',
            wins: this.state.user.wins,
            losses: this.state.user.losses,
            points: this.state.user.points,
            freegames: this.state.user.freegames,
            profilepic: this.state.user.profilepic,
            email: this.state.user.email,
            password: "",
            error: null,
            status: null,
        }, function () {
            //After setstate, then grab points and profile
            if (this.state.user.profilepic)
                this.getProfile(`${this.props.router.params.id}/profilepic`);
            else
                this.setState({ profileicon: default_profile })
        });
    }

    // Update changed items 
    updateUser() {
        const { username, name, team, profilepic, email, oldEmail, password } = this.state;
        let uid = this.props.router.params.id
        let points = this.state.wins * 10 + this.state.losses * 3 + 50
        let wins = parseInt(this.state.wins)
        let losses = parseInt(this.state.losses)
        let freegames = parseInt(this.state.freegames)
        const normalizedName = (name || '').trim().toLowerCase();
        const normalizedUsername = (username || '').trim().toLowerCase();
        update(this.props.firebase.user(uid), ({
            username, usernameLower: normalizedUsername, name, nameLower: normalizedName, team, wins, losses, points, profilepic, freegames
        }));

        // Email portion
        if (email !== oldEmail) {
            let updateEmail = this.props.firebase.manageProfile();
            updateEmail({ choice: "emailAdmin", uid, email: encode(email), old_email: encode(oldEmail) }).then((res) => {
            })
            this.setState({ oldEmail: email })
        }

        // Password portion

        if (password !== "") {
            if (password.length >= 6) {
                let updatePassword = this.props.firebase.manageProfile();
                updatePassword({ choice: "passAdmin", uid, password }).then((res) => {
                })
            }
            else {
                this.setState({ error: "Password must be longer than 6 characters." })
            }
        }

        this.setState({ status: "Successfully updated " + this.state.name })
    }

    // Form box on change event
    onChange = event => {
        this.setState({ [event.target.name]: event.target.value });
    };

    openWaiver() {
        getDownloadURL(this.props.firebase.membersWaivers(`${this.props.router.params.id}.pdf`)).then((url) => {
            window.open(url)
        }).catch((error) => {
            // Handle any errors
        })
    }

    // Checks if given date is expired or not
    checkDate(dt) {
        if (dt === 'N/A')
            return false
        const dateArray = dt.split('-')
        const date = new Date(dateArray[2], dateArray[0] - 1, dateArray[1])
        const today = new Date()
        if (date < today)
            return true // expired
        else
            return false // not expired
    }

    // Copies text to clipboard and then posts a status saying successfully copied
    copyToClipboard(uid, name) {
        navigator.clipboard.writeText("https://www.usairsoftfield.com/profilelookup/" + uid)
        this.setState({ notification: `Profile link for ${name} copied to clipboard.` })
    }

    render() {
        const { notification, user, error } = this.state
        return (
            <AuthUserContext.Consumer>
                {authUser =>
                    <div className="admin-container admin-compact-page">
                        <Helmet>
                            <title>{`US Airsoft Field: ${this.state.username} Options`}</title>
                        </Helmet>
                        {!this.state.loading ?
                            <Container className="admin-content">
                                <div className="admin-page-header">
                                <h2 className="admin-header">User Options</h2>
                                <Breadcrumb className="admin-breadcrumb admin-page-breadcrumb">
                                    <LinkContainer to="/admin">
                                        <Breadcrumb.Item>Admin</Breadcrumb.Item>
                                    </LinkContainer>
                                    <Breadcrumb.Item active>User Options</Breadcrumb.Item>
                                </Breadcrumb>
                                </div>
                                {!user || user.accountRemovedAt ? (
                                    <section className="admin-account-removal">
                                        <p role="status">{user?.accountRemovedAt ? 'This player account was removed.' : error || 'This player account was not found.'}</p>
                                        {user?.accountRemovedAt && <Button variant="outline-info" onClick={() => this.openWaiver()}>Open retained waiver</Button>}
                                    </section>
                                ) : <>
                                <Row className="row-uo admin-user-options-card">
                                    <Col md={4} className="admin-user-options-sidebar">
                                        <div className="team-single-img">
                                            <img className="profile-pic" src={this.state.profileicon} alt="" />
                                        </div>
                                        <Button variant="outline-danger" onClick={() => {
                                            this.setState({ profileicon: default_profile, profilepic: false })
                                        }} disabled={!this.state.profilepic}>
                                            Remove
                                        </Button>
                                    </Col>
                                    <Col className="admin-user-options-main">
                                        <Row>
                                            <Col>
                                                <Form>
                                                    <Form.Group controlId="form.name">
                                                        <Form.Label>Name:</Form.Label>
                                                        <Form.Control
                                                            type="name"
                                                            name="name"
                                                            value={this.state.name}
                                                            onChange={this.onChange}
                                                        />
                                                    </Form.Group>
                                                </Form>
                                            </Col>
                                            <Col>
                                                <Form>
                                                    <Form.Group controlId="form.username">
                                                        <Form.Label>Username:</Form.Label>
                                                        <Form.Control
                                                            type="name"
                                                            name="username"
                                                            value={this.state.username}
                                                            onChange={this.onChange}
                                                        />
                                                    </Form.Group>
                                                </Form>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Col>
                                                <Form>
                                                    <Form.Group controlId="form.email">
                                                        <Form.Label>Email:</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="email"
                                                            value={this.state.email}
                                                            onChange={this.onChange}
                                                        />
                                                    </Form.Group>
                                                </Form>
                                            </Col>
                                            <Col>
                                                <Form>
                                                    <Form.Group controlId="form.password">
                                                        <Form.Label>Password:</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="password"
                                                            value={this.state.password}
                                                            onChange={this.onChange}
                                                        />
                                                    </Form.Group>
                                                </Form>
                                            </Col>
                                        </Row>
                                        {this.state.error ? <Row className="justify-content-row">
                                            <p className="text-red">{this.state.error}</p>
                                        </Row> : null}
                                        <Row>
                                            <Col>
                                                <Form>
                                                    <Form.Group controlId="form.wins">
                                                        <Form.Label>Wins:</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="wins"
                                                            value={this.state.wins}
                                                            onChange={this.onChange}
                                                        />
                                                    </Form.Group>
                                                </Form>
                                            </Col>
                                            <Col>
                                                <Form>
                                                    <Form.Group controlId="form.losses">
                                                        <Form.Label>Losses:</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="losses"
                                                            value={this.state.losses}
                                                            onChange={this.onChange}
                                                        />
                                                    </Form.Group>
                                                </Form>
                                            </Col>
                                            <Col>
                                                <Form>
                                                    <Form.Group controlId="form.points">
                                                        <Form.Label>Points:</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="points"
                                                            value={this.state.wins * 10 + this.state.losses * 3 + 50}
                                                            disabled={true}
                                                        />
                                                    </Form.Group>
                                                </Form>
                                            </Col>
                                            <Col>
                                                <Form>
                                                    <Form.Group controlId="form.freegames">
                                                        <Form.Label>Free Games:</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="freegames"
                                                            value={this.state.freegames}
                                                            onChange={this.onChange}
                                                        />
                                                    </Form.Group>
                                                </Form>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Col>
                                                <Form>
                                                    <Form.Group controlId="form.points">
                                                        <Form.Label>Renewal:</Form.Label>
                                                        <Form.Control
                                                            className={this.checkDate(this.state.renewal) ? "form-control-expired-uo" : null}
                                                            type="text"
                                                            name="renewal"
                                                            value={this.state.renewal}
                                                            disabled={true}
                                                        />
                                                    </Form.Group>
                                                </Form>
                                            </Col>
                                            <Col className="col-button-renew-uo">
                                                <Link to={"/admin/renewal/" + this.props.router.params.id}>
                                                    <Button variant="primary">Renew</Button>
                                                </Link>
                                            </Col>
                                        </Row>
                                    </Col>
                                </Row>
                                <Row className="row-buttons-uo admin-user-options-actions">
                                    <Button variant="outline-info" onClick={() => this.openWaiver()}>
                                        Open Waiver
                                    </Button>
                                    <Button variant="outline-primary" className="button-update-uo"
                                        onClick={() => this.resetOptions()}>
                                        Reset
                                    </Button>
                                    <Button variant="outline-primary" className="button-update-uo"
                                        onClick={() => this.updateUser()}>
                                        Update
                                    </Button>
                                    <Button variant="outline-primary" className="button-update-uo"
                                        onClick={() => this.copyToClipboard(this.props.router.params.id, this.state.name)}>
                                        Copy Profile Link
                                    </Button>
                                    {this.state.status ?
                                        <p className="status-uo-admin">{this.state.status}</p>
                                        : null}
                                </Row>
                                {authUser && !!authUser.roles[ROLES.SUPER] ? <Row className="row-priv-buttons-uo admin-user-options-actions">
                                    <Col md="auto">
                                        <Button className="button-options-style-admin"
                                            type="button" id="update" variant="primary" onClick={() => {
                                                this.updatePrivilege("admin")
                                            }}>
                                            Upgrade to Admin
                                        </Button>
                                    </Col>
                                    <Col md="auto">
                                        <Button className="button-options-style-admin" onClick={() => {
                                            this.updatePrivilege("waiver")
                                        }}
                                            type="button" id="update" variant="warning">
                                            Upgrade to Waiver
                                        </Button>
                                    </Col>
                                    <Col md="auto">
                                        <Button className="button-options-style-admin" onClick={() => {
                                            this.updatePrivilege("clear")
                                        }}
                                            type="button" id="update" variant="danger">
                                            Clear Privilege
                                        </Button>
                                    </Col>
                                    <Col md="auto">
                                        <Button className="button-options-style-admin" onClick={() => {
                                            this.updatePrivilege("check")
                                        }}
                                            type="button" id="update" variant="info">
                                            <i className="fa fa-question fa-1x text-white"></i>
                                        </Button>
                                    </Col>
                                    {this.state.super_status ? <Col className="status-col-uo">
                                        <p className="super-status-uo-admin">{this.state.super_status}</p>
                                    </Col> : null}
                                </Row> : null}
                                {this.renderAccountRemoval(authUser)}
                                </>}
                            </Container>
                            : <h2 className="pagePlaceholder">Loading...</h2>}
                        <Snackbar open={notification !== null} autoHideDuration={6000} onClose={() => this.setState({ notification: null })}>
                            <Alert onClose={() => this.setState({ notification: null })} severity="info">
                                {notification}
                            </Alert>
                        </Snackbar>
                    </div>
                }
            </AuthUserContext.Consumer>
        );
    }
}

const condition = authUser =>
    authUser && !!authUser.roles[ROLES.ADMIN];

export default withAuthorization(condition)(UserOptions);

// export default composeHooks(
//     withAuthorization(condition),
//     withFirebase,
// )(UserOptions);
