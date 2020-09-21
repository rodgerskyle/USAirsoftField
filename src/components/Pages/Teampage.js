import React, { Component } from 'react';

import { Container, Row, Col } from 'react-bootstrap/';

import { Link } from 'react-router-dom';

import { withFirebase } from '../Firebase';

import './Profile.css';

import rankimages from '../constants/rankimgs';

class Teampage extends Component {
    constructor(props) {
        super(props);

        this.state = {
            images: rankimages,
            rank: '',
            rankindex: 0,
            teamicon: '',
            teamObject: '',
            members: '',
            leader: '',
        };
    }

    componentDidMount() {
        //Figure out rank logic here
        this.props.firebase.team(this.props.match.params.id).on('value', snapshot => {
            const Object = snapshot.val();

            this.setState({
                teamObject: Object,
                members: typeof Object.members !== 'undefined' ? Object.members : '',
            }, function () {
                //After setstate, then grab points and profile
                this.getPicture(this.props.match.params.id);
                this.getUsers(this.props.match.params.id);
            });
        });
    }

    componentWillUnmount() {
        this.props.firebase.team(this.props.match.params.id).off();
        this.props.firebase.user(this.state.teamObject.leader).off();
        //For loop for team members
        var error = false;
        try { const temp = this.state.teamObject.members.length;} catch(e) {error = true;}
        if (error === false) {
            for (var i = 0; i < this.state.teamObject.members.length; i++) {
                this.props.firebase.user(this.state.teamObject.members[i]).off()
            }
        }
    }


    //Figuring out rank logic
    getRank() {
        var points = this.state.authUser.points;
        var tmp_rank = "";
        var index = 1;
        if (points < 125) {
            tmp_rank = "Private";
            index = 1;
        }
        else if (points < 225) {
            tmp_rank = "Private First Class";
            index = 2;
        }
        else if (points < 335) {
            tmp_rank = "Specialist";
            index = 3;
        }
        else if (points < 450) {
            tmp_rank = "Corporal";
            index = 4;
        }
        else if (points < 570) {
            tmp_rank = "Sergeant";
            index = 5;
        }
        else if (points < 690) {
            tmp_rank = "Staff Sergeant";
            index = 6;
        }
        else if (points < 820) {
            tmp_rank = "Sergeant First Class";
            index = 7;
        }
        else if (points < 960) {
            tmp_rank = "Master Sergeant";
            index = 8;
        }
        else if (points < 1110) {
            tmp_rank = "First Sergeant";
            index = 9;
        }
        else if (points < 1270) {
            tmp_rank = "Sergeant Major";
            index = 10;
        }
        else if (points < 1440) {
            tmp_rank = "Command Sergeant Major";
            index = 11;
        }
        else if (points < 1640) {
            tmp_rank = "Sergeant Major of the Army";
            index = 12;
        }
        else if (points < 1840) {
            tmp_rank = "Second Lieutenant";
            index = 13;
        }
        else if (points < 2090) {
            tmp_rank = "First Lieutenant";
            index = 14;
        }
        else if (points < 2340) {
            tmp_rank = "Captain";
            index = 15;
        }
        else if (points < 2615) {
            tmp_rank = "Major";
            index = 16;
        }
        else if (points < 2890) {
            tmp_rank = "Lieutenant Colonel";
            index = 17;
        }
        else if (points < 3190) {
            tmp_rank = "Colonel";
            index = 18;
        }
        else if (points < 3490) {
            tmp_rank = "Brigadier General";
            index = 19;
        }
        else if (points < 3790) {
            tmp_rank = "Major General";
            index = 20;
        }
        else if (points < 4115) {
            tmp_rank = "Lieutenant General";
            index = 21;
        }
        else if (points < 4500) {
            tmp_rank = "General";
            index = 22;
        }
        else {
            tmp_rank = "General of the Army";
            index = 23;
        }
        index--;
        this.setState({ rank: tmp_rank, rankindex: index })
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

    //Get users from team
    getUsers() {
        this.props.firebase.user(this.state.teamObject.leader).on('value', snapshot => {
            const userObject = snapshot.val();

            this.setState({
                leader: userObject.name,
            }
            );
        });
    }


    render() {
        return (
            <div className="background-static-all">
                <Container>
                    <div className="team-single">
                        <Row className="team-info">
                            <div>
                                <div className="team-single-img">
                                    <img className="team-icon-individual" src={this.state.teamicon} alt="" />
                                </div>
                                <Row className="text-center stat-box">
                                    <Col>
                                        <div className="counter">
                                            <i className="fa fa-users fa-2x text-black"></i>
                                            <h2 className="timer count-title count-number" data-to="100" data-speed="1500">{(this.props.match.params.id).toUpperCase()}</h2>
                                            <p className="count-text ">Team Name</p>
                                        </div>
                                    </Col>
                                    <Col>
                                        <div className="counter">
                                            <i className="fa fa-user-circle fa-2x"></i>
                                            <Link className="profilelink-tm" to={"/profilelookup/" + this.state.teamObject.leader}>
                                                <h2 className="timer count-title count-number" data-to="1700" data-speed="1500">{this.state.leader}</h2>
                                            </Link>
                                            <p className="count-text ">Team Leader</p>
                                        </div>
                                    </Col>
                                </Row>
                                <div className="bg-light-gray md-padding-25px-all sm-padding-20px-all text-center description extra-box team-members-box">
                                    <h2 className="margin-10px-bottom font-size24 md-font-size22 sm-font-size20 font-weight-600">Members:</h2>
                                </div>
                                { this.state.members !== '' ?
                                    <TeamUserlist users={this.state.members}/> : ""
                                }
                            </div>
                        </Row>
                    </div>
                </Container>
            </div>
        )
    }
}

    const TeamUserlist = ({ users }) => (
        <Col>
            {users.map(user => (
            <div className="counter team-member-list" key={user[0]}>
                <i className="fa fa-users fa-2x text-black"></i>
                <Link className="profilelink-tm" to={"/profilelookup/" + user[1]}>
                    <h2 className="timer count-title count-number" data-to="100" data-speed="1500">{user[0]}</h2>
                </Link>
                <p className="count-text ">Member</p>
            </div>
            ))}
        </Col>
    );

export default withFirebase(Teampage);