import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCompress, faExpand } from '@fortawesome/free-solid-svg-icons';
import logo from '../../assets/usairsoft-small-logo.png';
import './LeaderboardTvDisplay.css';

export default function LeaderboardTvDisplay({ title, periodControls, status, playerCount, page, pageCount, onPageChange, children }) {
    const displayRef = useRef(null);
    const [fullscreen, setFullscreen] = useState(false);
    const [fullscreenError, setFullscreenError] = useState('');
    const hasStandings = status === 'ready' && playerCount > 0;

    useEffect(() => {
        function handleFullscreenChange() {
            setFullscreen(document.fullscreenElement === displayRef.current);
            setFullscreenError('');
        }
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

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
            <section className="field-lb-standings field-lb-presentation-standings" aria-labelledby="field-lb-presentation-title">
                {status === 'loading' && <p className="field-lb-message" role="status">Loading standings…</p>}
                {status === 'error' && <p className="field-lb-message" role="alert">Standings are temporarily unavailable.</p>}
                {status === 'ready' && !hasStandings && <p className="field-lb-message" role="status">No standings are available yet.</p>}
                {hasStandings && children}
            </section>
            {hasStandings && pageCount > 1 && (
                <nav className="field-lb-presentation-pagination" aria-label="Standings pages">
                    <button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)}>Previous</button>
                    <span aria-live="polite">Page {page} of {pageCount}</span>
                    <button type="button" disabled={page === pageCount} onClick={() => onPageChange(page + 1)}>Next</button>
                </nav>
            )}
        </main>
    );
}
