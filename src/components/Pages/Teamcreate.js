import React, { Component } from 'react';

import { Container, Row, Col, Form, Button } from 'react-bootstrap/';

import { AuthUserContext, withAuthorization } from '../session';

import logo from '../../assets/logo.png';

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
            error: null,
            imgError: true,
        };
    }
    imgRef = React.createRef();

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
                    this.setState({ page: !page, error: "" })
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
        this.setState({ page: !this.state.page, error: "" })
    }


    //create team
    createTeam(e) {
        e.preventDefault();

        const { image, uploaded, previous, teamname, imgError, error } = this.state;

        if (image !== null && imgError === false && error === null) {

            var t_name = teamname.toString().toLowerCase();

            //Handling the case if a user had previously uploaded an image
            if (uploaded === true) {
                this.props.firebase.teamsPictures(`${previous}.png`).delete().then(function () {
                    // File deleted successfully
                }).catch(function (error) {
                    // Uh-oh, an error occurred!
                });
            }
            //Create message to show they were removed and reset input box
            var createTeam = this.props.firebase.createTeam();
            createTeam({
                teamname: this.state.teamname, description: this.state.description
            }).then((result) => {
                // Read result of the Cloud Function.
                var update = result.data.message;
                if (update === "Complete") {
                    //If team was created without issue set completion to true
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
                                previous: t_name,
                                complete: true
                            }, function () {
                                window.location.href = "/teams";
                            })
                        })
                }
            })
        }
        else {
            this.setState({ error: "You must upload an image first." })
        }
    }

    handleChange = e => {
        if (e.target.files[0]) {
            const image = e.target.files[0];
            const url = URL.createObjectURL(e.target.files[0])
            this.setState({ image, url })
        }
    }

    // Checks dimensions of uploaded image
    checkDimensions = () => {
        // Width needs to be 654, height needs to be 192
        var height = this.imgRef.current.naturalHeight
        var width = this.imgRef.current.naturalWidth
        if (width === 654 && height === 192) {
            // Good to go
            this.setState({ imgError: false, error: null })
        }
        else {
            // Image is wrong
            this.setState({
                error: "Wrong dimensions on image, please upload 654x192.",
                imgError: true,
            })
        }
    }

    onChange = event => {
        this.setState({ teamname: event.target.value });
    };

    onChangeDesc = event => {
        this.setState({ description: event.target.value });
    };

    render() {
        const { description, page, teamname, error, imgError } = this.state;


        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div className="background-static-all">
                        {authUser.team !== '' ?
                            <Container className="notice-text-container">
                                <Row className="row-success-rp">
                                    <Col className="col-rp">
                                        <Row className="row-notice">
                                            <h2 className="page-header">Team Create Error:</h2>
                                        </Row>
                                        <Row className="row-notice">
                                            <p className="notice-text">You already have a team, you must quit your team first.</p>
                                        </Row>
                                        <Row className="row-notice">
                                            <img src={logo} alt="US Airsoft logo" className="small-logo-home"/>
                                        </Row>
                                    </Col>
                                </Row>
                            </Container> 
                            : (page ?
                                <Container>
                                    <h2 className="header-teamc">Create your team!</h2>
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
                                        <img className="team-icon-individual" ref={this.imgRef}
                                            src={this.state.url || alticon} alt=""
                                            onLoad={() => this.checkDimensions()} />
                                    </div>
                                    <Row>
                                        <Col md={6}>
                                            <p className="notice-text-settings"><b>NOTE: </b>Images can only be MAX 5mb </p>
                                            <p className="notice-text-settings">and need to be width 654px by height 192px.</p>
                                            <div className="file-field input-field img-input-teamc">
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
                                                disabled={imgError && !error}>
                                                Submit
                                            </Button>
                                        </Col>
                                    </Row>
                                    <p className="error-team-create">{this.state.error}</p>
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