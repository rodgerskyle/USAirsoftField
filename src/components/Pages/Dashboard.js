
import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import { Container, Row, Col, Breadcrumb, Card} from 'react-bootstrap/';

import { Link } from 'react-router-dom';

import * as ROLES from '../constants/roles';
 
class WaiverDashboard extends Component {
  constructor(props) {
    super(props);
 
    this.state = {
        loading: false,
      };
    }

    render() {
        return (
          <div className="background-static-all">
            <Container>
                <h1 className="admin-header">Waiver Dashboard</h1>
                <Breadcrumb className="admin-breadcrumb">
                  <Breadcrumb.Item active>Dashboard</Breadcrumb.Item>
                </Breadcrumb>
                <Row>
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
                    <Link to={"/renewal"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Membership Renewal</Card.Body>
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
                </Row>
            </Container>
          </div>
        );
      }
    }
    
const condition = authUser =>
    authUser && !!authUser.roles[ROLES.WAIVER];
 
export default compose(
    withAuthorization(condition),
    withFirebase,
    )(WaiverDashboard);