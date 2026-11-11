import React, { useLayoutEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import fullMap from '../../assets/MapHigherRes.png';
import previewMap from '../../assets/MapLowerRes.png';
import './map.css';

const zoomLevels = [100, 150, 200, 300, 400];

export default function Map() {
    const [zoomIndex, setZoomIndex] = useState(0);
    const [detailRequested, setDetailRequested] = useState(false);
    const [detailFailed, setDetailFailed] = useState(false);
    const viewport = useRef(null);
    const zoomCenter = useRef(null);
    const drag = useRef(null);
    const zoom = zoomLevels[zoomIndex];
    const showDetail = detailRequested && !detailFailed;

    useLayoutEffect(() => {
        const view = viewport.current;
        const center = zoomCenter.current;
        if (!view || !center) return;

        view.scrollLeft = center.x * view.scrollWidth - view.clientWidth / 2;
        view.scrollTop = center.y * view.scrollHeight - view.clientHeight / 2;
        zoomCenter.current = null;
    }, [zoomIndex]);

    function changeZoom(nextIndex) {
        if (nextIndex < 0 || nextIndex >= zoomLevels.length || nextIndex === zoomIndex) return;

        const view = viewport.current;
        zoomCenter.current = nextIndex === 0 ? { x: 0.5, y: 0.5 } : {
            x: (view.scrollLeft + view.clientWidth / 2) / view.scrollWidth,
            y: (view.scrollTop + view.clientHeight / 2) / view.scrollHeight,
        };
        if (nextIndex > 0) setDetailRequested(true);
        setZoomIndex(nextIndex);
    }

    function startDrag(event) {
        if (event.pointerType !== 'mouse' || event.button !== 0 || zoomIndex === 0) return;

        const view = event.currentTarget;
        view.focus({ preventScroll: true });
        view.setPointerCapture(event.pointerId);
        drag.current = {
            pointerId: event.pointerId,
            x: event.clientX + view.scrollLeft,
            y: event.clientY + view.scrollTop,
        };
        event.preventDefault();
    }

    function moveDrag(event) {
        const origin = drag.current;
        if (origin?.pointerId !== event.pointerId) return;

        const view = event.currentTarget;
        view.scrollLeft = origin.x - event.clientX;
        view.scrollTop = origin.y - event.clientY;
    }

    return (
        <main className="field-map-page">
            <Helmet>
                <title>Field Map | US Airsoft World</title>
                <meta name="description" content="Explore the official US Airsoft World field map in Anderson, California." />
            </Helmet>
            <div className="field-map-shell">
                <header className="field-map-intro">
                    <p className="field-map-kicker">Anderson, California</p>
                    <h1>Field map</h1>
                    <p>Get familiar with the US Airsoft World layout before game day.</p>
                </header>

                <section className="field-map-viewer" aria-labelledby="field-map-title">
                    <div className="field-map-toolbar">
                        <h2 id="field-map-title">Explore the field</h2>
                        <a className="field-map-image-link" href={fullMap} target="_blank" rel="noopener noreferrer" aria-label="Full image (opens in a new tab)">
                            Full image <span aria-hidden="true">↗</span>
                        </a>
                    </div>

                    <div className="field-map-controls" role="group" aria-label="Map zoom controls">
                        <button className="field-map-zoom-button" type="button" aria-label="Zoom out" disabled={zoomIndex === 0} onClick={() => changeZoom(zoomIndex - 1)}>
                            <span aria-hidden="true">−</span>
                        </button>
                        <output aria-label="Map zoom" className="field-map-zoom-value">{zoom}%</output>
                        <button className="field-map-zoom-button" type="button" aria-label="Zoom in" disabled={zoomIndex === zoomLevels.length - 1} onClick={() => changeZoom(zoomIndex + 1)}>
                            <span aria-hidden="true">+</span>
                        </button>
                        <button className="field-map-fit-button" type="button" disabled={zoomIndex === 0} onClick={() => changeZoom(0)}>
                            Fit map
                        </button>
                    </div>

                    <div
                        ref={viewport}
                        className={zoomIndex > 0 ? 'field-map-viewport is-zoomed' : 'field-map-viewport'}
                        tabIndex={0}
                        role="region"
                        aria-label="Scrollable field map"
                        aria-describedby="field-map-instructions"
                        onPointerDown={startDrag}
                        onPointerMove={moveDrag}
                        onLostPointerCapture={() => { drag.current = null; }}
                    >
                        <div className="field-map-stage" style={{ width: `${zoom}%` }}>
                            <img
                                className="field-map-image"
                                src={showDetail ? fullMap : previewMap}
                                alt="Official US Airsoft World field layout"
                                width="6000"
                                height="3375"
                                draggable={false}
                                onError={() => {
                                    if (showDetail) setDetailFailed(true);
                                    else setDetailRequested(true);
                                }}
                            />
                        </div>
                    </div>
                    <p id="field-map-instructions" className="field-map-hint">
                        Zoom in, then drag or swipe to pan. You can also focus the map and use the arrow keys.
                    </p>
                </section>
            </div>
        </main>
    );
}
