import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization, AuthUserContext } from '../session';
import { compose } from 'recompose';

import { Button, Form, Container, Row, Col, Breadcrumb } from 'react-bootstrap/';

import default_profile from '../../assets/default.png';

import * as ROLES from '../constants/roles';
import { LinkContainer } from 'react-router-bootstrap';

class UserOptions extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: false,
            user: null,
            username: "",
            name: "",
            profileicon: null,
            wins: 0,
            losses: 0,
            points: 0,
            freegames: 0,
            profilepic: false,
            removeImg: false,
            super_status: null,
            status: null,
        };
        this.handleChange = this.handleChange.bind(this);
    }
      
    handleChange(event) {
        this.setState({ value: event.target.value });
    }

    componentDidMount() {
        //Figure out rank logic here
        this.props.firebase.user(this.props.match.params.id).on('value', snapshot => {
            const userObject = snapshot.val();

            this.setState({
                user: userObject,
                username: userObject.username,
                name: userObject.name,
                team: userObject.team.toUpperCase(),
                wins: userObject.wins,
                losses: userObject.losses,
                points: userObject.points,
                freegames: userObject.freegames,
                profilepic: userObject.profilepic,
            }, function () {
                //After setstate, then grab points and profile
                if (userObject.profilepic)
                    this.getProfile(`${this.props.match.params.id}/profilepic`);
                else 
                    this.setState({ profileicon: default_profile })
            });
        });
    }

    componentWillUnmount() {
        this.props.firebase.user(this.props.match.params.id).off();
    }

    //Get image function for profile image = uid
    getProfile(uid) {
        this.props.firebase.pictures(`${uid}.png`).getDownloadURL().then((url) => {
            this.setState({ profileicon: url })
        }).catch((error) => {
            // Handle any errors
            this.setState({ profileicon: default_profile })
        })
    }

    // Updates User's privilege level
    updatePrivilege = (choice) => {
      if (choice === "admin" || choice === "waiver" || choice === "clear" || choice === "check") {
        this.setState({status: null, error: null})
        let user = this.props.match.params.id

        // Update token for the firebase uid
        const upgrade = this.props.firebase.createPrivilegedUser();
        upgrade({uid: user, privilege: choice
        }).then((result) => {
            //If complete finish loading
            if (result) this.setState({super_status: result.data.status})
        }).catch((error) =>{
            this.setState({ul_error: "Error: " + error})
        });

        if (choice !== "check") {
          // Update user database role for admin/waiver/clearing
          this.props.firebase.user(user).once("value", object => {
              const roles = {};
              if (choice === "waiver")
                roles[ROLES.WAIVER] = ROLES.WAIVER;
              else if (choice === "admin")
                roles[ROLES.ADMIN] = ROLES.ADMIN;
              this.props.firebase.user(user).update({roles})
          })
        }
      }
    }

    // Reset settings to default
    resetOptions() {
        this.setState({
            username: this.state.user.username,
            name: this.state.user.name,
            team: this.state.user.team.toUpperCase(),
            wins: this.state.user.wins,
            losses: this.state.user.losses,
            points: this.state.user.points,
            freegames: this.state.user.freegames,
            profilepic: this.state.user.profilepic,
        }, function () {
            //After setstate, then grab points and profile
            if (this.state.user.profilepic)
                this.getProfile(`${this.props.match.params.id}/profilepic`);
            else 
                this.setState({ profileicon: default_profile })
        });
    }

    // Update changed items 
    updateUser() {
        const { username, name, team, profilepic } = this.state;
        let uid = this.props.match.params.id
        let points = this.state.wins*10 + this.state.losses*3 + 50
        let wins = parseInt(this.state.wins)
        let losses = parseInt(this.state.losses)
        let freegames = parseInt(this.state.freegames)
        this.props.firebase.user(uid).update({
            username, name, team, wins, losses, points, profilepic, freegames
        });
        this.setState({status: "Successfully updated " + this.state.name })
    }

    // Form box on change event
    onChange = event => {
        this.setState({ [event.target.name]: event.target.value });
    };

    render() {
        return (
            <AuthUserContext.Consumer>
            {authUser =>
                <div className="background-static-all">
                    {!this.state.loading ?
                    <Container>
                        <h2 className="admin-header">User Options</h2>
                        <Breadcrumb className="admin-breadcrumb">
                            <LinkContainer to="/admin">
                                <Breadcrumb.Item>Admin</Breadcrumb.Item>
                            </LinkContainer>
                            <Breadcrumb.Item active>User Options</Breadcrumb.Item>
                        </Breadcrumb>
                        <Row className="row-uo">
                            <Col md={4}>
                                <div className="team-single-img">
                                    <img className="profile-pic" src={this.state.profileicon} alt="" />
                                </div>
                                <Button variant="outline-danger" onClick={() => {
                                    this.setState({ profileicon: default_profile, profilepic: false })
                                }} disabled={!this.state.profilepic}>
                                    Remove
                                </Button>
                            </Col>
                            <Col>
                                <Row>
                                    <Col>
                                        <Form>
                                            <Form.Group controlId="form.name">
                                                <Form.Label>Name:</Form.Label>
                                                <Form.Control
                                                    type="name"
                                                    name="name"
                                                    value={this.state.name}
                                                    onChange={this.onChange}
                                                />
                                            </Form.Group>
                                        </Form>
                                    </Col>
                                    <Col>
                                        <Form>
                                            <Form.Group controlId="form.username">
                                                <Form.Label>Username:</Form.Label>
                                                <Form.Control
                                                    type="name"
                                                    name="username"
                                                    value={this.state.username}
                                                    onChange={this.onChange}
                                                />
                                            </Form.Group>
                                        </Form>
                                    </Col>
                                    <Col>
                                        <Form>
                                            <Form.Group controlId="form.freegames">
                                                <Form.Label>Free Games:</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="freegames"
                                                    value={this.state.freegames}
                                                    onChange={this.onChange}
                                                />
                                            </Form.Group>
                                        </Form>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col>
                                        <Form>
                                            <Form.Group controlId="form.wins">
                                                <Form.Label>Wins:</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="wins"
                                                    value={this.state.wins}
                                                    onChange={this.onChange}
                                                />
                                            </Form.Group>
                                        </Form>
                                    </Col>
                                    <Col>
                                        <Form>
                                            <Form.Group controlId="form.losses">
                                                <Form.Label>Losses:</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="losses"
                                                    value={this.state.losses}
                                                    onChange={this.onChange}
                                                />
                                            </Form.Group>
                                        </Form>
                                    </Col>
                                    <Col>
                                        <Form>
                                            <Form.Group controlId="form.points">
                                                <Form.Label>Points:</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="points"
                                                    value={this.state.wins*10 + this.state.losses*3 + 50}
                                                    disabled={true}
                                                />
                                            </Form.Group>
                                        </Form>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                        <Row className="row-buttons-uo">
                            <Button variant="outline-primary" onClick={() => this.resetOptions()}>
                                Reset 
                            </Button>
                            <Button variant="outline-info" className="button-update-uo"
                            onClick={() => this.updateUser()}>
                                Update
                            </Button>
                            {this.state.status ? 
                                <p className="status-uo-admin">{this.state.status}</p>
                            : null}
                        </Row>
                        {authUser && !!authUser.roles[ROLES.SUPER] ? <Row className="row-priv-buttons-uo">
                            <Col md="auto">
                                <Button className="button-options-style-admin"
                                type="button" id="update" variant="primary" onClick={() => {
                                this.updatePrivilege("admin")
                                }}>
                                    Upgrade to Admin 
                                </Button>
                            </Col>
                            <Col md="auto">
                                <Button className="button-options-style-admin" onClick={() => {
                                this.updatePrivilege("waiver")
                                }}
                                type="button" id="update" variant="warning">
                                    Upgrade to Waiver 
                                </Button>
                            </Col>
                            <Col md="auto">
                                <Button className="button-options-style-admin" onClick={() => {
                                this.updatePrivilege("clear")
                                }}
                                type="button" id="update" variant="danger">
                                    Clear Privilege
                                </Button>
                            </Col>
                            <Col md="auto">
                                <Button className="button-options-style-admin" onClick={() => {
                                this.updatePrivilege("check")
                                }}
                                type="button" id="update" variant="info">
                                <i className="fa fa-question fa-1x text-white"></i>
                                </Button>
                            </Col>
                            {this.state.super_status ? <Col className="status-col-uo">
                                <p className="super-status-uo-admin">{this.state.super_status}</p>
                            </Col> : null}
                        </Row> : null}
                    </Container>
                    : <h2 className="pagePlaceholder">Loading...</h2>}
                </div>
            }
            </AuthUserContext.Consumer>
        );
    }
}

const condition = authUser =>
    authUser && !!authUser.roles[ROLES.ADMIN];

export default compose(
    withAuthorization(condition),
    withFirebase,
)(UserOptions);