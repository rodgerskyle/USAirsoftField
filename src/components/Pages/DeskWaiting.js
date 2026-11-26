import React, { useEffect, useRef, useState } from 'react';
import qrCode from '../../vendor/qrcode-generator.mjs';

const safeLink = url => /^https:\/\/www\.usairsoftfield\.com\/waiver#desk\/[a-f0-9]{64}$/.test(url);
function WaiverCode({ url, name }) {
  if (!safeLink(url)) return null;
  const code = qrCode(0, 'M');
  code.addData(url, 'Byte');
  code.make();
  return <div className="admin-checkin__waiver-qr"><img src={code.createDataURL(4, 16)} alt={'Waiver QR code for ' + name} />
    <div><p>Ask the player or guardian to scan, sign, and return to the desk.</p><a className="btn btn-outline-secondary" href={url} target="_blank" rel="noreferrer">Open this player’s waiver</a></div></div>;
}

export default function DeskWaiting({ request, ticket, onResume, disabled, revision }) {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [show, setShow] = useState(null);
  const [reload, setReload] = useState(0);
  const focusRow = useRef(null);
  const focusedTicket = useRef(null);
  useEffect(() => {
    if (ticket && focusedTicket.current !== ticket && focusRow.current) {
      focusedTicket.current = ticket;
      focusRow.current.focus();
    }
  }, [ticket, rows]);
  useEffect(() => { if (ticket) setShow(ticket.id); }, [ticket]);
  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    async function read() {
      if (loading || controller.signal.aborted) return;
      loading = true;
      try {
        const data = await request('/api/game-day-check-in?waiting=1', { signal: controller.signal });
        if (!controller.signal.aborted && Array.isArray(data.waiting)) {
          setRows(data.waiting);
          setLoaded(true);
          setError('');
        }
      } catch {
        if (!controller.signal.aborted) setError('Waiting list could not be refreshed. Check again before finishing a visit.');
      } finally { loading = false; }
    }
    void read();
    const timer = setInterval(() => { if (!document.hidden) void read(); }, 20000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [request, ticket, reload, revision]);
  return <section aria-labelledby="admin-checkin-waiting" className="admin-checkin__waiting">
    <div className="admin-checkin__heading">
      <h3 id="admin-checkin-waiting">Finish later · {loaded ? rows.length : '…'}</h3>
      <button type="button" className="btn btn-outline-secondary" onClick={() => setReload(n => n + 1)}>Refresh waiting list</button>
    </div>
    {error && <p role="alert">{error}</p>}
    {rows.map(row => {
      const signed = row.waiverStatus === 'signed';
      const qrId = 'desk-qr-' + row.id;
      return <article key={row.id} tabIndex={-1} ref={row.id === ticket?.id ? focusRow : null}>
        <div className="admin-checkin__ticket-title">
          <h4>{row.displayName}</h4>
          <span className="admin-checkin__waiver-state" data-signed={signed}>
            {signed ? 'Waiver verified' : row.waiverStatus === 'unavailable' ? 'Waiver check unavailable' : 'Waiting for waiver'}
          </span>
        </div>
        {row.needsRental && <p className="admin-checkin__hint">Rental requested</p>}
        <div className="admin-checkin__buttons">
          {!signed && <button type="button" className="btn btn-primary" aria-expanded={show === row.id}
            aria-controls={show === row.id ? qrId : undefined} onClick={() => setShow(show === row.id ? null : row.id)}>Waiver QR</button>}
          <button type="button" disabled={disabled} className={signed ? 'btn btn-primary' : 'btn btn-outline-secondary'}
            onClick={() => onResume(row)}>{signed ? 'Finish check-in' : 'Review player'}</button>
        </div>
        {show === row.id && !signed && <div id={qrId}><WaiverCode name={row.displayName} url={row.waiverUrl} /></div>}
      </article>;
    })}
  </section>;
}
