import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import { Button, Form } from 'react-bootstrap/';

import * as ROLES from '../constants/roles';

require('dotenv').config();

class EnterWins extends Component {
    constructor(props) {
        super(props);

        this.state = {
            results: "Here is where results will appear",
            value: '',
            loading: false,
            users: [],
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
            document.getElementById("usernameBox").focus();
        }
    }

    updateUser = (event) => {
        event.preventDefault()
        //Make API CALL HERE
        //Find user by username
        var index = -1;
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
            var currentmonth = this.state.users[index].currentmonth;
            if (((points+10) % 450) < (points % 450)) {
                freegames++;
            }
            points+=10;
            currentmonth+=10;
            wins+=1;
            this.props.firebase.user(uid).update({
                points, wins, freegames, currentmonth
            });
            this.setState({results: "User " + this.state.value + " was updated successfully."});
        }
        else {
            this.setState({results: "User " + this.state.value + " was not found."});
        }
        //End API call
        document.getElementById("usernameBox").focus();
        this.setState({ value: "" })
    }

    render() {
        return (
            <div>
                <h1 className="pagePlaceholder">Admin - Enter Wins</h1>
                {!this.state.loading ?
                    <div className="form-box">
                        <Form id="formBox" onSubmit={this.updateUser}>
                            <Form.Group controlId="usernameBox">
                                <Form.Label>Username</Form.Label>
                                <Form.Control onChange={this.handleChange}
                                    value={this.state.value}
                                    placeholder="Enter username to add points to" />
                                <Form.Text id="userName" className="text-muted">
                                    {this.state.results}
                                </Form.Text>
                                <Button type="submit" id="register" variant="primary">
                                    Submit
                        </Button>
                            </Form.Group>
                        </Form>
                    </div> : <h2 className="pagePlaceholder">Loading...</h2>}
            </div>
        );
    }
}

const condition = authUser =>
    authUser && !!authUser.roles[ROLES.ADMIN];

export default compose(
    withAuthorization(condition),
    withFirebase,
)(EnterWins);