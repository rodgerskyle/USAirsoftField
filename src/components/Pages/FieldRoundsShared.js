import React, { useCallback, useEffect, useRef, useState } from 'react';
import { roundPinLocation } from './FieldRoundMap';

export const LIVE_ROUNDS_PATH = '/api/live-games';
export const STAFF_ROUNDS_PATH = LIVE_ROUNDS_PATH + '?staff=1';
export const ROUND_CATALOG_PATH = LIVE_ROUNDS_PATH + '?catalog=1';

const californiaTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', weekday: 'short', hour: 'numeric', minute: '2-digit',
});
const californiaParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function formatFieldTime(timestamp) {
    const value = Date.parse(timestamp);
    return Number.isFinite(value) ? californiaTime.format(value) : 'Time pending';
}

export function fieldTimeInput(timestamp) {
    const { year, month, day, hour, minute } = Object.fromEntries(
        californiaParts.formatToParts(timestamp).map(({ type, value }) => [type, value]),
    );
    return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function fieldTimeISO(input) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(input);
    if (!match) throw new Error('Choose a valid California date and time.');
    const [year, month, day, hour, minute] = match.slice(1).map(Number);
    const local = Date.UTC(year, month - 1, day, hour, minute);
    const candidates = [7, 8].map(offset => local + offset * 3600000)
        .filter(timestamp => fieldTimeInput(timestamp) === input);
    if (candidates.length !== 1) {
        throw new Error(candidates.length
            ? 'That time occurs twice during the clock change. Choose another time.'
            : 'That California date or time does not exist. Choose another time.');
    }
    return new Date(candidates[0]).toISOString();
}

export function liveRounds(games, now) {
    const visible = (Array.isArray(games) ? games : [])
        .filter(game => Number.isFinite(Date.parse(game.startsAt)) && Number.isFinite(Date.parse(game.endsAt)))
        .filter(game => ['queued', 'delayed'].includes(game.status) ||
            (['scheduled', 'live'].includes(game.status) && Date.parse(game.endsAt) > now))
        .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
    const active = visible.filter(game => game.status === 'live' ||
        (game.status === 'scheduled' && Date.parse(game.startsAt) <= now));
    const current = active.find(game => game.status === 'live') || active[0];
    const upcoming = visible.filter(game => !active.includes(game));
    return { current, active, upcoming };
}

export function isOpenVote(poll, now) {
    return Boolean(poll && !poll.closed && Date.parse(poll.closesAt) > now);
}

export function formatRoundCountdown(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = String(Math.floor(seconds / 60) % 60).padStart(2, '0');
    const remainder = String(seconds % 60).padStart(2, '0');
    return hours ? `${hours}:${minutes}:${remainder}` : `${minutes}:${remainder}`;
}

export function useLiveFieldBoard(request, path = LIVE_ROUNDS_PATH) {
    const [snapshot, setSnapshot] = useState(null);
    const [error, setError] = useState('');
    const [clock, setClock] = useState(() => performance.now());
    const active = useRef(null);
    const refresh = useCallback(async () => {
        active.current?.abort();
        const controller = new AbortController();
        active.current = controller;
        const timeout = window.setTimeout(() => controller.abort(), 8000);
        try {
            const board = await request(path, { signal: controller.signal });
            const serverTime = Date.parse(board?.serverNow);
            if (!Array.isArray(board?.games) || !Number.isFinite(serverTime)) {
                throw new Error('The field board returned an unexpected response.');
            }
            if (path === STAFF_ROUNDS_PATH && board.isStaff !== true) {
                throw new Error('The staff board could not verify your access. Refresh the board to retry.');
            }
            if (active.current !== controller) return;
            if (controller.signal.aborted) throw new Error('The field board did not respond.');
            const received = performance.now();
            setSnapshot({ board, serverTime, received });
            setClock(received);
            setError('');
        } catch (failure) {
            if (active.current === controller) {
                setError(failure.name === 'AbortError' ? 'The field board did not respond.' :
                    failure.message || 'The field board is temporarily unavailable.');
            }
        } finally {
            window.clearTimeout(timeout);
            if (active.current === controller) active.current = null;
        }
    }, [path, request]);

    useEffect(() => {
        const update = () => {
            if (document.visibilityState !== 'hidden' && !active.current) void refresh();
        };
        void refresh();
        const poll = window.setInterval(update, 10000);
        const tick = window.setInterval(() => setClock(performance.now()), 1000);
        document.addEventListener('visibilitychange', update);
        return () => {
            window.clearInterval(poll);
            window.clearInterval(tick);
            document.removeEventListener('visibilitychange', update);
            const controller = active.current;
            active.current = null;
            controller?.abort();
        };
    }, [refresh]);

    const now = snapshot ? snapshot.serverTime + Math.max(0, clock - snapshot.received) : Date.now();
    return { board: snapshot?.board, error, now, refresh };
}

export function RoundRespawns({ round }) {
    return (
        <dl className="field-round-respawns">
            <div data-team="camo">
                <dt>Camo respawn</dt>
                <dd>{roundPinLocation(round, 'camo')}</dd>
            </div>
            <div data-team="solid">
                <dt>Solid respawn</dt>
                <dd>{roundPinLocation(round, 'solid')}</dd>
            </div>
        </dl>
    );
}
