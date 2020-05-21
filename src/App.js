import React, { Component } from 'react';
import banner from './assets/airsoftbanner.jpg';
import logo from './assets/us-airsoft-logo.png';
import './App.css';
import { Navbar, Nav, Button, NavItem } from 'react-bootstrap/';
import { Link, BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { LinkContainer } from "react-router-bootstrap";


class App extends Component {
  render() {
    return (
      <Router>
        <div className="staticBG">
          <div className="App-header">
            <div className="logobox">
              <img src={logo} className="logo" />
            </div>
            <div className="login">
              <Button variant="outline-success">
                <LinkContainer to="/login">
                  <NavItem>Login</NavItem>
                </LinkContainer>
              </Button>
            </div>
          </div>
          <div className="navbar">
            <Navbar collapseOnSelect expand="lg" bg="dark" variant="dark">
              <Nav className="mr-auto">
                <NavItem>
                  <Link className="nav-link" to="/">Home</Link>
                </NavItem>
              </Nav>
              <Navbar.Toggle aria-controls="responsive-navbar-nav" />
              <Navbar.Collapse id="responsive-navbar-nav">
                <Nav className="mr-auto">
                  <NavItem>   
                    <Link className="nav-link" to="/leaderboard">Leaderboard</Link> 
                  </NavItem>
                  <NavItem>    
                    <Link className="nav-link" to="/pricing">Pricing</Link> 
                  </NavItem>
                </Nav>
              </Navbar.Collapse>
            </Navbar>
          </div>
          <Switch>
            <Route path="/login">
              <Login />
            </Route>
            <Route path="/leaderboard">
              <Leaderboard />
            </Route>
            <Route path="/pricing">
              <Pricing />
            </Route>
            <Route path="/">
              <Home />
            </Route>
          </Switch>
        </div>
      </Router>
    );
  }
}
function Home() {
  return <div className="banner">
    <img src={banner} className="bannerimg" />
    <div className="overlay"></div>
    <div className="overlayText">
      The premier airsoft arena in the United States, Home of the first Stat Tracking & Leaderboard system!
            </div>
  </div>;
}
function Leaderboard() {
  return <h2 className="pagePlaceholder">Leaderboard</h2>;
}
function Pricing() {
  return <h2 className="pagePlaceholder">Pricing</h2>;
}
function Login() {
  return <h2 className="pagePlaceholder">Login</h2>;
}
export default App;
