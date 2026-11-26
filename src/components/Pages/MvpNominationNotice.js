import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { requestPublicFieldTool } from '../constants/fieldStaffApi';
import { watchMvpNotice } from '../constants/mvpNominationNotice';
import { AuthUserContext } from '../session';
import './BattleBadgeShowcase.css';

const excludedSections = new Set([
  'admin', 'dashboard', 'account', 'profilesettings', 'login', 'logout', 'forgotpassword',
  'emailoptout', 'waiver', 'group-check-in', 'live-polls',
]);

export default function MvpNominationNotice() {
  const user = useContext(AuthUserContext);
  const { pathname } = useLocation();
  const [poll, setPoll] = useState(null);
  const watch = useRef(null);
  const actor = user?.uid || 'guest';
  const canDisplay = !excludedSections.has(pathname.split('/')[1]?.toLowerCase());

  useEffect(() => {
    const notice = watchMvpNotice({
      actor: () => actor, visible: () => canDisplay,
      read: signal => requestPublicFieldTool('/api/live-games?mvpNotice=1', { signal }),
      render: setPoll,
    });
    watch.current = notice;
    return () => { notice.stop(); watch.current = null; };
  }, [actor, canDisplay]);

  if (!poll || !canDisplay) return null;
  return <aside className="daily-battle-notice mvp-nomination-notice" aria-label="Round MVP nominations" role="status">
    <span><strong>{poll.roundTitle || 'The round'} has ended.</strong><small>Refs have opened MVP nominations.</small></span>
    <Link to={'/live-polls?mvp=' + encodeURIComponent(poll.id) + '#round-mvp'}
      onClick={() => watch.current?.dismiss()}>Nominate a player</Link>
    <button type="button" onClick={() => watch.current?.dismiss()}>Dismiss</button>
  </aside>;
}
