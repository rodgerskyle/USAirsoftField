import React, { Component, useState } from 'react';
import { Container, Row, Col, InputGroup, FormControl, Button } from 'react-bootstrap/';
import { Link } from "react-router-dom";
import { AuthUserContext } from '../session';
import { withFirebase } from '../Firebase';
import * as ROLES from "../constants/roles";
import fblogo from '../../assets/SocialMedia/facebook.png';
import twlogo from '../../assets/SocialMedia/twitter.png';
import iglogo from '../../assets/SocialMedia/instagram.png';
import ytlogo from '../../assets/SocialMedia/youtube.png';
import { encode } from 'firebase-encode';
import logo from '../../assets/usairsoft-small-logo.png';

const FOOTER_LINKS = [
  { label: 'Store', href: 'https://www.usairsoft.com', external: true },
  { label: 'About Us', href: '/about' },
  { label: 'Contact Us', href: '/contact' },
];

const SOCIAL_LINKS = [
  { href: 'https://www.facebook.com/USAirsoftworld/', icon: fblogo, label: 'Facebook' },
  { href: 'https://www.instagram.com/usairsoftworld/', icon: iglogo, label: 'Instagram' },
  { href: 'https://twitter.com/usairsoftworld', icon: twlogo, label: 'Twitter' },
  { href: 'https://www.youtube.com/user/USAirsoftWorldInc', icon: ytlogo, label: 'YouTube' },
];

class Footer extends Component {
  render() {
    return (
      <AuthUserContext.Consumer>
        {authUser =>
          authUser
            ? !!authUser.roles[ROLES.WAIVER]
              ? null
              : <FooterAuth />
            : <FooterNonAuth emailMenu={this.props.firebase.emailOptMenu()} />
        }
      </AuthUserContext.Consumer>
    );
  }
}

function validateEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

function subscribe(event, passedEmail, emailMenu, setStatus) {
  event.preventDefault();

  if (passedEmail === "") {
    setStatus("Please enter an email!");
    setTimeout(() => setStatus(""), 10000);
    return;
  }

  if (!validateEmail(passedEmail)) {
    setStatus("Email is not properly formatted.");
    setTimeout(() => setStatus(""), 10000);
    return;
  }

  emailMenu({ secret: null, email: encode(passedEmail.toLowerCase()), choice: "in" })
    .then((result) => {
      if (result) {
        setStatus(result.data.status);
        setTimeout(() => setStatus(""), 10000);
      }
    })
    .catch((error) => {
      console.log(error);
    });
}

const FooterLinks = () => (
  <div className="public-footer-links">
    {FOOTER_LINKS.map((link) => (
      link.external ? (
        <a
          key={link.label}
          className="public-footer-link"
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {link.label}
        </a>
      ) : (
        <Link key={link.label} className="public-footer-link" to={link.href}>
          {link.label}
        </Link>
      )
    ))}
  </div>
);

const FooterSocials = () => (
  <div className="public-footer-socials">
    {SOCIAL_LINKS.map((link) => (
      <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="public-footer-social-link">
        <img src={link.icon} alt={link.label} className="socials-icons-footer" />
      </a>
    ))}
  </div>
);

const FooterLayout = ({ children }) => (
  <div className="topdiv-footer public-footer-shell">
    <Container>
      <div className="divider-footer" />
      <div className="public-footer-surface">
        <div className="public-footer-header">
          <p className="public-section-kicker">Stay Connected</p>
          <h3 className="public-footer-title">US Airsoft</h3>
        </div>
        {children}
        <FooterLinks />
        <FooterSocials />
        <Row className="justify-content-row">
          <Col className="col-image-home">
            <img src={logo} alt="US Airsoft logo" className="small-logo-home2 hours-logo-home public-footer-logo" />
          </Col>
        </Row>
      </div>
    </Container>
  </div>
);

const FooterAuth = () => (
  <FooterLayout />
);

function FooterNonAuth({ emailMenu }) {
  const [status, setStatus] = useState(null);
  const [value, setValue] = useState("");

  return (
    <FooterLayout>
      <div className="public-footer-subscribe">
        <InputGroup className="mb-1 input-group-footer">
          <FormControl
            placeholder="Subscribe to our mailing list"
            aria-label="Subscribe to our mailing list"
            className="footer-text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button
            variant="outline-primary"
            className="footer-text public-footer-subscribe-button"
            onClick={(e) => {
              subscribe(e, value, emailMenu, setStatus);
              setValue("");
            }}
          >
            Subscribe
          </Button>
        </InputGroup>
        {status ? <div className="status-row-footer">{status}</div> : null}
      </div>
    </FooterLayout>
  );
}

export default withFirebase(Footer);
