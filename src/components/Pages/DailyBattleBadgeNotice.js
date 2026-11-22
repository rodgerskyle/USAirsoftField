import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FirebaseContext } from '../Firebase';
import { AuthUserContext } from '../session';
import { dailyBattleBadgeNotifications } from '../constants/playerBadges';
import { battleBadgeArtUrl, battleBadgeForAward } from '../constants/battleBadgeArt';
import { milestoneDate } from '../constants/milestoneHistory';
import './BattleBadgeShowcase.css';

function PlayerNotice({ firebase, uid }) {
  const [notices, setNotices] = useState([]);
  const acknowledged = useRef(new Set());
  const active = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    active.current = controller;
    let loading = false;
    async function refresh() {
      if (loading || document.visibilityState === 'hidden' || firebase.auth.currentUser?.uid !== uid) return;
      loading = true;
      try {
        const data = await dailyBattleBadgeNotifications(firebase, { signal: controller.signal });
        if (!controller.signal.aborted && Array.isArray(data.notifications)) {
          setNotices(data.notifications.filter(n => n && typeof n.id === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(n.date) && !acknowledged.current.has(n.id)));
        }
      } catch { /* The next visible refresh retries unread notifications. */ }
      finally { loading = false; }
    }
    void refresh();
    const timer = setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [firebase, uid]);

  async function acknowledge(id) {
    const signal = active.current?.signal;
    if (!signal || signal.aborted || acknowledged.current.has(id) || firebase.auth.currentUser?.uid !== uid) return;
    acknowledged.current.add(id);
    try {
      await dailyBattleBadgeNotifications(firebase, { signal, readId: id });
      if (!signal.aborted) setNotices(rows => rows.filter(row => row.id !== id));
    } catch { acknowledged.current.delete(id); }
  }
  const notice = notices[0];
  if (!notice) return null;
  const badge = battleBadgeForAward(notice.totalAwards);
  return <aside className="daily-battle-notice" aria-label="Your Battle Badge" role="status">
    {badge && <img src={battleBadgeArtUrl(badge.id)} alt="" width="42" height="50" />}
    <span><strong>You earned {badge ? 'the ' + badge.name : 'a Battle Badge'}!</strong>
      <small>Field MVP · {milestoneDate(notice.date, 'day')}</small></span>
    <Link to="/account?section=milestones" onClick={() => void acknowledge(notice.id)}>View profile milestone</Link>
  </aside>;
}

export default function DailyBattleBadgeNotice() {
  const account = useContext(AuthUserContext);
  const firebase = useContext(FirebaseContext);
  return account?.uid && firebase?.auth?.currentUser?.uid === account.uid
    ? <PlayerNotice key={account.uid} uid={account.uid} firebase={firebase} /> : null;
}
