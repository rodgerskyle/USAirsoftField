import React, { useLayoutEffect, useRef, useState } from 'react';
import mapImage from '../../assets/MapLowerRes.png';
import './FieldRoundMap.css';

const pinKinds = [
    { key: 'briefing', label: 'Briefing', letter: 'B', location: 'briefingLocation' },
    { key: 'camo', label: 'Camo respawn', letter: 'C', location: 'camoSpawn' },
    { key: 'solid', label: 'Solid respawn', letter: 'S', location: 'solidSpawn' },
];
const mapCenter = { x: 0.5, y: 0.5 };
const arrowOffsets = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const isCoordinate = value => Number.isFinite(value) && value >= 0 && value <= 1;
const isMapPoint = point => isCoordinate(point?.x) && isCoordinate(point?.y);
const clampCoordinate = value => Math.round(Math.max(0, Math.min(1, value)) * 10000) / 10000;

export function readMapPins(pins) {
    return Object.fromEntries(pinKinds.flatMap(({ key }) => {
        const point = pins?.[key];
        return isMapPoint(point) ? [[key, { x: point.x, y: point.y }]] : [];
    }));
}

export function roundPinLocation(round, key) {
    const { location } = pinKinds.find(pin => pin.key === key);
    if (round[location]) return round[location];
    if (isMapPoint(round.mapPins?.[key])) return 'Marked on map';
    return key === 'briefing' ? round.location || 'Main field' : 'At briefing';
}

function MapSurface({ pins, selected, onPlace }) {
    const [zoomed, setZoomed] = useState(false);
    const viewport = useRef(null);
    const stage = useRef(null);
    const current = pins[selected];
    const x = current?.x;
    const y = current?.y;
    const selectedLabel = pinKinds.find(({ key }) => key === selected)?.label;

    useLayoutEffect(() => {
        if (!zoomed) return;
        const view = viewport.current;
        const image = stage.current;
        view.scrollLeft = (x ?? .5) * image.offsetWidth - view.clientWidth / 2;
        view.scrollTop = (y ?? .5) * image.offsetHeight - view.clientHeight / 2;
    }, [zoomed, x, y]);

    function place(event) {
        if (event.detail === 0) {
            onPlace(current || mapCenter);
            return;
        }
        const bounds = event.currentTarget.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return;
        onPlace({
            x: clampCoordinate((event.clientX - bounds.left) / bounds.width),
            y: clampCoordinate((event.clientY - bounds.top) / bounds.height),
        });
    }

    function nudge(event) {
        const offsets = arrowOffsets[event.key];
        if (!Array.isArray(offsets)) return;
        event.preventDefault();
        const point = current || mapCenter;
        const distance = event.shiftKey ? 0.05 : 0.01;
        onPlace({ x: clampCoordinate(point.x + offsets[0] * distance), y: clampCoordinate(point.y + offsets[1] * distance) });
    }

    const Stage = onPlace ? 'button' : 'div';
    return (
        <div className="round-map-surface">
            <button className="round-map-control" type="button" onClick={() => setZoomed(value => !value)}>
                {zoomed ? 'Fit map' : 'Zoom in on map'}
            </button>
            <div className="round-map-viewport" data-zoomed={zoomed} ref={viewport} tabIndex={zoomed ? 0 : undefined}
                role={zoomed ? 'region' : undefined}
                aria-label={zoomed ? 'Scrollable field map' : undefined}>
                <Stage className="round-map-stage" ref={stage} {...(onPlace && {
                    type: 'button', 'aria-label': `Place ${selectedLabel} pin on field map`, onClick: place, onKeyDown: nudge,
                })}>
                    <img src={mapImage} loading="lazy" width="900" height="506" draggable={false}
                        alt={onPlace ? '' : `Official US Airsoft World field map, highlighting ${selectedLabel}`} />
                    {pinKinds.filter(({ key }) => pins[key]).map(({ key, letter }) => (
                        <span className="round-map-marker" aria-hidden="true" key={key} data-pin={key} data-selected={key === selected}
                            style={{ left: `${pins[key].x * 100}%`, top: `${pins[key].y * 100}%` }}>{letter}</span>
                    ))}
                </Stage>
            </div>
        </div>
    );
}

export function FieldPinPicker({ pins, onChange }) {
    const [selected, setSelected] = useState('briefing');
    const { label } = pinKinds.find(({ key }) => key === selected);
    const point = pins[selected];
    function clearPin() {
        const next = { ...pins };
        delete next[selected];
        onChange(next);
    }

    return (
        <div className="round-map">
            <div className="round-map-controls" role="group" aria-label="Choose a map pin">
                {pinKinds.map(({ key, label: name }) => (
                    <button className="round-map-control" key={key} type="button" aria-pressed={key === selected}
                        onClick={() => setSelected(key)}>{name}</button>
                ))}
            </div>
            <p>Tap the map to place the selected pin. On a keyboard, focus the map and use the arrow keys.</p>
            <MapSurface pins={pins} selected={selected} onPlace={point => onChange({ ...pins, [selected]: point })} />
            <div className="round-map-controls">
                <p aria-live="polite">{label} pin {point ? 'placed' : 'unset'}.
                    {point && <span className="visually-hidden"> {Math.round(point.x * 100)}% from the left, {Math.round(point.y * 100)}% from the top.</span>}
                </p>
                <button className="round-map-control" type="button" disabled={!point} onClick={clearPin}>Clear {label} pin</button>
            </div>
        </div>
    );
}

export function RoundMapViewer({ round }) {
    const pins = readMapPins(round.mapPins);
    const [selected, setSelected] = useState(null);
    const active = pins[selected] ? selected : null;
    const available = pinKinds.filter(({ key }) => pins[key]);
    if (!available.length) return null;

    return (
        <div className="round-map">
            <div className="round-map-controls" role="group" aria-label="Show a location on the field map">
                {available.map(({ key, label }) => (
                    <button className="round-map-control" key={key} type="button" aria-pressed={active === key}
                        onClick={() => setSelected(value => value === key ? null : key)}>Show {label} on map</button>
                ))}
            </div>
            {active && <>
                <MapSurface pins={pins} selected={active} />
                <ul className="round-map-legend" aria-label="Map pin locations">
                    {available.map(({ key, label, letter }) => (
                        <li key={key} data-selected={key === active}>
                            <span className="round-map-key" data-pin={key} aria-hidden="true">{letter}</span>
                            <span><strong>{label}</strong> · {roundPinLocation(round, key)}</span>
                        </li>
                    ))}
                </ul>
            </>}
        </div>
    );
}
