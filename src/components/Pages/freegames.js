import React, { Component, useState } from 'react';
import '../../App.css';
import './FrontDeskForms.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';


import { Button, Form, Container, Card, Row, Col, Breadcrumb, Spinner } from 'react-bootstrap/';

import { LinkContainer } from 'react-router-bootstrap';

import * as ROLES from '../constants/roles';
import { Helmet } from 'react-helmet-async';
import { get, onValue, update } from 'firebase/database';

class FreeGames extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            users: [],
            search: "",
        };
    }


    componentWillUnmount() {
        this.unsubscribeUsers?.();
    }

    componentDidMount() {
        this.unsubscribeUsers = onValue(this.props.firebase.users(), snapshot => {
            const usersObject = snapshot.val() || {}

            const usersList = Object.keys(usersObject).map(key => ({
                ...usersObject[key],
                uid: key,
            }));
            const filteredList = usersList.filter(obj => !obj.accountRemovedAt && obj.freegames > 0);

            this.setState({
                users: filteredList,
                loading: false,
            });
        });
    }

    // Updates User's free game
    updateUser = (user) => {
        get(this.props.firebase.user(user)).then(snapshot => {
            if (snapshot.exists() && !snapshot.val().accountRemovedAt) {
                const userData = snapshot.val();
                const freegames = Math.max(0, userData.freegames - 1);
                update(this.props.firebase.user(user), { freegames })
                    .then(() => {
                        // Update local state to reflect the change
                        this.setState(prevState => ({
                            users: prevState.users.map(u =>
                                u.uid === user ? { ...u, freegames } : u
                            )
                        }));
                    })
                    .catch(error => {
                        console.error("Error updating free games:", error);
                    });
            }
        });
    }

    onChange = event => {
        this.setState({ search: event.target.value });
    };

    render() {
        return (
            <div className="admin-container admin-compact-page">
                <Helmet>
                    <title>US Airsoft Field: Free Games Lookup</title>
                </Helmet>
                <Container fluid className="admin-content">
                    <div className="admin-page-header">
                        <h2 className="admin-header">Redeem Free Game</h2>
                        <Breadcrumb className="admin-breadcrumb admin-page-breadcrumb">
                            {window.location.href.indexOf("admin") > -1 ?
                                <LinkContainer to="/admin">
                                    <Breadcrumb.Item>Admin</Breadcrumb.Item>
                                </LinkContainer>
                                :
                                <LinkContainer to="/dashboard">
                                    <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
                                </LinkContainer>
                            }
                            <Breadcrumb.Item active>Free Games</Breadcrumb.Item>
                        </Breadcrumb>
                    </div>
                    <Row>
                        <Col>
                            <Card className="admin-panel-card admin-freegames-card">
                                <Card.Header>
                                    <Form className="team-manage-text admin-freegames-search" onSubmit={e => { e.preventDefault(); }}>
                                        <Form.Group controlId="input1">
                                            <Form.Label className="search-label-admin">Search by name or username</Form.Label>
                                            <Form.Control
                                                type="search"
                                                placeholder="Player name or username"
                                                autoComplete="off"
                                                value={this.state.search}
                                                onChange={(e) => {
                                                    this.onChange(e);
                                                }}
                                            />
                                        </Form.Group>
                                    </Form>
                                </Card.Header>
                                {!this.state.loading ?
                                    <UserBox users={this.state.users} search={this.state.search} update={this.updateUser} />
                                    : <Row className="justify-content-row padding-5px"><Spinner animation="border" /></Row>}
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        );
    }
}

function UserBox({ users, search, update }) {
    const [confirmUid, setConfirmUid] = useState(null);
    const term = search.trim().toLowerCase();
    const matches = users.filter(user => [user.name, user.username].some(value => String(value || '').toLowerCase().includes(term)));

    return (
        <Card.Body className="desk-freegames-list">
            {matches.length === 0 && <p role="status">
                {term ? 'No players with free games match that search.' : 'No players have free games to redeem.'}
            </p>}
            {matches.map(user => (
                <div className="desk-freegames-row" key={user.uid}>
                    <div>
                        <strong>{user.name || user.username}</strong>
                        {user.username && <small>{user.username}</small>}
                    </div>
                    <span>{user.freegames} free {Number(user.freegames) === 1 ? 'game' : 'games'}</span>
                    {confirmUid === user.uid ? (
                        <div className="desk-freegames-actions" role="group" aria-label={`Redeem for ${user.name || user.username}`}>
                            <Button variant="success" disabled={user.freegames <= 0} onClick={() => {
                                setConfirmUid(null);
                                update(user.uid);
                            }}>Confirm redemption</Button>
                            <Button variant="outline-secondary" onClick={() => setConfirmUid(null)}>Cancel</Button>
                        </div>
                    ) : <Button variant="outline-primary" disabled={user.freegames <= 0}
                        onClick={() => setConfirmUid(user.uid)}>Redeem one game</Button>}
                </div>
            ))}
        </Card.Body>
    );
}

const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default withAuthorization(condition)(withFirebase(FreeGames));

// export default composeHooks(
//     withAuthorization(condition),
//     withFirebase,
// )(FreeGames);
