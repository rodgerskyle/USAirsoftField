import React, { useContext, useEffect, useRef, useState } from 'react';
import { staffBattleBadgeDay } from '../constants/playerBadges';
import { AuthUserContext } from '../session';
import { officialAccountRoles } from '../constants/roles';
import { newScoreId } from '../constants/scoreHistory';
import { battleBadgeArtUrl, battleBadgeForAward } from '../constants/battleBadgeArt';
import './StaffBattleBadges.css';

const title = 'US Airsoft World Battle Badges';
const teams = { camo: 'Camo', solid: 'Solid' };
const fieldDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});
const dateLabel = day => fieldDate.format(new Date(day + 'T12:00:00Z'));

function BattleDesk({ firebase, token, player, roundSide, onLock, allowOverride }) {
    const [side, setSide] = useState('');
    const [quantityInput, setQuantityInput] = useState('1');
    const quantity = Number(quantityInput);
    const validQuantity = Number.isSafeInteger(quantity) && quantity > 0;
    const [day, setDay] = useState(null);
    const [busy, setBusy] = useState(false);
    const [showOverrides, setShowOverrides] = useState(false);
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
        setShowOverrides(false);
        setFeedback(null);
        setRefresh(value => value + 1);
    }

    function save(awardToRemove, override = false) {
        if (!day || mutation.current) return;
        if (!awardToRemove && (!player || !teams[chosenSide])) return;
        if (!awardToRemove && (override ? !allowOverride || !validQuantity : day.awards.length > 0)) return;
        const date = day.date;
        if (awardToRemove && !window.confirm('Remove the Battle Badge awarded to ' + awardToRemove.playerName +
            ' on ' + dateLabel(date) + (awardToRemove.overrideQuantity
                ? '? This removes all ' + awardToRemove.overrideQuantity + ' badges in this override.'
                : '? This reopens that day’s MVP selection.'))) return;
        const key = !awardToRemove && [date, player.uid, chosenSide, override ? quantity : 'daily'].join(':');
        if (key && !requests.current.has(key)) requests.current.set(key, newScoreId());
        const body = awardToRemove ? { action: 'revoke', id: awardToRemove.id, date } : {
            action: override ? 'override' : 'award', ...(override && { quantity }), playerId: player.uid, side: chosenSide, date, requestId: requests.current.get(key),
        };
        const outcome = awardToRemove ? 'Battle Badge removed from ' + awardToRemove.playerName + '.' :
            override ? 'Override applied successfully.' : 'Daily Battle Badge awarded to ' + playerName + '.';
        return mutate(body, outcome, key);
    }

    function clearLog() {
        const newest = day?.overrides?.[0];
        if (!allowOverride || !showOverrides || !newest || mutation.current) return;
        if (!window.confirm('Clear today’s displayed override log? Players keep every awarded Battle Badge.')) return;
        return mutate({ action: 'clearOverrideLog', date: day.date, throughId: newest.id }, 'Override log cleared. Awarded badges were kept.');
    }

    async function mutate(body, outcome, key) {
        const controller = new AbortController();
        mutation.current = controller;
        setBusy(true);
        setFeedback(null);
        try {
            const result = await staffBattleBadgeDay(firebase, token, { body, signal: controller.signal });
            if (controller.signal.aborted) return;
            setDay(result);
            if (key) requests.current.delete(key);
            if (body.action === 'override') {
                setQuantityInput('1');
                setShowOverrides(false);
            }
            setFeedback({ text: outcome });
        } catch (error) {
            if (controller.signal.aborted) return;
            if (error.status === 401) { lockRef.current(); return; }
            if (error.status === 409 || error.status === 404) {
                if (key) requests.current.delete(key);
                setDay(null);
                setRefresh(value => value + 1);
            }
            const action = { award: 'Daily award', override: 'Override', clearOverrideLog: 'Log clearing', revoke: 'Badge removal' }[body.action];
            setFeedback({ error: true, heading: action + ' could not be confirmed.', text: error.message });
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
            {day.awards.map(award => {
                const tier = battleBadgeForAward(award.progress?.totalAwards);
                return <div className="staff-battle-recipient" key={award.id}>
                    {tier && <img src={battleBadgeArtUrl(tier.id)} alt="" width="60" height="75" />}
                    <div><strong>{award.playerName}</strong><span>{teams[award.side]} team · {tier?.name || 'MVP awarded'}</span></div>
                    <button type="button" className="btn btn-outline-secondary" disabled={busy}
                        onClick={() => save(award)}>Remove Battle Badge</button>
                </div>;
            })}
            {(!day.awards.length || (allowOverride && day.overrides)) && <>
                <p>{player ? <>Selected player · <strong>{playerName}</strong></> :
                    'Find and select a player to award today’s MVP.'}</p>
                {roundSide === undefined ? <label>MVP team
                    <select className="form-select" disabled={busy} value={side} onChange={event => setSide(event.target.value)}>
                        <option value="">Choose a team</option>
                        <option value="camo">Camo</option><option value="solid">Solid</option>
                    </select>
                </label> : <p>{teams[chosenSide] ? 'MVP team · ' + teams[chosenSide] : 'Choose the player’s team in Round details.'}</p>}
                {!day.awards.length && <button type="button" className="btn btn-primary" disabled={!player || !teams[chosenSide] || busy}
                    onClick={() => save()}>{busy ? 'Saving…' : 'Award daily MVP'}</button>}
            </>}
            {allowOverride && Array.isArray(day.overrides) && <div className="staff-battle-override">
                <h4>Admin Battle Badge override</h4>
                <p>Grant extra Battle Badges to the selected player.</p>
                <label>Number of Battle Badges
                    <input className="form-control" type="number" min="1" step="1" value={quantityInput}
                        disabled={busy} onChange={event => setQuantityInput(event.target.value)} />
                </label>
                <button type="button" className="btn btn-outline-primary" disabled={!player || !teams[chosenSide] || !validQuantity || busy}
                    onClick={() => save(null, true)}>Grant extra Battle Badges</button>
                <button type="button" className="btn btn-link" disabled={busy} aria-expanded={showOverrides}
                    onClick={() => setShowOverrides(value => !value)}>{showOverrides ? 'Hide override log' : 'Show override log'}</button>
                {showOverrides && <div className="staff-battle-log" role="group" aria-label="Today’s override log">
                    {day.overrides.length ? <>
                        {day.overrides.map(grant => <div key={grant.id} className="staff-battle-recipient">
                            <div><strong>{grant.playerName}</strong><span>{teams[grant.side]} · {grant.overrideQuantity} extra</span></div>
                            <button type="button" className="btn btn-outline-secondary" disabled={busy}
                                onClick={() => save(grant)}>Remove override</button>
                        </div>)}
                        <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={clearLog}>
                            Clear override log
                        </button>
                    </> : <p>No overrides in today’s log.</p>}
                </div>}
            </div>}
        </> : !feedback?.error && <p role="status">Checking the field’s MVP record…</p>}
        {feedback && <p className="staff-battle-feedback" role={feedback.error ? 'alert' : 'status'}>
            {feedback.heading && <><strong>{feedback.heading}</strong>{' '}</>}<span>{feedback.text}</span>
        </p>}
        {(day || feedback?.error) && <button type="button" className="btn btn-link" disabled={busy} onClick={reload}>Refresh field day</button>}
    </div>;
}

export default function StaffBattleBadges({ firebase, token, player, roundSide, onLock, onRequestUnlock, allowOverride = false }) {
    const [open, setOpen] = useState(false);
    const [accessError, setAccessError] = useState('');
    const account = useContext(AuthUserContext);
    useEffect(() => { if (token) setAccessError(''); }, [token]);
    if (!account?.uid || !officialAccountRoles(account.roles).ADMIN) return null;
    function sessionExpired() {
        setAccessError('The request could not be confirmed. Unlock badge controls and retry.');
        onLock();
    }
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
            {open && <BattleDesk key={token} {...{ firebase, token, player, roundSide, allowOverride }} onLock={sessionExpired} />}
        </> : onRequestUnlock ? <button type="button" className="btn btn-outline-secondary"
            onClick={() => { setOpen(true); onRequestUnlock(); }}>Unlock MVP controls</button> :
            <p>Unlock badge controls above to manage today’s MVP.</p>}
        {!token && accessError && <p role="alert">{accessError}</p>}
    </section>;
}
