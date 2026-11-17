import React, { useContext, useEffect, useState } from 'react';
import AuthUserContext from '../session/context';
import { ADMIN } from '../constants/roles';
import { fieldStaffPaths } from '../constants/fieldStaffApi';
import { normalizePartyBooking, partyBookingKey } from '../constants/partyBookingKey';

export default function PartyBookingCheckInLink({ booking }) {
  const account = useContext(AuthUserContext);
  const isAdmin = Boolean(account?.roles?.[ADMIN]);
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    if (!isAdmin || !booking) return undefined;
    const saved = normalizePartyBooking(booking);
    if (!saved) return undefined;
    let active = true;
    const params = new URLSearchParams({ partyDate: saved.date });
    const publishLink = key => {
      if (!active) return;
      if (key) params.set('booking', key);
      setSelection({ booking, href: fieldStaffPaths.checkIn + '?' + params + '#arriving-group' });
    };
    partyBookingKey(booking).then(publishLink, () => publishLink(null));
    return () => { active = false; };
  }, [booking, isAdmin]);

  if (!isAdmin || !booking || selection?.booking !== booking) return null;
  return <a className="btn btn-outline-primary" href={selection.href} target="_blank" rel="noopener noreferrer">
    Open group check-in <span className="visually-hidden">(opens in a new tab)</span>
  </a>;
}
