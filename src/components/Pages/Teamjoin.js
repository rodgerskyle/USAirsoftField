
import React, { Component } from 'react';

import { Container, Button, Row, Col } from 'react-bootstrap/';

import { Typeahead } from 'react-bootstrap-typeahead';

import logo from '../../assets/logo.png';

import { AuthUserContext, withAuthorization } from '../session';

import { withFirebase } from '../Firebase';

import ReactLoading from 'react-loading';

import 'react-bootstrap-typeahead/css/Typeahead.css';

import { compose } from 'recompose';

import { Helmet } from 'react-helmet-async';

class TeamJoin extends Component {
    constructor(props) {
        super(props);

        this.state = {
            authUser: null,
            teamObject: '',
            teams: [],
            joinbox: [],
            statustext: '',
            loading: false,
        };
    }

    componentDidMount() {
        this.authSubscription = 
            this.props.firebase.onAuthUserListener((user) => {
                if (user) {
                    this.setState({authUser: user})
                    if (user.team !== null) {
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
                    }
            }
        }, () => {
            this.setState({authUser: null})
        })
    }

    componentWillUnmount() {
        this.props.firebase.teams().off();
        this.authSubscription()
    }

    // Call function to request to join team
    RequestTeam = (e) => {
        e.preventDefault();
        this.setState({loading: true})
        // Calling firebase function
        const requestTeam = this.props.firebase.requestTeam();
        requestTeam({team: this.state.joinbox[0], user: this.state.authUser
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
        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div className="background-static-all">
                        <Helmet>
                            <title>US Airsoft Field: Join Team</title>
                        </Helmet>
                        {authUser.team !== "" ?
                            <Container className="notice-text-container">
                                <Row className="row-success-rp">
                                    <Col className="col-rp">
                                        <Row className="row-notice">
                                            <h2 className="page-header">Team Join Error:</h2>
                                        </Row>
                                        <Row className="row-notice">
                                            <p className="notice-text">You already have a team, please leave your team to join another.</p>
                                        </Row>
                                        <Row className="row-notice">
                                            <img src={logo} alt="US Airsoft logo" className="small-logo-home"/>
                                        </Row>
                                    </Col>
                                </Row>
                            </Container> 
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

export default compose(
    withFirebase,
    withAuthorization(condition),
    )(TeamJoin)