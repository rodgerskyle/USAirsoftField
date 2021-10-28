import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import { Container, Row, Col, Breadcrumb, Card} from 'react-bootstrap/';

import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';

import * as ROLES from '../constants/roles';

import PinCode from '../constants/pincode'
import { Helmet } from 'react-helmet-async';
 
class WaiverDashboard extends Component {
  constructor(props) {
    super(props);
 
    this.state = {
        loading: false,
        authorized: false,
        authUser: null,
        error: null,
      };
        this.verifyPin = this.verifyPin.bind(this)
    }


    componentDidMount() {
        this.authSubscription = this.props.firebase.onAuthUserListener((user) => {
          if (user) {
              this.setState({authUser: user})
          }
        }, () => {
          this.setState({authUser: null})
        });
    }

    componentWillUnmount() {
      this.authSubscription();
    }

    verifyPin = (val) => {
      if (this.state.authUser?.pin === parseInt(val)) {
        this.setState({authorized: true})
      }
      else {
        this.setState({error: "The pin code entered in was not correct. Please try again."}, () => {
          setTimeout(() => {
            this.setState({error: null})
          }, 4000)
        })
      }
    }

    render() {
        return (
          <div className="background-static-all">
            <Helmet>
              <title>US Airsoft Field: Waiver Dashboard</title>
            </Helmet>
            {this.state.authorized ? 
            <Container>
                <h1 className="admin-header">Waiver Dashboard</h1>
                <Breadcrumb className="admin-breadcrumb">
                  <Breadcrumb.Item active>Dashboard</Breadcrumb.Item>
                </Breadcrumb>
                <Row>
                   <Col className="admin-col-cards">
                    <Link to={"/dashboard/signup"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">New Member</Card.Body>
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
                    <Link to={"/dashboard/renewal"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Renew Member</Card.Body>
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
                    <Link to={"/dashboard/rentalform"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Rental Forms</Card.Body>
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
                <Row>
                  <Col className="admin-col-cards">
                    <Link to={"/dashboard/waiverform"} className="admin-cards-link">
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
                    <Link to={"/dashboard/waiverlookup"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Search Waiver</Card.Body>
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
                    <Link to={"/dashboard/scanwaiver"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Scan Waiver</Card.Body>
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
            </Container> : 
            <div className="div-pin-code-dashboard">
              <Container className="container-pin-code-dashboard">
                <Row className="justify-content-row row-img-logo-dashboard">
                  <img src={logo} alt="US Airsoft logo" className="img-logo-dashboard"/>
                </Row>
                <Row className="justify-content-row">
                  <h5 className="h5-dashboard">Enter the PIN Code:</h5>
                </Row>
                <Row className="justify-content-row">
                  <PinCode completePin={this.verifyPin}/>
                </Row>
                {this.state.error ?
                <Row className="justify-content-row">
                  <p className="p-error-text-dashboard">{this.state.error}</p>
                </Row> : null}
              </Container>
            </div>
            }
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