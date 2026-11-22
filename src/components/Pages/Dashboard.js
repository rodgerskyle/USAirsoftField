import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';

import { Container, Row, Breadcrumb } from 'react-bootstrap/';

import { Link } from 'react-router-dom';
import logo from '../../assets/usairsoft-small-logo.png';

import * as ROLES from '../constants/roles';

import PinCode from '../constants/pincode'
import { Helmet } from 'react-helmet-async';
import '../constants/dashboard.css';

const deskSections = [
  { name: 'Waivers', links: [
    ['waiverlookup', 'Find a signed waiver', 'search'],
    ['waiverform', 'Sign a waiver', 'pencil'],
    ['scanwaiver', 'Scan a paper waiver', 'camera'],
  ] },
  { name: 'Membership', links: [
    ['signup', 'Register a member', 'user-plus'],
    ['renewal', 'Renew a membership', 'refresh'],
    ['freegames', 'Redeem a free game', 'ticket'],
  ] },
  { name: 'Parties and rentals', links: [
    ['birthday', 'Party calendar', 'calendar'],
    ['rentalform', 'Rental forms', 'list-alt'],
  ] },
];

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
      <div className="admin-container admin-compact-page waiver-dashboard-shell">
        <Helmet>
          <title>US Airsoft Field: Waiver Dashboard</title>
        </Helmet>
        {this.state.authorized ?
          <Container className="admin-content waiver-dashboard-content">
              <div className="admin-page-header">
                <h2 className="admin-header">Waiver Dashboard</h2>
                <Breadcrumb className="admin-breadcrumb admin-page-breadcrumb">
                  <Breadcrumb.Item active>Dashboard</Breadcrumb.Item>
                </Breadcrumb>
              </div>
              <nav aria-label="Front desk tasks" className="waiver-desk-sections">
                {deskSections.map(({ name, links }) => (
                  <section key={name} className="waiver-desk-section">
                    <h3>{name}</h3>
                    <ul>
                      {links.map(([path, title, icon]) => (
                        <li key={path}>
                          <Link to={`/dashboard/${path}`}>
                            <i className={`fa fa-${icon}`} aria-hidden="true" />
                            {title}
                            <i className="fa fa-angle-right" aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </nav>
          </Container>
          :
          <div className="admin-pin-shell">
            <Container className="admin-pin-panel">
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
                  <p role="alert" className="p-error-text-dashboard">{this.state.error}</p>
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
