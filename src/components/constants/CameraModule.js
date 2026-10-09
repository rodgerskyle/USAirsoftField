import React, { Component } from 'react';
import jsPDF from "jspdf";

//Taken from MArtin

import Camera, { FACING_MODES, IMAGE_TYPES } from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';
import ImagePreview from './ImagePreview';
import { withFirebase } from '../Firebase';
import { onValue, update } from "firebase/database";

import { uploadBytes } from "firebase/storage";

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/lab/Alert';
import { normalizeRentalGroups } from './CameraModule.utils';

const max_width = 595;
const max_height = 842

// The dimensions are in millimeters.
const A4_PAPER_DIMENSIONS = {
  width: 210,
  height: 297,
};

const A4_PAPER_RATIO = A4_PAPER_DIMENSIONS.width / A4_PAPER_DIMENSIONS.height;

// Calculates the best possible position of an image on the A4 paper format,
// so that the maximal area of A4 is used and the image ratio is preserved.
const imageDimensionsOnA4 = (dimensions) => {
  const isLandscapeImage = dimensions.width >= dimensions.height;

  // If the image is in landscape, the full width of A4 is used.
  if (isLandscapeImage) {
    return {
      width: A4_PAPER_DIMENSIONS.width,
      height:
        A4_PAPER_DIMENSIONS.width / (dimensions.width / dimensions.height),
    };
  }

  // If the image is in portrait and the full height of A4 would skew
  // the image ratio, we scale the image dimensions.
  const imageRatio = dimensions.width / dimensions.height;
  if (imageRatio > A4_PAPER_RATIO) {
    const imageScaleFactor =
      (A4_PAPER_RATIO * dimensions.height) / dimensions.width;

    const scaledImageHeight = A4_PAPER_DIMENSIONS.height * imageScaleFactor;

    return {
      height: scaledImageHeight,
      width: scaledImageHeight * imageRatio,
    };
  }

  // The full height of A4 can be used without skewing the image ratio.
  return {
    width: A4_PAPER_DIMENSIONS.height / (dimensions.height / dimensions.width),
    height: A4_PAPER_DIMENSIONS.height,
  };
};



class CameraModule extends Component {
  state = {
    photo: null,
    fullname: "",
    selectedGroup: [],
    groupsObject: {},
    groupIndex: {},
    groups: [],
    loading: true,
    uploading: false,
    error: null,
    success: null,
    blob: null,
  }

  componentDidMount() {
    this.unsubscribeRentalGroups = onValue(
      this.props.firebase.rentalGroups(),
      snapshot => {
        const rentalGroups = normalizeRentalGroups(snapshot.val() || {});
        this.setState({ ...rentalGroups, loading: false });
      },
      () => {
        this.setState({
          error: "Rental groups could not be loaded. You can still scan a waiver without selecting a group.",
          loading: false,
        });
      }
    );
  }

  componentWillUnmount() {
    if (this.unsubscribeRentalGroups) this.unsubscribeRentalGroups();
  }

  resizeMe(img) {

    var canvas = document.createElement('canvas');

    var width = img.width;
    var height = img.height;

    // calculate the width and height, constraining the proportions
    if (width > height) {
      if (width > max_width) {
        //height *= max_width / width;
        height = Math.round(height *= max_width / width);
        width = max_width;
      }
    } else {
      if (height > max_height) {
        //width *= max_height / height;
        width = Math.round(width *= max_height / height);
        height = max_height;
      }
    }

    // resize the canvas and draw the image data into it
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", 0.7); // get the data from canvas as 70% JPG (can be also PNG, etc.)

  }

  // Called when the x is clicked in order to retake photo
  handleRetakePhoto = () => {
    this.setState({
      photo: null
    })
  }

  handleAcceptPhoto = async () => {
    const { imgWidth, imgHeight, fullname, groupsObject, groupIndex, selectedGroup } = this.state

    const trimmedFullname = fullname.trim();
    if (trimmedFullname === "") {
      this.setState({ error: "Please enter the full name for this waiver." })
      return;
    }

    if (this.state.uploading) return;

    const selectedGroupName = selectedGroup[0];
    const selectedGroupKey = selectedGroupName ? groupIndex[selectedGroupName] : null;
    const rentalGroup = selectedGroupKey != null ? groupsObject[selectedGroupKey] : null;

    if (selectedGroupName && !rentalGroup) {
      this.setState({ error: "That rental group is no longer available. Please select it again." });
      return;
    }

    const participants = rentalGroup?.participants || [];
    if (rentalGroup && participants.length >= rentalGroup.size) {
      this.setState({ error: "That rental group is already full." });
      return;
    }

    this.setState({ uploading: true, error: null });
    let waiverUploaded = false;

    try {
      const doc = new jsPDF()

      const imageDimensions = imageDimensionsOnA4({
        width: imgWidth,
        height: imgHeight
      })

      doc.addImage(
        this.state.blob,
        'JPEG',
        0,
        0,
        imageDimensions.width,
        imageDimensions.height
      )
      const waiverPdf = doc.output("blob");

      const now = new Date();
      const date = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear()}:${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}:${now.getMilliseconds()}`;
      const waiverName = `${trimmedFullname}(${date})`;

      await uploadBytes(this.props.firebase.nonmembersWaivers(`${waiverName}.pdf`), waiverPdf);
      waiverUploaded = true;

      if (rentalGroup) {
        await update(this.props.firebase.rentalGroup(selectedGroupKey), {
          participants: [...participants, { name: waiverName, gamepass: false }]
        });
      }

      this.setState({
        success: "Waiver was successfully scanned in.",
        photo: null,
        fullname: "",
        selectedGroup: [],
        uploading: false,
      });
    } catch (error) {
      console.error("Unable to scan waiver", error);
      this.setState({
        error: waiverUploaded
          ? "The waiver was uploaded, but it could not be added to the rental group. Please update the group manually."
          : "The waiver could not be uploaded. Please check the connection and try again.",
        photo: waiverUploaded ? null : this.state.photo,
        fullname: waiverUploaded ? "" : this.state.fullname,
        selectedGroup: waiverUploaded ? [] : this.state.selectedGroup,
        uploading: false,
      });
    }
  }

  // Set group from typeahead
  setGroup = (val) => {
    this.setState({ selectedGroup: val })
  }

  // Set full name for text field
  setFullname = (val) => {
    this.setState({ fullname: val })
  }

  handleTakePhotoAnimationDone = (dataUri) => {
    const img = new Image();
    img.src = dataUri

    img.onload = () => {
      this.setState({
        imgWidth: img.naturalWidth,
        imgHeight: img.naturalHeight,
        blob: this.resizeMe(img),
      })
      this.setState({
        photo: dataUri
      })
    }
  }

  handleCameraError = (error) => {
    console.error("Unable to start camera", error);
    this.setState({
      error: "The camera could not be opened. Check this browser's camera permission and make sure the page is using HTTPS."
    });
  }

  render() {
    return (
      <div>
        <div className="div-photo-cm">
          {(this.state.photo)
            ? <ImagePreview
              dataUri={this.state.photo}
              handleRetakePhoto={this.handleRetakePhoto}
              handleAcceptPhoto={this.handleAcceptPhoto}
              setGroup={this.setGroup.bind(this)}
              setFullname={this.setFullname.bind(this)}
              fullname={this.state.fullname}
              selectedGroup={this.state.selectedGroup}
              groups={this.state.groups}
              uploading={this.state.uploading}
            />
            : <Camera
              idealFacingMode={FACING_MODES.ENVIRONMENT}
              isImageMirror={false}
              onTakePhotoAnimationDone={this.handleTakePhotoAnimationDone}
              onCameraError={this.handleCameraError}
              imageType={IMAGE_TYPES.JPG}
              imageCompression={0.92}
            />
          }
        </div>
        <Snackbar open={this.state.error !== null} autoHideDuration={6000} onClose={() => this.setState({ error: null })}>
          <Alert onClose={() => this.setState({ error: null })} severity="error">
            {this.state.error}
          </Alert>
        </Snackbar>
        <Snackbar open={this.state.success !== null} autoHideDuration={6000} onClose={() => this.setState({ success: null })}>
          <Alert onClose={() => this.setState({ success: null })} severity="success">
            {this.state.success}
          </Alert>
        </Snackbar>
      </div>
    )
  }
}

export default withFirebase(CameraModule);
