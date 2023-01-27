import React from 'react';
import PropTypes from 'prop-types';

import '../../App.css';
import './ImagePreview.css';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import MUIButton from '@mui/material/Button';
import { Col, Row, Form } from 'react-bootstrap';

import { Typeahead } from 'react-bootstrap-typeahead';


export const ImagePreview = ({ dataUri, handleRetakePhoto, handleAcceptPhoto, setGroup, setFullname, fullname, groups, selectedGroup }) => {

  return (
    <div>
      <Row style={{ color: 'white', paddingBottom: 15 }} className="justify-content-row">
        <Col md={6}>
          Preview:
        </Col>
      </Row>
      <Row className="justify-content-center">
        <Col md={6}>
          <div className="IconRetake">
            <MUIButton onClick={handleRetakePhoto}>
              <HighlightOffIcon style={{ fontSize: "4rem" }} />
            </MUIButton>
          </div>
          <div className="IconAccept">
            <MUIButton onClick={handleAcceptPhoto} >
              <CheckCircleOutlineIcon style={{ fontSize: "4rem" }} />
            </MUIButton>
          </div>
          <img src={dataUri} alt="waiver scanned" />
        </Col>
      </Row>
      <Row className="row-fullname-ip">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Full Name:</Form.Label>
            <Form.Control
              name="fullname"
              value={fullname}
              onChange={(e) => {
                setFullname(e.target.value)
              }}
              type="text"
              autoComplete="off"
              placeholder="Full Name"
            />
          </Form.Group>
        </Col>
      </Row>
      <Row className="justify-content-row">
        <Col md={6}>
          <p className="p-groupname-rp">Rental Group Name: (If Applicable)</p>
        </Col>
      </Row>
      <Row className="row-typeahead-rp justify-content-row">
        <Col md={6}>
          <Typeahead
            labelKey="Groupname"
            id="group-join"
            onChange={(val) => {
              setGroup(val)
            }}
            options={groups}
            selected={selectedGroup}
          />
        </Col>
      </Row>
    </div>
  );
};

ImagePreview.propTypes = {
  dataUri: PropTypes.string,
  isFullscreen: PropTypes.bool
};

export default ImagePreview;