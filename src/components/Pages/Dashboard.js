import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';

import { Container, Row, Col, Breadcrumb, Card } from 'react-bootstrap/';

import { Link } from 'react-router-dom';
import logo from '../../assets/usairsoft-small-logo.png';

import * as ROLES from '../constants/roles';

import PinCode from '../constants/pincode'
import { Helmet } from 'react-helmet-async';
import '../constants/dashboard.css';

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
        this.setState({ authUser: user })
      }
    }, () => {
      this.setState({ authUser: null })
    });
  }

  componentWillUnmount() {
    this.authSubscription();
  }

  verifyPin = (val) => {
    if (this.state.authUser?.pin === parseInt(val)) {
      this.setState({ authorized: true })
    }
    else {
      this.setState({ error: "The pin code entered in was not correct. Please try again." }, () => {
        setTimeout(() => {
          this.setState({ error: null })
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
          <div>
            <div className="admin-top">
              <Container>
                <h2 className="admin-header">Waiver Dashboard</h2>
                <Breadcrumb className="admin-breadcrumb">
                  <Breadcrumb.Item active>Dashboard</Breadcrumb.Item>
                </Breadcrumb>
              </Container>
            </div>
            <Container className="admin-container">
              <Row>
                <Col className="admin-cards-container">
                  {/* First Row of Cards */}
                  <Row className="admin-row">
                    <Col lg={3} md={6} sm={12} className="admin-col">
                      <Link to={"/dashboard/signup"} className="admin-link">
                        <Card className="admin-card">
                          <Card.Body>
                            <div className="admin-card-content">
                              <span className="admin-card-title">New Member</span>
                              <i className="fa fa-angle-double-right admin-card-icon"></i>
                            </div>
                          </Card.Body>
                        </Card>
                      </Link>
                    </Col>
                    <Col lg={3} md={6} sm={12} className="admin-col">
                      <Link to={"/dashboard/renew"} className="admin-link">
                        <Card className="admin-card">
                          <Card.Body>
                            <div className="admin-card-content">
                              <span className="admin-card-title">Renew Member</span>
                              <i className="fa fa-angle-double-right admin-card-icon"></i>
                            </div>
                          </Card.Body>
                        </Card>
                      </Link>
                    </Col>
                    <Col lg={3} md={6} sm={12} className="admin-col">
                      <Link to={"/dashboard/rentalform"} className="admin-link">
                        <Card className="admin-card">
                          <Card.Body>
                            <div className="admin-card-content">
                              <span className="admin-card-title">Rental Forms</span>
                              <i className="fa fa-angle-double-right admin-card-icon"></i>
                            </div>
                          </Card.Body>
                        </Card>
                      </Link>
                    </Col>
                    <Col lg={3} md={6} sm={12} className="admin-col">
                      <Link to={"/dashboard/birthday"} className="admin-link">
                        <Card className="admin-card">
                          <Card.Body>
                            <div className="admin-card-content">
                              <span className="admin-card-title">Calendar</span>
                              <i className="fa fa-angle-double-right admin-card-icon"></i>
                            </div>
                          </Card.Body>
                        </Card>
                      </Link>
                    </Col>
                  </Row>
                  {/* Second Row of Cards */}
                  <Row className="admin-row">
                    <Col lg={3} md={6} sm={12} className="admin-col">
                      <Link to={"/dashboard/waiverform"} className="admin-link">
                        <Card className="admin-card">
                          <Card.Body>
                            <div className="admin-card-content">
                              <span className="admin-card-title">Sign Waiver</span>
                              <i className="fa fa-angle-double-right admin-card-icon"></i>
                            </div>
                          </Card.Body>
                        </Card>
                      </Link>
                    </Col>
                    <Col lg={3} md={6} sm={12} className="admin-col">
                      <Link to={"/dashboard/waiverlookup"} className="admin-link">
                        <Card className="admin-card">
                          <Card.Body>
                            <div className="admin-card-content">
                              <span className="admin-card-title">Search Waiver</span>
                              <i className="fa fa-angle-double-right admin-card-icon"></i>
                            </div>
                          </Card.Body>
                        </Card>
                      </Link>
                    </Col>
                    <Col lg={3} md={6} sm={12} className="admin-col">
                      <Link to={"/dashboard/scanwaiver"} className="admin-link">
                        <Card className="admin-card">
                          <Card.Body>
                            <div className="admin-card-content">
                              <span className="admin-card-title">Scan Waiver</span>
                              <i className="fa fa-angle-double-right admin-card-icon"></i>
                            </div>
                          </Card.Body>
                        </Card>
                      </Link>
                    </Col>
                    <Col lg={3} md={6} sm={12} className="admin-col">
                      <Link to={"/dashboard/freegames"} className="admin-link">
                        <Card className="admin-card">
                          <Card.Body>
                            <div className="admin-card-content">
                              <span className="admin-card-title">Check Free Games</span>
                              <i className="fa fa-angle-double-right admin-card-icon"></i>
                            </div>
                          </Card.Body>
                        </Card>
                      </Link>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </Container>
          </div>
          :
          <div className="div-pin-code-dashboard">
            <Container className="container-pin-code-dashboard">
              <Row className="justify-content-row row-img-logo-dashboard">
                <img src={logo} alt="US Airsoft logo" className="img-logo-dashboard" />
              </Row>
              <Row className="justify-content-row">
                <h5 className="h5-dashboard">Enter the PIN Code:</h5>
              </Row>
              <Row className="justify-content-row">
                <PinCode completePin={this.verifyPin} />
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
  authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default withAuthorization(condition)(withFirebase(WaiverDashboard));

// export default composeHooks(
//     withAuthorization(condition),
//     withFirebase,
//     )(WaiverDashboard);