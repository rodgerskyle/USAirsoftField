import React, { Component } from 'react';

import { Container, Row, Col, Form, Button } from 'react-bootstrap/';

import { Typeahead } from 'react-bootstrap-typeahead';

import { AuthUserContext, withAuthorization } from '../session';

import { withFirebase } from '../Firebase';

import './Profile.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';


class TeamManage extends Component {
    constructor(props) {
        super(props);

        this.onChange = this.onChange.bind(this);

        this.state = {
            authUser: JSON.parse(localStorage.getItem('authUser')),
            teamObject: '',
            teamicon: '',
            addbox: [],
            removebox: [],
            description: '',
            members: '',
            requests: '',
            requestSelected: [],
            memberSelected: [],
            AcceptRequestState: this.AcceptRequest,
            DeclineRequestState: this.DeclineRequest,
            KickMemberState: this.KickMember,
            PromoteToLeaderState: this.PromoteToLeader,
            onChangeSelectionReqState: this.onChangeSelectionReq,
            onChangeSelectionMemState: this.onChangeSelectionMem,
        };
    }

    componentDidMount() {
        if (this.state.authUser.team !== null) {
            //Figure out rank logic here
            this.props.firebase.team(this.state.authUser.team.toLowerCase()).on('value', snapshot => {
                const Object = snapshot.val();

                this.setState({
                    teamObject: Object,
                    requests: typeof Object.requests !== 'undefined' ? Object.requests : '',
                    members: typeof Object.members !== 'undefined' ? Object.members: '',
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

    //Add member to team
    addMember(e) {
        e.preventDefault();
        console.log(this.state.addbox[0]);
        //Create message to show they were added and reset input box
        var requests = this.state.teamObject.requests;
        var user = this.state.addbox[0];
        user = "martinhernandez"
        var uid = "OzZdvadHPkcOgO5YEefjzJfLffb2";
        let member = [user, uid];
        requests.push(member);
        console.log(requests);
        this.props.firebase.team(this.state.authUser.team.toLowerCase()).update({ requests })
    }

    //Remove member from team
    removeMember(e) {
        e.preventDefault();
        console.log(this.state.removebox[0]);
        //Create message to show they were removed and reset input box
        var members = this.state.teamObject.members;
        var found = false;
        for (var i = 0; i < members.length; i++) {
            if (members[i][0] === this.state.removebox[0]) {
                found = true;
                delete members[i];
            }
        }
        if (found === false) {
            //This player isnt on team
        }
        console.log(members);
        console.log(this.state.requests)
        this.props.firebase.team(this.state.authUser.team.toLowerCase()).update({ members })
    }

    onChange = event => {
        this.setState({ [event.target.name]: event.target.value });
    };

    onChangeSelectionReq = (e) => {
        this.setState({ requestSelected: e.target.value });
    };

    onChangeSelectionMem = (e) => {
        this.setState({ memberSelected: e.target.value });
    };

    // For accepting requests to join the team
    AcceptRequest = (e) => {
        e.preventDefault();
        // Grabs index selected and grabbing user info
        var index = this.state.requestSelected;
        if (index !== "" || index !== null) {
            var requests = this.state.teamObject.requests;
            var members = this.state.teamObject.members;
            var user = members[index][0];
            var uid =  members[index][1];
            let member = [user, uid];

            // Get rid of person off the request list and add them to members
            var manageTeam = this.props.firebase.createTeam();
            manageTeam({option: "accept", user: uid
            }).then(function(result) {
                // Read result of the Cloud Function.
                var update = result.data.message;
                if (update == "Complete") {
                    //If team was updated without issue, continue with change
                    requests.splice(index, 1)
                    members.push(member);
                    this.props.firebase.team(this.state.authUser.team.toLowerCase()).update({ requests, members })
                }
            });
        }
    }

    // For declining requests to join the team
    DeclineRequest = (e) => {
        e.preventDefault();
        // Grabs index selected and grabbing user info
        var index = this.state.requestSelected;

        if (index !== "" || index !== null) {
            var requests = this.state.teamObject.requests;

            // Get rid of person off the request list
            requests.splice(index, 1)
            this.props.firebase.team(this.state.authUser.team.toLowerCase()).update({ requests })
        }
    }

    // For kicking people off the team
    KickMember = (e) => {
        e.preventDefault();
        // Grabs index selected and grabbing user info
        var index = this.state.memberSelected;
        if (index !== "" || index !== null) {
            var members = this.state.teamObject.members;


            // Need to call function get rid of them off the team on their profile
            var manageTeam = this.props.firebase.createTeam();
            manageTeam({option: "kick", user: members[index][1]
            }).then(function(result) {
                // Read result of the Cloud Function.
                var update = result.data.message;
                if (update == "Complete") {
                    //If team was updated without issue, continue with change
                    members.splice(index, 1)
                    this.props.firebase.team(this.state.authUser.team.toLowerCase()).update({ members })
                }
            });
        }
    }

    // For promoting member to leader
    PromoteToLeader = (e) => {
        e.preventDefault();
        // Grabs index selected and grabbing user info
        var index = this.state.memberSelected;
        if (index !== "" || index !== null) {
            var members = this.state.teamObject.members;

            // Change leader to member selected
            var leader = members[index][1];
            this.props.firebase.team(this.state.authUser.team.toLowerCase()).update({ leader })
        }
    }

    render() {
        const { addbox, removebox, description, members } = this.state;

        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div className="staticBG">
                        {authUser.team === "" ?
                            <p className="team-manage-blank">You do not have a team</p>
                            :
                            <Container>
                                <div className="team-single-img">
                                    <img className="team-icon-individual" src={this.state.teamicon} alt="" />
                                </div>
                                    <MembersList members={this.state.members} kick={this.state.KickMemberState}
                                    promote={this.state.PromoteToLeaderState} onChange={this.state.onChangeSelectionMemState}/>
                                    <RequestList requests={this.state.requests} decline={this.state.DeclineRequestState} 
                                    accept={this.state.AcceptRequestState} onChange={this.state.onChangeSelectionReqState}/>
                                <Form className="team-manage-text">
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

const MembersList = ({ members, promote, kick, onChange }) => (
    <Form className="team-manage-text">
        <Form.Group controlId="exampleForm.ControlSelect2">
            <Form.Label>Team Members:</Form.Label>
            <Form.Control as="select" multiple
            onChange={ (e) => onChange(e)}
            > 
                {members !== '' ? members.map((index, i) => (
                    <option value={i} key={i}>{index[0]}</option>
                )): ""}
            </Form.Control>
            <Button className="team-manage-button" variant="outline-success" type="button" onClick={(e) => promote(e)}>
                Promote to leader
            </Button>
            <Button className="team-manage-button-2" variant="outline-danger" type="button" onClick={(e) => kick(e)}>
                Kick
            </Button>
        </Form.Group>
    </Form>
);


const RequestList = ({ requests, accept, decline, onChange }) => (
    <Form className="team-manage-text">
        <Form.Group controlId="exampleForm.ControlSelect2">
            <Form.Label>Players wanting to join:</Form.Label>
            <Form.Control as="select" multiple
            onChange={ (e) => onChange(e)}
            >
                {requests !== '' ? requests.map((index, i) => (
                    <option value={i} key={i}>{index[0]}</option>
                )): ""}
            </Form.Control>
            <Button className="team-manage-button" variant="outline-success" type="button" onClick={(e) => accept(e)}>
                Accept Request
            </Button>
            <Button className="team-manage-button-2" variant="outline-danger" type="button" onClick={(e) => decline(e)}>
                Decline Request
            </Button>
        </Form.Group>
    </Form>
);

const condition = authUser => !!authUser;

export default withFirebase(withAuthorization(condition)(TeamManage));

/* OLD CODE

                                <Form className="team-manage-text" onSubmit={(e) => this.addMember(e)}>
                                    <Form.Group controlId="exampleForm.ControlInput1">
                                        <Form.Label>Add Team Member (Input their Username here):</Form.Label>
                                        <Typeahead
                                            labelKey="addbox"
                                            id="team-member-add"
                                            placeholder="ex: johnsmith"
                                            onChange={(addbox) => {
                                                this.setState({ addbox });
                                            }}
                                            options={members}
                                            selected={this.state.addbox}
                                        />
                                        <Button className="team-manage-button" variant="outline-success" type="submit">
                                            Add Member
                                    </Button>
                                    </Form.Group>
                                </Form>
                                <Form className="team-manage-text" onSubmit={(e) => this.removeMember(e)}>
                                    <Form.Group controlId="exampleForm.ControlInput1">
                                        <Form.Label>Remove Team Member (Input their Username here):</Form.Label>
                                        <Typeahead
                                            labelKey="removebox"
                                            id="team-member-remove"
                                            placeholder="ex: johnsmith"
                                            onChange={(removebox) => {
                                                this.setState({ removebox });
                                            }}
                                            options={members}
                                            selected={this.state.removebox}
                                        />
                                        <Button className="team-manage-button" variant="outline-danger" type="submit">
                                            Remove Member
                                        </Button>
                                    </Form.Group>
                                </Form>

                                <Form className="team-manage-text">
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
                                </Form>
*/