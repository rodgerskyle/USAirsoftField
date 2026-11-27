import React, { useEffect, useState, useRef } from 'react';
import { child, onValue } from 'firebase/database';
import { clearReviewedReturns } from './utils/returnedBoard';

export function useReturnMarkers(firebase, uid, date, hasUndated, retry) {
    const [snapshot, setSnapshot] = useState(null);
    useEffect(() => {
        if (!uid || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !firebase?.rentals) return;
        let active = true;
        const buckets = hasUndated ? [date, 'undated'] : [date];
        const records = new Map();
        const failures = new Set();
        const subscriptions = [];
        const publish = () => {
            if (!active) return;
            const markers = new Set();
            for (const [bucket, rows] of records) {
                Object.entries(rows).forEach(([id, cleared]) => {
                    if (cleared === true) markers.add(bucket + '/' + id);
                });
            }
            const error = failures.size ? 'Could not load the shared Returned list. Refresh pickups to try again.' : '';
            setSnapshot({firebase, uid, date, hasUndated, markers, ready: records.size === buckets.length && !error, error});
        };
        const failed = bucket => {
            failures.add(bucket);
            records.delete(bucket);
            publish();
        };
        for (const bucket of buckets) {
            try {
                subscriptions.push(onValue(child(firebase.rentals(), 'returnListClears/' + bucket), data => {
                    records.set(bucket, data.val() || {});
                    failures.delete(bucket);
                    publish();
                }, () => failed(bucket)));
            } catch { failed(bucket); }
        }
        return () => { active = false; subscriptions.forEach(stop => stop?.()); };
    }, [firebase, uid, date, hasUndated, retry]);
    return snapshot?.uid === uid && snapshot.date === date && snapshot.firebase === firebase &&
        snapshot.hasUndated === hasUndated ? snapshot : null;
}

export function ReturnedListControls({firebase, day, clearable, enabled, filtered, clearedCount, history, setHistory}) {
    const [review, setReview] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const busy = useRef(false);
    const active = useRef(true);
    useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
    const clear = async () => {
        if (!enabled || !review || busy.current) return;
        busy.current = true; setSaving(true); setError('');
        try {
            const keys = new Set(review.markers);
            const reviewed = clearable.filter(({markers}) => markers.every(key => keys.has(key)));
            if (!reviewed.length) {
                setFeedback('The listed returns have changed. Review the current list.');
            } else {
                await clearReviewedReturns(firebase, reviewed.map(entry => entry.card), day);
                if (active.current) setFeedback('Returned list cleared. Equipment history is saved.');
            }
            if (active.current) setReview(null);
        } catch (failure) {
            if (active.current) setError(failure.message || 'Could not clear the Returned list. Try again.');
        } finally {
            busy.current = false;
            if (active.current) setSaving(false);
        }
    };
    return <div className="armory-return-controls">
        {(clearedCount > 0 || history) && <button type="button" className="btn btn-outline-primary" disabled={saving}
            aria-pressed={history} onClick={() => {setHistory(!history); setReview(null); setFeedback(''); setError('');}}>
            {history ? 'Back to Returned' : 'Show cleared returns (' + clearedCount + ')'}
        </button>}
        {!history && !review && clearable.length > 0 && <button type="button" className="btn btn-outline-primary"
            disabled={!enabled} onClick={() => {setReview({count:clearable.length, markers:clearable.flatMap(entry => entry.markers)}); setFeedback(''); setError('');}}>
            {filtered ? 'Clear matching returns' : 'Clear returned list'}
        </button>}
        {review && <div className="armory-return-confirm" role="group" aria-label="Clear completed returns">
            <p>Clear {review.count} completed {review.count === 1 ? 'return' : 'returns'} from the armory list on all staff devices? You can still view the equipment history.</p>
            <button type="button" className="btn btn-primary" disabled={saving || !enabled} onClick={clear}>{saving ? 'Clearing…' : 'Confirm clear'}</button>
            <button type="button" className="btn btn-outline-primary" disabled={saving} onClick={() => setReview(null)}>Cancel</button>
        </div>}
        {error && <p role="alert">{error}</p>}
        {feedback && <p role="status">{feedback}</p>}
    </div>;
}
