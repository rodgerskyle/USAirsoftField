import React, { useCallback, useEffect, useState } from 'react';
import { awardRoundPatch, badgeById, getRoundPatchOptions, unlockBadgeStaff } from '../constants/playerBadges';

export const emptyPatchSelection = { badgeIds: [], reason: '' };

function PatchDelivery({ job, firebase, token, updateJob, lock, report }) {
    const badgeId = job.badgeIds[0];
    const patchName = badgeById[badgeId]?.name || 'Patch';
    const player = job.playerName || 'this player';
    const [reason, setReason] = useState(job.reason);
    useEffect(() => {
        if (!token || job.error) return undefined;
        const controller = new AbortController();
        let mounted = true;
        const timer = setTimeout(() => controller.abort(), 15000);
        awardRoundPatch(firebase, { playerId: job.playerId, eventId: job.eventId, day: job.day, badgeId, reason: job.reason }, token, controller.signal)
            .then(() => {
                if (!mounted) return;
                report(patchName + ' awarded to ' + player + '.');
                updateJob(job.id, old => ({ ...old, badgeIds: old.badgeIds.slice(1) }));
            })
            .catch(error => {
                if (!mounted) return;
                if (error.status === 401) lock();
                updateJob(job.id, old => ({ ...old, error: error.name === 'AbortError'
                    ? 'Award confirmation timed out. Retry this patch.' : error.message || 'The patch could not be confirmed.' }));
            });
        return () => { mounted = false; controller.abort(); clearTimeout(timer); };
    }, [job, badgeId, firebase, token, updateJob, lock, report, patchName, player]);

    return <div className="score-patch-job">
        <strong>{player} · {job.mode}</strong>
        <p>Score saved. {job.badgeIds.map(id => badgeById[id]?.name || id).join(', ')} pending.</p>
        {job.error && <>
            <p role="alert">{job.error}</p>
            <label>First-award reason for {patchName}
                <input className="form-control" maxLength={160} value={reason} onChange={event => setReason(event.target.value)} />
            </label>
            <div className="score-entry-mode">
                <button type="button" className="btn btn-outline-secondary" disabled={!token}
                    onClick={() => updateJob(job.id, old => ({ ...old, reason: reason.trim(), error: '' }))}>Retry patch</button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => {
                    if (window.confirm('Stop retrying ' + patchName + ' for ' + player + '? The recorded score will be kept.')) {
                        updateJob(job.id, old => ({ ...old, badgeIds: old.badgeIds.slice(1), error: '' }));
                    }
                }}>Stop retrying this patch</button>
            </div>
        </>}
    </div>;
}

export function ScorePatchAwards({ firebase, mode, player, disabled, selection, onChange, jobs, updateJob }) {
    const [options, setOptions] = useState(null);
    const [reload, setReload] = useState(0);
    const [session, setSession] = useState(null);
    const [unlocking, setUnlocking] = useState(false);
    const [unlockError, setUnlockError] = useState('');
    const [notice, setNotice] = useState('');
    const lock = useCallback(() => setSession(null), []);
    const token = session?.staffToken;
    useEffect(() => {
        if (!mode) return undefined;
        const controller = new AbortController();
        getRoundPatchOptions(mode, controller.signal).then(patches => {
            if (!controller.signal.aborted) setOptions({ mode, patches });
        }).catch(error => {
            if (!controller.signal.aborted) setOptions({ mode, error: error.message });
        });
        return () => controller.abort();
    }, [mode, reload]);
    useEffect(() => {
        if (!session) return undefined;
        const timer = setTimeout(lock, Math.max(0, session.expiresAt - Date.now()));
        return () => clearTimeout(timer);
    }, [session, lock]);

    async function unlock(event) {
        event.preventDefault();
        if (unlocking) return;
        const values = new FormData(event.currentTarget);
        event.currentTarget.reset();
        setUnlocking(true);
        setUnlockError('');
        try {
            const result = await unlockBadgeStaff(firebase, { email: values.get('email').trim(), password: values.get('password') });
            const expiresAt = Date.parse(result.expiresAt);
            if (!result.staffToken || !(expiresAt > Date.now())) throw new Error('Badge access could not be verified.');
            setSession({ staffToken: result.staffToken, expiresAt });
        } catch (error) { setUnlockError(error.message || 'Badge access could not be unlocked.'); }
        finally { setUnlocking(false); }
    }
    function toggle(id) {
        const ids = selection.badgeIds.includes(id) ? selection.badgeIds.filter(value => value !== id) : [...selection.badgeIds, id];
        onChange(ids.length ? { ...selection, badgeIds: ids } : emptyPatchSelection);
    }
    if (!mode && !jobs.length && !notice) return null;
    const current = options?.mode === mode ? options : null;
    return <section className="score-patch-panel" aria-label="Round patches">
        {mode && <>
            <h3>Round patches</h3>
            <p>{player ? 'Select the patches ' + player + ' earned this round.' : 'Find a player to select the patches they earned this round.'}</p>
            {current?.error ? <p role="status">{current.error} <button type="button" className="btn btn-link"
                onClick={() => { setOptions(null); setReload(value => value + 1); }}>Reload patches</button></p>
                : !current ? <p role="status">Loading patches…</p> :
                    <div className="score-patch-grid">
                        {current.patches.map(patch => <button key={patch.id} type="button" aria-label={patch.name} aria-pressed={selection.badgeIds.includes(patch.id)}
                            disabled={!player || disabled} title={patch.description} onClick={() => toggle(patch.id)}>
                            <img src={patch.thumbUrl} alt="" width="64" height="64" />
                            <span>{patch.name}</span>
                        </button>)}
                    </div>}
            {selection.badgeIds.length > 0 && <label className="score-patch-reason">Award reason
                <input className="form-control" value={selection.reason} maxLength={160} disabled={disabled}
                    onChange={event => onChange({ ...selection, reason: event.target.value })} />
                <small>Enter 3–160 characters for a first award. Repeat awards can be left blank.</small>
            </label>}
        </>}
        {!token && (selection.badgeIds.length > 0 || jobs.length > 0) && <form className="score-patch-access" onSubmit={unlock}>
            <p>Unlock badge awards to deliver the selected patches after the score is saved.</p>
            <label>Staff badge email<input name="email" type="email" className="form-control" required autoComplete="username" /></label>
            <label>Staff badge password<input name="password" type="password" className="form-control" required autoComplete="current-password" /></label>
            <button className="btn btn-outline-secondary" disabled={unlocking}>Unlock badge awards</button>
            {unlockError && <p role="alert">{unlockError}</p>}
        </form>}
        {token && <button type="button" className="btn btn-link" onClick={lock}>Lock badge awards</button>}
        {jobs.map(job => <PatchDelivery key={job.id} job={job} firebase={firebase} token={token} updateJob={updateJob}
            lock={lock} report={setNotice} />)}
        {notice && <p role="status">{notice}</p>}
    </section>;
}
