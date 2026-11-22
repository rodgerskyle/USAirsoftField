import React, { useEffect, useRef, useState } from 'react';
import { LIVE_ROUNDS_PATH } from './FieldRoundsShared';

const displayMs = 6000;
const pollMs = 3000;

export default function BarracksPatchCelebrations({ initialCursor, request }) {
    const baseline = useRef(initialCursor);
    const [award, setAward] = useState(null);

    useEffect(() => {
        let cursor = baseline.current;
        let stopped = false;
        let playing = false;
        let controller;
        let nextRead;
        let nextAward;
        const queue = [];

        function playNext() {
            if (document.hidden || stopped) return;
            const next = queue.shift();
            playing = Boolean(next);
            setAward(next ?? null);
            if (playing) nextAward = window.setTimeout(playNext, displayMs);
        }

        async function readPage() {
            if (document.hidden || stopped || controller) return;
            window.clearTimeout(nextRead);
            controller = new AbortController();
            const signal = controller.signal;
            const timeout = window.setTimeout(() => controller?.abort(), 8000);
            let followUp = pollMs;
            try {
                const data = await request(LIVE_ROUNDS_PATH + '?celebrationsAfter=' + cursor, { signal });
                if (stopped || signal.aborted || !Array.isArray(data?.events) || !Number.isSafeInteger(data.cursor) || data.cursor < cursor) return;
                const previous = cursor;
                for (const event of data.events) {
                    if (!Number.isSafeInteger(event?.sequence) || event.sequence <= cursor || event.sequence > data.cursor) continue;
                    if (!['battle', 'virtual'].includes(event.kind) || typeof event.playerName !== 'string' ||
                        typeof event.patchName !== 'string' || !event.playerName.trim() || !event.patchName.trim()) continue;
                    queue.push(event);
                    cursor = event.sequence;
                }
                cursor = data.cursor;
                if (!playing && queue.length) playNext();
                if (cursor > previous && (data.events.length || data.hasMore)) followUp = 0;
            } catch {
                // A later poll resumes at the same sequence after an interruption.
            } finally {
                window.clearTimeout(timeout);
                controller = null;
                if (!stopped && !document.hidden) nextRead = window.setTimeout(readPage, followUp);
            }
        }

        function visibilityChanged() {
            window.clearTimeout(nextRead);
            window.clearTimeout(nextAward);
            if (document.hidden) return;
            if (playing) nextAward = window.setTimeout(playNext, displayMs);
            else if (queue.length) playNext();
            void readPage();
        }
        void readPage();
        document.addEventListener('visibilitychange', visibilityChanged);
        return () => {
            stopped = true;
            window.clearTimeout(nextRead);
            window.clearTimeout(nextAward);
            controller?.abort();
            document.removeEventListener('visibilitychange', visibilityChanged);
        };
    }, [request]);

    if (!award) return null;
    return (
        <section key={award.sequence} className="field-barracks-award" data-kind={award.kind}
            aria-label="Patch celebration" role="status" aria-live="polite" aria-atomic="true">
            <div className="field-barracks-award-art" aria-hidden="true">
                {award.imageUrl && <img src={award.imageUrl} alt="" />}
            </div>
            <div className="field-barracks-award-copy">
                <p>{award.kind === 'battle' ? 'Game MVP' : 'Patch awarded'}</p>
                <h2>{award.playerName}</h2>
                <strong>{award.patchName}</strong>
            </div>
        </section>
    );
}
