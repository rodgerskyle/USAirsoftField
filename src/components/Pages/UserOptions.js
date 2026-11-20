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
import { getDownloadURL, getMetadata, updateMetadata } from 'firebase/storage';
import { waiverArchiveStart } from '../utils/waiverArchive';
import './UserOptions.css';

function profileFields(user) {
    return {
        username: user.username ?? '', name: user.name ?? '', team: user.team?.toUpperCase() ?? '',
        wins: user.wins ?? 0, losses: user.losses ?? 0, freegames: user.freegames ?? 0,
        profilepic: Boolean(user.profilepic),
    };
}

function knownEmailFailure(error) {
    const reason = [error?.details?.code, error?.details?.errorInfo?.code, error?.code,
        error?.details?.message, error?.message].filter(value => typeof value === 'string').join(' ');
    if (/already[-_ ](?:in[-_ ]use|exists)|email[-_ ]exists|already.*(?:used|in use)/i.test(reason)) {
        return 'This email is already used by another account. Enter a different email.';
    }
    if (/invalid[-_ ]email|invalid[-_ ]argument/i.test(reason)) return 'Check the player’s email address and save again.';
    if (/user[-_ ]not[-_ ]found/i.test(reason)) return 'Firebase could not find this player’s sign-in account. Check the player ID in Find Player.';
    if (/unauthenticated|requires[-_ ]recent[-_ ]login|token[-_ ]expired/i.test(reason)) return 'Sign in to your USAW administrator account again, then reopen this player.';
    if (/service lacks permission|service account.*permission/i.test(reason)) return 'The email service lacks permission to update accounts. Contact the Firebase project owner.';
    if (/permission[-_ ]denied|insufficient[-_ ]permission/i.test(reason)) return 'Firebase denied this change. Ask a project administrator to check your email-edit access.';
    return '';
}

function uncertainEmailFailure(error) {
    return /^(functions\/)?(internal|unknown|unavailable|deadline-exceeded|cancelled|network-request-failed)$/i.test(error?.code) ||
        /^(internal(?: server error)?|unknown|failed to fetch|network error)$/i.test(error?.message || '');
}

const changedSessionMessage = 'Your USAW staff sign-in changed. Reopen the player using your administrator account.';

async function availableEmailService(firebase, actor, signal, checkSession) {
    const service = firebase.updatePlayerSignInEmail();
    let capability;
    try {
        capability = (await service({ action: 'capabilities' }))?.data;
    } catch (error) {
        // Missing HTTPS callables can appear as "internal" in browsers when
        // their 404 lacks CORS headers. This probe has no target and cannot write.
        const missing = ['functions/not-found', 'functions/unimplemented'].includes(error?.code);
        const opaque = error?.code === 'functions/internal' && /^(internal(?: server error)?|failed to fetch)?$/i.test(error.message || '');
        if (knownEmailFailure(error) || (!missing && !opaque)) throw error;
        checkSession();
        let status;
        try {
            status = await requestStaffFieldTool(firebase, actor.uid, '/api/staff-player-accounts/email-service', { signal });
        } catch (statusError) {
            checkSession();
            if ([401, 403].includes(statusError.status)) throw statusError;
            throw new Error('Unable to verify which email service is available. Retry after reconnecting or contact the Firebase project administrator.');
        }
        checkSession();
        if (status?.deployed === false) return null;
        throw new Error(status?.deployed === true
            ? 'The player email service is deployed but did not respond. Retry later or contact the Firebase project administrator.'
            : 'The email service deployment could not be confirmed. Contact the Firebase project administrator.');
    }
    if (capability?.operation !== 'updatePlayerSignInEmail' || capability.version !== 1) {
        throw new Error('The player email service is incompatible with this website. Refresh the page before editing.');
    }
    return service;
}

function sameEmail(actual, expected) {
    return typeof actual === 'string' && actual.trim().toLowerCase() === expected.trim().toLowerCase();
}

function unconfirmedEmailMessage(saved, requested, uid) {
    const profile = typeof saved === 'string' && saved.toLowerCase() === requested.toLowerCase()
        ? 'The player profile shows the requested address, but Firebase did not confirm the sign-in change.'
        : 'Firebase did not confirm the player’s sign-in email change.';
    return profile + ' Ask a Firebase project administrator to check Authentication → Users for player ID ' + uid + ' before retrying.';
}

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
            oldEmail: "",
            saving: false,
            emailNotice: "",
            emailError: "",
            password: "",
            removeImg: false,
            super_status: null,
            status: null,
            error: null,
            notification: null,
            removing: false,
            reviewWaiver: null,
            removeTarget: null,
            removeError: null,
        };
        this.reviewRemovalButton = React.createRef();
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(event) {
        this.setState({ value: event.target.value });
    }

    loadAccount() {
        this.unsubscribeUser?.();
        this.saveRequest?.abort();
        this.saveRequest = null;
        const uid = this.props.router.params.id;
        this.setState({ loading: true, user: null, saving: false, reviewWaiver: null, error: null, status: null,
            emailError: '', emailNotice: '', password: '', removing: false, removeTarget: null, removeError: null });
        this.unsubscribeUser = onValue(this.props.firebase.user(uid), snapshot => {
            if (this.props.router.params.id !== uid) return;
            const user = snapshot.val();
            if (!user || user.accountRemovedAt) {
                this.setState({ loading: false, user });
                return;
            }

            this.setState(previous => {
                const fields = profileFields(user);
                const baseline = previous.user && profileFields(previous.user);
                // A live email update must not discard unsaved edits to this player.
                for (const key of Object.keys(fields)) {
                    if (baseline && previous[key] !== baseline[key]) fields[key] = previous[key];
                }
                const editingEmail = previous.user && previous.email !== previous.oldEmail;
                return {
                    ...fields, loading: false, user, renewal: user.renewal ?? '',
                    email: editingEmail ? previous.email : (user.email ?? ''),
                    oldEmail: editingEmail ? previous.oldEmail : (user.email ?? ''),
                };
            }, () => {
                if (this.state.profilepic) this.getProfile(uid + '/profilepic');
                else this.setState({ profileicon: default_profile });
            });
        }, () => {
            if (this.props.router.params.id === uid) this.setState({ loading: false, user: null, error: 'The player account is temporarily unavailable.' });
        });
    }

    componentDidMount() {
        this.loadAccount();
    }

    componentDidUpdate(previousProps) {
        if (previousProps.router.params.id !== this.props.router.params.id) {
            this.removeRequest?.abort();
            this.removeRequest = null;
            this.loadAccount();
        }
    }

    componentWillUnmount() {
        this.saveRequest?.abort();
        this.unsubscribeUser?.();
        this.removeRequest?.abort();
    }

    canRemoveAccount(authUser, playerId) {
        const { user } = this.state;
        return Boolean(authUser?.roles?.[ROLES.ADMIN] && authUser.uid !== playerId && user &&
            !user.accountRemovedAt && !Object.values(user.roles ?? {}).some(Boolean));
    }

    removeAccount = async (authUser) => {
        const playerId = this.props.router.params.id;
        const { removeTarget, removing } = this.state;
        if (removing || this.removeRequest || removeTarget !== playerId || !this.canRemoveAccount(authUser, playerId)) return;
        const request = new AbortController();
        this.removeRequest = request;
        this.setState({ removing: true, removeError: null });
        try {
            const result = await requestStaffFieldTool(this.props.firebase, authUser.uid, '/api/staff-player-accounts', {
                method: 'POST', body: { playerId, confirmation: playerId }, signal: request.signal,
            });
            if (request.signal.aborted) return;
            if (!result.removed || result.playerId !== playerId) throw new Error('Account removal could not be confirmed.');
            this.setState(current => ({
                user: { ...current.user, accountRemovedAt: true }, removing: false, removeTarget: null,
            }));
        } catch (error) {
            if (!request.signal.aborted) this.setState({ removing: false, removeError: error.message });
        } finally {
            if (this.removeRequest === request) this.removeRequest = null;
        }
    };

    renderAccountRemoval(authUser) {
        const playerId = this.props.router.params.id;
        const { user, removeTarget, removeError, removing } = this.state;
        if (!this.canRemoveAccount(authUser, playerId)) return null;
        return (
            <section className="admin-account-removal" aria-labelledby="admin-account-removal-title">
                <h3 id="admin-account-removal-title">Remove player account</h3>
                <p>Blocks access to this player account in the website and Companion. Signed waivers and historical records are retained.</p>
                {removeTarget !== playerId ? (
                    <Button type="button" variant="outline-danger" ref={this.reviewRemovalButton}
                        onClick={() => this.setState({ removeTarget: playerId, removeError: null })}>Review removal</Button>
                ) : (
                    <div className="admin-account-removal__review" role="group" aria-label="Confirm player account removal" aria-busy={removing}>
                        <p><strong>{user.name || user.username || 'Player'}</strong>
                            {user.name && user.username && user.username !== user.name && <span> ({user.username})</span>}
                            <br />Player ID <code>{playerId}</code>
                        </p>
                        {removeError && <p role="alert">{removeError}</p>}
                        <div className="admin-account-removal__actions">
                            <Button type="button" variant="danger" disabled={removing} onClick={() => this.removeAccount(authUser)}>
                                {removing ? 'Removing account…' : 'Confirm removal'}
                            </Button>
                            <Button autoFocus type="button" variant="outline-secondary" disabled={removing}
                                onClick={() => this.setState({ removeTarget: null, removeError: null }, () => this.reviewRemovalButton.current?.focus())}>Cancel</Button>
                        </div>
                    </div>
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
            ...profileFields(this.state.user),
            email: this.state.user.email ?? '',
            oldEmail: this.state.user.email ?? '',
            emailNotice: '',
            emailError: '',
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

    async savePlayerEmail(uid, email, oldEmail, actor, signal, checkSession) {
        const { firebase } = this.props;
        const emailRef = firebase.user(uid + '/email');
        const current = (await get(emailRef)).val() ?? '';
        checkSession();
        if (current !== oldEmail && !sameEmail(current, email)) {
            this.setState(state => ({ user: { ...state.user, email: current } }));
            throw new Error('The saved email changed. Select Reset to load the current address before trying again.');
        }
        const service = await availableEmailService(firebase, actor, signal, checkSession);
        checkSession();
        if (!service && current !== oldEmail) throw new Error(unconfirmedEmailMessage(current, email, uid));
        let verifiedSignIn = false;
        try {
            if (service) {
                const { data } = await service({ uid, email, expectedEmail: oldEmail });
                verifiedSignIn = data?.verified === true && data.uid === uid &&
                    [data.email, data.authEmail, data.profileEmail].every(value => sameEmail(value, email));
                if (!verifiedSignIn) {
                    throw Object.assign(new Error('Incomplete account confirmation.'), { code: 'functions/unknown' });
                }
            } else {
                const result = await firebase.manageProfile()({
                    choice: 'emailAdmin', uid, email: encode(email), old_email: encode(oldEmail),
                });
                const data = result?.data;
                if (data === false || data?.success === false || data?.error) {
                    const reason = data?.error || data;
                    const message = typeof reason === 'string' ? reason : reason?.message || data?.message;
                    throw Object.assign(new Error(message || 'The email change was declined.'), { code: reason?.code, details: reason?.details });
                }
            }
        } catch (error) {
            checkSession();
            // The dedicated service returns specific explanations for protected
            // accounts (including the operator's own account) and stale edits.
            if (service && error?.code === 'functions/permission-denied' && error.message && error.message !== 'permission-denied') {
                throw new Error(error.message);
            }
            const actionable = knownEmailFailure(error);
            if (actionable) throw new Error(actionable);
            if (!uncertainEmailFailure(error)) throw error;
            // Never issue a second write after an ambiguous response from either service.
            const saved = await get(emailRef).then(snapshot => snapshot.val()).catch(() => null);
            checkSession();
            throw new Error(unconfirmedEmailMessage(saved, email, uid));
        }
        checkSession();
        const saved = await get(emailRef).then(snapshot => snapshot.val()).catch(() => null);
        checkSession();
        if (!sameEmail(saved, email)) {
            if (verifiedSignIn) throw new Error('Firebase confirmed the sign-in address as ' + email + '. Reopen the player to check their current profile address before saving again.');
            throw new Error('The account service has not confirmed the new email on this profile. Reopen the player to check the saved address.');
        }
        this.setState(state => ({
            email: saved, oldEmail: saved, user: { ...state.user, email: saved },
            emailNotice: 'Player email updated to ' + saved + '.', emailError: '',
        }));
    }

    async updateUser(authUser, emailOnly = false) {
        if (this.saveRequest || !this.state.user || this.state.user.accountRemovedAt) return;
        const { firebase } = this.props;
        const uid = this.props.router.params.id;
        const { oldEmail, password, user } = this.state;
        const email = this.state.email.trim();
        const emailChanged = email.toLowerCase() !== oldEmail.trim().toLowerCase();
        if (emailChanged && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
            this.setState({ emailError: 'Enter a valid player email address.', emailNotice: '', status: null });
            return;
        }
        if (!emailOnly && password && password.length < 6) {
            this.setState({ error: 'Password must be at least 6 characters.', status: null });
            return;
        }
        if (emailOnly && !emailChanged) return;
        const baseline = profileFields(user);
        const edits = Object.fromEntries(Object.keys(baseline)
            .filter(key => String(this.state[key]) !== String(baseline[key]))
            .map(key => [key, this.state[key]]));
        for (const key of ['wins', 'losses', 'freegames']) {
            if (key in edits) {
                if (!emailOnly && (!/^\d+$/.test(String(edits[key])) || !Number.isSafeInteger(Number(edits[key])))) {
                    this.setState({ error: 'Enter a whole number of zero or more for ' + key + '.', status: null });
                    return;
                }
                edits[key] = Number(edits[key]);
            }
        }
        if ('wins' in edits || 'losses' in edits) edits.points = Number(this.state.wins) * 10 + Number(this.state.losses) * 3 + 50;
        if ('username' in edits) edits.usernameLower = edits.username.trim().toLowerCase();
        if ('name' in edits) edits.nameLower = edits.name.trim().toLowerCase();

        const actor = firebase.auth.currentUser;
        if (!actor || actor.uid !== authUser?.uid || !authUser.roles?.[ROLES.ADMIN]) {
            this.setState({ emailError: changedSessionMessage });
            return;
        }
        const request = new AbortController();
        const checkSession = () => {
            if (request.signal.aborted || firebase.auth.currentUser !== actor) throw new Error(changedSessionMessage);
        };
        this.saveRequest = request;
        const unsubscribe = firebase.auth.onAuthStateChanged(current => {
            if (current !== actor && this.saveRequest === request && !request.signal.aborted) {
                request.abort();
                this.saveRequest = null;
                this.setState({ saving: false, emailError: changedSessionMessage });
            }
        });
        this.setState({ saving: true, status: null, error: null, emailError: '', emailNotice: '' });
        let updatingEmail = emailChanged;
        try {
            if (emailChanged) await this.savePlayerEmail(uid, email, oldEmail, actor, request.signal, checkSession);
            checkSession();
            if (emailOnly) return;
            updatingEmail = false;
            if (Object.keys(edits).length) await update(firebase.user(uid), edits);
            checkSession();
            if (password) await firebase.manageProfile()({ choice: 'passAdmin', uid, password });
            if (!request.signal.aborted && (Object.keys(edits).length || password)) {
                this.setState({ status: 'Successfully updated ' + this.state.name, password: '' });
            }
        } catch (error) {
            if (!request.signal.aborted) this.setState(updatingEmail ? { emailError: knownEmailFailure(error) || error.message || 'The player email could not be updated.' } :
                { error: error.message || 'The player profile could not be updated.' });
        } finally {
            unsubscribe();
            if (this.saveRequest === request) {
                this.saveRequest = null;
                if (!request.signal.aborted) this.setState({ saving: false });
            }
        }
    }

    // Form box on change event
    onChange = event => {
        const { name, value } = event.target;
        this.setState({ [name]: value, ...(name === 'email' && { emailNotice: '', emailError: '' }) });
    };

    async openWaiver() {
        const uid = this.props.router.params.id;
        const storageRef = this.props.firebase.membersWaivers(uid + '.pdf');
        const tab = window.open();
        if (!tab) {
            this.setState({ error: 'Allow the waiver PDF to open and try again.' });
            return;
        }
        tab.opener = null;
        this.setState({ reviewWaiver: null, error: null });
        try {
            const [url, metadata] = await Promise.all([getDownloadURL(storageRef), getMetadata(storageRef)]);
            tab.location.replace(url);
            const created = Date.parse(metadata.timeCreated);
            const data = metadata.customMetadata || {};
            if (this.props.router.params.id === uid && created > waiverArchiveStart() && created <= Date.now() &&
                metadata.generation && data.usawSignedMemberForm !== 'v1' && data.usawReviewedGeneration !== metadata.generation) {
                this.setState({ reviewWaiver: { uid, storageRef, generation: metadata.generation } });
            }
        } catch {
            tab.close();
            if (this.props.router.params.id === uid) this.setState({ error: 'Unable to open the member waiver.' });
        }
    }

    confirmReviewedWaiver = async () => {
        const reviewed = this.state.reviewWaiver;
        if (!reviewed || reviewed.uid !== this.props.router.params.id ||
            !window.confirm('Did you verify this is the correct participant and visually confirm their signature and any required guardian signature on this PDF?')) return;
        this.setState({ reviewWaiver: null });
        try {
            const metadata = await getMetadata(reviewed.storageRef);
            if (metadata.generation !== reviewed.generation || Date.parse(metadata.timeCreated) <= waiverArchiveStart()) {
                throw new Error('The waiver has expired or changed. Reopen the current waiver.');
            }
            await updateMetadata(reviewed.storageRef, { customMetadata: {
                ...metadata.customMetadata, usawReviewedGeneration: reviewed.generation,
                usawReviewedBy: this.props.firebase.auth.currentUser.uid,
            } });
            if (this.props.router.params.id === reviewed.uid) this.setState({ status: 'Waiver signatures verified for check-in.', error: null });
        } catch (error) {
            if (this.props.router.params.id === reviewed.uid) this.setState({ error: error.message || 'Unable to save the waiver review.' });
        }
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
                                                <Form noValidate onSubmit={event => { event.preventDefault(); void this.updateUser(authUser, true); }}>
                                                    <Form.Group controlId="form.email">
                                                        <Form.Label>Player sign-in email</Form.Label>
                                                        <Form.Control type="email" name="email" autoComplete="off" maxLength={254}
                                                            disabled={this.state.saving} value={this.state.email} onChange={this.onChange}
                                                            aria-invalid={Boolean(this.state.emailError)} aria-describedby="player-email-message" />
                                                    </Form.Group>
                                                    <Button type="submit" variant="outline-primary" className="mt-2"
                                                        disabled={this.state.saving || this.state.email.trim().toLowerCase() === this.state.oldEmail.trim().toLowerCase()}>
                                                        Save email
                                                    </Button>
                                                    <div id="player-email-message">
                                                        {this.state.emailError && <p role="alert" className="text-red">{this.state.emailError}</p>}
                                                        {this.state.emailNotice && <p role="status">{this.state.emailNotice}</p>}
                                                    </div>
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
                                    {this.state.reviewWaiver && <Button variant="outline-primary" onClick={this.confirmReviewedWaiver}>
                                        Confirm reviewed signatures
                                    </Button>}
                                    <Button variant="outline-primary" className="button-update-uo"
                                        disabled={this.state.saving} onClick={() => this.resetOptions()}>
                                        Reset
                                    </Button>
                                    <Button variant="outline-primary" className="button-update-uo"
                                        disabled={this.state.saving} onClick={() => this.updateUser(authUser)}>
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
