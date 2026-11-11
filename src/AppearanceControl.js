import React from 'react';

export default function AppearanceControl({ theme, onToggle }) {
    const dark = theme === 'dark';

    return (
        <button
            type="button"
            className="usaw-nav__control usaw-nav__appearance"
            aria-label="Dark mode"
            aria-pressed={dark}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={onToggle}
        >
            <svg
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                overflow="visible"
            >
                <path d="M4 8.8C4.5 4.6 7.6 2 12 2s7.5 2.6 8 6.8M5.6 15.6l1 3.4 5.4 3 5.4-3 1-3.4" />
                <path d="M5 8.7h4l1-2.1h4l1 2.1h4M12 6.6v4.9m-1.5 0h3M8.8 18.3l1.1-1.9h4.2l1.1 1.9" />
                <g
                    fill={dark ? '#d5ff91' : 'none'}
                    stroke={dark ? '#70ef44' : 'currentColor'}
                    style={dark ? { filter: 'drop-shadow(0 0 1.5px #64ed39)' } : undefined}
                >
                    <circle cx="3.2" cy="12.4" r="1.95" />
                    <circle cx="9.1" cy="11.8" r="1.95" />
                    <circle cx="14.9" cy="11.8" r="1.95" />
                    <circle cx="20.8" cy="12.4" r="1.95" />
                </g>
            </svg>
            <span className="usaw-nav__appearance-label" aria-hidden="true">{dark ? 'Dark' : 'Light'}</span>
        </button>
    );
}
