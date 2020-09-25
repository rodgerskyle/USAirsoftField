import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import { Button, Form, Container, Card, Row, Col } from 'react-bootstrap/';

import * as ROLES from '../constants/roles';

class Migration extends Component {
    constructor(props) {
        super(props);

        this.state = {
        };
    }

    handleFiles = (files) => {
        // Check for the various File API support.
        if (window.FileReader) {
            // FileReader are supported.
            this.getAsText(files.target.files[0]);
        }
    }

    getAsText(fileToRead) {
        var reader = new FileReader();
        // Read file into memory as UTF-8      
        reader.readAsText(fileToRead);
        // Handle errors load
        reader.onload = this.fileReadingFinished;
        reader.onerror = this.errorHandler;
    }

    fileReadingFinished(event) {
        var csv = event.target.result;
        //this.processData(csv);
        var allTextLines = csv.split(/\r\n|\n/);
        var lines = allTextLines.map(data => data.split(';'))

        console.log(lines)
    }

    processData(csv) {
        var allTextLines = csv.split(/\r\n|\n/);
        var lines = allTextLines.map(data => data.split(';'))

        console.log(lines)
    }

    errorHandler(event) {
        if (event.target.error.name === "NotReadableError") {
            alert("Cannot read file!");
        }
    }

    componentWillUnmount() {
    }

    componentDidMount() {
    }

    render() {
        return (
            <div className="background-static-all">
                <h2 className="page-header">Admin - Migration Page</h2>
                    <Container>
                        <Row>
                            <Col className="col-admin-mg">
                                <div className="btn">
                                    <span className="imgUpload-text">File</span>
                                    <input type="file" onChange={(e) => this.handleFiles(e)} 
                                    className="imgUpload-input" accept=".csv"
                                    />
                                </div>
                            </Col>
                        </Row>
                    </Container>
            </div>
        );
    }
}

const condition = authUser =>
    authUser && !!authUser.roles[ROLES.ADMIN];

export default compose(
    withAuthorization(condition),
    withFirebase,
)(Migration);