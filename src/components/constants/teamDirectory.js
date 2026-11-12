import { useEffect, useState } from 'react';
import { getDownloadURL } from 'firebase/storage';

const companion = 'https://usaw-field-companion.pink-bud-3735.chatgpt.site';
const endpoint = `${companion}/api/team-directory`;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const allowedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function teamPagePath({ id, source }) {
    const path = `/teams/${encodeURIComponent(id)}`;
    return source === 'companion' ? `${path}?source=companion` : path;
}

export function companionTeamWorkspace(id) {
    return `${companion}/#teams/my/${encodeURIComponent(id)}`;
}

async function request(user, query, signal) {
    const url = new URL(endpoint);
    url.search = new URLSearchParams(query).toString();
    const token = await user.getIdToken();
    return fetch(url, {
        headers: { Accept: query.asset === 'logo' ? 'image/*' : 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        signal,
    });
}

const pending = { status: 'loading' };
const validTeam = team => team?.source === 'companion' && typeof team.id === 'string' && uuid.test(team.id)
    && typeof team.name === 'string';

export function useCompanionTeamDirectory(firebase, { enabled = true, id, attempt = 0 } = {}) {
    const [state, setState] = useState(pending);
    useEffect(() => {
        if (!enabled) return undefined;
        if (id !== undefined && !uuid.test(id)) {
            setState({ status: 'missing' });
            return undefined;
        }
        let controller;
        let active = true;
        const stopAuth = firebase.auth.onAuthStateChanged(user => {
            if (!active) return;
            controller?.abort();
            if (!user) {
                setState({ status: 'signed-out' });
                return;
            }
            setState(pending);
            controller = new AbortController();
            const { signal } = controller;
            request(user, id ? { id } : {}, signal).then(async response => {
                if (signal.aborted) return;
                if (response.status === 401 || response.status === 403) {
                    setState({ status: 'membership-required' });
                    return;
                }
                if (response.status === 404 && id) {
                    setState({ status: 'missing' });
                    return;
                }
                if (!response.ok) throw new Error('The team directory is unavailable.');
                const record = await response.json();
                if (signal.aborted) return;
                if (id) {
                    if (!validTeam(record?.team) || record.team.id !== id || !Array.isArray(record.team.members)) {
                        throw new Error('The team profile is unavailable.');
                    }
                } else {
                    if (!Array.isArray(record?.teams)) throw new Error('The team directory is unavailable.');
                    record.teams = record.teams.filter(validTeam);
                }
                setState({ status: 'ready', user, record });
            }).catch(() => {
                if (!signal.aborted) setState({ status: 'error' });
            });
        });
        return () => {
            active = false;
            controller?.abort();
            stopAuth();
        };
    }, [firebase, enabled, id, attempt]);

    return state;
}

export function useTeamLogo(firebase, { id, source, hasLogo, user } = {}) {
    const [logo, setLogo] = useState('');
    useEffect(() => {
        setLogo('');
        if (!id || (source === 'companion' && (!hasLogo || !user))) return undefined;
        const controller = new AbortController();
        const { signal } = controller;
        let objectUrl;
        async function load() {
            if (source === 'field') {
                const url = await getDownloadURL(firebase.teamsPictures(`${id}.png`));
                if (!signal.aborted) setLogo(url);
                return;
            }
            const response = await request(user, { id, asset: 'logo' }, signal);
            if (!response.ok) return;
            const blob = await response.blob();
            if (signal.aborted || !allowedImageTypes.has(blob.type)) return;
            objectUrl = URL.createObjectURL(blob);
            setLogo(objectUrl);
        }
        load().catch(() => {}); // Keep the directory icon when no logo is available.
        return () => {
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [firebase, id, source, hasLogo, user]);
    return { logo, clearLogo: () => setLogo('') };
}
