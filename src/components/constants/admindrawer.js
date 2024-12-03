import React from 'react';
import { Link } from "react-router-dom";
import { Navbar, Nav, Container } from 'react-bootstrap';
import logo from '../../assets/usairsoft-small-logo.png';
import '../constants/admin.css';

const AdminNav = ({ component }) => {
  return (
    <div className="admin-layout">
      <Navbar className="admin-navbar" variant="dark" fixed="top">
        <Container fluid>
          <Navbar.Brand as={Link} to="/admin">
            <img
              src={logo}
              alt="US Airsoft logo"
              className="admin-nav-logo"
            />
            <span className="ms-2">Administrative Panel</span>
          </Navbar.Brand>
          <Nav>
            <Nav.Link as={Link} to="/" className="nav-link-light">
              <i className="fa fa-home me-1"></i>
              Back to Website
            </Nav.Link>
          </Nav>
        </Container>
      </Navbar>

      <div className="admin-main-content">
        {component}
      </div>
    </div>
  );
};

export default AdminNav;