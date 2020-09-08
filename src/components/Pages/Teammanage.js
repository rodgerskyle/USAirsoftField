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
            requestError: '',
            memberSelected: [],
            memberError: '',
            AcceptRequestState: this.AcceptRequest,
            DeclineRequestState: this.DeclineRequest,
            KickMemberState: this.KickMember,
            QuitTeamState : this.QuitTeam,
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
        if (index !== "" && index !== null && typeof index !== 'undefined') {
            var requests = this.state.requests;
            var members = this.state.members !== '' ? this.state.members : [];
            var user = requests[index][0];
            var uid =  requests[index][1];
            let member = [user, uid];

            // Get rid of person off the request list and add them to members
            var acceptRequest = this.props.firebase.acceptRequest();
            acceptRequest({user: uid, team: this.state.authUser.team, new_member: member, member_index: index}).then( function(result) {
                //If team was updated without issue, continue with change
                console.log(result.error)
            }).catch(function(error){
                console.log("here?")
                this.setState({requestError: "Error: " + error.message})
                //this.setState({requestError: details})
                //Remove from request list if on team already too if that was the error message NEEDS WORK
                //requests.splice(index, 1)
                //this.props.firebase.team(this.state.authUser.team.toLowerCase()).update({ requests }) 
            });
        }
    }

    // For declining requests to join the team
    DeclineRequest = (e) => {
        e.preventDefault();
        // Grabs index selected and grabbing user info
        var index = this.state.requestSelected;

        if (index !== "" && index !== null && typeof index !== 'undefined') {
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
        if (index !== "" && index !== null && typeof index !== 'undefined') {
            var members = this.state.teamObject.members;
            var uid = members[index][1];


            // Need to call function get rid of them off the team on their profile
            var kickMember = this.props.firebase.kickMember();
            kickMember({team: this.state.authUser.team, user: uid, member_index: index
            }).then(function(result) {
                // Read result of the Cloud Function.
                //var update = result.data.message;
                console.log(result.data)
                //if (update === "Complete") {
                    //If team was updated without issue, continue with change
                    //members.splice(index, 1)
                    //this.props.firebase.team(this.state.authUser.team.toLowerCase()).update({ members })
                //}
            }).catch(function(error) {
                console.log("error: " +error)
            });
        }
    }

    QuitTeam = (e) => {
        e.preventDefault();
        var manageTeam = this.props.firebase.manageTeam();
        manageTeam({option: "quit", user: '', team: ''
        }).then(function(result) {
            // Read result of the Cloud Function.
            var update = result.data.message;
            if (update === "Complete") {
                //If team was updated without issue, you are off the team
            }
            else {
                this.setState({memberError: "You cannot be leader to quit the team."})
            }
        });
    }

    // For promoting member to leader
    PromoteToLeader = (e) => {
        e.preventDefault();
        // Grabs index selected and grabbing user info
        var index = this.state.memberSelected;
        if (index !== "" && index !== null && typeof index !== 'undefined') {
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
                                    promote={this.state.PromoteToLeaderState} onChange={this.state.onChangeSelectionMemState}
                                    quit={this.state.QuitTeamState} errortext={this.state.memberError}
                                    />
                                    <RequestList requests={this.state.requests} decline={this.state.DeclineRequestState} 
                                    accept={this.state.AcceptRequestState} onChange={this.state.onChangeSelectionReqState}
                                    errortext={this.state.requestError}
                                    />
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

const MembersList = ({ members, promote, kick, onChange, quit, errortext }) => (
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
            <Button className="team-manage-button-2" variant="outline-danger" type="submit" onClick={(e) => quit(e)}>
                Quit Team
            </Button>
        </Form.Group>
        <p>{errortext}</p>
    </Form>
);


const RequestList = ({ requests, accept, decline, onChange, errortext }) => (
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
        <p>{errortext}</p>
    </Form>
);

const condition = authUser => !!authUser;

export default withFirebase(withAuthorization(condition)(TeamManage));
