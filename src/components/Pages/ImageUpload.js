import React, { Component } from 'react';

import { AuthUserContext, withAuthorization } from '../session';

import { withFirebase } from '../Firebase';

class ImageUpload extends Component {
    constructor(props) {
        super(props);
        this.state = {
            image: null,
            url: "",
            progress: 0,
        };
    }

    handleChange = e => {
        if (e.target.files[0]) {
            const image = e.target.files[0];
            this.setState(() => ({ image }));
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
                    <div className="container">
                        <br />
                        <h2 className="imgUpload-text">New Profile Picture</h2>
                        <br />
                        <br />
                        <div className="row">
                            <progress value={this.state.progress} max="100" className="progress" />
                        </div>
                        <br />
                        <br />
                        <br />
                        <div className="file-field input-field">
                            <div className="btn">
                                <span>File</span>
                                <input type="file" onChange={this.handleChange} />
                            </div>
                            <div className="file-path-wrapper">
                                <input className="file-path validate" type="text" />
                            </div>
                        </div>
                        <button
                            onClick={(() => this.handleUpload(authUser.uid))}
                            className="waves-effect waves-light btn"
                            disabled={isInvalid}
                        >
                            Upload
                        </button>
                        <br />
                        <br />
                        <img
                            src={this.state.url || "https://via.placeholder.com/400x300"}
                            alt="Uploaded Images"
                            height="300"
                            width="400"
                        />
                    </div>

                )}
            </AuthUserContext.Consumer>
        );
    }
}

const condition = authUser => !!authUser;

export default withFirebase(withAuthorization(condition)(ImageUpload));