import React, { Component } from 'react';

import { Container, Row, Col } from 'react-bootstrap/';

import default_profile from '../../assets/default.png';

import { withFirebase } from '../Firebase';

import './Profile.css';

import rankimages from '../constants/rankimgs';

class ProfileLookup extends Component {
    constructor(props) {
        super(props);

        this.state = {
            images: rankimages,
            rank: '',
            rankindex: 0,
            profileicon: '',
            authUser: '',
        };
    }

    componentDidMount() {
        //Figure out rank logic here
        this.props.firebase.user(this.props.match.params.id).on('value', snapshot => {
            const userObject = snapshot.val();

            this.setState({
                authUser: userObject,
            }, function(){
                //After setstate, then grab points and profile
                this.getRank();
                this.getProfile(`${this.props.match.params.id}/profilepic`);
            } );
        });
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


    //Get image function for profile image = uid
    getProfile(uid) {
        this.props.firebase.pictures(`${uid}.png`).getDownloadURL().then((url) => {
            this.setState({ profileicon: url })
        }).catch((error) => {
            // Handle any errors
            this.setState({ profileicon: default_profile })
        })
    }


    render() {
        return (
                    <div className="account-page">
                        <Container>
                            <div className="team-single">
                                <Row>
                                    <div className="col-lg-4 col-md-5 xs-margin-30px-bottom">
                                        <div className="team-single-img">
                                            <img className="profile-pic" src={this.state.profileicon} alt="" />
                                        </div>
                                        <div className="bg-light-gray padding-30px-all md-padding-25px-all sm-padding-20px-all text-center description">
                                            <h4 className="margin-10px-bottom font-size24 md-font-size22 sm-font-size20 font-weight-600">{this.state.authUser.username}</h4>
                                            <img className="margin-10px-bottom font-size24 md-font-size22 sm-font-size20 font-weight-600" src={this.state.images.length !== 0 ? this.state.images[this.state.rankindex] : null}
                                                alt="Players rank" />
                                            <p className="sm-width-95 sm-margin-auto rank-title">Rank: {this.state.rank}</p>
                                        </div>
                                        <div className="bg-light-gray padding-30px-all md-padding-25px-all sm-padding-20px-all text-center description extra-box">
                                            <h2 className="margin-10px-bottom font-size24 md-font-size22 sm-font-size20 font-weight-600">Leaderboard Placement:</h2>
                                            <h5 className="timer count-title count-number" data-to="1700" data-speed="1500">Top: {this.state.authUser.points}</h5>
                                            <h5 className="timer count-title count-number" data-to="1700" data-speed="1500">Monthly: {this.state.authUser.points}</h5>
                                        </div>
                                    </div>

                                    <div className="col-lg-8 col-md-7 stats-desc">
                                        <div className="team-single-text padding-50px-left sm-no-padding-left">
                                            <p className="no-margin-bottom user-name">{this.state.authUser.name}</p>

                                            <Row className="text-center stat-box">
                                                <Col>
                                                    <div className="counter">
                                                        <i className="fa fa-trophy fa-2x text-green"></i>
                                                        <h2 className="timer count-title count-number" data-to="1700" data-speed="1500">{this.state.authUser.points}</h2>
                                                        <p className="count-text ">Points</p>
                                                    </div>
                                                </Col>
                                            </Row>

                                            <Row className="text-center stat-box">
                                                <Col>
                                                    <div className="win-box counter">
                                                        <i className="fa fa-check-circle fa-2x text-green"></i>
                                                        <h2 className="timer count-title count-number" data-to="100" data-speed="1500">{this.state.authUser.wins}</h2>
                                                        <p className="count-text ">Wins</p>
                                                    </div>
                                                </Col>
                                                <Col>
                                                    <div className="loss-box counter">
                                                        <i className="fa fa-times fa-2x text-green"></i>
                                                        <h2 className="timer count-title count-number" data-to="1700" data-speed="1500">{this.state.authUser.losses}</h2>
                                                        <p className="count-text ">Losses</p>
                                                    </div>
                                                </Col>
                                            </Row>

                                            <Row className="text-center stat-box">
                                                <Col>
                                                    <div className="counter">
                                                        <i className="fa fa-code fa-2x text-green"></i>
                                                        <h2 className="timer count-title count-number" data-to="100" data-speed="1500">{this.state.authUser.freegames}</h2>
                                                        <p className="count-text ">Free Games</p>
                                                    </div>
                                                </Col>
                                                <Col>
                                                    <div className="counter">
                                                        <i className="fa fa-users fa-2x text-green"></i>
                                                        <h2 className="timer count-title count-number" data-to="1700" data-speed="1500">{this.state.authUser.team !== "" ? this.state.authUser.team : "N/A"}</h2>
                                                        <p className="count-text ">Team</p>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </div>
                                    </div>
                                </Row>
                            </div>
                        </Container>
                    </div>
        )
    }
}

export default withFirebase(ProfileLookup);