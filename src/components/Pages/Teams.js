import React, { Component } from 'react';
import { Table, Button } from 'react-bootstrap/';
import '../../App.css';

import { Container, Row, Col } from 'react-bootstrap/';
import './Profile.css';
import BootstrapSwitchButton from 'bootstrap-switch-button-react';

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

    //Get image function for profile image = uid
    getPicture(teamname) {
        this.props.firebase.teamsPictures(`${teamname}.png`).getDownloadURL().then((url) => {
            var temp = this.state.teamicon;
            temp.push(url);
            this.setState({ teamicon: temp })
        }).catch((error) => {
            // Handle any errors NOT DONE
            this.setState({ })
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
                loading: false,
            }, () => {
                for (var i=0; i<this.state.teams.length; i++) {
                    this.getPicture(this.state.teams[i].teamname);
                }
            });
        });
    }

    render() {
        return (
            <div className="pagePlaceholder">
                <h2>Teams</h2>
                <Container>
                    <Row>
                        <Col>
                        <Button variant="outline-success">
                        <p className="team-rows">Create Team</p>
                                <i className="fa fa-plus-square fa-2x text-white team-rows-icons"></i>
                        </Button>
                        </Col>
                        <Col>
                        <Button variant="outline-info">
                        <p className="team-rows">Join Team</p>
                                <i className="fa fa-users fa-2x text-white team-rows-icons"></i>
                        </Button>
                        </Col>
                        <Col>
                        <Button variant="outline-danger">
                        <p className="team-rows">Team Issues</p>
                                <i className="fa fa-exclamation-circle fa-2x text-white team-rows-icons"></i>
                        </Button>
                        </Col>
                    </Row>
                    <br></br>
                    {this.state.loading && <div>Loading ...</div>}
                    <TeamList teams={this.state.teams} teamicon={this.state.teamicon} />
                </Container>
            </div>
        );
    }
}



    const TeamList = ({ teams, teamicon }) => (
      <ul>
        {teams.map((team, i) => (
          <li key={team.teamname}>
            <img src={teamicon.length === teams.length ? teamicon[i]: null}></img>
            <span>
              <strong>{team.teamname}</strong>
            </span>
          </li>
        ))}
      </ul>
    );


export default withFirebase(Teams);