import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { faFacebookF, faInstagram, faYoutube } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getDownloadURL } from 'firebase/storage';
import { withFirebase } from './components/Firebase';
import * as ROLES from './components/constants/roles';
import logo from './assets/usairsoft-wide-logo.png';
import shieldLogo from './assets/usairsoft-small-logo.png';
import AppearanceControl from './AppearanceControl';
import { useAppearance } from './Appearance';
import defaultProfile from './assets/default.png';
import './Navigation.css';

const VISIT_LINKS = [
    ['/pricing', 'Pricing & parties'],
    ['/schedule', 'Schedule'],
    ['/map', 'Field map'],
    ['/contact', 'Contact & directions'],
];

const PLAY_LINKS = [
    ['/information/rules', 'Field rules'],
    ['/information/gametypes', 'Game modes'],
    ['/leaderboard', 'Leaderboard'],
];

const SOCIAL_LINKS = [
    ['https://www.facebook.com/USAirsoftworld/', 'Facebook', faFacebookF],
    ['https://www.instagram.com/usairsoftworld/', 'Instagram', faInstagram],
    ['https://www.youtube.com/user/USAirsoftWorldInc', 'YouTube', faYoutube],
];

function SiteLink({ to, children, ...props }) {
    return <NavLink to={to} end={to !== '/dashboard' && to !== '/admin'} {...props}>{children}</NavLink>;
}

function LinkList({ items, onSelect }) {
    return (
        <ul className="usaw-nav__links">
            {items.map(([to, label]) => (
                <li key={to}><SiteLink to={to} onClick={onSelect}>{label}</SiteLink></li>
            ))}
        </ul>
    );
}

function Chevron() {
    return <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="m2.5 4.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function AccountIcon() {
    return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.6" /><path d="M5 19c.7-3.5 3-5.2 7-5.2s6.3 1.7 7 5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}

function StoreLink() {
    return (
        <a className="usaw-nav__store" href="https://www.usairsoft.com" target="_blank" rel="noopener noreferrer">
            Online store
        </a>
    );
}

function SocialLinks() {
    return (
        <div className="usaw-nav__social" aria-label="US Airsoft social channels">
            {SOCIAL_LINKS.map(([href, label, icon]) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                    <FontAwesomeIcon icon={icon} aria-hidden="true" />
                </a>
            ))}
        </div>
    );
}

function NavigationLayout({ authUser, profilePic }) {
    const location = useLocation();
    const appearance = useAppearance();
    const header = useRef(null);
    const triggers = useRef({});
    const [open, setOpen] = useState('');
    const waiverOnly = Boolean(authUser?.roles?.[ROLES.WAIVER]);
    const waiverKiosk = waiverOnly && Boolean(authUser?.roles?.[ROLES.STATIC]);
    const isAdmin = Boolean(authUser?.roles?.[ROLES.ADMIN]);
    const accountItems = waiverOnly
        ? [['/logout', 'Log out']]
        : [
            ['/account', 'My profile'],
            ['/profilesettings', 'Profile settings'],
            ...(isAdmin ? [['/admin', 'Admin tools']] : []),
            ['/logout', 'Log out'],
        ];

    useEffect(() => setOpen(''), [location, waiverOnly, waiverKiosk, authUser?.uid]);

    useEffect(() => {
        if (!open) return;
        const handleOutside = (event) => {
            if (!header.current?.contains(event.target)) setOpen('');
        };
        const media = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 1000px)') : null;
        const handleViewport = () => setOpen('');
        document.addEventListener('pointerdown', handleOutside);
        if (media?.addEventListener) media.addEventListener('change', handleViewport);
        else if (media) media.addListener(handleViewport);
        return () => {
            document.removeEventListener('pointerdown', handleOutside);
            if (media?.removeEventListener) media.removeEventListener('change', handleViewport);
            else if (media) media.removeListener(handleViewport);
        };
    }, [open]);

    const close = () => setOpen('');
    const toggle = (name) => setOpen(current => current === name ? '' : name);
    const handleEscape = (event) => {
        if (open && event.key === 'Escape') {
            event.preventDefault();
            close();
            triggers.current[open]?.focus();
        }
    };

    const group = (name, label, links, className = '') => (
        <div className="usaw-nav__group" onBlur={(event) => {
            if (open === name && !event.currentTarget.contains(event.relatedTarget)) close();
        }}>
            <button type="button" ref={(node) => { triggers.current[name] = node; }}
                className={`usaw-nav__control ${className}`}
                aria-expanded={open === name} aria-controls={`usaw-nav-${name}`}
                onClick={() => toggle(name)}>
                {label}
                <Chevron />
            </button>
            <div id={`usaw-nav-${name}`} className="usaw-nav__panel" hidden={open !== name}>
                <LinkList items={links} onSelect={close} />
            </div>
        </div>
    );

    return (
        <header ref={header} className="usaw-nav" onKeyDown={handleEscape} onBlur={(event) => {
            if (open === 'mobile' && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close();
        }}>
            {!waiverOnly && (
                <div className="usaw-nav__utility">
                    <div className="usaw-nav__shell usaw-nav__utility-inner">
                        <span className="usaw-nav__venue">Anderson, California</span>
                        <div className="usaw-nav__utility-links">
                            <StoreLink />
                            <SocialLinks />
                        </div>
                    </div>
                </div>
            )}
            <div className="usaw-nav__shell usaw-nav__bar">
                <SiteLink to={waiverOnly ? '/dashboard' : '/home'} onClick={close} className="usaw-nav__brand"
                    aria-label={waiverOnly ? 'US Airsoft World dashboard' : 'US Airsoft World home'}>
                    <picture>
                        <source media="(max-width: 365px)" srcSet={shieldLogo} />
                        <img src={logo} alt="" width="175" height="41" />
                    </picture>
                </SiteLink>
                <nav aria-label="Main navigation" className="usaw-nav__desktop">
                    {waiverOnly ? (
                        <SiteLink className="usaw-nav__control" to="/dashboard">Dashboard</SiteLink>
                    ) : (
                        <>
                            {group('visit', 'Plan your visit', VISIT_LINKS)}
                            {group('play', 'Play the field', PLAY_LINKS)}
                            <SiteLink className="usaw-nav__control usaw-nav__hub" to="/player-hub">Player hub</SiteLink>
                        </>
                    )}
                </nav>
                <div className="usaw-nav__actions">
                    {!waiverOnly && (
                        <SiteLink className="usaw-nav__control usaw-nav__waiver" to="/waiver" onClick={close}>Waiver</SiteLink>
                    )}
                    {!waiverKiosk && (
                        <div className="usaw-nav__desktop-account">
                            {authUser ? group('account', (
                                <>
                                    <img className="usaw-nav__avatar" src={profilePic} alt="" width="25" height="25" />
                                    <span>{waiverOnly ? (authUser.username || 'Account') : 'Account'}</span>
                                </>
                            ), accountItems, 'usaw-nav__account') : (
                                <SiteLink className="usaw-nav__control usaw-nav__account" to="/login"><AccountIcon />Sign in</SiteLink>
                            )}
                        </div>
                    )}
                    {!waiverOnly && (
                        <SiteLink className="usaw-nav__control usaw-nav__mobile-account" to={authUser ? '/account' : '/login'}
                            aria-label={authUser ? 'Account' : 'Sign in'} onClick={close}>
                            {authUser ? <img className="usaw-nav__avatar" src={profilePic} alt="" width="24" height="24" /> : <AccountIcon />}
                            <span>{authUser ? 'Account' : 'Sign in'}</span>
                        </SiteLink>
                    )}
                    {waiverOnly && <SiteLink className="usaw-nav__control usaw-nav__mobile-dashboard" to="/dashboard" onClick={close}>Dashboard</SiteLink>}
                    {appearance && !waiverKiosk && <AppearanceControl {...appearance} />}
                    {!waiverKiosk && (
                        <button type="button" className="usaw-nav__control usaw-nav__toggle"
                            ref={(node) => { triggers.current.mobile = node; }}
                            aria-expanded={open === 'mobile'} aria-controls="usaw-nav-drawer"
                            onClick={() => toggle('mobile')}>
                            <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none">
                                <path d={open === 'mobile' ? 'm6 6 12 12M18 6 6 18' : 'M4 6h16M4 12h16M4 18h16'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                            <span>{open === 'mobile' ? 'Close' : 'Menu'}</span>
                        </button>
                    )}
                </div>
            </div>
            {!waiverKiosk && (
                <nav id="usaw-nav-drawer" className="usaw-nav__drawer" aria-label="Mobile navigation" hidden={open !== 'mobile'}>
                    <div className="usaw-nav__shell usaw-nav__drawer-content">
                        {!waiverOnly && (
                            <>
                                <ul className="usaw-nav__links usaw-nav__quick">
                                    <li><SiteLink to="/player-hub" onClick={close}>Player hub</SiteLink></li>
                                    <li><StoreLink /></li>
                                </ul>
                                <div className="usaw-nav__drawer-section">
                                    <p>Plan your visit</p>
                                    <LinkList items={VISIT_LINKS} onSelect={close} />
                                </div>
                                <div className="usaw-nav__drawer-section">
                                    <p>Play the field</p>
                                    <LinkList items={PLAY_LINKS} onSelect={close} />
                                </div>
                            </>
                        )}
                        {authUser && (
                            <div className="usaw-nav__drawer-section">
                                <p>Account</p>
                                <LinkList items={accountItems} onSelect={close} />
                            </div>
                        )}
                        {!waiverOnly && (
                            <div className="usaw-nav__drawer-footer">
                                <span className="usaw-nav__venue">Anderson, California</span>
                                <SocialLinks />
                            </div>
                        )}
                    </div>
                </nav>
            )}
        </header>
    );
}

function Navigation({ firebase }) {
    const [authUser, setAuthUser] = useState(null);
    const [profilePic, setProfilePic] = useState(defaultProfile);

    useEffect(() => {
        let mounted = true;
        let request = 0;
        const unsubscribe = firebase.onAuthUserListener((user) => {
            if (!mounted) return;
            const current = ++request;
            setAuthUser(user);
            setProfilePic(defaultProfile);
            if (user?.uid) {
                getDownloadURL(firebase.pictures(`${user.uid}/profilepic.png`)).then((url) => {
                    if (mounted && request === current) setProfilePic(url);
                }).catch(() => { /* Use the default image when a player hasn't uploaded one. */ });
            }
        }, () => {
            if (!mounted) return;
            request += 1;
            setAuthUser(null);
            setProfilePic(defaultProfile);
        });
        return () => {
            mounted = false;
            unsubscribe();
        };
    }, [firebase]);

    return <NavigationLayout authUser={authUser} profilePic={profilePic} />;
}

export default withFirebase(Navigation);
