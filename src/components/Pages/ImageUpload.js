import React, { Component } from 'react';

import { AuthUserContext, withAuthorization } from '../session';

import { Row, Col, ProgressBar } from 'react-bootstrap/';
import Slider from '@material-ui/core/Slider'
import Cropper from 'react-easy-crop'
import { Modal, Fade, Backdrop } from '@material-ui/core';
import CancelIcon from '@material-ui/icons/Cancel';
import default_profile from '../../assets/default.png';

import { withFirebase } from '../Firebase';
import { Button } from '@material-ui/core';
import EditIcon from '@material-ui/icons/Edit';

import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';
import { onValue } from 'firebase/database';
import { getDownloadURL, uploadBytes } from 'firebase/storage';

const createImage = url =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', error => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') // needed to avoid cross-origin issues on CodeSandbox
    image.src = url
  })

async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  const maxSize = Math.max(image.width, image.height)
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))

  // set each dimensions to double largest dimension to allow for a safe area for the
  // image to rotate in without being clipped by canvas context
  canvas.width = safeArea
  canvas.height = safeArea

  // translate canvas context to a central location on image to allow rotating around the center.
  ctx.translate(safeArea / 2, safeArea / 2)
//   ctx.rotate(getRadianAngle(rotation))
  ctx.translate(-safeArea / 2, -safeArea / 2)

  // draw rotated image and store data.
  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  )
  const data = ctx.getImageData(0, 0, safeArea, safeArea)

  // set canvas width to final desired crop size - this will clear existing context
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // paste generated rotate image with correct offsets for x,y crop values.
  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  )

  // As Base64 string
//   return canvas.toDataURL('image/jpeg');

  // As a blob
  return new Promise(resolve => {
    canvas.toBlob(file => {
      resolve((file))
    }, 'image/jpeg')
  })
}
class ImageUpload extends Component {
    constructor(props) {
        super(props);

        this.state = {
            image: null,
            url: "",
            uploadedUrl: "",
            authUser: null,
            loading: true,
            user: "",
            progress: null,
            img_status: null,
            crop: { x: 0, y: 0 },
            zoom: 1,
            aspect: 1,
            uploading: false,
            croppedAreaPixels: null,
            submitting: false,
        };
    }

    onCropChange = crop => {
        this.setState({ crop })
    }

    onCropComplete = (croppedArea, croppedAreaPixels) => {
        // console.log(croppedAreaPixels.width / croppedAreaPixels.height)
        this.setState({croppedAreaPixels})
    }

    onZoomChange = zoom => {
        this.setState({ zoom })
    }

    componentDidMount() {
        this.authSubscription = this.props.firebase.onAuthUserListener((user) => {
            this.setState({authUser: user})
            onValue(this.props.firebase.user(user.uid), obj => {
                if (obj.val().profilepic)
                    this.getProfile(`${user.uid}/profilepic`);
                else
                    this.setState({ url: "" })
            })
        }, () => {
            this.setState({authUser: null})
        });
    }

    componentWillUnmount() {
        this.authSubscription();
        // this.props.firebase.user(this.state.authUser.uid).off()
    }

    //Get image function for profile image = uid
    getProfile(uid) {
        getDownloadURL(this.props.firebase.pictures(`${uid}.png`)).then((url) => {
            this.setState({ url })
        }).catch((error) => {
            // Handle any errors
            this.setState({ url: "" })
        })
    }

    // Handles change for file input
    handleChange = e => {
        if (e.target.files[0]) {
            const image = e.target.files[0];
            const url = URL.createObjectURL(e.target.files[0])
            this.setState(() => ({ image, uploadedUrl: url, uploading: true }));
        }
    };

    // Creates cropped image then calls handleUpload
    async createCroppedImage(uid) {
        const croppedImage = await getCroppedImg(
            this.state.uploadedUrl,
            this.state.croppedAreaPixels,
            0
        )
        this.handleUpload(uid, croppedImage)
    }

    // Handles uploading to firebase
    handleUpload = (uid, image) => {
        // const { image } = this.state;
        this.setState({uploading: false})
        const uploadTask = uploadBytes(this.props.firebase.pictures(`${uid}/profilepic.png`), (image));
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
                getDownloadURL(this.props.firebase
                    .pictures(`/${uid}/profilepic.png`),
                    url => {
                        var manage = this.props.firebase.manageProfile();
                        manage({ choice: "profilepic" })
                        this.setState({ url }, function () {
                            setTimeout(() => {
                                this.setState({
                                    progress: null,
                                    img_status: "Successfully Updated.",
                                    submitting: false,
                                })
                            }, 2000);
                        })
                    });
            }
        );
    };



    render() {
        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <Row className="row-settings">
                        <Col>
                            <Row className="justify-content-row">
                                <p className="p-picture-label-settings">Current Picture:</p>
                            </Row>
                            <Row className="justify-content-row">
                                <label htmlFor="upload-button">
                                    <div className="div-img-settings">
                                        <img
                                            src={this.state.url || default_profile}
                                            alt="User Uploaded"
                                            height="250"
                                            width="250"
                                            className="profile-img-settings"
                                        />
                                        <div className="div-img-button-settings">
                                            <EditIcon />
                                        </div>
                                        <div className="div-img-text-settings">
                                            {`CHANGE\nPICTURE`}
                                        </div>
                                    </div>
                                </label>
                            </Row>
                            {this.state.progress ?
                                <Row className="row-loading-imgup">
                                    <ProgressBar animated striped now={this.state.progress} label={`${this.state.progress}%`} />
                                </Row> : null}
                            <Row className="justify-content-row">
                                <p className="notice-text-settings text-align-center"><b>NOTE: </b>Images can only be MAX 5mb </p>
                            </Row>
                            <div className="div-upload-settings">
                                <input
                                    accept="image/*"
                                    type="file"
                                    onChange={this.handleChange}
                                    id="upload-button"
                                />
                            </div>
                        </Col>
                        <Modal
                            aria-labelledby="Image upload"
                            className={"modal-ef"}
                            open={this.state.uploading}
                            onClose={() => this.setState({ uploading: false })}
                            closeAfterTransition
                            BackdropComponent={Backdrop}
                            BackdropProps={{
                                timeout: 500,
                            }}>
                            <Fade in={this.state.uploading}>
                                <div className={"paper-ef"}>
                                    <div className="div-crop-image-settings">
                                        <div className="div-cancel-button-settings">
                                            <Button
                                                onClick={() => {this.setState({uploading: false})}}
                                                variant="contained"
                                                color="secondary"
                                                >
                                                    <CancelIcon />
                                                </Button>
                                        </div>
                                        <div className="crop-container-settings">
                                            <Cropper
                                                image={this.state.uploadedUrl}
                                                crop={this.state.crop}
                                                zoom={this.state.zoom}
                                                aspect={this.state.aspect}
                                                cropShape="round"
                                                showGrid={false}
                                                onCropChange={this.onCropChange}
                                                onCropComplete={this.onCropComplete}
                                                onZoomChange={this.onZoomChange}
                                            />
                                        </div>
                                        <div className="controls-settings">
                                                <Slider
                                                    value={this.state.zoom}
                                                    min={1}
                                                    max={3}
                                                    step={0.1}
                                                    aria-labelledby="Zoom"
                                                    onChange={(e, zoom) => this.onZoomChange(zoom)}
                                                />
                                                <Button
                                                    onClick={(() => {
                                                        this.setState({submitting: true})
                                                        this.createCroppedImage(authUser.uid)})
                                                    }
                                                    variant="contained"
                                                    color="primary"
                                                    className="imgUpload-submit"
                                                    disabled={this.state.submitting}
                                                >
                                                    Save
                                                </Button>
                                        </div>
                                    </div>
                                </div>
                            </Fade>
                        </Modal>
                        <Snackbar open={this.state.img_status !== null} autoHideDuration={6000} onClose={() => this.setState({img_status: null})}>
                            <Alert onClose={() => this.setState({img_status: null})} severity="success">
                                {this.state.img_status}
                            </Alert>
                        </Snackbar>
                    </Row>
                )}
            </AuthUserContext.Consumer>
        );
    }
}



const condition = authUser => !!authUser;

export default withFirebase(withAuthorization(condition)(ImageUpload));