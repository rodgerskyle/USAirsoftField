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

const App = () => (
      <Router>
        <div className="staticBG">
          <Navigation />
          <Switch>
            <Route path="/teams">
              <Teams />
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
        </div>
      </Router>
);

function LoginRoute() {
  return <div className="pagePlaceholder"><Login /></div>
}
export default withAuthentication(App);
