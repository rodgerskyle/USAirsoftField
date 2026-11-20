import React from 'react';
import './App.css';
import './components/constants/waiver-status.css';
import { BrowserRouter as Router, Route, Routes, useLocation, useMatch, Navigate } from "react-router-dom";
import Login from "./Login"
import Navigation from "./Navigation"
import Footer from "./components/Pages/Footer";
import { withAuthentication } from './components/session';
import { PasswordForgetForm } from './passwordForgot';
import AccountPage from './components/Pages/Account';
import ProfileSettings from './components/Pages/Profilesettings';
import Home from './components/Pages/home'
import PlayerHub from './components/Pages/PlayerHub';
import LivePolls from './components/Pages/LivePolls';
import AnonymousSuggestions from './components/Pages/AnonymousSuggestions';
import PlayerComparison from './components/Pages/PlayerComparison';
import PlayerMilestones from './components/Pages/PlayerMilestones';
import GroupCheckIn from './components/Pages/GroupCheckIn';
import VirtualPatches from './components/Pages/VirtualPatches';
import Admin from './components/Pages/Admin'
import AdminLayout, { AdminThemeRoute } from './components/constants/admindrawer';
import AdminFieldTools from './components/Pages/AdminFieldTools';
import BarracksTV from './components/Pages/BarracksTV';
import { fieldStaffPaths } from './components/constants/fieldStaffApi';
import SignUpForm from './components/Pages/Signup'
import WaiverForm from './components/Pages/FillOutWaiver'
import EnterWins from './components/Pages/enterwins';
import EnterLosses from './components/Pages/enterlosses';
import ScoreEntry from './components/Pages/ScoreEntry';
import FreeGames from './components/Pages/freegames';
// import Migration from './components/Pages/migrate';
import Leaderboard, { LegacyLeaderboardTvRedirect, LEGACY_LEADERBOARD_TV_PATH } from './components/Pages/leaderboard';
import TeamLeaderboard from './components/Pages/TeamLeaderboard';
import ProfileLookup from './components/Pages/Profilelookup';
import Pricing from './components/Pages/Pricing';
import Teams from './components/Pages/Teams';
import Instagram from './components/Pages/Instagram';
import Videos from './components/Pages/Videos';
import Rules from './components/Pages/Rules';
import RulesClassicPage from './components/Pages/RulesClassicPage';
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
import { useAppearance } from './Appearance';
import PageNotFound from './components/Pages/PageNotFound';
import Birthday from './components/Pages/Birthday';
import ScanWaiver from './components/Pages/ScanWaiver';
import About from './components/Pages/About';
import Logout from './components/constants/logout';
import Schedule from './components/Pages/Schedule';
import PartiesAndEvents from './components/Pages/PartiesAndEvents';
// import EmailDashboard from './components/Pages/EmailDashboard';
import RentalsManagement from './components/Pages/RentalsManagement';

const App = () => (
  <Router>
    <a className="field-skip-link" href="#field-content" onClick={focusContent}>Skip to content</a>
    <ScrollToTop />
    <Redirect />
    <NavigationRoute />
    <div id="field-content" tabIndex={-1}>
    <Routes>
      {/* <Route exact path="/migrate">
                  <Migration />
                </Route> */}
      <Route exact path="/emailoptout/:secret"
        render={(props) => (
          <EmailOptOut {...props} />
        )}
      ></Route>
      <Route exact path="/events" element={<Navigate to="/pricing" replace />} />
      <Route exact path="/schedule" element={<Schedule />} />
      <Route path="/live-polls" element={<LivePolls />} />
      <Route path="/suggestions" element={<AnonymousSuggestions />} />
      <Route path="/player-hub" element={<PlayerHub />} />
      <Route path="/player-comparison" element={<PlayerComparison />} />
      <Route path="/player-milestones/:id" element={<PlayerMilestones />} />
      <Route path="/group-check-in" element={<GroupCheckIn />} />
      <Route path="/virtual-patches" element={<VirtualPatches />} />
      <Route exact path="/map" element={<Map />} />
      <Route exact path="/waiver" element={<Waiver />} />
      <Route exact path="/membership" element={<Membership />} />
      <Route exact path="/contact" element={<Contact />} />
      <Route exact path="/information/contact" element={<Contact />} />
      <Route exact path="/about" element={<About />} />
      <Route exact path="/information/gametypes" element={<Gametypes />} />
      <Route exact path="/information/rules" element={<Rules />} />
      <Route path="/information/rules/classic" element={<RulesClassicPage />} />
      <Route exact path="/media/youtube" element={<Videos />} />
      <Route exact path="/media/instagram" element={<Instagram />} />
      <Route exact path="/teams" element={<Teams />} />
      <Route exact path="/teams/:team" element={<Teampage />} />
      <Route exact path="/manageteam" element={<Teammanage />} />
      <Route exact path="/createteam" element={<Teamcreate />} />
      <Route exact path="/jointeam" element={<Teamjoin />} />
      <Route exact path="/profilelookup/:id" element={<ProfileLookup />} />
      <Route exact path="/profilesettings" element={<ProfileSettings />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Admin />} />
        <Route path="field/:tool" element={<AdminFieldTools />} />
        <Route path="signup" element={<SignUpForm />} />
        <Route path="waiverform" element={<WaiverForm />} />
        <Route path="waiverlookup" element={<WaiverLookup />} />
        <Route path="renewal" element={<RenewSubscription />} />
        <Route path="renewal/:id" element={<RenewSubscription />} />
        <Route path="scores" element={<ScoreEntry />} />
        <Route path="enterwins" element={<EnterWins />} />
        <Route path="enterlosses" element={<EnterLosses />} />
        <Route path="freegames" element={<FreeGames />} />
        <Route path="scanwaiver" element={<ScanWaiver />} />
        <Route path="rentalform" element={<RentalsManagement />} />
        <Route path="birthday" element={<Birthday />} />
        <Route path="useroptions/:id" element={<UserOptions />} />
      </Route>
      <Route path={fieldStaffPaths.tv} element={<BarracksTV />} />
      <Route path={LEGACY_LEADERBOARD_TV_PATH} element={<LegacyLeaderboardTvRedirect />} />
      <Route path="/dashboard" element={<AdminThemeRoute />}>
        <Route index element={<WaiverDashboard />} />
        <Route path="waiverform" element={<WaiverForm />} />
        <Route path="scanwaiver" element={<ScanWaiver />} />
        <Route path="waiverlookup" element={<WaiverLookup />} />
        <Route path="signup" element={<SignUpForm />} />
        <Route path="renewal" element={<RenewSubscription />} />
        <Route path="rentalform" element={<RentalsManagement />} />
        <Route path="freegames" element={<FreeGames />} />
        <Route path="birthday" element={<Birthday />} />
      </Route>
      <Route exact path="/account" element={<AccountPage />} />
      <Route exact path="/forgotpassword" element={<PasswordForgetForm />} />
      <Route exact path="/login" element={<LoginRoute />} />
      <Route exact path="/logout" element={<Logout />} />
      <Route exact path="/leaderboard" element={<Leaderboard />} />
      <Route path="/leaderboard/:view" element={<Leaderboard />} />
      <Route path="/team-leaderboard" element={<TeamLeaderboard />} />
      <Route exact path="/pricing" element={<Pricing />} />
      <Route exact path="/information/pricing" element={<Navigate to="/pricing" replace />} />
      <Route exact path="/home" element={<Home />} />
      <Route exact path="/" element={<Home />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </div>
    <FooterRoute />
    <CookieConsentRoute />
  </Router>
);

function focusContent(event) {
  const content = document.getElementById('field-content');
  if (content) {
    event.preventDefault();
    content.focus();
  }
}

function LoginRoute() {
  return <div><Login /></div>
}

function useTvDisplay() {
  const legacy = useMatch(LEGACY_LEADERBOARD_TV_PATH);
  const leaderboard = useMatch('/leaderboard/:view?');
  const barracks = useMatch(fieldStaffPaths.tv);
  const { search } = useLocation();
  return Boolean(barracks || legacy || (leaderboard && new URLSearchParams(search).get('display') === 'tv'));
}

function CookieConsentRoute() {
  const tvDisplay = useTvDisplay();
  const light = useAppearance()?.theme === 'light';
  return tvDisplay ? null : (
    <CookieConsent
      style={light ? { background: 'var(--usaw-raised)', color: 'var(--usaw-light-ink)', borderTop: '1px solid var(--usaw-line)' } : undefined}
      buttonStyle={light ? { color: 'var(--usaw-light-ink)' } : undefined}
    >
      This website uses cookies to enhance the user experience.
    </CookieConsent>
  );
}

function NavigationRoute() {
  const tvDisplay = useTvDisplay();
  const admin = useMatch('/admin/*');
  return tvDisplay || admin ? null : <Navigation />;
}

function FooterRoute() {
  const tvDisplay = useTvDisplay();
  const admin = useMatch('/admin/*');
  return tvDisplay || admin ? null : <Footer />;
}

export default withAuthentication(App);
