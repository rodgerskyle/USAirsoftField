import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCompress, faExpand } from '@fortawesome/free-solid-svg-icons';
import logo from '../../assets/usairsoft-small-logo.png';
import './LeaderboardTvDisplay.css';

export default function LeaderboardTvDisplay({ title, periodControls, status, playerCount, onLoadMore, children }) {
    const displayRef = useRef(null);
    const standingsRef = useRef(null);
    const [fullscreen, setFullscreen] = useState(false);
    const [fullscreenError, setFullscreenError] = useState('');
    const hasStandings = status === 'ready' && playerCount > 0;

    useEffect(() => {
        function handleFullscreenChange() {
            const active = document.fullscreenElement === displayRef.current;
            setFullscreen(active);
            setFullscreenError('');
            if (active) standingsRef.current?.focus({ preventScroll: true });
        }
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        standingsRef.current.scrollTop = 0;
    }, [title]);

    function loadMoreOnScroll(event) {
        const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
        if (scrollHeight - scrollTop - clientHeight <= clientHeight) onLoadMore?.();
    }

    async function toggleFullscreen() {
        setFullscreenError('');
        try {
            if (document.fullscreenElement === displayRef.current) {
                await document.exitFullscreen();
            } else if (displayRef.current?.requestFullscreen) {
                await displayRef.current.requestFullscreen();
            } else {
                setFullscreenError('Use your browser’s full screen option on this device.');
            }
        } catch {
            setFullscreenError('Full screen could not be changed. Use your browser’s full screen option.');
        }
    }

    return (
        <main ref={displayRef} className="field-lb field-lb-presentation">
            <Helmet><title>{`USAW ${title} TV Display`}</title></Helmet>
            <header className="field-lb-presentation-header">
                <div className="field-lb-presentation-brand">
                    <img src={logo} alt="US Airsoft" />
                    <h1 id="field-lb-presentation-title">{title}</h1>
                </div>
                <div className="field-lb-presentation-controls">
                    {periodControls}
                    {!fullscreen && <Link to="/admin">Back to staff</Link>}
                    <button type="button" onClick={toggleFullscreen}>
                        <FontAwesomeIcon icon={fullscreen ? faCompress : faExpand} aria-hidden="true" />
                        {fullscreen ? 'Exit full screen' : 'Full screen'}
                    </button>
                </div>
            </header>
            {fullscreenError && <p className="field-lb-presentation-notice" role="status">{fullscreenError}</p>}
            <section ref={standingsRef} className="field-lb-standings field-lb-presentation-standings"
                aria-labelledby="field-lb-presentation-title" tabIndex={0} onScroll={onLoadMore ? loadMoreOnScroll : undefined}>
                {status === 'loading' && <p className="field-lb-message" role="status">Loading standings…</p>}
                {status === 'error' && <p className="field-lb-message" role="alert">Standings are temporarily unavailable.</p>}
                {status === 'ready' && !hasStandings && <p className="field-lb-message" role="status">No standings are available yet.</p>}
                {hasStandings && children}
            </section>
        </main>
    );
}
