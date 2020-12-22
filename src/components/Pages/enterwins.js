import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import { Button, Form, Container, Card, Row, Col, Breadcrumb, Spinner } from 'react-bootstrap/';

import * as ROLES from '../constants/roles';
import { LinkContainer } from 'react-router-bootstrap';

class EnterWins extends Component {
    constructor(props) {
        super(props);

        this.state = {
            value: '',
            loading: false,
            users: [],
            statusBox: [],
        };
        this.handleChange = this.handleChange.bind(this);
    }
      
    handleChange(event) {
        this.setState({ value: event.target.value });
    }

    componentWillUnmount() {
        this.props.firebase.users().off();
    }

    componentDidMount() {
        document.getElementById("usernameBox").focus();
        document.addEventListener("keypress",
            (tmp) => this.handleKeypress(tmp))
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

    handleKeypress(event) {
        if (event.keyCode === 13) {
            this.updateUser(event)
        }
    }

    updateUser = (event) => {
        event.preventDefault()
        //Make API CALL HERE
        //Find user by username
        var index = -1;
        var temp;
        for (var i=0; i < this.state.users.length; i++) {
            if (this.state.users[i].username === this.state.value) {
                index = i;
                break;
            }
        }
        if (index !== -1) {
            var uid = this.state.users[index].uid;
            var points = this.state.users[index].points;
            var wins = this.state.users[index].wins;
            var freegames = this.state.users[index].freegames;
            var cmwins = this.state.users[index].cmwins;
            if (((points+10) % 450) < (points % 450)) {
                freegames++;
            }
            points+=10;
            cmwins+=1;
            wins+=1;
            this.props.firebase.user(uid).update({
                points, wins, freegames, cmwins
            });
            temp = this.state.statusBox;
            temp.unshift("User " + this.state.value + " was updated successfully.")
            this.setState({statusBox: temp})
        }
        else {
            temp = this.state.statusBox;
            temp.unshift("User " + this.state.value + " was not found.");
            this.setState({statusBox: temp})
        }
        //End API call
        document.getElementById("usernameBox").focus();
        this.setState({ value: "" })
    }

    render() {
        return (
            <div className="background-static-all">
                {!this.state.loading ?
                <Container>
                    <h2 className="admin-header">Enter Wins</h2>
                    <Breadcrumb className="admin-breadcrumb">
                        <LinkContainer to="/admin">
                            <Breadcrumb.Item>Admin</Breadcrumb.Item>
                        </LinkContainer>
                        <Breadcrumb.Item active>Enter Wins</Breadcrumb.Item>
                    </Breadcrumb>
                    <Row className="admin-row-points">
                        <Form id="formBox">
                            <Col>
                                <Form.Group controlId="usernameBox">
                                    <Form.Label>Username</Form.Label>
                                    <Form.Control onChange={this.handleChange}
                                        value={this.state.value}
                                        className="form-input-admin"
                                        placeholder="Enter username to add points to" />
                                    </Form.Group>
                                </Col>
                            </Form>
                            <Col className="admin-col-button-points">
                                <Button className="button-submit-admin" type="button" id="register" variant="outline-success" 
                                onClick={(e) => {
                                    this.updateUser(e);
                                }}>
                                    Submit
                                </Button>
                            </Col>
                    </Row>
                    <Row>
                        <Col>
                            <Card className="status-card-admin admin-cards">
                                <Card.Header>Status Box</Card.Header>
                                <StatusBox updates={this.state.statusBox}/>
                            </Card>
                        </Col>
                    </Row>
                    </Container>
                : <Row className="justify-content-row padding-5px"><Spinner animation="border" /></Row>}
            </div>
        );
    }
}

const StatusBox = ({updates}) => (
    <Card.Body className="status-card-body-admin">
        {updates.map((item, i) => (
            i % 2 ? 
            <Card.Text className="status-card-row-admin" key={i}>
                {"(" + i + ") " + item}
            </Card.Text>
                : 
            <Card.Text className="status-card-offrow-admin" key={i}>
                {"(" + i + ") " + item}
            </Card.Text>
            
        ))}
    </Card.Body>
);

const condition = authUser =>
    authUser && !!authUser.roles[ROLES.ADMIN];

export default compose(
    withAuthorization(condition),
    withFirebase,
)(EnterWins);