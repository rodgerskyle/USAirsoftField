
import React, { Component } from 'react';

import { Container, Row, Col, Form, Button } from 'react-bootstrap/';

import { Typeahead } from 'react-bootstrap-typeahead';

import { AuthUserContext, withAuthorization } from '../session';

import { withFirebase } from '../Firebase';

import ReactLoading from 'react-loading';

import './Profile.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';


class TeamJoin extends Component {
    constructor(props) {
        super(props);

        this.state = {
            authUser: JSON.parse(localStorage.getItem('authUser')),
            teamObject: '',
            teams: [],
            joinbox: [],
            statustext: '',
            loading: false,
            userObject: '',
        };
    }

    componentDidMount() {
        if (this.state.authUser.team !== null) {
            //Figure out rank logic here
            this.props.firebase.teams().on('value', snapshot => {
                const teamsObject = snapshot.val();
                const teamsList = Object.keys(teamsObject).map(key => ({
                    ...teamsObject[key],
                    teamname: key,
                }));
                let temp = [];
                for (var i=0; i<teamsList.length; i++) {
                    temp.push(teamsList[i].teamname)
                }
                this.setState({
                    teams: temp,
                    teamObject: teamsObject,
                })
            });
            // Check user list
            this.props.firebase.user(this.state.authUser.uid).once('value', snapshot => {
                const userObject = snapshot.val();
                this.setState({userObject: userObject});
            })
        }
    }

    componentWillUnmount() {
        this.props.firebase.teams().off();
    }

    // Call function to request to join team
    RequestTeam = (e) => {
        e.preventDefault();
        this.setState({loading: true})
        // Calling firebase function
        const requestTeam = this.props.firebase.requestTeam();
        requestTeam({team: this.state.joinbox[0], user: this.state.userObject
        }).then((result) => {
            //If complete finish loading
                if(result.data.message === "Complete") {
                    this.setState({loading: false, statustext: "Completed request"})
            }
        }).catch((error) =>{
            console.log("error: " +error)
            this.setState({loading: false})
            //Stop loading icon
        });
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
        const {joinbox} = this.state
        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div className="staticBG">
                        {authUser.team !== "" ?
                            <p className="team-manage-blank">You already have a team</p>
                            :
                            <Container>
                                <h2 className="page-header">Join Team</h2>
                                <Typeahead
                                    labelKey="teamjoin"
                                    id="team-join"
                                    onChange={(joinbox) => {
                                        this.setState({joinbox});
                                        }}
                                    options={this.state.teams}
                                    selected={this.state.joinbox}
                                />
                                {this.state.loading ? <Progress type="spin" color="white"/> : ""}
                                <p className="team-manage-text">{this.state.statustext}</p>
                                <Button className="team-manage-button" variant="outline-success" type="button"
                                onClick={(e) => this.RequestTeam(e)}>
                                    Request to join
                                </Button>
                            </Container>
                        }
                    </div>
                )
                }
            </AuthUserContext.Consumer>
        )
    }
}

const Progress = ({ type, color }) => (
    <ReactLoading type={type} color={color} height={'2%'} width={'2%'} />
);

const condition = authUser => !!authUser;

export default withFirebase(withAuthorization(condition)(TeamJoin));