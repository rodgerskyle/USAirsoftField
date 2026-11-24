import React, { useCallback, useEffect, useRef, useState } from 'react';
import StaffWaiverPicker from './StaffWaiverPicker';
import './MemberWaiverReview.css';

const membership = '/api/waivers/membership';
const sources = { digital: 'Digital waiver', paper: 'Reviewed paper waiver', party: 'Party waiver' };
const signedDate = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Los_Angeles',
});

function AccountIdentity({ member }) {
  return <><strong>{member.name || 'Name unavailable'}</strong>
    <small>{member.username ? '@' + member.username : 'Member ID ' + member.playerId}</small></>;
}

function ManualMatch({ member, request, onBack, onSaved }) {
  const [match, setMatch] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const saveRequest = useRef(null);
  const confirmation = useRef(null);
  const searchWaivers = useCallback((search, signal) => request(membership, {
    method: 'POST', body: { action: 'reviewSearch', memberId: member.playerId, search }, signal,
  }), [request, member.playerId]);

  useEffect(() => () => saveRequest.current?.abort(), []);
  useEffect(() => { if (match) confirmation.current?.focus(); }, [match]);

  function select(waiver) {
    setError(''); setConfirmed(false); setMatch(waiver);
  }
  async function attach(event) {
    event.preventDefault();
    if (!match || !confirmed || saveRequest.current) return;
    const controller = new AbortController();
    saveRequest.current = controller;
    setSaving(true); setError('');
    try {
      const result = await request(membership, {
        method: 'POST', signal: controller.signal,
        body: { action: 'reviewLink', memberId: member.playerId, ref: match.ref, signedAt: match.signedAt, confirmed },
      });
      if (controller.signal.aborted) return;
      if (result?.check?.status !== 'signed' || result.check.signedAt !== match.signedAt) {
        throw new Error('The service could not confirm that the selected waiver was attached.');
      }
      onSaved();
    } catch (failure) {
      if (!controller.signal.aborted) {
        setSaving(false);
        setError(failure.message || 'The waiver could not be attached. Try again.');
      }
    } finally {
      saveRequest.current = null;
    }
  }
  return <section className="member-waiver-review__match" aria-label="Match signed waiver">
    <button type="button" className="btn btn-outline-secondary" onClick={onBack} disabled={saving}>Back to members</button>
    <h3>Match a signed waiver</h3>
    <p className="member-waiver-review__identity"><AccountIdentity member={member} /></p>
    {match ? <form onSubmit={attach}>
      <p className="member-waiver-review__proof">
        <strong>{match.name}</strong>
        <span>{sources[match.source] || 'Signed waiver'} · Signed {signedDate.format(new Date(match.signedAt))} PT</span>
      </p>
      <label className="admin-checkin__rental-option">
        <input type="checkbox" ref={confirmation} required checked={confirmed} disabled={saving}
          onChange={event => setConfirmed(event.target.checked)} />
        I verified this waiver belongs to {member.name || 'this member'}.
      </label>
      {error && <p className="alert alert-danger" role="alert">{error}</p>}
      <div className="admin-checkin__buttons">
        <button type="submit" className="btn btn-primary" disabled={saving || !confirmed}>
          {saving ? 'Attaching waiver…' : 'Attach waiver to profile'}
        </button>
        <button type="button" className="btn btn-outline-secondary" disabled={saving}
          onClick={() => select(null)}>Choose a different waiver</button>
      </div>
    </form> : <StaffWaiverPicker request={request} searchWaivers={searchWaivers} name={member.name || ''}
      autoSearch focus onChoose={select} />}
  </section>;
}

function listStatus(data, query, cursor) {
  if (cursor && !data.members.length) return 'This page is empty. Choose Previous members to continue.';
  if (query) return data.members.length ? 'Members matching your search' : 'No members match this search.';
  if (data.total) return `${data.total} ${data.total === 1 ? 'member needs' : 'members need'} a waiver match.`;
  return data.building ? 'Checking member accounts…' : 'All reviewed active members have a verified waiver.';
}

function MemberList({ request, page, onSearch, onNext, onPrevious, onChoose, scanCompletedAt }) {
  const [text, setText] = useState(page.query);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const cursor = page.cursors[page.cursors.length - 1];
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    setData(null); setError('');
    async function load() {
      try {
        const result = await request('/api/waivers/member-sync', {
          method: 'POST', signal: controller.signal,
          body: { action: 'list', ...(page.query && { query: page.query }), ...(cursor && { cursor }) },
        });
        if (controller.signal.aborted) return;
        if (!Array.isArray(result?.members)) throw new Error('The service could not return the member list.');
        setData(result);
        if (result.building) timer = setTimeout(load, 10000);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure.message || 'The member list could not be loaded.');
      }
    }
    load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [request, cursor, page.query, scanCompletedAt, revision]);

  return <>
    <form className="admin-checkin__form" onSubmit={event => {
      event.preventDefault();
      onSearch(text.trim());
    }}>
      <label>Find a member on the review list
        <input type="search" placeholder="Name, username or member ID" value={text} maxLength={120}
          onChange={event => setText(event.target.value)} />
      </label>
      <button type="submit" className="btn btn-primary">Search members</button>
      {page.query && <button type="button" className="btn btn-outline-secondary" onClick={() => {
        setText(''); onSearch('');
      }}>Clear search</button>}
    </form>
    {error && <p className="alert alert-danger" role="alert">{error}</p>}
    {data ? <>
      <p role="status">{listStatus(data, page.query, cursor)}
        {data.building && ' The list updates as matching progresses.'}</p>
      {data.members.length > 0 && <ul className="admin-checkin__players" aria-label="Members to review">
        {data.members.map(member => <li key={member.playerId} className="member-waiver-review__row">
          <span><AccountIdentity member={member} /><small>{member.reason === 'missing' ? 'No current match' : 'Needs verification'}</small></span>
          <button type="button" className="btn btn-outline-primary"
            aria-label={`Match waiver for ${member.name || member.playerId}${member.username ? ' (@' + member.username + ')' : ''}`}
            onClick={() => onChoose(member)}>Match waiver</button>
        </li>)}
      </ul>}
    </> : !error && <p role="status">Loading members…</p>}
    <div className="admin-checkin__buttons">
      {page.cursors.length > 1 && <button type="button" className="btn btn-outline-secondary" onClick={onPrevious}>Previous members</button>}
      {data?.nextCursor && <button type="button" className="btn btn-outline-secondary" onClick={() => onNext(data.nextCursor)}>Next members</button>}
      {(data || error) && <button type="button" className="btn btn-outline-secondary" onClick={() => setRevision(n => n + 1)}>
        {error ? 'Retry member list' : 'Refresh list'}
      </button>}
    </div>
  </>;
}

export default function MemberWaiverReview({ request, scanCompletedAt }) {
  const [openedFor, setOpenedFor] = useState(null);
  const open = openedFor === request;
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState({ query: '', cursors: [null] });
  const [notice, setNotice] = useState('');
  return <div className="member-waiver-review">
    <button type="button" className="btn btn-outline-primary" aria-expanded={open} onClick={() => {
      setOpenedFor(open ? null : () => request);
      setPage({ query: '', cursors: [null] });
      setSelected(null); setNotice('');
    }}>{open ? 'Hide member review list' : 'View members needing a waiver match'}</button>
    {open && <section className="member-waiver-review__body" aria-label="Members needing a waiver match">
      {notice && <p role="status" className="alert alert-success">{notice}</p>}
      {selected ? <ManualMatch key={selected.playerId} member={selected} request={request}
        onBack={() => setSelected(null)} onSaved={() => {
          setNotice('Signed waiver attached to the profile for ' + (selected.name || selected.playerId) + '.');
          setSelected(null);
        }} /> : <MemberList request={request} scanCompletedAt={scanCompletedAt} page={page}
          onSearch={query => { setPage({ query, cursors: [null] }); setNotice(''); }}
          onNext={cursor => setPage({ ...page, cursors: [...page.cursors, cursor] })}
          onPrevious={() => setPage({ ...page, cursors: page.cursors.slice(0, -1) })}
          onChoose={member => { setNotice(''); setSelected(member); }} />}
    </section>}
  </div>;
}
