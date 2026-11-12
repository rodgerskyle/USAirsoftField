import { useEffect, useRef, useState } from 'react';
import rankIncrements from './rankincrements';

const endpoint = 'https://usaw-field-companion.pink-bud-3735.chatgpt.site/api/player-prestige';
const playerIdPattern = /^[a-z0-9_-]{10,128}$/i;
export const maximumRankPoints = rankIncrements[rankIncrements.length - 1];

export function prestigeCyclePoints(lifetimePoints, record) {
  return Math.max(0, lifetimePoints - (record?.cycleStartPoints ?? 0));
}

export function profileRank(points) {
  const nextRank = rankIncrements.findIndex(threshold => points < threshold);
  return nextRank === -1 ? rankIncrements.length - 1 : Math.max(0, nextRank - 1);
}

function isRecord(data) {
  return Number.isSafeInteger(data?.prestigeCount) && data.prestigeCount >= 0
    && Number.isSafeInteger(data.cycleStartPoints) && data.cycleStartPoints >= 0;
}

async function readResponse(response) {
  const data = await response.json().catch(() => null);
  if (response.ok) return data;
  const error = new Error(typeof data?.error === 'string' ? data.error : 'Prestige is temporarily unavailable.');
  error.status = response.status;
  throw error;
}

export async function getPlayerPrestige(id, signal) {
  const query = new URLSearchParams({ id });
  const result = await readResponse(await fetch(`${endpoint}?${query}`, {
    headers: { Accept: 'application/json' },
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    signal,
  }));
  if (!isRecord(result)) throw new Error('Prestige information is unavailable.');
  return result;
}

async function changePrestige(firebase, playerId, body, signal) {
  const user = firebase.auth.currentUser;
  if (user?.uid !== playerId) throw new Error('Sign in to your USAW account to continue.');
  const token = await user.getIdToken();
  if (signal.aborted || firebase.auth.currentUser !== user) throw new DOMException('Account changed.', 'AbortError');
  return readResponse(await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    signal,
  }));
}

export async function preparePrestige(firebase, playerId, signal) {
  const result = await changePrestige(firebase, playerId, { action: 'prepare' }, signal);
  if (typeof result?.challenge !== 'string' || !result.challenge
    || !Number.isSafeInteger(result.nextPrestige) || result.nextPrestige < 1) {
    throw new Error('The Prestige review could not be started.');
  }
  return result;
}

export async function confirmPrestige(firebase, playerId, challenge, signal) {
  const result = await changePrestige(firebase, playerId, { action: 'confirm', challenge }, signal);
  if (!isRecord(result)) throw new Error('The Prestige confirmation could not be verified.');
  return result;
}

export function usePlayerPrestige(playerId) {
  const [state, setState] = useState(null);
  const request = useRef(null);

  useEffect(() => {
    if (!playerIdPattern.test(playerId ?? '')) return undefined;
    function refresh() {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      const { signal } = controller;
      getPlayerPrestige(playerId, signal)
        .then(record => { if (!signal.aborted) setState({ playerId, record, failed: false }); })
        .catch(() => {
          if (!signal.aborted) setState(previous => ({
            playerId, record: previous?.playerId === playerId ? previous.record : null, failed: true,
          }));
        });
    }
    refresh();
    window.addEventListener('focus', refresh);
    return () => {
      request.current?.abort();
      window.removeEventListener('focus', refresh);
    };
  }, [playerId]);

  function replace(record) {
    request.current?.abort();
    setState({ playerId, record, failed: false });
  }

  const current = state?.playerId === playerId ? state : null;
  return { record: current?.record ?? null, failed: current?.failed ?? false, replace };
}
