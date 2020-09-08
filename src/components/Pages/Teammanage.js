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
            checkBox: false,
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
                    description: typeof Object.description !== 'undefined' ? Object.description: '',
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

    onChangeCheck = (e) => {
        this.setState({ checkBox: !this.state.checkBox})
    }

    onChangeDescription = (e) => {
        this.setState({ description: e.target.value})
    }

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

    // For quitting the team assuming team has no players
    QuitTeam = (e) => {
        e.preventDefault();
        var quitTeam = this.props.firebase.quitTeam();
        quitTeam({team: this.state.authUser.team
        }).then(function(result) {
            console.log(result.data)
        }).catch(function(error) {
            console.log("error: " +error)
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
            // Get rid of promoted player off of member list and add self to member list first
            var members = this.state.members;
            let member = [this.state.authUser.name, this.state.authUser.uid];
            members.splice(index, 1);
            members.push(member)
            this.props.firebase.team(this.state.authUser.team.toLowerCase()).update({ members, leader })
        }
    }

    // For disbanding team
    DisbandTeam = (e) => {
        e.preventDefault();
        // Make sure team is empty first
        // Verify that user wants to disband team
        if (this.state.checkBox === true) {
            e.preventDefault();
            var disbandTeam = this.props.firebase.quitTeam();
            disbandTeam({team: this.state.authUser.team
            }).then(function(result) {
                console.log(result.data)
            }).catch(function(error) {
                console.log("error: " +error)
            });
        }
    }

    // Updating the team description
    UpdateDescription = (e) => {
        e.preventDefault();
        //update description 
        let description = this.state.description
        this.props.firebase.team(this.state.authUser.team.toLowerCase()).update(description)
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
                                        <Form.Control as="textarea" rows="3" value={this.state.description}
                                        onChange={(e) => this.onChangeDescription(e)}/>
                                        <Button className="team-manage-button" variant="outline-success" 
                                        type="button" onClick={(e) => this.UpdateDescription(e)}>
                                            Update
                                        </Button>
                                    </Form.Group>
                                </Form>
                                <Button variant="outline-danger" size="md" block 
                                type="button" onClick={(e) => this.DisbandTeam(e)}>
                                    Disband team
                                </Button>
                                <Form.Group controlId="formBasicCheckbox">
                                    <Form.Check checked={this.state.checkBox} 
                                    onChange={this.onChangeCheck}
                                    type="checkbox" className="team-manage-text"
                                    label="By checking this, you confirm to disband your team" />
                                </Form.Group>
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
