import React, { Component } from 'react';
import '../../App.css';

import { Container, Row, Col, Form, Button } from 'react-bootstrap/';

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
        optmenu({secret: this.props.match.params.secret, email: this.state.value, choice: "out"}).then((result) => {
            if (result) this.setState({status: result.data.status})
        }).catch(error => {
            this.setState({error: 'failed-condition: Email does not match the token or it is an improper token.' })
        })
    }

    render() {
        return (
            <div className="background-static-all">
                <Container>
                    <Row className="admin-row-emailoptout">
                        <Form id="formBox">
                            <Col>
                                <Form.Group controlId="usernameBox">
                                    <Form.Label>Enter your email:</Form.Label>
                                    <Form.Control onChange={this.handleChange}
                                        value={this.state.value}
                                        className="form-input-admin"
                                        placeholder="email" />
                                    </Form.Group>
                                </Col>
                            </Form>
                            <Col className="admin-col-button-points">
                                <Button className="button-submit-admin" type="button" id="register" variant="outline-success" 
                                disabled={this.state.value === ""} onClick={(e) => {
                                    this.updateUser(e);
                                }}>
                                    Submit
                                </Button>
                            </Col>
                    </Row>
                    <Row>
                        {this.state.status ? <p className="status-oo-admin">{this.state.status}</p> : null}
                        {this.state.error ? <p className="error-oo-admin">{this.state.error}</p> : null}
                    </Row>
                </Container>
            </div>
        );
    }
}


export default withFirebase(emailOptOut);