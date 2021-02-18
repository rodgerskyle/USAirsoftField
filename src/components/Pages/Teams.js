import React, { Component } from 'react';
import { Table, Button } from 'react-bootstrap/';
import '../../App.css';

import { Container, Row, Col, Spinner } from 'react-bootstrap/';
import './Profile.css';
import Td from '../constants/td';

import { Link } from 'react-router-dom';

import { withFirebase } from '../Firebase';

class Teams extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: false,
            teams: [],
            teamicon: [],
        };
    }

    //Get image function for team image = teamname
    getPicture(teamname) {
        this.props.firebase.teamsPictures(`${teamname}.png`).getDownloadURL().then((url) => {
            let temp = this.state.teamicon;
            temp[teamname.toString()] = url
            this.setState({ teamicon: temp })
        }).catch((error) => {
            // Handle any errors NOT DONE
            this.setState({})
        })
    }

    componentWillUnmount() {
        this.props.firebase.teams().off();
    }

    componentDidMount() {
        this.setState({ loading: true });

        this.props.firebase.teams().on('value', snapshot => {
            const teamObject = snapshot.val();

            const teamsList = Object.keys(teamObject).map(key => ({
                ...teamObject[key],
                teamname: key,
            }));

            this.setState({
                teams: teamsList,
            }, () => {
                for (var i = 0; i < this.state.teams.length; i++) {
                    this.getPicture(this.state.teams[i].teamname);
                }
                this.setState({loading: false})
            });
        });
    }

    render() {
        return (
            <div className="background-static-all">
                <h2 className="page-header">Teams</h2>
                <Container>
                    <Row>
                        <Col>
                            <Link to="/createteam">
                                <Button variant="success" className="button-create-teams">
                                    <p className="team-rows">Create Team</p>
                                    <i className="fa fa-plus-square fa-2x text-white team-rows-icons"></i>
                                </Button>
                            </Link>
                        </Col>
                        <Col className="text-center">
                            <Link to="/jointeam">
                                <Button variant="info">
                                    <p className="team-rows">Join Team</p>
                                    <i className="fa fa-users fa-2x text-white team-rows-icons"></i>
                                </Button>
                            </Link>
                        </Col>
                        <Col>
                            <Link to="/manageteam">
                                <Button variant="danger" className="button-manage-teams">
                                    <p className="team-rows">Manage Team</p>
                                    <i className="fa fa-exclamation-circle fa-2x text-white team-rows-icons"></i>
                                </Button>
                            </Link>
                        </Col>
                    </Row>
                    <br></br>
                    {this.state.loading ? 
                    <Row className="justify-content-row padding-5px"><Spinner animation="border" /></Row> : 
                    <TeamList teams={this.state.teams} teamicon={this.state.teamicon} /> }
                    <Row className="row-bottom"></Row>
                </Container>
            </div>
        );
    }
}



const TeamList = ({ teams, teamicon }) => (
    <Table className="table table-striped table-dark table-teams">
        <tbody>
            {teams.map((team, i) => (
                <tr key={team.teamname}>
                    <Td to={"/teams/" + team.teamname.toString()}>
                        <img className="team-pictures"
                            src={teamicon[team.teamname.toString()]} alt={"Team " + team.teamname}></img>
                    </Td>
                    <Td cl="team-name" to={"/teams/" + team.teamname} ct={"link-team-name"}>
                        <strong>{(team.teamname).toUpperCase()}</strong>
                    </Td>
                </tr>
            ))}
        </tbody>
    </Table>
);




export default withFirebase(Teams);