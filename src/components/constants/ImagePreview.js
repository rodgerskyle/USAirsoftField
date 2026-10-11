import React from 'react';
import PropTypes from 'prop-types';

import '../../App.css';
import './ImagePreview.css';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import MUIButton from '@mui/material/Button';
import { Form } from 'react-bootstrap';

import { Typeahead } from 'react-bootstrap-typeahead';


export const ImagePreview = ({ dataUri, handleRetakePhoto, handleAcceptPhoto, setGroup, setFullname, fullname, groups, selectedGroup, uploading }) => {

  return (
    <section className="scan-waiver-review" aria-labelledby="scan-waiver-review-title">
      <header className="scan-waiver-review-header">
        <div>
          <h3 id="scan-waiver-review-title">Review scanned waiver</h3>
          <p>Make sure the entire waiver is readable, then enter the customer's name.</p>
        </div>
      </header>

      <div className="scan-waiver-preview-frame">
        <img className="scan-waiver-preview-image" src={dataUri} alt="Scanned waiver preview" />
      </div>

      <Form id="scan-waiver-details-form" className="scan-waiver-form" onSubmit={(event) => {
        event.preventDefault();
        handleAcceptPhoto();
      }}>
        <Form.Group controlId="scan-waiver-fullname">
          <Form.Label>Customer full name</Form.Label>
          <Form.Control
            name="fullname"
            value={fullname}
            onChange={(e) => {
              setFullname(e.target.value)
            }}
            disabled={uploading}
            type="text"
            autoComplete="off"
            placeholder="First and last name"
          />
        </Form.Group>

        <Form.Group controlId="scan-waiver-group">
          <Form.Label>Rental group <span>(optional)</span></Form.Label>
          <Typeahead
            labelKey="Groupname"
            id="scan-waiver-group-picker"
            onChange={(val) => {
              setGroup(val)
            }}
            options={groups || []}
            selected={selectedGroup}
            disabled={uploading}
            placeholder="Select a rental group"
          />
        </Form.Group>
      </Form>

      <div className="scan-waiver-actions">
        <MUIButton
          className="scan-waiver-action scan-waiver-retake"
          variant="outlined"
          type="button"
          startIcon={<HighlightOffIcon />}
          disabled={uploading}
          onClick={handleRetakePhoto}
        >
          Retake photo
        </MUIButton>
        <MUIButton
          className="scan-waiver-action scan-waiver-submit"
          variant="contained"
          color="success"
          type="submit"
          form="scan-waiver-details-form"
          startIcon={<CheckCircleOutlineIcon />}
          disabled={uploading}
        >
          {uploading ? 'Saving waiver…' : 'Submit waiver'}
        </MUIButton>
      </div>
    </section>
  );
};

ImagePreview.propTypes = {
  dataUri: PropTypes.string.isRequired,
  handleRetakePhoto: PropTypes.func.isRequired,
  handleAcceptPhoto: PropTypes.func.isRequired,
  setGroup: PropTypes.func.isRequired,
  setFullname: PropTypes.func.isRequired,
  fullname: PropTypes.string.isRequired,
  groups: PropTypes.arrayOf(PropTypes.string),
  selectedGroup: PropTypes.arrayOf(PropTypes.string),
  uploading: PropTypes.bool,
};

ImagePreview.defaultProps = {
  groups: [],
  selectedGroup: [],
  uploading: false,
};

export default ImagePreview;
