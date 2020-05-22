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
            results:"Here is where results will appear",
            value: '',
        };
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(event) {
        this.setState({value: event.target.value});
    }

    componentDidMount(){
        document.getElementById("usernameBox").focus();
        document.addEventListener("keypress", 
        (tmp) => this.handleKeypress(tmp))
      }

    handleKeypress(event) {
        if (event.keyCode === 13) {
            document.getElementById("usernameBox").focus();
        }
    }

    updateUser = (event) => {
        event.preventDefault()
        //Make API CALL HERE
        var apiCall = process.env.REACT_APP_API_CALL_WIN + this.state.value;
        fetch(apiCall)
        .then((response) => {
            var x = response;
            console.log(x);
            //this.setState({ results: response},
            //)
            }
        )
        //console.log(apiCall)
        //End API call
        document.getElementById("usernameBox").focus();
        this.setState({value: ""})
    }

    render() {
        return (
            <div>
                <h1 className="pagePlaceholder">Admin - Enter Wins</h1>
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
                </div>
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