import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import { Button, Form, Container, Card, Row, Col } from 'react-bootstrap/';

import * as ROLES from '../constants/roles';

class FreeGames extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: false,
            users: [],
            queriedlist: [],
            search: "",
            UpdateUserState: this.updateUser,
        };
    }

    componentWillUnmount() {
        this.props.firebase.users().off();
    }

    componentDidMount() {
        this.setState({ loading: true });

        this.props.firebase.users().on('value', snapshot => {
            const usersObject = snapshot.val();

            const usersList = Object.keys(usersObject).map(key => ({
                ...usersObject[key],
                uid: key,
            }));

            this.setState({
                users: usersList,
                loading: false,
            });
        });
    }

    // Updates User's free game
    updateUser = (user) => {
        this.props.firebase.user(user).once("value", object => {
            var freegames = object.val().freegames;
            freegames--;
            this.props.firebase.user(user).update({freegames})
        })
    }

    onChange = event => {
            this.setState({ search: event.target.value });
    };

    render() {
        return (
            <div className="background-static-all">
                <h2 className="page-header">Admin - Redeem Free Game</h2>
                {!this.state.loading ?
                    <Container>
                        <Row>
                            <Col>
                                <Card>
                                    <Card.Header>
                                        <Form className="team-manage-text" onSubmit={(e) => this.nextPage(e)}>
                                            <Form.Group controlId="input1">
                                                <Form.Label className="search-label-admin">Search by Username:</Form.Label>
                                                <Form.Control
                                                    type="name"
                                                    placeholder="ex: JohnDoe"
                                                    value={this.state.search}
                                                    onChange={(e) => {
                                                        this.onChange(e);
                                                    }}
                                                />
                                            </Form.Group>
                                        </Form>
                                    </Card.Header>
                                    <UserBox users={this.state.users} index={0} 
                                    search={this.state.search} update={this.state.UpdateUserState}/>
                                </Card>
                            </Col>
                        </Row>
                    </Container>
                    : <h2 className="pagePlaceholder">Loading...</h2>}
            </div>
        );
    }
}

const UserBox = ({users, index, search, update}) => (
    <Card.Body className="status-card-body-admin">
        {users.map((user, i) => (
            search !== "" ? // Search query case
                user.freegames > 0 && user.name.toLowerCase().includes(search.toLowerCase()) ? 
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
                                        {user.freegames + " Free Game(s)"}
                                    </Col>
                                    <Col>
                                        <Button className="button-submit-admin2" onClick={() => update(user.uid)}
                                        type="submit" id="update" variant="outline-success">
                                            Use 1 
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
                                        {user.freegames + " Free Game(s)"}
                                    </Col>
                                    <Col>
                                        <Button className="button-submit-admin2" onClick={() => update(user.uid)}
                                        type="submit" id="update" variant="success">
                                            Use 1 
                                        </Button>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                : ""
            :
                user.freegames > 0 ? 
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
                                        {user.freegames + " Free Game(s)"}
                                    </Col>
                                    <Col>
                                        <Button className="button-submit-admin2" onClick={() => update(user.uid)}
                                        type="submit" id="update" variant="outline-success">
                                            Use 1 
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
                                        {user.freegames + " Free Game(s)"}
                                    </Col>
                                    <Col>
                                        <Button className="button-submit-admin2" onClick={() => update(user.uid)}
                                        type="submit" id="update" variant="success">
                                            Use 1 
                                        </Button>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                : ""
        ))}
    </Card.Body>
);

const condition = authUser =>
    authUser && !!authUser.roles[ROLES.ADMIN];

export default compose(
    withAuthorization(condition),
    withFirebase,
)(FreeGames);