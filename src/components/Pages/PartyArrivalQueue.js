import React, { useEffect, useState } from 'react';

export default function PartyArrivalQueue({ request, onOpen, disabled, refresh }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    async function poll() {
      try {
        if (!document.hidden) {
          const response = await request('/api/staff-groups?waiting=1', { signal: controller.signal });
          if (!controller.signal.aborted && Array.isArray(response?.waiting)) setRows(response.waiting);
        }
      } catch (error) {
        if (!controller.signal.aborted && [401, 403].includes(error?.status)) setRows([]);
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(poll, 15000);
      }
    }
    timer = setTimeout(poll, 1500);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [request, refresh]);
  return rows.length > 0 && <section className="party-desk party-tray" aria-label="Waiting party guests">
    <div className="party-tray-heading"><h4>Finish party check-in</h4><span>{rows.length} {rows.length === 1 ? 'guest' : 'guests'}</span></div>
    <ul className="party-tray-list">{rows.map(row => <li key={row.entryId}>
      <div className="party-tray-person"><strong>{row.name}</strong><small>{row.groupName}</small></div>
      <span className="party-guest-state" data-kind={row.ready ? 'ready' : 'waiting'}>
        {row.ready ? 'Waiver received' : 'Waiting for waiver'}
      </span>
      <button type="button" disabled={disabled} className={row.ready ? 'btn btn-primary party-main' : 'btn btn-outline-primary'}
        onClick={() => onOpen(row.groupId, row.entryId)}>{row.ready ? 'Finish check-in' : 'Open party'}</button>
    </li>)}</ul>
  </section>;
}
