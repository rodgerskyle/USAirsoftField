import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { requestPublicFieldTool } from '../constants/fieldStaffApi';
import { watchMvpNotice } from '../constants/mvpNominationNotice';
import { AuthUserContext } from '../session';
import './BattleBadgeShowcase.css';

export default function MvpNominationNotice() {
  const user = useContext(AuthUserContext);
  const { pathname } = useLocation();
  const [poll, setPoll] = useState(null);
  const watch = useRef(null);
  const actor = user?.uid || 'guest';
  const onBallot = pathname === '/live-polls';

  useEffect(() => {
    const notice = watchMvpNotice({
      actor: () => actor, visible: () => !onBallot,
      read: signal => requestPublicFieldTool('/api/live-games?mvpNotice=1', { signal }),
      render: setPoll,
    });
    watch.current = notice;
    return () => { notice.stop(); watch.current = null; };
  }, [actor, onBallot]);

  if (!poll || onBallot) return null;
  return <aside className="daily-battle-notice mvp-nomination-notice" aria-label="Round MVP nominations" role="status">
    <span><strong>{poll.roundTitle || 'The round'} has ended.</strong><small>Refs have opened MVP nominations.</small></span>
    <Link to={'/live-polls?mvp=' + encodeURIComponent(poll.id) + '#round-mvp'}
      onClick={() => watch.current?.dismiss()}>Nominate a player</Link>
    <button type="button" onClick={() => watch.current?.dismiss()}>Dismiss</button>
  </aside>;
}
