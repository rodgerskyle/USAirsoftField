import React, { useEffect, useRef, useState } from 'react';
import { mountBriefingController, mountBriefingTV } from './round-briefing-controller';

// Both TV displays and both staff desks draw on the same field image.
const imageUrl = 'https://app.usairsoftfield.com/assets/field-map.jpg';

export function RoundBriefingEditor({ game, request, displayGameId, displayRevision, onDisplayChange, disabled }) {
    const [open, setOpen] = useState(false);
    const host = useRef(null);
    const editor = useRef(null);
    const onTV = game.id === displayGameId;
    const panelId = 'round-briefing-' + game.id;

    useEffect(() => () => {
        editor.current?.destroy();
        editor.current = null;
    }, [open, request, onDisplayChange]);

    useEffect(() => {
        if (!open) return;
        const snapshot = { game, displayGameId, displayRevision };
        if (editor.current) editor.current.update(snapshot);
        else editor.current = mountBriefingController(host.current, { ...snapshot, request, imageUrl, onDisplayChange });
    }, [open, game, request, displayGameId, displayRevision, onDisplayChange]);

    async function toggle() {
        if (open && editor.current && !(await editor.current.beforeClose())) return;
        setOpen(!open);
    }

    return (
        <div className="field-round-briefing">
            <div className="field-rounds-actions">
                <button type="button" className="btn btn-outline-primary" aria-expanded={open} aria-controls={panelId}
                    disabled={disabled && !open} onClick={toggle}>
                    {open ? 'Close briefing map' : 'Open briefing map'}
                </button>
                {onTV && !open && <span className="field-briefing-on-tv">On Barracks TV</span>}
            </div>
            <div id={panelId} ref={host} hidden={!open} role="region" aria-label={`Briefing map for ${game.title || 'field round'}`} />
        </div>
    );
}

export function RoundBriefingDisplay({ request, onActiveChange }) {
    const host = useRef(null);
    useEffect(() => {
        const receiver = mountBriefingTV(host.current, { request, imageUrl, onActiveChange });
        return () => receiver.destroy();
    }, [request, onActiveChange]);

    return <div className="field-barracks-briefing" ref={host} />;
}
