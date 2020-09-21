import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import { Button, Form, Container, Card } from 'react-bootstrap/';

import * as ROLES from '../constants/roles';
 
class EnterLosses extends Component {
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
        this.setState({value: event.target.value});
    }

    componentWillUnmount() {
        this.props.firebase.users().off();
    }

    componentDidMount(){
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
            var losses = this.state.users[index].losses;
            var freegames = this.state.users[index].freegames;
            var currentmonth = this.state.users[index].currentmonth;
            if (((points+3) % 450) < (points % 450)) {
                freegames++;
            }
            points+=3;
            currentmonth+=3;
            losses+=1;
            this.props.firebase.user(uid).update({
                points, losses, freegames, currentmonth
            });
            var temp = this.state.statusBox;
            temp.push("User " + this.state.value + " was updated successfully.")
            this.setState({statusBox: temp})
        }
        else {
            var temp = this.state.statusBox;
            temp.push("User " + this.state.value + " was not found.");
            this.setState({statusBox: temp})
        }
        //End API call
        document.getElementById("usernameBox").focus();
        this.setState({value: ""})
    }

    render() {
        return (
            <div className="background-static-all">
                <h2 className="page-header">Admin - Enter Losses</h2>
                {!this.state.loading ?
                <Container>
                    <div className="form-box">
                        <Form id="formBox" onSubmit={this.updateUser}>
                            <Form.Group controlId="usernameBox">
                                <Form.Label>Username</Form.Label>
                                <Form.Control onChange={this.handleChange}
                                    value={this.state.value}
                                    className="form-input-admin"
                                    placeholder="Enter username to add points to" />
                                <Button className="button-submit-admin" type="submit" id="register" variant="outline-success">
                                    Submit
                                </Button>
                            </Form.Group>
                        </Form>
                    </div>
                        <Card className="status-card-admin">
                            <Card.Header>Status Box</Card.Header>
                            <StatusBox updates={this.state.statusBox}/>
                        </Card>
                    </Container>
                : <h2 className="pagePlaceholder">Loading...</h2>}
            </div>
        );
    }
}

const StatusBox = ({updates}) => (
    <Card.Body className="status-card-body-admin">
        {updates.map((item, i) => (
            i % 2 ? 
            <Card.Text key={i}>
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
    )(EnterLosses);