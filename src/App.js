import React, { Component } from 'react';
import banner from './assets/airsoftbanner.jpg';
import logo from './assets/us-airsoft-logo.png';
import './App.css';
import {Navbar, Nav, Button} from 'react-bootstrap/';

class App extends Component {
  render() {
    return (
      <div className="staticBG">
          <div className="App-header">
            <div className="logobox">
              <img src={logo} className="logo" />
            </div>
            <div className="login">
              <Button variant="outline-success">Login</Button>
            </div>
          </div>
        <div className="navbar">
          <Navbar collapseOnSelect expand="lg" bg="dark" variant="dark">
            <Navbar.Brand href="blank">Home</Navbar.Brand>
            <Navbar.Toggle aria-controls="responsive-navbar-nav" />
            <Navbar.Collapse id="responsive-navbar-nav">
              <Nav className="mr-auto">
                <Nav.Link href="blah">Leaderboard</Nav.Link>
                <Nav.Link href="blah">Pricing</Nav.Link>
              </Nav>
            </Navbar.Collapse>
          </Navbar>
        </div>
          <div className="banner">
            <img src={banner} className="bannerimg"/>
            <div className="overlay"></div>
            <div className="overlayText">
              The premier airsoft arena in the United States, Home of the first Stat Tracking & Leaderboard system!
            </div>
          </div>
      </div>
    );
  }
}

export default App;
