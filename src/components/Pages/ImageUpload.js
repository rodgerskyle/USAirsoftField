import React, { Component } from 'react';

import { AuthUserContext, withAuthorization } from '../session';

import { Button, Form, Row, Col, ProgressBar } from 'react-bootstrap/';

import { withFirebase } from '../Firebase';

class ImageUpload extends Component {
    constructor(props) {
        super(props);

        this.state = {
            image: null,
            url: "",
            authUser: JSON.parse(localStorage.getItem('authUser')),
            loading: true,
            user: "",
            progress: null,
            img_status: null,
        };
    }

    componentDidMount() {
        this.authSubscription = this.props.firebase.auth.onAuthStateChanged((user) => {
            if (this.state.authUser.profilepic)
                this.getProfile(`${user.uid}/profilepic`);
            else
                this.setState({ url: ""})
        });
    }

    componentWillUnmount() {
        this.authSubscription();
    }

    //Get image function for profile image = uid
    getProfile(uid) {
        this.props.firebase.pictures(`${uid}.png`).getDownloadURL().then((url) => {
            this.setState({ url })
        }).catch((error) => {
            // Handle any errors
            this.setState({ url: ""})
        })
    }

    handleChange = e => {
        if (e.target.files[0]) {
            const image = e.target.files[0];
            const url = URL.createObjectURL(e.target.files[0])
            this.setState(() => ({ image, url}));
        }
    };

    handleUpload = (uid) => {
        const { image } = this.state;
        const uploadTask = this.props.firebase.pictures(`${uid}/profilepic.png`).put(image);
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
                    .pictures(`/${uid}/profilepic.png`)
                    .getDownloadURL()
                    .then(url => {
                        var manage = this.props.firebase.manageProfile();
                        manage({choice: "profilepic"})
                        this.setState({ url }, function() {
                            setTimeout( () => {
                                this.setState({progress: null,
                                img_status: "Successfully Updated."}, () => {
                                    setTimeout(() => {
                                        this.setState({img_status: null})
                                    }, 5000)
                                })
                            }, 2000);
                        })
                    });
            }
        );
    };
    render() {
        const isInvalid = this.state.image === null;
        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <Col sm={5}>
                        <Row className="justify-content-row">
                            <img
                                src={this.state.url || "https://via.placeholder.com/350x250"}
                                alt="Uploaded Images"
                                height="250"
                                width="350"
                                className="profile-img-settings"
                            />
                        </Row>
                        {this.state.progress ? 
                        <Row className="row-loading-imgup">
                            <ProgressBar animated striped now={this.state.progress} label={`${this.state.progress}%`} />
                        </Row> : null}
                        <Row className="justify-content-row">
                            <p className="notice-text-settings text-align-center"><b>NOTE: </b>Images can only be MAX 5mb </p>
                        </Row>
                        <Row className="justify-content-row">
                            <p className="notice-text-settings text-align-center">and display on your profile like above.</p>
                        </Row>
                        <div className="file-field input-field">
                                <Form.File onChange={this.handleChange}
                                label="Change Picture" accept="image/*" custom data-browse="Upload"
                                className="imgUpload-input"/>
                        </div>

                        <Row className="justify-content-flex-end-row">
                            <Button
                                onClick={(() => this.handleUpload(authUser.uid))}
                                variant="outline-success"
                                className="imgUpload-submit"
                                disabled={isInvalid}
                            >
                                Submit
                            </Button>
                        </Row>
                        {this.state.img_status ? 
                        <Row className="row-loading-imgup">
                            <p className="p-status-imgup">{this.state.img_status}</p>
                        </Row> : null}
                    </Col>
                )}
            </AuthUserContext.Consumer>
        );
    }
}

const condition = authUser => !!authUser;

export default withFirebase(withAuthorization(condition)(ImageUpload));