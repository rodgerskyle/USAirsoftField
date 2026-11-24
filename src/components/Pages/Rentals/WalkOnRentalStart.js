import { useCallback, useEffect, useState } from 'react';
import { requestStaffFieldTool } from '../../constants/fieldStaffApi';

function useCheckedInRenter(firebase, uid, handoff) {
    const { key, playerId, date } = handoff || {};
    const visit = [uid, key, playerId, date].join('/');
    const [record, setRecord] = useState(null);
    const [attempt, setAttempt] = useState(0);
    const verify = useCallback(async signal => {
        const path = '/api/rental-groups?' + new URLSearchParams({ [key]: playerId, date });
        const data = await requestStaffFieldTool(firebase, uid, path, { signal });
        const row = data[key];
        if (row?.playerId !== playerId || row.date !== date || !row.displayName?.trim()) {
            throw new Error('Could not confirm this ' + (key === 'walkOn' ? 'walk-on' : 'member') + '. Reopen the player from check-in.');
        }
        return row;
    }, [firebase, uid, key, playerId, date]);
    useEffect(() => {
        if (!uid || !playerId) return;
        const controller = new AbortController();
        setRecord(null);
        verify(controller.signal).then(player => {
            if (!controller.signal.aborted) setRecord({ visit, player });
        }).catch(failure => {
            if (!controller.signal.aborted) setRecord({ visit, error: failure.message || 'Could not load this check-in. Please retry.' });
        });
        return () => controller.abort();
    }, [uid, playerId, visit, verify, attempt]);
    return { ...(record?.visit === visit ? record : {}), verify, retry: () => setAttempt(value => value + 1) };
}

export default useCheckedInRenter;
