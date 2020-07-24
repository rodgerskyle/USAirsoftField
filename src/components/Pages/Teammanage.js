import React, { Component } from 'react';

import { Container, Row, Col, Form, Button } from 'react-bootstrap/';

import { AuthUserContext, withAuthorization } from '../session';

import { withFirebase } from '../Firebase';

import './Profile.css';


class TeamManage extends Component {
    constructor(props) {
        super(props);

        this.state = {
            authUser: JSON.parse(localStorage.getItem('authUser')),
            teamObject: '',
            teamicon: '',
        };
    }

    componentDidMount() {

        if (this.state.authUser.team !== null) {
            //Figure out rank logic here
            this.props.firebase.team(this.state.authUser.team.toLowerCase()).on('value', snapshot => {
                const Object = snapshot.val();

                this.setState({
                    teamObject: Object,
                }, function () {
                    //After setstate, then grab points and profile
                    this.getPicture(this.state.authUser.team.toLowerCase());
                });
            });
        }
    }

    componentWillUnmount() {
        if (this.state.authUser.team !== null)
            this.props.firebase.team(this.state.authUser.team.toLowerCase()).off();
    }

    //Get image function for team image = teamname
    getPicture(teamname) {
        this.props.firebase.teamsPictures(`${teamname}.png`).getDownloadURL().then((url) => {
            this.setState({ teamicon: url })
        }).catch((error) => {
            // Handle any errors NOT DONE
            this.setState({})
        })
    }

    render() {
        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div className="staticBG">
                        {authUser.team === null ?
                            <p className="team-manage-blank">You do not have a team</p>
                            :
                            <Container>
                                <div className="team-single-img">
                                    <img className="team-icon-individual" src={this.state.teamicon} alt="" />
                                </div>
                                <Form className="team-manage-text">
                                    <Form.Group controlId="exampleForm.ControlInput1">
                                        <Form.Label>Add Team Member (Input their Username here):</Form.Label>
                                        <Form.Control type="email" placeholder="ex: johnsmith" />
                                    <Button className="team-manage-button" variant="outline-success" type="submit">
                                        Add Member
                                    </Button>
                                    </Form.Group>
                                    <Form.Group controlId="exampleForm.ControlInput1">
                                        <Form.Label>Remove Team Member (Input their Username here):</Form.Label>
                                        <Form.Control type="email" placeholder="ex: johnsmith" />
                                    <Button className="team-manage-button" variant="outline-danger" type="submit">
                                        Remove Member
                                    </Button>
                                    </Form.Group>
                                <Form.Group controlId="exampleForm.ControlSelect2">
                                    <Form.Label>Players wanting to join:</Form.Label>
                                    <Form.Control as="select" multiple>
                                        <option>1</option>
                                        <option>2</option>
                                        <option>3</option>
                                        <option>4</option>
                                        <option>5</option>
                                    </Form.Control>
                                    <Button className="team-manage-button" variant="outline-success" type="submit">
                                        Accept Request
                                    </Button>
                                    <Button className="team-manage-button-2" variant="outline-danger" type="submit">
                                        Decline Request
                                    </Button>
                                </Form.Group>
                                <Form.Group controlId="exampleForm.ControlTextarea1">
                                    <Form.Label>Add Description Here:</Form.Label>
                                    <Form.Control as="textarea" rows="3" />
                                    <Button className="team-manage-button" variant="outline-success" type="submit">
                                       Submit 
                                    </Button>
                                </Form.Group>
                                </Form>
                            </Container>
                        }
                    </div>
        )
    }
            </AuthUserContext.Consumer>
        )
    }
}

const condition = authUser => !!authUser;

export default withFirebase(withAuthorization(condition)(TeamManage));