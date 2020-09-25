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
            searching: "false",
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

    updateUser = (event) => {
        event.preventDefault()
    }

    onChange = event => {
        if (event.target.value !== "")
            this.setState({ search: event.target.value, searching: true });
        else 
            this.setState({ search: event.target.value, searching: false });
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
                                    <UserBox users={this.state.users} index={0} search={this.state.search}/>
                                </Card>
                            </Col>
                        </Row>
                    </Container>
                    : <h2 className="pagePlaceholder">Loading...</h2>}
            </div>
        );
    }
}

const UserBox = ({users, index, search}) => (
    <Card.Body className="status-card-body-admin">
        {users.map((user, i) => (
            search !== "" ? // Search query case
                user.freegames > 0 && user.name.includes(search) ? 
                        index++ % 2 === 0 ? 
                        <Row className="row-fg">
                            <Col className="col-name-fg">
                                <Card.Text key={index}>
                                    {"(" + index + ") " + user.name}
                                </Card.Text>
                            </Col>
                            <Col>
                                <Button className="button-submit-admin2" type="submit" id="update" variant="outline-success">
                                    Use 
                                </Button>
                            </Col>
                        </Row>
                            : 
                        <Row className="status-card-offrow-admin-fg">
                            <Col className="col-name-fg">
                                <Card.Text key={index}>
                                        {"(" + index + ") " + user.name}
                                </Card.Text>
                            </Col>
                            <Col>
                                <Button className="button-submit-admin2" type="submit" id="update" variant="success">
                                    Use 
                                </Button>
                            </Col>
                        </Row>
                : ""
            :
                user.freegames > 0 ? 
                        index++ % 2 === 0 ? 
                        <Row className="row-fg">
                            <Col className="col-name-fg">
                                <Card.Text key={index}>
                                    {"(" + index + ") " + user.name}
                                </Card.Text>
                            </Col>
                            <Col>
                                <Button className="button-submit-admin2" type="submit" id="update" variant="outline-success">
                                    Use 
                                </Button>
                            </Col>
                        </Row>
                            : 
                        <Row className="status-card-offrow-admin-fg">
                            <Col className="col-name-fg">
                                <Card.Text key={index}>
                                        {"(" + index + ") " + user.name}
                                </Card.Text>
                            </Col>
                            <Col>
                                <Button className="button-submit-admin2" type="submit" id="update" variant="success">
                                    Use 
                                </Button>
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