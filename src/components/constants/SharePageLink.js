import React, { useState } from 'react';

export default function SharePageLink({ title, label = 'Share page', href, className }) {
    const [status, setStatus] = useState('');
    const [showLink, setShowLink] = useState(false);
    const url = href ? new URL(href, window.location.origin).href : window.location.href;

    async function share() {
        setStatus('');
        setShowLink(false);
        if (navigator.share) {
            try {
                await navigator.share({ title, url });
                return;
            } catch (error) {
                if (error.name === 'AbortError') return;
            }
        }

        try {
            await navigator.clipboard.writeText(url);
            setStatus('Link copied.');
        } catch {
            setShowLink(true);
        }
    }

    return (
        <div className="usaw-share">
            <button type="button" className={className} onClick={share}>{label}</button>
            {status && <span role="status" className="usaw-share__status">{status}</span>}
            {showLink && <input className="usaw-share__link" aria-label="Page link" readOnly value={url}
                onFocus={(event) => event.target.select()} />}
        </div>
    );
}
