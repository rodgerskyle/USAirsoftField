import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import { Container, Row, Col, Form, Button, Breadcrumb, Card } from 'react-bootstrap/';

import { Link } from 'react-router-dom';

import * as ROLES from '../constants/roles';
 
class AdminPage extends Component {
  constructor(props) {
    super(props);
 
    this.state = {
        loading: false,
        emailBox: '',
        emailSubject: '',
      };
    }
   
    componentWillUnmount() {
        this.props.firebase.users().off();
    }

    changeEmailBox = event => {
        this.setState({ emailBox: event.target.value });
    };

    changeEmailSubject = event => {
        this.setState({ emailSubject: event.target.value });
    };

    emailAll = () => {
        // Add verification check before emailing
        // Grab users from users api call
        // Verify legal requirements when it comes to emailing
        // Add in opt out feature in backend
        var sendMail = this.props.firebase.sendMail();
        const {emailBox, emailSubject} = this.state;
        sendMail({email: "kyle77r@gmail.com", body: emailBox, subject: emailSubject, img: null}).then((result) => {
          if (result.data) console.log(result.data.status)
        }).catch((error) => {
          console.log(error)
        })
        // Add loading to show completion
    }

    render() {
        const { loading } = this.state;
     
        return (
          <div className="background-static-all">
            <Container>
                <h1 className="admin-header">Admin Dashboard</h1>
                <Breadcrumb className="admin-breadcrumb">
                  <Breadcrumb.Item active>Admin</Breadcrumb.Item>
                </Breadcrumb>
                <Row>
                  <Col className="admin-col-cards">
                    <Link to={"/enterwins"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Enter Wins</Card.Body>
                        <Card.Footer>
                          <Row>
                            <Col xs="auto">
                              <Card.Text className="admin-card-footer">View</Card.Text>
                            </Col>
                            <Col>
                              <Card.Text className="admin-card-icon">
                                <i className="fa fa-angle-double-right fa-1x text-white"></i>
                              </Card.Text>
                            </Col>
                          </Row>
                        </Card.Footer>
                      </Card>
                    </Link>
                  </Col>
                  <Col className="admin-col-cards">
                    <Link to={"/enterlosses"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Enter Losses</Card.Body>
                        <Card.Footer>
                          <Row>
                            <Col xs="auto">
                              <Card.Text className="admin-card-footer">View</Card.Text>
                            </Col>
                            <Col>
                              <Card.Text className="admin-card-icon">
                                <i className="fa fa-angle-double-right fa-1x text-white"></i>
                              </Card.Text>
                            </Col>
                          </Row>
                        </Card.Footer>
                      </Card>
                    </Link>
                  </Col>
                  <Col className="admin-col-cards">
                    <Link to={"/freegames"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Check Free Games</Card.Body>
                        <Card.Footer>
                          <Row>
                          <Col xs="auto">
                              <Card.Text className="admin-card-footer">View</Card.Text>
                            </Col>
                            <Col>
                              <Card.Text className="admin-card-icon">
                                <i className="fa fa-angle-double-right fa-1x text-white"></i>
                              </Card.Text>
                            </Col>
                          </Row>
                        </Card.Footer>
                      </Card>
                    </Link>
                  </Col>
                </Row>
                <Row className="admin-row-email">
                  <Col>
                    <Card className="admin-cards">
                      <Card.Header>
                        <Row>
                          <Col xs="auto">
                            <Card.Text className="admin-card-icon2">
                                <i className="fa fa-address-card fa-1x text-white"></i>
                            </Card.Text>
                          </Col>
                          <Col>
                            Email Users
                          </Col>
                        </Row>
                      </Card.Header>
                      <Card.Body>
                        <Form>
                          <Form.Group controlId="exampleForm.ControlTextarea1">
                            <Form.Label>Add Subject Here:</Form.Label>
                                <Form.Control
                                    as="textarea" rows="1"
                                    placeholder="Email subject"
                                    value={this.state.emailSubject}
                                    onChange={(e) => {
                                        this.changeEmailSubject(e);
                                    }}
                                />
                            </Form.Group>
                          <Form.Group controlId="exampleForm.ControlTextarea1">
                            <Form.Label>Add Body Here:</Form.Label>
                                <Form.Control
                                    as="textarea" rows="3"
                                    placeholder="Email body"
                                    value={this.state.emailBox}
                                    onChange={(e) => {
                                        this.changeEmailBox(e);
                                    }}
                                />
                            </Form.Group>
                                <Button className="admin-button-email1" variant="info" type="button"
                                onClick={() => {
                                  this.emailAll();
                                }}
                                >
                                    Email All
                                </Button>
                                <Button className="admin-button-email2" variant="info" type="button"
                                >
                                    Email Members
                                </Button>
                                <Button className="admin-button-email3" variant="info" type="button"
                                >
                                    Email Non-Members
                                </Button>
                        </Form>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                <Row className="admin-row-email">
                  <Col className="admin-col-cards">
                    <Link to={"/signup"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Membership Registration</Card.Body>
                        <Card.Footer>
                          <Row>
                            <Col xs="auto">
                              <Card.Text className="admin-card-footer">View</Card.Text>
                            </Col>
                            <Col>
                              <Card.Text className="admin-card-icon">
                                <i className="fa fa-angle-double-right fa-1x text-white"></i>
                              </Card.Text>
                            </Col>
                          </Row>
                        </Card.Footer>
                      </Card>
                    </Link>
                  </Col>
                  <Col className="admin-col-cards">
                    <Link to={"/waiverform"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Sign Waiver</Card.Body>
                        <Card.Footer>
                          <Row>
                            <Col xs="auto">
                              <Card.Text className="admin-card-footer">View</Card.Text>
                            </Col>
                            <Col>
                              <Card.Text className="admin-card-icon">
                                <i className="fa fa-angle-double-right fa-1x text-white"></i>
                              </Card.Text>
                            </Col>
                          </Row>
                        </Card.Footer>
                      </Card>
                    </Link>
                  </Col>
                  <Col className="admin-col-cards">
                    <Link to={"/waiverlookup"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Waiver Search</Card.Body>
                        <Card.Footer>
                          <Row>
                            <Col xs="auto">
                              <Card.Text className="admin-card-footer">View</Card.Text>
                            </Col>
                            <Col>
                              <Card.Text className="admin-card-icon">
                                <i className="fa fa-angle-double-right fa-1x text-white"></i>
                              </Card.Text>
                            </Col>
                          </Row>
                        </Card.Footer>
                      </Card>
                    </Link>
                  </Col>
                  <Col className="admin-col-cards">
                    <Link to={"/migration"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Migration Page</Card.Body>
                        <Card.Footer>
                          <Row>
                            <Col xs="auto">
                              <Card.Text className="admin-card-footer">View</Card.Text>
                            </Col>
                            <Col>
                              <Card.Text className="admin-card-icon">
                                <i className="fa fa-angle-double-right fa-1x text-white"></i>
                              </Card.Text>
                            </Col>
                          </Row>
                        </Card.Footer>
                      </Card>
                    </Link>
                  </Col>
                </Row>
        
                {loading && <div>Loading ...</div>}
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
    )(AdminPage);