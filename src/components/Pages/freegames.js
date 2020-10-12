import React, { Component, useState } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import { Button, Form, Container, Card, Row, Col, Breadcrumb } from 'react-bootstrap/';

import { LinkContainer } from 'react-router-bootstrap';

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
                {!this.state.loading ?
                    <Container>
                        <h2 className="admin-header">Admin - Redeem Free Game</h2>
                        <Breadcrumb className="admin-breadcrumb">
                            <LinkContainer to="/admin">
                                <Breadcrumb.Item>Admin</Breadcrumb.Item>
                            </LinkContainer>
                            <Breadcrumb.Item active>Free Games</Breadcrumb.Item>
                        </Breadcrumb>
                        <Row>
                            <Col>
                                <Card className="admin-cards">
                                    <Card.Header>
                                        <Form className="team-manage-text">
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
                                    <UserBox users={this.state.users} index={0} length={this.state.users.length}
                                    search={this.state.search} update={this.state.UpdateUserState} />
                                </Card>
                            </Col>
                        </Row>
                    </Container>
                    : <h2 className="pagePlaceholder">Loading...</h2>}
            </div>
        );
    }
}

function UserBox({users, index, search, update, length}) {
    const [ButtonArray, setButtonArray] = useState( new Array(length).fill(false));

    return (
        <Card.Body className="status-card-body-fg-admin">
            {users.map((user, i) => (
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
                                            {user.freegames + " Free Game(s)"}
                                        </Col>
                                        {ButtonArray[i] === false ? 
                                            <Col>
                                                <Button className="button-submit-admin2" onClick={() => {
                                                    let tempArray = [...ButtonArray];
                                                    tempArray.fill(false)
                                                    tempArray[i] = true 
                                                    setButtonArray(tempArray)
                                                }}
                                                type="submit" id="update" variant="success">
                                                    Use 1 
                                                </Button>
                                            </Col>
                                        :
                                            <Row className="confirm-buttons-admin">
                                                <Col>
                                                    <Button className="button-submit-admin2" onClick={() => update(user.uid)}
                                                    type="submit" id="update" variant="success">
                                                        Confirm 
                                                    </Button>
                                                </Col>
                                                <Col>
                                                    <Button className="button-submit-admin2" onClick={() => {
                                                        let tempArray = [...ButtonArray];
                                                        tempArray[i] = false
                                                        setButtonArray(tempArray)
                                                    }}
                                                    type="submit" id="update" variant="danger">
                                                        Cancel 
                                                    </Button>
                                                </Col>
                                            </Row>
                                        }
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
                                        {ButtonArray[i] === false ? 
                                            <Col>
                                                <Button className="button-submit-admin2" onClick={() => {
                                                    let tempArray = [...ButtonArray];
                                                    tempArray.fill(false)
                                                    tempArray[i] = true 
                                                    setButtonArray(tempArray)
                                                }}
                                                type="submit" id="update" variant="success">
                                                    Use 1 
                                                </Button>
                                            </Col>
                                        :
                                            <Row className="confirm-buttons-admin">
                                                <Col>
                                                    <Button className="button-submit-admin2" onClick={() => update(user.uid)}
                                                    type="submit" id="update" variant="success">
                                                        Confirm 
                                                    </Button>
                                                </Col>
                                                <Col>
                                                    <Button className="button-submit-admin2" onClick={() => {
                                                        let tempArray = [...ButtonArray];
                                                        tempArray[i] = false
                                                        setButtonArray(tempArray)
                                                    }}
                                                    type="submit" id="update" variant="danger">
                                                        Cancel 
                                                    </Button>
                                                </Col>
                                            </Row>
                                        }
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
                                        {user.freegames + " Free Game(s)"}
                                    </Col>
                                    {ButtonArray[i] === false ? 
                                        <Col>
                                            <Button className="button-submit-admin2" onClick={() => {
                                                let tempArray = [...ButtonArray];
                                                tempArray.fill(false)
                                                tempArray[i] = true 
                                                setButtonArray(tempArray)
                                            }}
                                            type="submit" id="update" variant="success">
                                                Use 1 
                                            </Button>
                                        </Col>
                                    :
                                        <Row className="confirm-buttons-admin">
                                            <Col>
                                                <Button className="button-submit-admin2" onClick={() => update(user.uid)}
                                                type="submit" id="update" variant="success">
                                                    Confirm 
                                                </Button>
                                            </Col>
                                            <Col>
                                                <Button className="button-submit-admin2" onClick={() => {
                                                    let tempArray = [...ButtonArray];
                                                    tempArray[i] = false
                                                    setButtonArray(tempArray)
                                                }}
                                                type="submit" id="update" variant="danger">
                                                    Cancel 
                                                </Button>
                                            </Col>
                                        </Row>
                                    }
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
                                    {ButtonArray[i] === false ? 
                                        <Col>
                                            <Button className="button-submit-admin2" onClick={() => {
                                                let tempArray = [...ButtonArray];
                                                tempArray.fill(false)
                                                tempArray[i] = true 
                                                setButtonArray(tempArray)
                                            }}
                                            type="submit" id="update" variant="success">
                                                Use 1 
                                            </Button>
                                        </Col>
                                    :
                                        <Row className="confirm-buttons-admin">
                                            <Col>
                                                <Button className="button-submit-admin2" onClick={() => update(user.uid)}
                                                type="submit" id="update" variant="success">
                                                    Confirm 
                                                </Button>
                                            </Col>
                                            <Col>
                                                <Button className="button-submit-admin2" onClick={() => {
                                                    let tempArray = [...ButtonArray];
                                                    tempArray[i] = false
                                                    setButtonArray(tempArray)
                                                }}
                                                type="submit" id="update" variant="danger">
                                                    Cancel 
                                                </Button>
                                            </Col>
                                        </Row>
                                    }
                                </Row>
                            </Col>
                        </Row>
            ))}
        </Card.Body>
    )
};

const condition = authUser =>
    authUser && !!authUser.roles[ROLES.ADMIN];

export default compose(
    withAuthorization(condition),
    withFirebase,
)(FreeGames);