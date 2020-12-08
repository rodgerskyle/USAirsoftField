import React, { Component } from 'react';

import { AuthUserContext, withAuthorization } from '../session';

import { Button, Form, Row, Col } from 'react-bootstrap/';

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
                        this.setState({ url });
                        var manage = this.props.firebase.manageProfile();
                        manage({choice: "profilepic"})
                    });
            }
        );
    };
    render() {
        const isInvalid = this.state.image === null;
        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div>
                        <img
                            src={this.state.url || "https://via.placeholder.com/350x250"}
                            alt="Uploaded Images"
                            height="250"
                            width="350"
                            className="profile-img-settings"
                        />
                        <Row>
                            <Col className="notice-col-settings">
                                <p className="notice-text-settings"><b>NOTE: </b>Images can only be MAX 5mb </p>
                            </Col>
                        </Row>
                        <Row>
                            <Col className="notice-col-settings">
                                <p className="notice-text-settings">and display on your profile like above.</p>
                            </Col>
                        </Row>
                        <div className="file-field input-field">
                            <div className="btn">
                                <Form.File onChange={this.handleChange}
                                label="Change Picture" accept="image/*" custom data-browse="Upload"
                                className="imgUpload-input"/>
                            </div>
                        </div>

                        <Row>
                            <Col className="img-upload-col-button">
                                <Button
                                    onClick={(() => this.handleUpload(authUser.uid))}
                                    variant="outline-success"
                                    className="imgUpload-submit"
                                    disabled={isInvalid}
                                >
                                    Submit
                                </Button>
                            </Col>
                        </Row>
                    </div>
                )}
            </AuthUserContext.Consumer>
        );
    }
}

const condition = authUser => !!authUser;

export default withFirebase(withAuthorization(condition)(ImageUpload));