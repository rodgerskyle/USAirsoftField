import React, { Component, useState } from 'react';
import '../../App.css';

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
            UpdateUserState: this.updateUser,
        };
    }


    componentWillUnmount() {
        // this.props.firebase.users().off();
    }

    componentDidMount() {
        onValue(this.props.firebase.users(), snapshot => {
            const usersObject = snapshot.val()

            const usersList = Object.keys(usersObject).map(key => ({
                ...usersObject[key],
                uid: key,
            }));
            const filteredList = usersList.filter(obj => obj.freegames > 0);

            this.setState({
                users: filteredList,
                loading: false,
            });
        });
    }

    // Updates User's free game
    updateUser = (user) => {
        get(this.props.firebase.user(user)).then(snapshot => {
            if (snapshot.exists()) {
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
            <div className="background-static-all">
                <Helmet>
                    <title>US Airsoft Field: Free Games Lookup</title>
                </Helmet>
                <Container>
                    <h2 className="admin-header">Redeem Free Game</h2>
                    <Breadcrumb className="admin-breadcrumb">
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
                    <Row>
                        <Col>
                            <Card className="admin-cards">
                                <Card.Header>
                                    <Form className="team-manage-text" onSubmit={e => { e.preventDefault(); }}>
                                        <Form.Group controlId="input1">
                                            <Form.Label className="search-label-admin">Search by Username:</Form.Label>
                                            <Form.Control
                                                type="name"
                                                placeholder="ex: JohnDoe"
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
                                    <UserBox users={this.state.users} index={0} length={this.state.users.length}
                                        search={this.state.search} update={this.state.UpdateUserState} />
                                    : <Row className="justify-content-row padding-5px"><Spinner animation="border" /></Row>}
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        );
    }
}

function UserBox({ users, index, search, update, length }) {
    const [ButtonArray, setButtonArray] = useState(new Array(length).fill(false));

    const handleConfirm = (user, i) => {
        if (user.freegames > 0) {
            update(user.uid);
            let tempArray = [...ButtonArray];
            tempArray[i] = false;
            setButtonArray(tempArray);
        }
    };

    const renderUserRow = (user, i, rowIndex, isEven) => {
        const rowClass = isEven ? "row-fg" : "status-card-offrow-admin-fg";

        return (
            <Row className={rowClass} key={rowIndex}>
                <Col className="col-name-fg">
                    <Card.Text>
                        {"(" + rowIndex + ") " + user.name}
                    </Card.Text>
                </Col>
                <Col>
                    <Row>
                        <Col className="col-name-fg" style={{ color: "white" }}>
                            {user.freegames + " Free Game(s)"}
                        </Col>
                        {ButtonArray[i] === false ? (
                            <Col xs={4}>
                                <Button
                                    className="button-submit-admin2"
                                    onClick={() => {
                                        let tempArray = [...ButtonArray];
                                        tempArray.fill(false);
                                        tempArray[i] = true;
                                        setButtonArray(tempArray);
                                    }}
                                    disabled={user.freegames <= 0}
                                    type="submit"
                                    variant={user.freegames > 0 ? "success" : "secondary"}
                                >
                                    Use 1
                                </Button>
                            </Col>
                        ) : (
                            <Col xs={4}>
                                <Row>
                                    <Col>
                                        <Button
                                            className="button-submit-admin2"
                                            onClick={() => handleConfirm(user, i)}
                                            type="submit"
                                            variant="success"
                                            size="sm"
                                        >
                                            Confirm
                                        </Button>
                                    </Col>
                                    <Col>
                                        <Button
                                            className="button-submit-admin2"
                                            onClick={() => {
                                                let tempArray = [...ButtonArray];
                                                tempArray[i] = false;
                                                setButtonArray(tempArray);
                                            }}
                                            type="submit"
                                            variant="danger"
                                            size="sm"
                                        >
                                            Cancel
                                        </Button>
                                    </Col>
                                </Row>
                            </Col>
                        )}
                    </Row>
                </Col>
            </Row>
        );
    };

    return (
        <Card.Body className="status-card-body-fg-admin">
            {users.map((user, i) => {
                if (search !== "" && !user.username.toLowerCase().includes(search.toLowerCase())) {
                    return null;
                }
                index++;
                return renderUserRow(user, i, index, index % 2 === 0);
            })}
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