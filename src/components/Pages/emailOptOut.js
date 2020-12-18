import React, { Component } from 'react';
import '../../App.css';

import { Container, Row, Form, Button, Spinner } from 'react-bootstrap/';

import { encode } from 'firebase-encode';

import { withFirebase } from '../Firebase';

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
                        <Row className="row-nomargin justify-content-row">
                            <Form id="formBox">
                                <Form.Group controlId="usernameBox">
                                <Form.Label>Enter your email:</Form.Label>
                                <Form.Control onChange={this.handleChange}
                                    value={this.state.value}
                                    className="form-input-emailoptout"
                                    placeholder="email" />
                                </Form.Group>
                            </Form>
                        </Row>
                        <Row className="row-nomargin justify-content-row">
                            <Button type="button" id="register" variant="success" 
                            disabled={this.state.value === ""} onClick={(e) => {
                                this.setState({loading: true, error: null, status: null}, function() {
                                    this.updateUser(e);
                                })
                            }}>
                                Submit
                            </Button>
                        </Row>
                        <Row className="row-nomargin justify-content-row">
                            {this.state.loading ? <Spinner animation="border" /> : null}
                            {this.state.status ? <p className="status-oo-admin">{this.state.status}</p> : null}
                            {this.state.error ? <p className="error-oo-admin">{this.state.error}</p> : null}
                        </Row>
                    </div>
                </Container>
            </div>
        );
    }
}


export default withFirebase(emailOptOut);