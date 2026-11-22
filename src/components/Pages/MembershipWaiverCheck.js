import React, { useEffect, useRef, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';
import './MembershipWaiverCheck.css';

export function membershipWaiverRequest(firebase, body, signal) {
  return requestStaffFieldTool(firebase, firebase.auth?.currentUser?.uid, '/api/waivers/membership', { method: 'POST', body, signal });
}

const signedDate = value => new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Los_Angeles',
}).format(value);

export default function MembershipWaiverCheck({ firebase, member, initial, onUse, onNew, onBack, busy, error }) {
  const [firstName, setFirstName] = useState(initial?.fname || '');
  const [lastName, setLastName] = useState(initial?.lname || '');
  const [dob, setDob] = useState(initial?.dob || '');
  const [reference, setReference] = useState('');
  const [lookup, setLookup] = useState({ kind: member ? 'checking' : 'ready' });
  const [attempt, setAttempt] = useState(0);
  const active = useRef(null);
  const memberId = member?.uid;
  useEffect(() => {
    if (!memberId) return () => active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLookup({ kind: 'checking' });
    membershipWaiverRequest(firebase, { action: 'current', memberId }, controller.signal).then(({ check }) => {
      if (!controller.signal.aborted) setLookup(check.status === 'signed'
        ? { kind: 'onFile', signedAt: check.signedAt } : { kind: 'missingMember' });
    }).catch(error => { if (!controller.signal.aborted) setLookup({ kind: 'currentError', message: error.message }); });
    return () => { active.current?.abort(); };
  }, [firebase, memberId, attempt]);

  const name = member ? member.registeredName : [firstName.trim(), lastName.trim()].join(' ');
  const identity = { fname: firstName.trim(), lname: lastName.trim(), dob };
  function edit(setter, value) {
    active.current?.abort();
    setter(value);
    setLookup({ kind: 'ready' });
  }
  async function find(event) {
    event.preventDefault();
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLookup({ kind: 'searching' });
    try {
      const result = await membershipWaiverRequest(firebase, {
        action: 'find', ...(memberId && { memberId }), name, dob, ...(reference.trim() && { reference: reference.trim() }),
      }, controller.signal);
      if (!controller.signal.aborted) setLookup({ kind: 'matches', rows: result.matches });
    } catch (error) {
      if (!controller.signal.aborted) setLookup({ kind: 'searchError', message: error.message });
    }
  }
  return <section className="membership-waiver-check" aria-label="Membership waiver check">
    <h3>Check for a signed waiver</h3>
    {member && <p>Member <strong>{member.name}</strong></p>}
    {lookup.kind === 'checking' && <p role="status">Checking this member’s waiver…</p>}
    {lookup.kind === 'currentError' && <><p role="alert">{lookup.message}</p>
      <Button type="button" variant="outline-secondary" onClick={() => setAttempt(n => n + 1)}>Retry member check</Button></>}
    {lookup.kind === 'onFile' ? <div>
      <p role="status">✓ Current waiver on file · Signed {signedDate(lookup.signedAt)} PT</p>
      <Button type="button" variant="success" disabled={busy}
        onClick={() => onUse({ signedAt: lookup.signedAt }, identity)}>Renew with this waiver</Button>
    </div> : lookup.kind !== 'checking' && <Form onSubmit={find}>
      {lookup.kind === 'missingMember' && <p>No current waiver linked to this account. Check for a walk-on or party waiver below.</p>}
      {!member && <div className="membership-waiver-names">
        <Form.Group controlId="membership-check-first"><Form.Label>First name</Form.Label>
          <Form.Control required maxLength={60} value={firstName} onChange={e => edit(setFirstName, e.target.value)} /></Form.Group>
        <Form.Group controlId="membership-check-last"><Form.Label>Last name</Form.Label>
          <Form.Control required maxLength={60} value={lastName} onChange={e => edit(setLastName, e.target.value)} /></Form.Group>
      </div>}
      <Form.Group controlId="membership-check-dob"><Form.Label>Participant date of birth</Form.Label>
        <Form.Control type="date" required value={dob} onChange={e => edit(setDob, e.target.value)} /></Form.Group>
      <details><summary>Search with a waiver reference</summary>
        <Form.Group controlId="membership-check-ref"><Form.Label>Waiver reference</Form.Label>
          <Form.Control maxLength={128} value={reference} onChange={e => edit(setReference, e.target.value)} /></Form.Group>
      </details>
      <Button type="submit" variant="primary" disabled={busy || lookup.kind === 'searching'}>Find signed waiver</Button>
      {lookup.kind === 'searching' && <p role="status">Checking signatures and birth date…</p>}
      {lookup.kind === 'searchError' && <p role="alert">{lookup.message}</p>}
      {lookup.kind === 'matches' && <><p role="status">{lookup.rows.length
        ? 'Confirm the signing date and choose a waiver.' : 'No current signed waiver matched this name and birth date.'}</p>
        {lookup.rows.map(row => <Button type="button" variant="success" key={row.ref} disabled={busy}
          onClick={() => onUse(row, identity)}>{member ? 'Renew' : 'Continue'} with waiver signed {signedDate(row.signedAt)} PT</Button>)}</>}
    </Form>}
    {error && <p role="alert">{error}</p>}
    {error && lookup.kind === 'onFile' && <Button type="button" disabled={busy} variant="outline-secondary"
      onClick={() => setAttempt(n => n + 1)}>Check member waiver again</Button>}
    <Button type="button" variant="outline-secondary" disabled={busy} onClick={() => onNew(identity)}>Sign a new waiver</Button>
    {onBack && <Button type="button" variant="link" disabled={busy} onClick={onBack}>Back to member list</Button>}
  </section>;
}
