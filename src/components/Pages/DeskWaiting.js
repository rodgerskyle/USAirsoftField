import React, { useEffect, useRef, useState } from 'react';
import qrCode from '../../vendor/qrcode-generator.mjs';

const safeLink = url => /^https:\/\/www\.usairsoftfield\.com\/waiver#desk\/[a-f0-9]{64}$/.test(url);
function WaiverCode({ url, name }) {
  if (!safeLink(url)) return null;
  const code = qrCode(0, 'M');
  code.addData(url, 'Byte');
  code.make();
  return <div><p>Ask the player or guardian to scan this code, sign, and return to the desk.</p><img src={code.createDataURL(4, 16)} alt={'Waiver QR code for ' + name} />
    <p><a href={url} target="_blank" rel="noreferrer">Open this player’s waiver</a></p></div>;
}

export default function DeskWaiting({ request, ticket, onResume, disabled, revision }) {
  const [rows, setRows] = useState([]);
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
  return <section aria-labelledby="admin-checkin-waiting" className="admin-checkin__walk-on">
    <h3 id="admin-checkin-waiting">Finish later · {rows.length}</h3>
    <button type="button" className="btn btn-outline-primary" onClick={() => setReload(n => n + 1)}>Refresh waiting list</button>
    {error && <p role="alert">{error}</p>}
    {rows.map(row => <article key={row.id} tabIndex={-1} ref={row.id === ticket?.id ? focusRow : null}>
      <strong>{row.displayName}</strong>{' · '}{row.waiverStatus === 'signed' ? 'Waiver verified' : row.waiverStatus === 'unavailable' ? 'Waiver check unavailable' : 'Waiting for waiver'}
      {row.needsRental && ' · Rental requested'}
      <div className="admin-checkin__buttons">
        <button type="button" disabled={disabled} className="btn btn-primary" onClick={() => onResume(row)}>{row.waiverStatus === 'signed' ? 'Finish check-in' : 'Review player'}</button>
        {row.waiverStatus !== 'signed' && <button type="button" className="btn btn-outline-primary" aria-expanded={show === row.id}
          onClick={() => setShow(show === row.id ? null : row.id)}>Waiver QR</button>}
      </div>
      {show === row.id && row.waiverStatus !== 'signed' && <WaiverCode name={row.displayName} url={row.waiverUrl} />}
    </article>)}
  </section>;
}
