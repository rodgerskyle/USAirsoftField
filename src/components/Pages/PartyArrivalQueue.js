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
  return rows.length > 0 && <section className="group-placement party-return-queue" aria-label="Waiting party guests">
    <h4>Finish party check-in</h4>
    <ul>{rows.map(row => <li key={row.entryId}><strong>{row.name}</strong> · {row.groupName}{' '}
      {row.ready ? 'Waiver received' : 'Waiting for waiver'}{' '}
      <button type="button" disabled={disabled} className="btn btn-outline-primary" onClick={() => onOpen(row.groupId, row.entryId)}>
        {row.ready ? 'Finish check-in' : 'Open party'}
      </button>
    </li>)}</ul>
  </section>;
}
