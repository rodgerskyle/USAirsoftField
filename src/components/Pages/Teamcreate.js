import React, { Component } from 'react';

import { Container, Row, Col, Form, Button } from 'react-bootstrap/';

import { Typeahead } from 'react-bootstrap-typeahead';

import { AuthUserContext, withAuthorization } from '../session';

import { withFirebase } from '../Firebase';

import alticon from '../../assets/team-img-placeholder.png';

import './Profile.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';


class TeamCreate extends Component {
    constructor(props) {
        super(props);

        this.onChange = this.onChange.bind(this);

        this.state = {
            authUser: JSON.parse(localStorage.getItem('authUser')),
            teamObject: '',
            teamicon: '',
            teamname: '',
            description: '',
            progress: 0,
            image: null,
            url: '',
            uploaded: false,
        };
    }

    componentDidMount() {
    }

    componentWillUnmount() {
    }


    //create team
    createTeam(e) {
        e.preventDefault();
        var members = [];
        //Create message to show they were removed and reset input box
        this.props.firebase.team(this.state.teambox.toLowerCase()).set({
            members
        })
    }

    handleUpload = (teamname) => {
        const { image } = this.state;
        const uploadTask = this.props.firebase.teamsPictures(`${teamname}.png`).put(image);
        uploadTask.on(
            "state_changed",
            snapshot => {
                // progress function ...
                const progress = Math.round(
                    (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                );
                this.setState({ progress });
            },
            error => {
                // Error function ...
                console.log(error);
            },
            () => {
                // complete function ...
                this.props.firebase
                    .teamsPictures(`${teamname}.png`)
                    .getDownloadURL()
                    .then(url => {
                        this.setState({ url });
                    });
                this.setState({ uploaded: true})
            }
        );
    };

    handleChange = e => {
        if (e.target.files[0]) {
            const image = e.target.files[0];
            this.setState(() => ({ image }));
        }
    };

    onChange = event => {
        this.setState({ [event.target.name]: event.target.value });
    };

    render() {
        const { addbox, removebox, description, members, picture } = this.state;


        const isInvalid = this.state.image === null || this.state.teamname === '';
        
        const canSubmit = this.state.uploaded === false;

        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div className="staticBG">
                        {authUser.team !== '' ?
                            <p className="team-manage-blank">You already have a team, you must quit your team first.</p>
                            :
                            <Container>
                                <div className="team-single-img">
                                    <img className="team-icon-individual" src={this.state.url || alticon} alt="" />
                                </div>
                                <Row>
                                        <div className="file-field input-field">
                                            <div className="btn team-upload">
                                                <span>File</span>
                                                <input type="file" onChange={this.handleChange} />
                                            </div>
                                        </div>
                                </Row>
                                <Row>
                                    <Col md={3}>
                                        <progress value={this.state.progress} max="100" className="progress" />
                                    </Col>
                                    <Col>
                                        <Button className="upload-button" onClick={(() => this.handleUpload(this.state.teamname))}
                                            disabled={isInvalid}>
                                                Upload
                                        </Button>
                                    </Col>
                                </Row>
                                <Form className="team-manage-text" onSubmit={(e) => this.createTeam(e)}>
                                    <Form.Group controlId="exampleForm.ControlInput1">
                                        <Form.Label>Team Name:</Form.Label>
                                        <Form.Control 
                                        type="name" 
                                        placeholder="team name" 
                                        onChange={(teamname) => {
                                            this.setState({ teamname });
                                        }}
                                        />
                                    </Form.Group>
                                    <Form.Group controlId="exampleForm.ControlTextarea1">
                                        <Form.Label>Add Description Here:</Form.Label>
                                        <Form.Control as="textarea" rows="3" />
                                        <Button className="team-manage-button" variant="outline-success" type="submit" 
                                            disabled={ canSubmit }>
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

const condition = authUser => !!authUser;

export default withFirebase(withAuthorization(condition)(TeamCreate));