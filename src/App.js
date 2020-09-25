import React from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Login from "./Login"
import Navigation from "./Navigation"
import { withAuthentication } from './components/session';
import { PasswordForgetForm } from './passwordForgot';
import AccountPage from './components/Pages/Account';
import ProfileSettings from './components/Pages/Profilesettings';
import Home from './components/Pages/home'
import Admin from './components/Pages/Admin'
import SignUpForm from './components/Pages/Signup'
import EnterWins from './components/Pages/enterwins';
import EnterLosses from './components/Pages/enterlosses';
import FreeGames from './components/Pages/freegames';
import Migration from './components/Pages/migrate';
import Leaderboard from './components/Pages/leaderboard';
import ProfileLookup from './components/Pages/Profilelookup';
import Pricing from './components/Pages/Pricing';
import Teams from './components/Pages/Teams';
import Pictures from './components/Pages/Pictures';
import Videos from './components/Pages/Videos';
import Rules from './components/Pages/Rules';
import Gametypes from './components/Pages/Gametypes';
import Contact from './components/Pages/Contact';
import Membership from './components/Pages/Membership';
import Waiver from './components/Pages/Waiver';
import Map from './components/Pages/Map';
import Teampage from './components/Pages/Teampage'
import Teammanage from './components/Pages/Teammanage'
import Teamcreate from './components/Pages/Teamcreate'
import Teamjoin from './components/Pages/Teamjoin'

const App = () => (
      <Router>
          <Navigation />
          <Switch>
            <Route path="/map">
              <Map />
            </Route>
            <Route path="/waiver">
              <Waiver />
            </Route>
            <Route path="/membership">
              <Membership />
            </Route>
            <Route path="/contact">
              <Contact />
            </Route>
            <Route path="/gametypes">
              <Gametypes/>
            </Route>
            <Route path="/rules">
              <Rules />
            </Route>
            <Route path="/videos">
              <Videos />
            </Route>
            <Route path="/pictures">
              <Pictures />
            </Route>
            <Route exact path="/teams">
              <Teams />
            </Route>
            <Route exact path="/teams/:id"
            render={(props) => (
              <Teampage {...props} />
            )}
            ></Route>
            <Route exact path="/manageteam">
              <Teammanage />
            </Route>
            <Route exact path="/createteam">
              <Teamcreate />
            </Route>
            <Route exact path="/jointeam">
              <Teamjoin />
            </Route>
            <Route exact path="/profilelookup/:id"
            render={(props) => (
              <ProfileLookup {...props} />
            )}
            >
            </Route>
            <Route path="/profilesettings">
              <ProfileSettings />
            </Route>
            <Route path="/signup">
              <SignUpForm />
            </Route>
            <Route path="/enterwins">
              <EnterWins />
            </Route>
            <Route path="/enterlosses">
              <EnterLosses />
            </Route>
            <Route path="/freegames">
              <FreeGames />
            </Route>
            <Route path="/migration">
              <Migration />
            </Route>
            <Route path="/register">
              <SignUpForm />
            </Route>
            <Route path="/admin">
              <Admin />
            </Route>
            <Route path="/account">
              <AccountPage />
            </Route>
            <Route path="/forgotpassword">
              <PasswordForgetForm />
            </Route>
            <Route path="/login">
              <LoginRoute />
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
      </Router>
);

function LoginRoute() {
  return <div className="pagePlaceholder"><Login /></div>
}
export default withAuthentication(App);
