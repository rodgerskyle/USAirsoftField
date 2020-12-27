import React, { Component } from 'react';
import '../../App.css';

import { Container, Row, Form, Button, Spinner, Col } from 'react-bootstrap/';

import { encode } from 'firebase-encode';

import { withFirebase } from '../Firebase';

import logo from '../../assets/logo.png';

class emailOptOut extends Component {
    constructor(props) {
        super(props);

        this.state = {
            value: "",
            status: null,
            error: null,
        };
        this.handleChange = this.handleChange.bind(this);
    }
      
    handleChange(event) {
        this.setState({ value: event.target.value });
    }

    updateUser = (event) => {
        event.preventDefault()
        const optmenu = this.props.firebase.emailOptMenu();
        optmenu({secret: this.props.match.params.secret, email: encode(this.state.value.toLowerCase()), choice: "out"}).then((result) => {
            if (result) this.setState({status: result.data.status, error: null, loading: false})
        }).catch(error => {
            this.setState({error: 'failed-condition: Email does not match the token or it is an improper token.', loading: false, status: null, })
        })
    }

    render() {
        return (
            <div className="background-static-all">
                <Container className="container-emailoptout">
                    <div className="admin-row-emailoptout">
                        <Row className="header-rp">
                            <img src={logo} alt="US Airsoft logo"/>
                        </Row>
                        <Row className="row-nomargin justify-content-row">
                            <Col md={4}>
                                <Form id="formBox">
                                    <Form.Group controlId="usernameBox">
                                    <Form.Label>Enter your email:</Form.Label>
                                    <Form.Control onChange={this.handleChange}
                                        value={this.state.value}
                                        placeholder="email" />
                                    </Form.Group>
                                </Form>
                            </Col>
                        </Row>
                        <Row className="row-nomargin justify-content-row">
                            <Col md={4} className="justify-content-flex-end-col">
                                <Button type="button" id="register" variant="success" 
                                disabled={this.state.value === ""} onClick={(e) => {
                                    this.setState({loading: true, error: null, status: null}, function() {
                                        this.updateUser(e);
                                    })
                                }}>
                                    Submit
                                </Button>
                            </Col>
                        </Row>
                        <Row className="row-nomargin justify-content-row">
                            {this.state.loading ? <Spinner animation="border" /> : null}
                            {this.state.status ? <p className="status-oo-admin">{this.state.status}</p> : null}
                            {this.state.error ? <p className="error-oo-admin">{this.state.error}</p> : null}
                        </Row>
                        <Row className="row-nomargin justify-content-row row-margin15-top">
                            <Col md={4}>
                                <p>By clicking submit, you are opting out of all future emails from US Airsoft.</p>
                                <p>We understand your inbox gets lots of emails and hope we weren't too much of a hassle.</p>
                                <p>We hope you will reconsider, thank you and have a great day!</p>
                            </Col>
                        </Row>
                    </div>
                </Container>
            </div>
        );
    }
}


export default withFirebase(emailOptOut);