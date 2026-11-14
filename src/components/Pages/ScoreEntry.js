import React, { useContext, useEffect, useRef, useState } from 'react';
import { Breadcrumb, Button, Card, Container, Form } from 'react-bootstrap';
import { Helmet } from 'react-helmet-async';
import { LinkContainer } from 'react-router-bootstrap';
import { onValue } from 'firebase/database';

import { withFirebase } from '../Firebase';
import { AuthUserContext, withAuthorization } from '../session';
import { ADMIN, WAIVER } from '../constants/roles';
import { getAllPlayerDisplayNames } from '../constants/playerDisplayNames';
import { readScannedMemberCard, verifyScannedMemberCard } from '../constants/scoreCards';
import { recordPlayerResult } from '../constants/scoreRecording';
import '../constants/admin.css';
import './ScoreEntry.css';

const playerId = /^[A-Za-z0-9_-]{1,128}$/;
const maxMatches = 10;
const maxRecentResults = 20;
const websiteOrigin = 'https://www.usairsoftfield.com';
const profileOrigins = new Set([websiteOrigin, 'https://usairsoftfield.com']);
const textValue = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
const normalized = value => textValue(value).toLowerCase();
const nameOf = member => member.name || member.username || member.uid;

function memberDirectory(snapshot) {
    return Object.entries(snapshot.val() ?? {}).filter(([uid, member]) =>
        playerId.test(uid) && member && typeof member === 'object' && !Array.isArray(member) && !member.roles?.[WAIVER]
    ).map(([uid, member]) => ({ uid, name: textValue(member.name), username: textValue(member.username) }));
}

function profileIdFromInput(value) {
    if (!value.startsWith('/profilelookup/') && !/^https?:\/\//i.test(value)) return null;
    let url;
    let uid;
    try {
        url = new URL(value, websiteOrigin);
        const match = /^\/profilelookup\/([^/]+)\/?$/.exec(url.pathname);
        uid = match && decodeURIComponent(match[1]);
    } catch {
        throw new Error('Enter a valid USAW player profile link, name, or ID.');
    }
    if (!profileOrigins.has(url.origin) || url.username || url.password || !uid || !playerId.test(uid)) {
        throw new Error('Enter a valid USAW player profile link, name, or ID.');
    }
    return uid;
}

function findMembers(members, displayNames, value) {
    const uid = profileIdFromInput(value);
    const direct = members.find(member => member.uid === (uid ?? value));
    if (direct || uid) return { direct, matches: [] };

    const query = normalized(value);
    const exact = [];
    const partial = [];
    for (const member of members) {
        const names = [member.name, member.username, displayNames[member.uid]].map(normalized);
        if (names.includes(query)) exact.push(member);
        else if (query.length >= 2 && names.some(name => name.includes(query))) partial.push(member);
    }
    if (exact.length === 1) return { direct: exact[0], matches: [] };
    return { matches: exact.length ? exact : partial };
}

function ScoreEntry({ firebase, outcome }) {
    const admin = useContext(AuthUserContext);
    const isWin = outcome === 'win';
    const heading = isWin ? 'Enter Wins' : 'Enter Losses';
    const resultName = isWin ? 'Win' : 'Loss';
    const input = useRef(null);
    const mounted = useRef(false);
    const pending = useRef(null);
    const resultSequence = useRef(0);
    const [members, setMembers] = useState(null);
    const [directoryUnavailable, setDirectoryUnavailable] = useState(false);
    const [displayNames, setDisplayNames] = useState({});
    const [value, setValue] = useState('');
    const [matches, setMatches] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [recent, setRecent] = useState([]);

    useEffect(() => {
        mounted.current = true;
        const controller = new AbortController();
        const unsubscribe = onValue(firebase.users(), snapshot => {
            setMembers(memberDirectory(snapshot));
            setDirectoryUnavailable(false);
        }, () => {
            setMembers(null);
            setDirectoryUnavailable(true);
        });
        getAllPlayerDisplayNames({ signal: controller.signal }).then(names => {
            if (!controller.signal.aborted) setDisplayNames(names);
        }).catch(() => {});
        return () => {
            mounted.current = false;
            pending.current?.abort();
            controller.abort();
            unsubscribe();
        };
    }, [firebase]);

    async function submitResult(selectedMember) {
        const query = value.trim();
        if (!query || !members || pending.current) return;
        const staffUser = firebase.auth.currentUser;
        if (!staffUser || staffUser.uid !== admin?.uid) {
            setError('Sign in again to record a result.');
            return;
        }
        const controller = new AbortController();
        pending.current = controller;
        setBusy(true);
        setError('');
        try {
            let member = selectedMember && members.find(entry => entry.uid === selectedMember.uid);
            if (selectedMember && !member) throw new Error('This player is no longer in the member directory. Search again.');
            if (!member) {
                const token = readScannedMemberCard(query);
                if (token) {
                    const uid = await verifyScannedMemberCard(firebase, token, { signal: controller.signal });
                    if (controller.signal.aborted) return;
                    member = members.find(entry => entry.uid === uid);
                } else {
                    const result = findMembers(members, displayNames, query);
                    member = result.direct;
                    setMatches(result.matches);
                    if (result.matches.length) return;
                }
            }
            if (!member) throw new Error('No matching USAW member. Check the name, player ID, or card.');

            if (firebase.auth.currentUser !== staffUser) throw new Error('The admin session changed. Sign in again to record a result.');
            await recordPlayerResult(firebase, member.uid, outcome);
            if (!mounted.current || controller.signal.aborted) return;
            const item = { id: ++resultSequence.current, text: `${resultName} recorded for ${nameOf(member)}.` };
            setRecent(items => [item, ...items].slice(0, maxRecentResults));
            setValue('');
            setMatches([]);
        } catch (failure) {
            if (mounted.current && !controller.signal.aborted) {
                setError(failure?.message || 'The result could not be recorded. Try again.');
            }
        } finally {
            if (pending.current === controller) pending.current = null;
            if (mounted.current && !controller.signal.aborted) {
                setBusy(false);
                input.current?.focus();
            }
        }
    }

    function submit(event) {
        event.preventDefault();
        submitResult();
    }

    function changeValue(event) {
        setValue(event.target.value);
        setMatches([]);
        setError('');
    }

    return (
        <div className="admin-container admin-compact-page">
            <Helmet><title>{`US Airsoft Field: ${heading}`}</title></Helmet>
            <Container fluid className="admin-content">
                <div className="admin-page-header">
                    <h2 className="admin-header">{heading}</h2>
                    <Breadcrumb className="admin-breadcrumb admin-page-breadcrumb">
                        <LinkContainer to="/admin"><Breadcrumb.Item>Admin</Breadcrumb.Item></LinkContainer>
                        <Breadcrumb.Item active>{heading}</Breadcrumb.Item>
                    </Breadcrumb>
                </div>
                <Card className="admin-panel-card admin-points-card">
                    <Card.Body>
                        <Form className="admin-points-form" onSubmit={submit}>
                            <Form.Group controlId="score-entry-player" className="admin-points-field">
                                <Form.Label>Scan a card or find a player</Form.Label>
                                <Form.Control ref={input} value={value} onChange={changeValue} autoFocus autoComplete="off"
                                    readOnly={busy} aria-describedby="score-entry-help"
                                    placeholder="Name, callsign, player ID, or profile link" />
                                <Form.Text id="score-entry-help">Scan with the input focused, or type the player’s details and press Enter.</Form.Text>
                            </Form.Group>
                            {directoryUnavailable ? <p role="alert">Could not load the member directory. Reload this page to try again.</p>
                                : !members ? <p role="status">Loading members…</p> : null}
                            {error && <p role="alert">{error}</p>}
                            {matches.length > 0 && (
                                <div className="score-entry-matches">
                                    <p>Select the player to record this result.</p>
                                    <ul aria-label="Matching players">
                                        {matches.slice(0, maxMatches).map(member => (
                                            <li key={member.uid}>
                                                <Button variant="outline-secondary" type="button" disabled={busy}
                                                    onClick={() => submitResult(member)}>
                                                    <strong>{nameOf(member)}</strong>
                                                    <small>{[member.username, displayNames[member.uid], member.uid]
                                                        .filter((value, index, values) => value && value !== nameOf(member) && values.indexOf(value) === index)
                                                        .join(' · ') || member.uid}</small>
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                    {matches.length > maxMatches && <p>Enter a more specific name or player ID to see additional matches.</p>}
                                </div>
                            )}
                            <div className="admin-submit-row">
                                <Button className="button-submit-admin" type="submit" disabled={busy || !members || !value.trim()}>
                                    {busy ? 'Recording…' : `Record ${outcome}`}
                                </Button>
                            </div>
                        </Form>
                    </Card.Body>
                </Card>
                <Card className="status-card-admin admin-panel-card admin-status-card">
                    <Card.Header>Recent results</Card.Header>
                    <Card.Body className="status-card-body-admin" aria-live="polite" aria-relevant="additions text">
                        {recent.length ? recent.map((item, index) => (
                            <Card.Text className={index % 2 ? 'status-card-row-admin' : 'status-card-offrow-admin'} key={item.id}>
                                {item.text}
                            </Card.Text>
                        )) : <Card.Text className="status-card-row-admin">No results recorded in this session.</Card.Text>}
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
}

const isAdmin = user => Boolean(user?.roles?.[ADMIN]);

export default withAuthorization(isAdmin, { verifyOnMount: true })(withFirebase(ScoreEntry));
