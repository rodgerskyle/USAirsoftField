import React, { Component } from 'react';

import { Container, Form, Button, Row, Col, Spinner } from 'react-bootstrap/';

import { AuthUserContext, withAuthorization } from '../session';

import { withFirebase } from '../Firebase';

import logo from '../../assets/logo.png';

import './Profile.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';

import ReactLoading from 'react-loading';


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
            requestError: null,
            memberSelected: [],
            memberError: null,
            descriptionError: null,
            checkBox: false,
            requestLoading: false,
            membersLoading: false,
            descriptionLoading: false,
            deleting: false,
            loading: true,
            disbandError: null,
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
        if (this.state.authUser.team !== null && this.state.deleting === false) {
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
            this.setState({ teamicon: url, loading: false })
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
        if (typeof index === 'string') {
            this.setState({requestLoading: true})
            var requests = this.state.requests;
            var user = requests[index][0];
            var uid =  requests[index][1];
            let member = [user, uid];

            // Get rid of person off the request list and add them to members
            var acceptRequest = this.props.firebase.acceptRequest();
            acceptRequest({user: uid, teamname: this.state.authUser.team.toLowerCase(),
                 new_member: member, member_index: index, team: this.state.teamObject
                }).then( (result) => {
                //If team was updated without issue, continue with change
                if (result.data.message === "Complete")
                    this.setState({ requestError: "Request Accepted.", requestLoading: false}, function() {
                        setTimeout( () => {
                            this.setState({requestError: null })
                        }, 5000);
                    })
            }).catch( (error) => {
                console.log(error)
                this.setState({requestError: "Error: " + error.message})
            });
        }
        else {
            this.setState({ requestError: "Please select a user."}, function() {
                setTimeout( () => {
                    this.setState({requestError: null })
                }, 5000);
            })
        }
    }

    // For declining requests to join the team
    DeclineRequest = (e) => {
        e.preventDefault();
        // Grabs index selected and grabbing user info
        var index = this.state.requestSelected;

        if (typeof index === 'string') {
            this.setState({requestLoading: true})
            var requests = this.state.teamObject.requests;

            // Get rid of person off the request list
            requests.splice(index, 1)
            this.props.firebase.team(this.state.authUser.team.toLowerCase()).update({ requests }).then(() => {
                this.setState({ requestError: "Request Declined.", requestLoading: false}, function() {
                    setTimeout( () => {
                        this.setState({requestError: null })
                    }, 5000);
                })
            })
        }
        else {
            this.setState({ requestError: "Please select a user."}, function() {
                setTimeout( () => {
                    this.setState({requestError: null })
                }, 5000);
            })
        }
    }

    // For kicking people off the team
    KickMember = (e) => {
        e.preventDefault();
        // Grabs index selected and grabbing user info
        var index = this.state.memberSelected;
        if (typeof index === 'string') {
            this.setState({memberLoading: true})
            var members = this.state.teamObject.members;
            var uid = members[index][1];

            // Need to call function get rid of them off the team on their profile
            var kickMember = this.props.firebase.kickMember();
            kickMember({teamname: this.state.authUser.team, 
                user: uid, member_index: index, team: this.state.teamObject
            }).then( (result) => {
                // Read result of the Cloud Function.
                //console.log(result.data)
                if (result.data.message === "Complete") {
                    this.setState({ memberError: "Kick was successful.", memberLoading: false}, function() {
                        setTimeout( () => {
                            this.setState({memberError: null })
                        }, 5000);
                    })
                }
            }).catch( (error) => {
                this.setState({memberError: "Error: " + error, memberLoading: false,})
            });
        }
        else {
            this.setState({ memberError: "Please select a user."}, function() {
                setTimeout( () => {
                    this.setState({memberError: null })
                }, 5000);
            })
        }
    }

    // For quitting the team assuming team has no players
    QuitTeam = (e) => {
        e.preventDefault();
        this.setState({memberLoading: true})
        var quitTeam = this.props.firebase.quitTeam();
        quitTeam({user: this.state.authUser
        }).then( (result) => {
            // Change cache to reflect change
            if (result.data.message === "Complete") {
                var tempUser = this.state.authUser;
                tempUser.team = "";
                localStorage.setItem('authUser', JSON.stringify(tempUser));
                window.location.href = "/teams";
            }
        }).catch( (error) => {
            console.log("error: " +error)
        });
    }

    // For promoting member to leader
    PromoteToLeader = (e) => {
        e.preventDefault();
        // Grabs index selected and grabbing user info
        var index = this.state.memberSelected;
        if (typeof index === 'string') {
            this.setState({memberLoading: true})
            var members = this.state.members;

            // Change leader to member selected
            var leader = members[index][1];
            // Get rid of promoted player off of member list and add self to member list first
            let member = [this.state.authUser.name, this.state.authUser.uid];
            members.splice(index, 1);
            members.push(member)
            this.props.firebase.team(this.state.authUser.team.toLowerCase()).update({ members, leader }).then(() => {
                this.setState({memberError: "Promotion successful.", memberLoading: false}, function() {
                    window.location.href = "/teams";
                })
            })
        }
    }

    // For disbanding team
    DisbandTeam = (e) => {
        e.preventDefault();
        // Make sure team is empty first
        // Verify that user wants to disband team
        if (this.state.checkBox === true && this.state.members.length === 0) {
            this.setState({deleting: true})
            //Pass in user object
            var disbandTeam = this.props.firebase.disbandTeam();
            disbandTeam({team: this.state.authUser.team, user: this.state.authUser
            }).then( (result) => {
                if (result.data.message === "Complete") {
                    // WIP on making sure cache is updated
                    var tempUser = this.state.authUser;
                    tempUser.team = "";
                    localStorage.setItem('authUser', JSON.stringify(tempUser));
                    window.location.href = "/teams";
                }
            }).catch( (error) => {
                console.log("error: " +error)
                this.setState({deleting: false})
            });
        }
        else {
            this.setState({ disbandError: "Please remove other teammates before disbanding."}, function() {
                setTimeout( () => {
                    this.setState({disbandError: null })
                }, 5000);
            })
        }
    }

    // Updating the team description
    UpdateDescription = (e) => {
        e.preventDefault();
        this.setState({descriptionLoading: true})
        //update description 
        let description = this.state.description
       
        if (description.length <= 400) {
            this.props.firebase.team(this.state.authUser.team.toLowerCase()).update({description}).then(() => {
                this.setState({ descriptionError: "Successful update.", descriptionLoading: false}, function() {
                    setTimeout( () => {
                        this.setState({descriptionError: null })
                    }, 5000);
                })
            }).catch((error) => {

            })
        } else {
            this.setState({ descriptionError: "Please use less than 400 characters for your description." }, function() {
                setTimeout( () => {
                    this.setState({descriptionError: null })
                }, 5000);
            })
        }
    }

    render() {
        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div className="background-static-all">
                        {this.state.loading ? 
                        <Row className="justify-content-row">
                            <Spinner animation="border" variant="light"/>
                        </Row> :
                        authUser.team === "" ?
                            <Container className="notice-text-container">
                                <Row className="row-success-rp">
                                    <Col className="col-rp">
                                        <Row className="row-notice">
                                            <h2 className="page-header">Team Manage Error:</h2>
                                        </Row>
                                        <Row className="row-notice">
                                            <p className="notice-text">You do not have a team to manage at this time.</p>
                                        </Row>
                                        <Row className="row-notice">
                                            <img src={logo} alt="US Airsoft logo" className="small-logo-home"/>
                                        </Row>
                                    </Col>
                                </Row>
                            </Container> 
                            :
                            this.state.teamObject.leader === authUser.uid ?
                            <Container>
                                <h2 className="page-header">Manage Team</h2>
                                <div className="team-single-img">
                                    <img className="team-icon-individual" src={this.state.teamicon} alt="" />
                                </div>
                                {!this.state.deleting ?
                                <Row className="justify-content-row">
                                    <Col md={7}>
                                        <MembersList members={this.state.members} kick={this.state.KickMemberState}
                                        promote={this.state.PromoteToLeaderState} onChange={this.state.onChangeSelectionMemState}
                                        quit={this.state.QuitTeamState} errortext={this.state.memberError}
                                        />
                                    </Col>
                                </Row>
                                : null }
                                {this.state.memberLoading ? <Progress type="spin" color="white"/> : null}
                                {!this.state.deleting ?
                                <Row className="justify-content-row">
                                    <Col md={7}>
                                        <RequestList requests={this.state.requests} decline={this.state.DeclineRequestState} 
                                        accept={this.state.AcceptRequestState} onChange={this.state.onChangeSelectionReqState}
                                        errortext={this.state.requestError}
                                        />
                                    </Col>
                                </Row>
                                : null}
                                {this.state.requestLoading ? <Progress type="spin" color="white"/> : null}
                                {!this.state.deleting ?
                                <Row className="justify-content-row">
                                    <Col md={7}>
                                        <Form className="team-manage-text">
                                            <Form.Group controlId="exampleForm.ControlTextarea1">
                                                <Form.Label>Add Description Here:</Form.Label>
                                                <Form.Control as="textarea" rows="8" value={this.state.description}
                                                onChange={(e) => this.onChangeDescription(e)}/>
                                                <Button className="team-manage-button" variant="success" 
                                                type="button" onClick={(e) => this.UpdateDescription(e)}>
                                                    Update
                                                </Button>
                                            </Form.Group>
                                        </Form>
                                    </Col>
                                </Row>
                                : null }
                                {this.state.descriptionError ? <p className="status-text-teammanage">{this.state.descriptionError}</p> : null}
                                {this.state.descriptionLoading ? <Progress type="spin" color="white"/> : null}
                                <Row className="justify-content-row">
                                    <Col md={7}>
                                        <Button variant="danger" size="md" block disabled={!this.state.checkBox}
                                        type="button" onClick={(e) => this.DisbandTeam(e)}>
                                            Disband team
                                        </Button>
                                        <Form.Group controlId="formBasicCheckbox">
                                            <Form.Check checked={this.state.checkBox} 
                                            onChange={this.onChangeCheck}
                                            type="checkbox" className="team-manage-text"
                                            label="By checking this box, you confirm to disband your team" />
                                        </Form.Group>
                                        {this.state.disbandError ? <p className="status-text-teammanage">{this.state.disbandError}</p> : null}
                                    </Col>
                                </Row>
                                {this.state.deleting ? <Progress type="spin" color="white"/> : null}
                            </Container> 
                            :
                            <Container>
                                <h2 className="page-header">Manage Team</h2>
                                <Row className="team-single-img">
                                    <img className="team-icon-individual" src={this.state.teamicon} alt="" />
                                </Row>
                                <Row className="justify-content-row">
                                    <Button className="team-manage-button-2" variant="danger" type="submit" onClick={(e) => this.QuitTeam(e)}>
                                        Quit Team
                                    </Button>
                                    {this.state.requestLoading ? <Progress type="spin" color="white"/> : null}
                                </Row>
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
        <Form.Group controlId="member-select">
            <Form.Label>Team Members:</Form.Label>
            <Form.Control as="select" multiple
            onChange={ (e) => onChange(e)}
            > 
                {members !== '' ? members.map((index, i) => (
                    <option value={i} key={i}>{index[0]}</option>
                )): ""}
            </Form.Control>
            <Button className="team-manage-button" variant="success" type="button" onClick={(e) => promote(e)}
            disabled={members?.length === 0}>
                Promote to leader
            </Button>
            <Button className="team-manage-button-2" variant="danger" type="button" onClick={(e) => kick(e)}
            disabled={members?.length === 0}>
                Kick
            </Button>
            <Button className="team-manage-button-2" variant="danger" type="submit" onClick={(e) => quit(e)}>
                Quit Team
            </Button>
        </Form.Group>
        {errortext ? <p className="status-text-teammanage">{errortext}</p> : null}
    </Form>
);


const RequestList = ({ requests, accept, decline, onChange, errortext }) => (
    <Form className="team-manage-text">
        <Form.Group controlId="request-select">
            <Form.Label>Players wanting to join:</Form.Label>
            <Form.Control as="select" multiple
            onChange={ (e) => onChange(e)}
            >
                {requests !== '' ? requests.map((index, i) => (
                    <option value={i} key={i}>{index[0]}</option>
                )): ""}
            </Form.Control>
            <Button className="team-manage-button" variant="success" type="button" onClick={(e) => accept(e)}
            disabled={requests?.length === 0}>
                Accept Request
            </Button>
            <Button className="team-manage-button-2" variant="danger" type="button" onClick={(e) => decline(e)}
            disabled={requests?.length === 0}>
                Decline Request
            </Button>
        </Form.Group>
        {errortext ? <p className="status-text-teammanage">{errortext}</p> : null}
    </Form>
);

const Progress = ({ type, color }) => (
    <ReactLoading type={type} color={color} height={'2%'} width={'2%'} />
);

const condition = authUser => !!authUser;

export default withFirebase(withAuthorization(condition)(TeamManage));
