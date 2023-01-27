import React, { Component } from 'react';
import jsPDF from "jspdf";

//Taken from MArtin

import Camera, { FACING_MODES } from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';
import ImagePreview from './ImagePreview';
import { withFirebase } from '../Firebase';
import { onValue, update } from "firebase/database";

import { uploadBytes } from "firebase/storage";

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/lab/Alert';

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
    groupsObject: null,
    groupIndex: null,
    groups: null,
    loading: true,
    error: null,
    success: null,
    blob: null,
  }

  componentDidMount() {
    onValue(this.props.firebase.rentalGroups(), obj => {
      const groupsObj = obj.val()

      let groups = []
      let groupsObject;
      let groupIndex = {}

      if (groupsObj) {
        groupsObject = Object.keys(groupsObj).map(key => ({
          ...groupsObj[key],
          index: key,
        }))
        for (let i = 0; i < groupsObj.length; i++) {
          groups[i] = groupsObj[i].name
          groupIndex[groupsObj[i].name] = i
        }
      }

      this.setState({ groups, loading: false, groupsObject, groupIndex })
    })
  }

  componentWillUnmount() {
    // this.props.firebase.rentalGroups().off()
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

  handleAcceptPhoto = () => {
    const { imgWidth, imgHeight, fullname, groupsObject, groupIndex, selectedGroup } = this.state

    if (fullname === "") {
      this.setState({ error: "Please enter the full name for this waiver." })
      return;
    }

    const doc = new jsPDF()
    //doc.addPage()

    const imageDimensions = imageDimensionsOnA4({
      width: imgWidth,
      height: imgHeight
    })

    doc.addImage(
      this.state.blob,
      'png',
      (A4_PAPER_DIMENSIONS.width - A4_PAPER_DIMENSIONS.width) / 2,
      (A4_PAPER_DIMENSIONS.height - A4_PAPER_DIMENSIONS.height) / 2,
      imageDimensions.width,
      imageDimensions.height
    )
    // Creates a PDF and opens it in a new browser tab.
    const blob = doc.output("blob");

    var date = (new Date().getMonth() + 1) + "-" + (new Date().getDate()) + "-" + (new Date().getFullYear()) + ":" +
      (new Date().getHours()) + ":" + (new Date().getMinutes()) + ":" + (new Date().getSeconds()) + ":" + (new Date().getMilliseconds());
    uploadBytes(this.props.firebase.nonmembersWaivers(`${fullname}(${date}).pdf`), blob).then(() => {
      if (selectedGroup.length !== 0) {
        if (typeof groupsObject[groupIndex[selectedGroup[0]]].participants === 'undefined') {
          // Push participant into new array and set it
          let participants = []
          let obj = { name: `${fullname}(${date})`, gamepass: false }
          participants.push(obj)
          update(this.props.firebase.rentalGroup(groupIndex[selectedGroup[0]]), ({ participants }))
        }
        else if (groupsObject[groupIndex[selectedGroup[0]]].participants.length < groupsObject[groupIndex[selectedGroup[0]]].size) {
          // Push participant into existing array and set it
          let participants = groupsObject[groupIndex[selectedGroup[0]]].participants
          let obj = { name: `${fullname}(${date})`, gamepass: false }
          participants.push(obj)
          update(this.props.firebase.rentalGroup(groupIndex[selectedGroup[0]]), ({ participants }))
        }
        // Make sure length and size are not equal
        // Push new user to participants table
      }
      this.setState({ success: "Waiver was successfully scanned in.", photo: null, fullname: "", selectedGroup: [] })
    })
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
            />
            : <Camera
              idealFacingMode={FACING_MODES.ENVIRONMENT}
              isImageMirror={false}
              onTakePhotoAnimationDone={this.handleTakePhotoAnimationDone}
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