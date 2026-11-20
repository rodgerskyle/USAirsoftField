import React, { useEffect, useRef, useState } from 'react';
import { staffBattleBadgeDay } from '../constants/playerBadges';
import { newScoreId } from '../constants/scoreHistory';
import { battleBadgeArtUrl, battleBadgeForAward } from '../constants/battleBadgeArt';
import './StaffBattleBadges.css';

const title = 'US Airsoft World Battle Badges';
const teams = { camo: 'Camo', solid: 'Solid' };
const fieldDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});
const dateLabel = day => fieldDate.format(new Date(day + 'T12:00:00Z'));

function BattleDesk({ firebase, token, player, roundSide, onLock }) {
    const [side, setSide] = useState('');
    const [day, setDay] = useState(null);
    const [busy, setBusy] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [refresh, setRefresh] = useState(0);
    const requests = useRef(new Map());
    const mutation = useRef(null);
    const lockRef = useRef(onLock);
    lockRef.current = onLock;
    const chosenSide = roundSide === undefined ? side : roundSide;
    const playerName = player?.name || player?.username || player?.uid;

    useEffect(() => {
        const controller = new AbortController();
        staffBattleBadgeDay(firebase, token, { signal: controller.signal })
            .then(result => { if (!controller.signal.aborted) setDay(result); })
            .catch(error => {
                if (controller.signal.aborted) return;
                if (error.status === 401) lockRef.current();
                else setFeedback({ error: true, text: error.message });
            });
        return () => controller.abort();
    }, [firebase, token, refresh]);
    useEffect(() => () => mutation.current?.abort(), []);

    function reload() {
        setDay(null);
        setFeedback(null);
        setRefresh(value => value + 1);
    }

    async function save(awardToRemove) {
        if (!day || mutation.current) return;
        if (!awardToRemove && (!player || !teams[chosenSide] || day.awards.length)) return;
        const date = day.date;
        if (awardToRemove && !window.confirm('Remove the Battle Badge awarded to ' + awardToRemove.playerName +
            ' on ' + dateLabel(date) + '? This reopens that day’s MVP selection.')) return;
        const key = !awardToRemove && [date, player.uid, chosenSide].join(':');
        if (key && !requests.current.has(key)) requests.current.set(key, newScoreId());
        const body = awardToRemove ? { action: 'revoke', id: awardToRemove.id, date } : {
            action: 'award', playerId: player.uid, side: chosenSide, date, requestId: requests.current.get(key),
        };
        const controller = new AbortController();
        mutation.current = controller;
        setBusy(true);
        setFeedback(null);
        try {
            const result = await staffBattleBadgeDay(firebase, token, { body, signal: controller.signal });
            if (controller.signal.aborted) return;
            setDay(result);
            requests.current.clear();
            setFeedback({ text: awardToRemove ? 'Battle Badge removed from ' + awardToRemove.playerName + '.' :
                'Battle Badge awarded to ' + playerName + '.' });
        } catch (error) {
            if (controller.signal.aborted) return;
            if (error.status === 401) { lockRef.current(); return; }
            if (error.status === 409 || error.status === 404) {
                if (key) requests.current.delete(key);
                setDay(null);
                setRefresh(value => value + 1);
            }
            setFeedback({ error: true, text: error.message });
        } finally {
            if (!controller.signal.aborted) {
                mutation.current = null;
                setBusy(false);
            }
        }
    }

    return <div className="staff-battle-desk" aria-busy={busy}>
        {day ? <>
            <h4>Field MVP · {dateLabel(day.date)}</h4>
            {day.awards.length ? day.awards.map(award => {
                const tier = battleBadgeForAward(award.progress?.totalAwards);
                return <div className="staff-battle-recipient" key={award.id}>
                    {tier && <img src={battleBadgeArtUrl(tier.id)} alt="" width="60" height="75" />}
                    <div><strong>{award.playerName}</strong><span>{teams[award.side]} team · {tier?.name || 'MVP awarded'}</span></div>
                    <button type="button" className="btn btn-outline-secondary" disabled={busy}
                        onClick={() => save(award)}>Remove Battle Badge</button>
                </div>;
            }) : <>
                <p>{player ? <>Selected player · <strong>{playerName}</strong></> :
                    'Find and select a player to award today’s MVP.'}</p>
                {roundSide === undefined ? <label>MVP team
                    <select className="form-select" disabled={busy} value={side} onChange={event => setSide(event.target.value)}>
                        <option value="">Choose a team</option>
                        <option value="camo">Camo</option><option value="solid">Solid</option>
                    </select>
                </label> : <p>{teams[chosenSide] ? 'MVP team · ' + teams[chosenSide] : 'Choose the player’s team in Round details.'}</p>}
                <button type="button" className="btn btn-primary" disabled={!player || !teams[chosenSide] || busy}
                    onClick={() => save()}>{busy ? 'Saving…' : 'Award daily MVP'}</button>
            </>}
        </> : !feedback?.error && <p role="status">Checking the field’s MVP record…</p>}
        {feedback && <p role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
        {(day || feedback?.error) && <button type="button" className="btn btn-link" disabled={busy} onClick={reload}>Refresh field day</button>}
    </div>;
}

export default function StaffBattleBadges({ firebase, token, player, roundSide, onLock, onRequestUnlock }) {
    const [open, setOpen] = useState(false);
    return <section className="staff-battle-badges" aria-label={title}>
        <div className="staff-battle-heading">
            <img src={battleBadgeArtUrl('tower-of-power')} alt="Tower of Power Battle Badge" width="66" height="78" />
            <div><h3>{title}</h3>
                <p>Choose one daily MVP from Camo or Solid. Eight colored badges lead to the Tower of Power.
                    Each MVP after that earns a silver star. Every 20 silver stars become a gold star.</p></div>
        </div>
        {token ? <>
            <button type="button" className="btn btn-outline-secondary" aria-expanded={open}
                onClick={() => setOpen(!open)}>{open ? 'Close MVP controls' : 'Manage today’s MVP'}</button>
            {open && <BattleDesk key={token} {...{ firebase, token, player, roundSide, onLock }} />}
        </> : onRequestUnlock ? <button type="button" className="btn btn-outline-secondary"
            onClick={() => { setOpen(true); onRequestUnlock(); }}>Unlock MVP controls</button> :
            <p>Unlock badge controls above to manage today’s MVP.</p>}
    </section>;
}
