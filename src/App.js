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
import WaiverForm from './components/Pages/FillOutWaiver'
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
import WaiverLookup from './components/Pages/waiverlookup'
import EmailOptOut from './components/Pages/emailOptOut'

const App = () => (
      <Router>
          <Navigation />
          <Switch>
            <Route exact path="/emailoptout/:secret"
            render={(props) => (
              <EmailOptOut {...props} />
            )}
            ></Route>
            <Route exact path="/map">
              <Map />
            </Route>
            <Route exact path="/waiver">
              <Waiver />
            </Route>
            <Route exact path="/membership">
              <Membership />
            </Route>
            <Route exact path="/contact">
              <Contact />
            </Route>
            <Route exact path="/gametypes">
              <Gametypes/>
            </Route>
            <Route exact path="/rules">
              <Rules />
            </Route>
            <Route exact path="/videos">
              <Videos />
            </Route>
            <Route exact path="/pictures">
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
            <Route exact path="/profilesettings">
              <ProfileSettings />
            </Route>
            <Route exact path="/signup">
              <SignUpForm />
            </Route>
            <Route exact path="/waiverform">
              <WaiverForm />
            </Route>
            <Route exact path="/waiverlookup">
              <WaiverLookup />
            </Route>
            <Route exact path="/enterwins">
              <EnterWins />
            </Route>
            <Route exact path="/enterlosses">
              <EnterLosses />
            </Route>
            <Route exact path="/freegames">
              <FreeGames />
            </Route>
            <Route exact path="/migration">
              <Migration />
            </Route>
            <Route exact path="/register">
              <SignUpForm />
            </Route>
            <Route exact path="/admin">
              <Admin />
            </Route>
            <Route exact path="/account">
              <AccountPage />
            </Route>
            <Route exact path="/forgotpassword">
              <PasswordForgetForm />
            </Route>
            <Route exact path="/login">
              <LoginRoute />
            </Route>
            <Route exact path="/leaderboard">
              <Leaderboard />
            </Route>
            <Route exact path="/pricing">
              <Pricing />
            </Route>
            <Route exact path="/">
              <Home />
            </Route>
          </Switch>
      </Router>
);

function LoginRoute() {
  return <div className="pagePlaceholder"><Login /></div>
}
export default withAuthentication(App);
