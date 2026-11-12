import React from 'react';
import { Link } from "react-router-dom";
import { Navbar, Nav, Container } from 'react-bootstrap';
import { useAppearance } from '../../Appearance';
import AppearanceControl from '../../AppearanceControl';
import logo from '../../assets/usairsoft-small-logo.png';
import '../constants/admin.css';

const AdminNav = ({ component }) => {
  const appearance = useAppearance();

  return (
    <div className="admin-layout">
      <Navbar className="admin-navbar" aria-label="Staff navigation">
        <Container fluid>
          <Navbar.Brand as={Link} to="/admin">
            <img
              src={logo}
              alt=""
              className="admin-nav-logo"
            />
            <span>Staff</span>
          </Navbar.Brand>
          <Nav className="staff-dashboard__nav-actions">
            <Link to="/" className="staff-dashboard__site-link" aria-label="Back to website">Website</Link>
            {appearance && <AppearanceControl {...appearance} />}
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
