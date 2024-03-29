import React from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Switch, useLocation } from "react-router-dom";
import Login from "./Login"
import Navigation from "./Navigation"
import Footer from "./components/Pages/Footer";
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
import EnterTime from './components/Pages/entertime';
import FreeGames from './components/Pages/freegames';
// import Migration from './components/Pages/migrate';
import Leaderboard from './components/Pages/leaderboard';
import TimedLeaderboard from './components/Pages/TimedLeaderboard';
import ProfileLookup from './components/Pages/Profilelookup';
import Pricing from './components/Pages/Pricing';
import Teams from './components/Pages/Teams';
import Instagram from './components/Pages/Instagram';
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
import RenewSubscription from './components/Pages/Renew'
import WaiverDashboard from './components/Pages/Dashboard'
import UserOptions from './components/Pages/UserOptions';
import ScrollToTop from './components/constants/scrolltotop';
import Redirect from './components/constants/redirect';
import CookieConsent from "react-cookie-consent";
import PageNotFound from './components/Pages/PageNotFound';
import RentalForm from './components/Pages/RentalForm';
import Birthday from './components/Pages/Birthday';
import ScanWaiver from './components/Pages/ScanWaiver';
import About from './components/Pages/About';
import Logout from './components/constants/logout';
import Schedule from './components/Pages/Schedule';
// import EmailDashboard from './components/Pages/EmailDashboard';
import { useState } from 'react';

const App = () => (
  <Router>
    <ScrollToTop />
    <Redirect />
    <NavigationRoute />
    <Switch>
      {/* <Route exact path="/migrate">
                <Migration />
              </Route> */}
      <Route exact path="/emailoptout/:secret"
        render={(props) => (
          <EmailOptOut {...props} />
        )}
      ></Route>
      <Route exact path="/schedule">
        <Schedule />
      </Route>
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
      <Route exact path="/about">
        <About />
      </Route>
      <Route exact path="/gametypes">
        <Gametypes />
      </Route>
      <Route exact path="/rules">
        <Rules />
      </Route>
      <Route exact path="/media/videos">
        <Videos />
      </Route>
      <Route exact path="/media/instagram">
        <Instagram />
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
      <Route exact path="/admin">
        <Admin />
      </Route>
      <Route exact path="/admin/signup">
        <SignUpForm />
      </Route>
      <Route exact path="/admin/waiverform">
        <WaiverForm />
      </Route>
      <Route exact path="/admin/waiverlookup">
        <WaiverLookup />
      </Route>
      <Route exact path="/admin/renewal">
        <RenewSubscription />
      </Route>
      <Route exact path="/admin/renewal/:id"
        render={(props) => (
          <RenewSubscription {...props} />
        )}
      ></Route>
      <Route exact path="/admin/entertime">
        <EnterTime />
      </Route>
      <Route exact path="/admin/enterwins">
        <EnterWins />
      </Route>
      <Route exact path="/admin/enterlosses">
        <EnterLosses />
      </Route>
      <Route exact path="/admin/freegames">
        <FreeGames />
      </Route>
      <Route exact path="/admin/scanwaiver">
        <ScanWaiver />
      </Route>
      <Route exact path="/admin/rentalform">
        <RentalForm />
      </Route>
      <Route exact path="/admin/birthday">
        <Birthday />
      </Route>
      {/* <Route exact path="/admin/sendmail">
        <EmailDashboard />
      </Route> */}
      <Route exact path="/admin/useroptions/:id"
        render={(props) => (
          <UserOptions {...props} />
        )}
      />
      <Route exact path="/dashboard">
        <WaiverDashboard />
      </Route>
      <Route exact path="/dashboard/waiverform">
        <WaiverForm />
      </Route>
      <Route exact path="/dashboard/scanwaiver">
        <ScanWaiver />
      </Route>
      <Route exact path="/dashboard/waiverlookup">
        <WaiverLookup />
      </Route>
      <Route exact path="/dashboard/signup">
        <SignUpForm />
      </Route>
      <Route exact path="/dashboard/renewal">
        <RenewSubscription />
      </Route>
      <Route exact path="/dashboard/rentalform">
        <RentalForm />
      </Route>
      <Route exact path="/dashboard/freegames">
        <FreeGames />
      </Route>
      <Route exact path="/dashboard/birthday">
        <Birthday />
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
      <Route exact path="/logout">
        <Logout />
      </Route>
      <Route exact path="/timedleaderboard">
        <TimedLeaderboard />
      </Route>
      <Route exact path="/leaderboard">
        <Leaderboard />
      </Route>
      <Route exact path="/leaderboard/query=:query"
        render={(props) => (
          <Leaderboard {...props} />
        )}
      ></Route>
      <Route exact path="/pricing">
        <Pricing />
      </Route>
      <Route exact path="/home">
        <Home />
      </Route>
      <Route exact path="/">
        <Home />
      </Route>
      <Route component={PageNotFound} />
    </Switch>
    <FooterRoute />
    <CookieConsent>This website uses cookies to enhance the user experience.</CookieConsent>
  </Router>
);

function LoginRoute() {
  return <div><Login /></div>
}

function NavigationRoute() {
  const [nav, showNav] = useState(true);
  let location = useLocation();
  React.useEffect(() => {
    if (location.pathname.includes('/admin')) {
      showNav(false)
    }
    else {
      showNav(true)
    }
  }, [location]);

  return <div>{nav ? <Navigation /> : (null)}</div>
}

function FooterRoute() {
  const [footer, showFooter] = useState(true);
  let location = useLocation();
  React.useEffect(() => {
    if (location.pathname.includes('/admin')) {
      showFooter(false)
    }
    else {
      showFooter(true)
    }
  }, [location]);

  return <div>{footer ? <Footer /> : (null)}</div>
}

export default withAuthentication(App);
