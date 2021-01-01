import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import { Container, Row, Col, Breadcrumb } from 'react-bootstrap/';

import { encode } from 'firebase-encode';

import { LinkContainer } from 'react-router-bootstrap';

import * as ROLES from '../constants/roles';

class Migration extends Component {
    constructor(props) {
        super(props);

        this.fileReadingFinished= this.fileReadingFinished.bind(this);

        this.state = {
        }
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
        var lines = csv.split(/\r\n|\n/);
        //var sendMail = this.props.firebase.sendMail();
        var mergeUsers = this.props.firebase.mergeUsers();
        for (let i=0; i<lines.length; i++) {
            let usr = String(lines[i]).split(',')
            mergeUsers({
                user: usr, 
            }).then((result) => {
                // Read result of the Cloud Function.
                if (result.data && result.data.user !== null) {
                    var secret = 'm' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
                    let email = result.data.user
                    this.props.firebase.emailList(encode(email.toLowerCase())).set({secret})
                    // Send email from our end
                    /*sendMail({email, body: null, subject: "US Airsoft Migration Notice", img: null, secret: "empty", migrate: true, addressee: usr[0]}).then((result) => {
                    if (result.data) console.log(result.data.status)
                    }).catch((error) => {
                    console.log(error)
                    }) */
                    //Add email call to our backend instead of reset
                }
            });
        }
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
                    <Container>
                        <h2 className="admin-header">Migration Page</h2>
                        <Breadcrumb className="admin-breadcrumb">
                            <LinkContainer to="/admin">
                                <Breadcrumb.Item>Admin</Breadcrumb.Item>
                            </LinkContainer>
                            <Breadcrumb.Item active>Migration</Breadcrumb.Item>
                        </Breadcrumb>
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
    authUser && !!authUser.roles[ROLES.SUPER];

export default compose(
    withAuthorization(condition),
    withFirebase,
)(Migration);