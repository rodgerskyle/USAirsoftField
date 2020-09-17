import React, { Component } from 'react';

import { Container, Row, Col, Form, Button } from 'react-bootstrap/';

import { AuthUserContext, withAuthorization } from '../session';

import { withFirebase } from '../Firebase';

import alticon from '../../assets/team-img-placeholder.png';

import './Profile.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';


class TeamCreate extends Component {
    constructor(props) {
        super(props);

        this.onChange = this.onChange.bind(this);
        this.nextPage = this.nextPage.bind(this);

        this.state = {
            authUser: JSON.parse(localStorage.getItem('authUser')),
            teamObject: '',
            teamicon: '',
            teamname: "",
            description: '',
            progress: 0,
            image: null,
            url: '',
            uploaded: false,
            complete: false,
            previous: '',
            page: true,
            error: '',
        };
    }

    componentDidMount() {
    }

    componentWillUnmount() {
        if (this.state.complete === false) {
            if (this.state.uploaded === true) {
                this.props.firebase.teamsPictures(`${this.state.previous}.png`).delete().then(function () {
                    // File deleted successfully
                }).catch(function (error) {
                    // Uh-oh, an error occurred!
                });
            }
        }
    }

    //Continue to next page assuming all validators are checked
    nextPage(e) {
        const { page } = this.state;
        e.preventDefault();
        if (this.state.teamname !== "") {
            this.props.firebase.team(this.state.teamname.toString().toLowerCase()).ref.once("value", (data) => {
                //Check for existance
                if (data.val() === null) {
                    this.setState({ page: !page })
                }
                else {
                    this.setState({ error: "Team name already exists! Please enter another name." })
                }
            });
        }
        else {
            this.setState({ error: "Team name cannot be empty!" })
        }
    }

    previousPage(e) {
        e.preventDefault();
        this.setState({ page: !this.state.page })
    }


    //create team
    createTeam(e) {
        e.preventDefault();

        const { image, uploaded, previous, teamname } = this.state;

        if (image !== null) {

            var t_name = teamname.toString().toLowerCase();

            //Handling the case if a user had previously uploaded an image
            if (uploaded === true) {
                this.props.firebase.teamsPictures(`${previous}.png`).delete().then(function () {
                    // File deleted successfully
                }).catch(function (error) {
                    // Uh-oh, an error occurred!
                });
            }

            const uploadTask = this.props.firebase.teamsPictures(`${t_name}.png`).put(image);
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
                        .teamsPictures(`${t_name}.png`)
                        .getDownloadURL()
                        .then(url => {
                            this.setState({ url });
                        });
                    this.setState({
                        uploaded: true,
                        previous: t_name
                    }, function () {
                        //Create message to show they were removed and reset input box
                        var createTeam = this.props.firebase.createTeam();
                        createTeam({
                            teamname: this.state.teamname, description: this.state.description
                        }).then((result) => {
                            // Read result of the Cloud Function.
                            var update = result.data.message;
                            if (update === "Complete") {
                                //If team was created without issue set completion to true
                                this.setState({ complete: true }, () => {
                                    window.location.href = "/teams";
                                })
                            }
                        });
                    })
                }
            );
        }
        else {
            this.setState({ error: "You must upload an image first." })
        }
    }

    handleChange = e => {
        if (e.target.files[0]) {
            const image = e.target.files[0];
            const url = URL.createObjectURL(e.target.files[0])
            this.setState({image, url })
        }
    }

    onChange = event => {
        this.setState({ teamname: event.target.value });
    };

    onChangeDesc = event => {
        this.setState({ description: event.target.value });
    };

    render() {
        const { description, page, teamname } = this.state;


        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div className="background-static-all">
                        {authUser.team !== '' ?
                            <p className="team-manage-blank">You already have a team, you must quit your team first.</p>
                            : (page ?
                                <Container>
                                    <Form className="team-manage-text" onSubmit={(e) => this.nextPage(e)}>
                                        <Form.Group controlId="exampleForm.ControlInput1">
                                            <Form.Label>Team Name:</Form.Label>
                                            <Form.Control
                                                type="name"
                                                placeholder="ex: Bandits"
                                                value={teamname}
                                                onChange={(e) => {
                                                    this.onChange(e);
                                                }}
                                            />
                                        </Form.Group>
                                        <Form.Group controlId="exampleForm.ControlTextarea1">
                                            <Form.Label>Add Description Here:</Form.Label>
                                            <Form.Control
                                                as="textarea" rows="3"
                                                placeholder="Tell us about your team!"
                                                value={description}
                                                onChange={(e) => {
                                                    this.onChangeDesc(e);
                                                }}
                                            />
                                            <Button className="next-button" variant="outline-secondary" type="submit"
                                            >
                                                Next
                                        </Button>
                                        </Form.Group>
                                    </Form>
                                    <Row>
                                        <Col>
                                            <p className="error-team-create">{this.state.error}</p>
                                        </Col>
                                    </Row>
                                </Container>
                                :
                                <Container>
                                    <p className="team-upload-text">Team Image Upload:</p>
                                    <div className="team-single-img">
                                        <img className="team-icon-individual" src={this.state.url || alticon} alt="" />
                                    </div>
                                    <Row>
                                        <Col md={6}>
                                            <div className="file-field input-field">
                                                <div className="btn team-upload">
                                                    <span>File</span>
                                                    <input type="file" onChange={this.handleChange} />
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col md={3}>
                                            <progress value={this.state.progress} max="100" className="progress" />
                                        </Col>
                                    </Row>
                                    <Row >
                                        <Col md={1}>
                                            <Button className="previous-button" variant="outline-secondary" onClick={((e) => this.previousPage(e))}
                                            >
                                                Previous
                                            </Button>
                                        </Col>
                                        <Col>
                                            <Button className="submit-button" variant="outline-success" onClick={((e) => this.createTeam(e))}
                                            >
                                                Submit
                                            </Button>
                                        </Col>
                                    </Row>
                                    <Row>{this.state.error}</Row>
                                </Container>
                            )
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