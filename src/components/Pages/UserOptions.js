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
            confirmation: '',
            attemptedRemoval: false,
            deleted: false,
            removeError: null,
        };
        this.reviewRemovalButton = React.createRef();
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(event) {
        this.setState({ value: event.target.value });
    }

    loadAccount() {
        this.waiverRequest?.abort();
        this.unsubscribeUser?.();
        this.saveRequest?.abort();
        this.saveRequest = null;
        const uid = this.props.router.params.id;
        this.setState({ loading: true, user: null, saving: false, reviewWaiver: null, error: null, status: null,
            emailError: '', emailNotice: '', password: '', removing: false, removeTarget: null, confirmation: '', attemptedRemoval: false, deleted: false, removeError: null });
        this.unsubscribeUser = onValue(this.props.firebase.user(uid), snapshot => {
            if (this.props.router.params.id !== uid) return;
            const user = snapshot.val();
            if (!user || user.accountRemovedAt) {
                this.setState(previous => ({
                    loading: false, user,
                    ...(!user && !previous.attemptedRemoval && { removeTarget: null, confirmation: '', removeError: null }),
                }));
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
                    ...(previous.removeTarget && !previous.attemptedRemoval && Object.values(user.roles ?? {}).some(Boolean) &&
                        { removeTarget: null, confirmation: '', removeError: null }),
                    email: editingEmail ? previous.email : (user.email ?? ''),
                    oldEmail: editingEmail ? previous.oldEmail : (user.email ?? ''),
                };
            }, () => {
                if (this.state.profilepic) this.getProfile(uid + '/profilepic');
                else this.setState({ profileicon: default_profile });
            });
        }, () => {
            if (this.props.router.params.id === uid) this.setState(previous => ({
                loading: false, user: null, error: 'The player account is temporarily unavailable.',
                ...(!previous.attemptedRemoval && { removeTarget: null, confirmation: '', removeError: null }),
            }));
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
        this.waiverRequest?.abort();
        this.saveRequest?.abort();
        this.unsubscribeUser?.();
        this.removeRequest?.abort();
    }

    canRemoveAccount(authUser, playerId) {
        const { user, removeTarget, attemptedRemoval, deleted } = this.state;
        // A successful server-side delete may remove the live profile before a receipt arrives.
        const reviewed = user || (attemptedRemoval && removeTarget?.uid === playerId && removeTarget);
        return Boolean(!deleted && reviewed && authUser?.roles?.[ROLES.ADMIN] && authUser.uid !== playerId &&
            !Object.values(reviewed.roles ?? {}).some(Boolean));
    }

    removeAccount = async (authUser) => {
        const { firebase } = this.props;
        const playerId = this.props.router.params.id;
        const { confirmation, removeTarget } = this.state;
        if (this.removeRequest || this.saveRequest || removeTarget?.uid !== playerId ||
            confirmation !== playerId || !this.canRemoveAccount(authUser, playerId)) return;
        const actor = firebase.auth.currentUser;
        if (!actor || actor.uid !== authUser.uid || actor.uid !== removeTarget.actorUid) {
            this.setState({ removeError: changedSessionMessage });
            return;
        }
        const request = new AbortController();
        this.removeRequest = request;
        this.setState({ removing: true, attemptedRemoval: true, removeError: null });
        try {
            const { data } = await firebase.permanentlyDeletePlayerAccount()({ playerId, confirmation });
            if (request.signal.aborted) return;
            if (firebase.auth.currentUser !== actor) throw new Error(changedSessionMessage);
            if (data?.deleted !== true || data.playerId !== playerId) throw new Error('Permanent deletion could not be confirmed. Retry for this player ID.');
            this.setState({
                user: null, deleted: true, removing: false, removeTarget: null, confirmation: '', attemptedRemoval: false,
            });
        } catch (error) {
            if (!request.signal.aborted) {
                const message = !error?.message || /^(internal(?: server error)?|unavailable|unknown|failed to fetch|not found)$/i.test(error.message)
                    ? 'The deletion service could not confirm completion. Retry for this player ID. If this continues, ask the Firebase project administrator to check the deletion service.'
                    : error.message;
                this.setState({ removing: false, removeError: message });
            }
        } finally {
            if (this.removeRequest === request) this.removeRequest = null;
        }
    };

    renderAccountRemoval(authUser) {
        const playerId = this.props.router.params.id;
        const { user, removeTarget, removeError, confirmation, removing, saving } = this.state;
        if (!this.canRemoveAccount(authUser, playerId)) return null;
        return (
            <section className="admin-account-removal" aria-labelledby="admin-account-removal-title">
                <h3 id="admin-account-removal-title">Permanently delete player</h3>
                <p>This deletes the player’s sign-in and profile and frees their email and username for registration.
                    Signed waivers keep their one-year window. Past check-ins and rental records stay on file.</p>
                {removeTarget?.uid !== playerId ? (
                    <Button type="button" variant="outline-danger" ref={this.reviewRemovalButton} disabled={saving}
                        onClick={() => this.setState({ removeTarget: {
                            uid: playerId, actorUid: authUser.uid, name: user.name, username: user.username, email: user.email, roles: user.roles,
                        }, confirmation: '', attemptedRemoval: false, removeError: null })}>Review deletion</Button>
                ) : (
                    <Form className="admin-account-removal__review" role="group" aria-label="Confirm permanent deletion" aria-busy={removing}
                        onSubmit={event => { event.preventDefault(); void this.removeAccount(authUser); }}>
                        <p><strong>{removeTarget.name || removeTarget.username || 'Player'}</strong>
                            {removeTarget.name && removeTarget.username && removeTarget.username !== removeTarget.name && <span> ({removeTarget.username})</span>}
                            {removeTarget.email && <><br />{removeTarget.email}</>}
                            <br />Player ID <code>{playerId}</code>
                        </p>
                        <Form.Group controlId="confirm-player-deletion">
                            <Form.Label>Type the player ID to confirm permanent deletion</Form.Label>
                            <Form.Control autoFocus autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                                value={confirmation} disabled={removing} onChange={event => this.setState({ confirmation: event.target.value })} />
                        </Form.Group>
                        {removeError && <p role="alert">{removeError}</p>}
                        <div className="admin-account-removal__actions">
                            <Button type="submit" variant="danger" disabled={removing || saving || confirmation !== playerId}>
                                {removing ? 'Deleting account…' : 'Permanently delete player'}
                            </Button>
                            <Button type="button" variant="outline-secondary" disabled={removing}
                                onClick={() => this.setState({ removeTarget: null, confirmation: '', attemptedRemoval: false, removeError: null },
                                    () => this.reviewRemovalButton.current?.focus())}>Cancel</Button>
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
            this.setState({ status: null, error: null, super_status: null, ul_error: null })
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
        if (this.saveRequest || this.removeRequest || this.state.removeTarget || !this.state.user || this.state.user.accountRemovedAt) return;
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
        const firebase = this.props.firebase;
        const staff = firebase.auth.currentUser;
        const storageRef = firebase.membersWaivers(uid + '.pdf');
        const tab = window.open();
        if (!tab) {
            this.setState({ error: 'Allow the waiver PDF to open and try again.' });
            return;
        }
        tab.opener = null;
        this.waiverRequest?.abort();
        const controller = new AbortController();
        this.waiverRequest = controller;
        const sameAccount = () => !controller.signal.aborted && this.props.router.params.id === uid && firebase.auth.currentUser === staff;
        this.setState({ reviewWaiver: null, error: null, status: null });
        try {
            let metadata;
            try {
                metadata = await getMetadata(storageRef);
            } catch (error) {
                if (error.code !== 'storage/object-not-found') throw error;
            }
            const created = Date.parse(metadata?.timeCreated);
            const current = created > waiverArchiveStart() && created <= Date.now();
            const data = metadata?.customMetadata || {};
            const reviewed = current && (data.usawSignedMemberForm === 'v1' ||
                (metadata?.generation && data.usawReviewedGeneration === metadata.generation));

            // A member can sign a newer waiver after their account PDF was created.
            let url;
            if (!this.state.user?.accountRemovedAt && sameAccount()) {
                const { document: linked } = await requestStaffFieldTool(firebase, staff.uid, '/api/waivers/membership', {
                    method: 'POST', body: { action: 'document', memberId: uid }, signal: controller.signal,
                }).catch(error => {
                    // The separately authorized legacy member PDF is still available for manual review.
                    if (metadata && (!error.status || error.status >= 500)) return { document: null };
                    throw error;
                });
                if (!sameAccount()) { tab.close(); return; }
                const document = linked && (!reviewed || linked.signedAt > created) ? linked : null;
                if (document?.type === 'digital' || document?.type === 'member-submission') {
                    const record = document.type === 'member-submission'
                        ? document.record : (await get(firebase.digitalWaiver(document.ref))).val();
                    if (!record || Number(record.timestamp) !== document.signedAt) throw new Error('Waiver changed');
                    const [{ pdf }, { default: SignedWaiver }] = await Promise.all([import('@react-pdf/renderer'), import('./SignedWaiver')]);
                    const blob = await pdf(<SignedWaiver {...record.additionalFields} {...record} />).toBlob();
                    if (!sameAccount()) { tab.close(); return; }
                    url = URL.createObjectURL(blob);
                    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
                } else if (document?.type === 'paper') {
                    const prefix = 'waivers/non-members/';
                    if (!document.objectName.startsWith(prefix)) throw new Error('Incorrect waiver document');
                    const scan = firebase.nonmembersWaivers(document.objectName.slice(prefix.length));
                    if ((await getMetadata(scan)).generation !== document.generation) throw new Error('The scan changed');
                    url = await getDownloadURL(scan);
                } else if (document?.type === 'party-receipt') {
                    if (!sameAccount()) { tab.close(); return; }
                    const date = new Intl.DateTimeFormat('en-US', {
                        timeZone: 'America/Los_Angeles', year: 'numeric', month: 'short', day: 'numeric',
                    }).format(document.signedAt);
                    this.setState({ status: `Party waiver submission confirmed for ${document.name} on ${date}. Search the waiver archive by name to open the original signed form.` });
                    if (!current) { tab.close(); return; }
                    // A current member PDF is still available for staff to inspect and review below.
                }
            }
            if (!url) {
                if (!metadata || (this.state.user?.accountRemovedAt && !current)) {
                    throw new Error('No member waiver available');
                }
                url = await getDownloadURL(storageRef);
                if (sameAccount() && current && metadata.generation && !reviewed) {
                    this.setState({ reviewWaiver: { uid, storageRef, generation: metadata.generation } });
                }
            }
            if (sameAccount()) tab.location.replace(url);
            else tab.close();
        } catch {
            tab.close();
            if (sameAccount()) this.setState({ error: 'Unable to open the member waiver. Refresh the player and try again.' });
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
                                <h2 className="admin-header">Player account</h2>
                                <Breadcrumb className="admin-breadcrumb admin-page-breadcrumb">
                                    <LinkContainer to="/admin">
                                        <Breadcrumb.Item>Admin</Breadcrumb.Item>
                                    </LinkContainer>
                                    <Breadcrumb.Item active>Player account</Breadcrumb.Item>
                                </Breadcrumb>
                                </div>
                                {!user || user.accountRemovedAt || this.state.deleted ? (
                                    <section className="admin-account-removal">
                                        {this.state.deleted ? <p role="status">Player account permanently deleted. The email and username have been released.</p>
                                            : user?.accountRemovedAt ? <p role="status">This player account is archived.</p>
                                            : !this.state.removeTarget && <p role="status">{error || 'This player account was not found.'}</p>}
                                        {this.state.deleted && <Link to="/admin/waiverlookup">Find retained waiver</Link>}
                                        {user?.accountRemovedAt && !this.state.deleted && <>
                                            <Button variant="outline-info" onClick={() => this.openWaiver()}>Open retained waiver</Button>
                                            {error && <p role="alert">{error}</p>}
                                        </>}
                                    </section>
                                ) : (!this.state.removeTarget || !this.canRemoveAccount(authUser, this.props.router.params.id)) && <>
                                <Row className="row-uo admin-user-options-card">
                                    <Col md={4} className="admin-user-options-sidebar">
                                        <div className="team-single-img">
                                            <img className="profile-pic" src={this.state.profileicon} alt="" />
                                        </div>
                                        <Button variant="outline-danger" onClick={() => {
                                            this.setState({ profileicon: default_profile, profilepic: false })
                                        }} disabled={!this.state.profilepic}>
                                            Remove photo
                                        </Button>
                                    </Col>
                                    <Col className="admin-user-options-main">
                                        <h3 className="player-edit-heading">Account details</h3>
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
                                                        <Form.Label>New password</Form.Label>
                                                        <Form.Control
                                                            type="password"
                                                            autoComplete="new-password"
                                                            name="password"
                                                            value={this.state.password}
                                                            onChange={this.onChange}
                                                        />
                                                    </Form.Group>
                                                </Form>
                                            </Col>
                                        </Row>
                                        {this.state.error ? <Row className="justify-content-row">
                                            <p role="alert" className="text-red">{this.state.error}</p>
                                        </Row> : null}
                                        <h3 className="player-edit-heading">Game record</h3>
                                        <Row className="player-edit-stats">
                                            <Col>
                                                <Form>
                                                    <Form.Group controlId="form.wins">
                                                        <Form.Label>Wins:</Form.Label>
                                                        <Form.Control
                                                            type="text" inputMode="numeric"
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
                                                            type="text" inputMode="numeric"
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
                                                            type="text" inputMode="numeric"
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
                                                    <Form.Group controlId="form.renewal">
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
                                                <Link className="btn btn-outline-primary" to={"/admin/renewal/" + this.props.router.params.id}>Renew</Link>
                                            </Col>
                                        </Row>
                                    </Col>
                                </Row>
                                <div className="player-edit-actions" role="group" aria-label="Player account actions">
                                    <Button variant="primary" disabled={this.state.saving} onClick={() => this.updateUser(authUser)}>
                                        Update
                                    </Button>
                                    <Button variant="outline-secondary" disabled={this.state.saving} onClick={() => this.resetOptions()}>
                                        Reset
                                    </Button>
                                    <Button variant="outline-primary" onClick={() => this.openWaiver()}>Open Waiver</Button>
                                    {this.state.reviewWaiver && <Button variant="outline-primary" onClick={this.confirmReviewedWaiver}>
                                        Confirm reviewed signatures
                                    </Button>}
                                    <Button variant="outline-primary" onClick={() => this.copyToClipboard(this.props.router.params.id, this.state.name)}>
                                        Copy Profile Link
                                    </Button>
                                </div>
                                {this.state.status && <p role="status" className="status-uo-admin">{this.state.status}</p>}
                                {authUser && !!authUser.roles[ROLES.SUPER] && (
                                    <section className="player-edit-access" aria-labelledby="player-edit-access">
                                        <h3 id="player-edit-access" className="player-edit-heading">Staff access</h3>
                                        <div className="player-edit-actions">
                                            <Button variant="outline-primary" onClick={() => this.updatePrivilege("check")}>Check current access</Button>
                                            <Button variant="outline-primary" onClick={() => this.updatePrivilege("admin")}>Grant admin access</Button>
                                            <Button variant="outline-primary" onClick={() => this.updatePrivilege("waiver")}>Grant waiver access</Button>
                                            <Button variant="outline-danger" onClick={() => this.updatePrivilege("clear")}>Clear staff access</Button>
                                        </div>
                                        {this.state.super_status && <p role="status">{this.state.super_status}</p>}
                                        {this.state.ul_error && <p role="alert" className="text-red">{this.state.ul_error}</p>}
                                    </section>
                                )}
                                </>}
                                {this.renderAccountRemoval(authUser)}
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
