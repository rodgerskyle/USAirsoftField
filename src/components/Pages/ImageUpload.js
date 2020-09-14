import React, { Component } from 'react';

import { AuthUserContext, withAuthorization } from '../session';

import { Container, Row, Col, Form, Button } from 'react-bootstrap/';

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

    componentWillMount() {
        this.authSubscription = this.props.firebase.auth.onAuthStateChanged((user) => {
            this.getProfile(`${user.uid}/profilepic`);
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
                    });
            }
        );
    };
    render() {
        const isInvalid = this.state.image === null;
        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <Container>
                        <img
                            src={this.state.url || "https://via.placeholder.com/400x250"}
                            alt="Uploaded Images"
                            height="250"
                            width="400"
                        />
                        <div className="file-field input-field">
                            <div className="btn">
                                <span className="imgUpload-text">File</span>
                                <input type="file" onChange={this.handleChange} 
                                className="imgUpload-input"
                                />
                            </div>
                        </div>
                        <Button
                            onClick={(() => this.handleUpload(authUser.uid))}
                            variant="outline-success"
                            className="imgUpload-submit"
                            disabled={isInvalid}
                        >
                            Submit
                        </Button>
                    </Container>

                )}
            </AuthUserContext.Consumer>
        );
    }
}

const condition = authUser => !!authUser;

export default withFirebase(withAuthorization(condition)(ImageUpload));