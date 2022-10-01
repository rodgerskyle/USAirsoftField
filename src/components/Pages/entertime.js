import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import { Button, Form, Container, Card, Row, Col, Breadcrumb, Spinner, ToggleButton } from 'react-bootstrap/';

import * as ROLES from '../constants/roles';
import { LinkContainer } from 'react-router-bootstrap';

import { v4 as uuid } from 'uuid';

import { Helmet } from 'react-helmet-async';

import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';

class EnterTime extends Component {
    constructor(props) {
        super(props);

        this.state = {
            value: '', //username
            remove: false,
            class: [],
            minutes: 0,
            seconds: 0,
            milliseconds: 0,
            curIndex: -1,
            loading: false,
            users: [],
            statusBox: [],
            error: null,
        };
        this.handleChange = this.handleChange.bind(this);
        this.handleChangeM = this.handleChangeM.bind(this);
        this.handleChangeS = this.handleChangeS.bind(this);
        this.handleChangeMS = this.handleChangeMS.bind(this);
        this.handleBoxChange = this.handleBoxChange.bind(this);
        this.handleClassChange = this.handleClassChange.bind(this);
    }
      
    handleChange(event) {
        this.setState({ value: event.target.value });
    }

    handleChangeM(event) {
        this.setState({ minutes: event.target.value });
    }

    handleChangeS(event) {
        this.setState({ seconds: event.target.value });
    }

    handleChangeMS(event) {
        this.setState({ milliseconds: event.target.value });
    }

    handleBoxChange() {
        this.setState({ remove: !this.state.remove });
    }

    handleClassChange(index) {
        var _class = this.state.class;
        var bool = !_class[index];
        this.setState({curIndex: index})

        for (let i=0; i<_class.length; i++) {
            _class[i] = false;
        }
        _class[index] = bool;
        this.setState({
            class: _class
        })
    }

    resetClass() {
        var _class = this.state.class;
        _class.fill(false)
        this.setState({class: _class})
    }

    // Returns class given index
    returnClass(index){
        if (index === 0) {
            return "Rifle Class";
        }
        else if (index === 1) {
            return "Pistol Class";
        }
        else {
            return "Open Class";
        }
    }

    componentWillUnmount() {
        this.props.firebase.users().off();
    }

    componentDidMount() {
        document.getElementById("usernameBox").focus();
        document.addEventListener("keypress",
            (tmp) => this.handleKeypress(tmp))
        this.setState({ loading: true });

        // Create class array
        // Rifle class, pistol class, open class
        let generated_class = [];
        generated_class[0] = false
        generated_class[1] = false
        generated_class[2] = false
        this.setState({ class: generated_class})

        this.props.firebase.users().on('value', snapshot => {
            const usersObject = snapshot.val();

            const usersList = Object.keys(usersObject).map(key => ({
                ...usersObject[key],
                uid: key,
            }));

            this.setState({
                users: this.remapArray(usersList),
            });
        });

        this.props.firebase.timedRun().on('value', snapshot => {
            const timedRunUsersObject = snapshot.val();
            
            if (timedRunUsersObject) {
                const timedRunUsersList = Object.keys(timedRunUsersObject).map(key => ({
                    ...timedRunUsersObject[key],
                    uid: key,
                }));
    
                this.setState({
                    timedRunUsers: this.remapArray(timedRunUsersList),
                    loading: false,
                });
            }
            else {
                this.setState({ loading: false})
            }
        });
    }

    remapArray(userArray) {
        let array = [];
        for (let i=0; i<userArray.length; i++) {
            let username = userArray[i].username.toLocaleLowerCase()
            array[username] = userArray[i];
        }
        return array;
    }

    handleKeypress(event) {
        if (event.keyCode === 13) {
            this.updateUser(event)
        }
    }
    
    addMemberTime(user, newTime) {
        const date = new Date().getFullYear() + "-" + new Date().getMonth() + "-" + new Date().getDate()
        const {curIndex} = this.state;
        const _class = this.returnClass(curIndex).replace(' ', "")
        // Check if user contains time object
        // Case 1 if it does not exist, create one
        if (typeof user['timedrun'] === 'undefined' || typeof user['timedrun'][_class] === 'undefined') {
            let timedRun = {};
            timedRun['bestTime'] = newTime
            timedRun['timestamp'] = date;
            this.props.firebase.userCourse(user.uid, _class).update(
                timedRun
            );
            return true
        }
        // Case 2, it does exist but compare times
        else {
            // New time is faster
            if (parseInt(user['timedrun'][_class]['bestTime']) > parseInt(newTime)) {
                let timedRun = {};
                timedRun['bestTime'] = newTime
                timedRun['timestamp'] = date;
                this.props.firebase.userCourse(user.uid, _class).update(
                    timedRun
                );
                return true
            }
            // Old time is faster
            else {
                return false;
            }
        }
    }

    addNonmemberTime(user, newTime) {
        const date = new Date().getFullYear() + "-" + new Date().getMonth() + "-" + new Date().getDate()
        const {curIndex} = this.state;
        const _class = this.returnClass(curIndex).replace(' ', "")
        // Check if user contains time object
        // Case 1 if it does not exist, create one
        if (typeof user['timedrun'] === 'undefined' || typeof user['timedrun'][_class] === 'undefined') {
            let timedRun = {};
            timedRun['bestTime'] = newTime
            timedRun['timestamp'] = date;
            this.props.firebase.timedRunUserCourse(user.uid, _class).update(
                timedRun
            );
            return true
        }
        // Case 2, it does exist but compare times
        else {
            // New time is faster
            if (parseInt(user['timedrun'][_class]['bestTime']) > parseInt(newTime)) {
                let timedRun = {};
                timedRun['bestTime'] = newTime
                timedRun['timestamp'] = date;
                this.props.firebase.timedRunUserCourse(user.uid, _class).update(
                    timedRun
                );
                return true
            }
            // Old time is faster
            else {
                return false;
            }
        }
    }

    removeMemberTime(user) {
        const {curIndex} = this.state;
        const _class = this.returnClass(curIndex).replace(' ', "")
        // Case 1 if it does not exist, create one
        if (typeof user['timedrun'] !== 'undefined' && typeof user['timedrun'][_class] !== 'undefined') {
            this.props.firebase.userCourse(user.uid, _class).remove();
            return true;
        }
        else {
            return false;
        }
    }

    removeNonmemberTime(user) {
        const {curIndex} = this.state;
        const _class = this.returnClass(curIndex).replace(' ', "")
        // Check if user contains time object
        // Case 1 if it exists, delete it
        if (typeof user['timedrun'] !== 'undefined' && typeof user['timedrun'][_class] !== 'undefined') {
            this.props.firebase.timedRunUserCourse(user.uid, _class).remove();
            return true;
        }
        // Case 2, it doesn't exist, return
        else {
            return false;
        }
    }

    /*
    *         Users -> ID -> timedRun -> timestamp (of bestTime)
    *                              -> bestTime 
    *
    * TimedRunUsers -> ID -> timedRun -> timestamp (of bestTime)
    *                              -> bestTime
    * 
    * 
    * 
    */

    removeUser = (event) => {
        event.preventDefault()
        const {value, loading, curIndex} = this.state;
        const _class = this.returnClass(curIndex).replace(' ', "")
        if (loading)
            return;
        
        if (value === "") {
            this.setState({
                error: "Please enter a name to submit a time for."
            })
            return;
        }

        const lc_value = value.toLocaleLowerCase()
        let temp;


        if (typeof this.state.users[lc_value] === "undefined") {
            // Check if entered in name exists in timedRunUsers
            // Case: exists
            var name = lc_value.replace(" ", "_");
            if (typeof this.state.timedRunUsers[name] !== "undefined") {
                if (this.removeNonmemberTime(this.state.timedRunUsers[name])) {
                    temp = this.state.statusBox;
                    temp.unshift("The time for nonmember " + lc_value + " was removed successfully.");
                    this.setState({statusBox: temp, value: ""})
                }
                else {
                    temp = this.state.statusBox;
                    temp.unshift("The class for nonmember " + lc_value + " was not found.");
                    this.setState({statusBox: temp, value: ""})
                }
            }
            else {
                temp = this.state.statusBox;
                temp.unshift("Nonmember " + lc_value + " was not found.");
                this.setState({statusBox: temp, value: ""})
            }
        }
        // Member case
        else {
            if (this.removeMemberTime(this.state.users[lc_value])) {
                temp = this.state.statusBox;
                temp.unshift(`The time for user ${lc_value} on ${_class} was removed successfully.`)
                this.setState({statusBox: temp})
            }
            else {
                temp = this.state.statusBox;
                temp.unshift(`User ${lc_value} does not have a time for ${_class}.`)
                this.setState({statusBox: temp})
            }
        }

        //End API call
        document.getElementById("usernameBox").focus();
        this.resetClass();
        this.setState({ value: "", remove: false, minutes: 0, seconds: 0, milliseconds: 0, curIndex: -1,  })
    }


    updateUser = (event) => {
        event.preventDefault()
        const date = new Date().getFullYear() + "-" + new Date().getMonth() + "-" + new Date().getDate()
        const {value, loading, minutes, seconds, milliseconds, curIndex} = this.state;
        if (loading)
            return;
        
        if (value === "") {
            this.setState({
                error: "Please enter a name to submit a time for."
            })
            return;
        }
        else if (curIndex === -1) {
            this.setState({
                error: "Please select a class before submitting."
            })
            return;
        }
        else if (minutes === 0 && seconds === 0 && milliseconds === 0) {
            this.setState({
                error: "Please enter a time before submitting."
            })
            return;
        }
        const lc_value = value.toLocaleLowerCase()

        // Calculate time
        let time = (minutes * 60000) + (seconds * 1000) + parseInt(milliseconds);

        let temp;

        // Nonmember case
        if (typeof this.state.users[lc_value] === "undefined") {
            // Check if entered in name exists in timedRunUsers
            // Case: exists
            var name = lc_value.replace(" ", "_");
            if (typeof this.state.timedRunUsers !== 'undefined' && typeof this.state.timedRunUsers[name] !== "undefined") {
                if (this.addNonmemberTime(this.state.timedRunUsers[name], time)) {
                    temp = this.state.statusBox;
                    temp.unshift("Nonmember " + lc_value + " was updated successfully.")
                    this.setState({statusBox: temp})
                }
                else {
                    temp = this.state.statusBox;
                    temp.unshift("Nonmember " + lc_value + " has a better time already.")
                    this.setState({statusBox: temp})
                }
            }
            // Case: doesnt exist
            else {
                let timedRun = {};
                let uid = uuid();
                timedRun['bestTime'] = time
                timedRun['timestamp'] = date;
                this.props.firebase.timedRunUser(uid).set({
                    name: value,
                    username: name,
                }, () => {
                    this.props.firebase.timedRunUserCourse(uid, this.returnClass(curIndex).replace(' ', "")).set(
                        timedRun
                    );
                })
                temp = this.state.statusBox;
                temp.unshift("Nonmember " + lc_value + " was updated successfully.");
                this.setState({statusBox: temp, value: ""})
            }
        }
        // Member case
        else {
            if (this.addMemberTime(this.state.users[lc_value], time)) {
                temp = this.state.statusBox;
                temp.unshift("User " + lc_value + " was updated successfully.")
                this.setState({statusBox: temp})
            }
            else {
                temp = this.state.statusBox;
                temp.unshift("User " + lc_value + " has a better time already.")
                this.setState({statusBox: temp})
            }
        }

        //End API call
        document.getElementById("usernameBox").focus();
        this.resetClass();
        this.setState({ value: "", remove: false, minutes: 0, seconds: 0, milliseconds: 0, curIndex: -1,  })
    }

    render() {
        return (
            <div className="background-static-all">
                <Helmet>
                    <title>US Airsoft Field: Enter Time</title>
                </Helmet>
                {!this.state.loading ?
                <Container>
                    <h2 className="admin-header">Enter Time</h2>
                    <Breadcrumb className="admin-breadcrumb">
                        <LinkContainer to="/admin">
                            <Breadcrumb.Item>Admin</Breadcrumb.Item>
                        </LinkContainer>
                        <Breadcrumb.Item active>Enter Time</Breadcrumb.Item>
                    </Breadcrumb>
                    <div className="admin-row-time">
                        <Form id="formBox">
                            <Row>
                                <Col>
                                    <Form.Group controlId="usernameBox">
                                        <Form.Label>Username</Form.Label>
                                        <Form.Control onChange={this.handleChange}
                                            value={this.state.value}
                                            autoFocus={true}
                                            autoComplete="off"
                                            placeholder={`Enter member username or name.`} />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row className="entertime-row-toggle-button">
                                {this.state.class.map((choice, i) => (
                                    <Col xs={4} className="col-center-middle" key={i}>
                                        <ToggleButton
                                            key={i}
                                            id={`radio-${i}`}
                                            type="radio"
                                            variant={choice ? 'outline-success' : 'outline-light'}
                                            name="radio"
                                            value={i}
                                            checked={choice}
                                            onChange={() => this.handleClassChange(i)}
                                        >
                                            <div className="entertime-toggle-button">
                                                {this.returnClass(i)}
                                            </div>
                                        </ToggleButton>
                                    </Col>
                                    ))
                                }
                            </Row>
                            {this.state.remove ? null :
                            <Row>
                                <Col>
                                    <Form.Group controlId="minutesBox">
                                        <Form.Label>Minutes</Form.Label>
                                        <Form.Control onChange={this.handleChangeM}
                                            value={this.state.minutes}
                                            autoComplete="off"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col>
                                    <Form.Group controlId="secondsBox">
                                        <Form.Label>Seconds</Form.Label>
                                        <Form.Control onChange={this.handleChangeS}
                                            value={this.state.seconds}
                                            autoComplete="off"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col>
                                    <Form.Group controlId="millisecondsBox">
                                        <Form.Label>Milliseconds</Form.Label>
                                        <Form.Control onChange={this.handleChangeMS}
                                            value={this.state.milliseconds}
                                            autoComplete="off"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>}
                            <Row className="entertime-removing-row">
                                <Button 
                                variant={this.state.remove ? "danger" : "secondary"}
                                size="lg"
                                onClick={() => this.handleBoxChange()}
                                >
                                    {this.state.remove ? `Removing` : `Remove Time`}
                                </Button>
                            </Row>
                        </Form>
                        <Row className="entertime-submitting-row">
                            <Button className="button-submit-admin" type="button" id="register" variant="success" 
                            size="lg"
                            onClick={(e) => {
                                if (this.state.remove)
                                    this.removeUser(e);
                                else 
                                    this.updateUser(e);
                            }}>
                                <div>
                                    {`Submit${this.state.remove ? ' Removal' : ''}`}
                                </div>
                            </Button>
                        </Row>
                    </div>
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
                <Snackbar open={this.state.error !== null} autoHideDuration={6000} onClose={() => this.setState({error: null})}>
                    <Alert onClose={() => this.setState({error: null})} severity="error">
                        {this.state.error}
                    </Alert>
                </Snackbar>
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
)(EnterTime);