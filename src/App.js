import React from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
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
import FreeGames from './components/Pages/freegames';
// import Migration from './components/Pages/migrate';
import Leaderboard from './components/Pages/leaderboard';
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
    <Routes>
      {/* <Route exact path="/migrate">
                  <Migration />
                </Route> */}
      <Route exact path="/emailoptout/:secret"
        render={(props) => (
          <EmailOptOut {...props} />
        )}
      ></Route>
      <Route exact path="/schedule" element={<Schedule />} />
      <Route exact path="/map" element={<Map />} />
      <Route exact path="/waiver" element={<Waiver />} />
      <Route exact path="/membership" element={<Membership />} />
      <Route exact path="/information/contact" element={<Contact />} />
      <Route exact path="/about" element={<About />} />
      <Route exact path="/information/gametypes" element={<Gametypes />} />
      <Route exact path="/information/rules" element={<Rules />} />
      <Route exact path="/media/youtube" element={<Videos />} />
      <Route exact path="/media/instagram" element={<Instagram />} />
      <Route exact path="/teams" element={<Teams />} />
      <Route exact path="/teams/:team" element={<Teampage />} />
      <Route exact path="/manageteam" element={<Teammanage />} />
      <Route exact path="/createteam" element={<Teamcreate />} />
      <Route exact path="/jointeam" element={<Teamjoin />} />
      <Route exact path="/profilelookup/:id" element={<ProfileLookup />} />
      <Route exact path="/profilesettings" element={<ProfileSettings />} />
      <Route exact path="/admin" element={<Admin />} />
      <Route exact path="/admin/signup" element={<SignUpForm />} />
      <Route exact path="/admin/waiverform" element={<WaiverForm />} />
      <Route exact path="/admin/waiverlookup" element={<WaiverLookup />} />
      <Route exact path="/admin/renewal" element={<RenewSubscription />} />
      <Route exact path="/admin/renewal/:id" element={<RenewSubscription />} />
      <Route exact path="/admin/enterwins" element={<EnterWins />} />
      <Route exact path="/admin/enterlosses" element={<EnterLosses />} />
      <Route exact path="/admin/freegames" element={<FreeGames />} />
      <Route exact path="/admin/scanwaiver" element={<ScanWaiver />} />
      <Route exact path="/admin/rentalform" element={<RentalForm />} />
      <Route exact path="/admin/birthday" element={<Birthday />} />
      <Route exact path="/admin/useroptions/:id" element={<UserOptions />} />
      <Route exact path="/dashboard" element={<WaiverDashboard />} />
      <Route exact path="/dashboard/waiverform" element={<WaiverForm />} />
      <Route exact path="/dashboard/scanwaiver" element={<ScanWaiver />} />
      <Route exact path="/dashboard/waiverlookup" element={<WaiverLookup />} />
      <Route exact path="/dashboard/signup" element={<SignUpForm />} />
      <Route exact path="/dashboard/renewal" element={<RenewSubscription />} />
      <Route exact path="/dashboard/rentalform" element={<RentalForm />} />
      <Route exact path="/dashboard/freegames" element={<FreeGames />} />
      <Route exact path="/dashboard/birthday" element={<Birthday />} />
      <Route exact path="/account" element={<AccountPage />} />
      <Route exact path="/forgotpassword" element={<PasswordForgetForm />} />
      <Route exact path="/login" element={<LoginRoute />} />
      <Route exact path="/logout" element={<Logout />} />
      <Route exact path="/leaderboard" element={<Leaderboard />} />
      <Route exact path="/leaderboard/query=:query"
        render={(props) => (
          <Leaderboard {...props} />
        )}
      ></Route>
      <Route exact path="/information/pricing" element={<Pricing />} />
      <Route exact path="/home" element={<Home />} />
      <Route exact path="/" element={<Home />} />
      <Route element={<PageNotFound />} />
    </Routes>
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
