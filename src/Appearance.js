import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import './appearance.css';

const STORAGE_KEY = 'usaw-field-theme';
const DARK_SCHEME = '(prefers-color-scheme: dark)';
const AppearanceContext = createContext(null);

function readPreference() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function getSystemTheme() {
  return window.matchMedia?.(DARK_SCHEME).matches ? 'dark' : 'light';
}

export function AppearanceProvider({ children }) {
  const [preference, setPreference] = useState(readPreference);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const theme = preference || systemTheme;

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0b1622' : '#0d2338');
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia?.(DARK_SCHEME);
    if (!media) return undefined;

    const update = ({ matches }) => setSystemTheme(matches ? 'dark' : 'light');
    if (media.addEventListener) media.addEventListener('change', update);
    else media.addListener(update);
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', update);
      else media.removeListener(update);
    };
  }, []);

  const onToggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setPreference(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The current tab can still use the selected appearance.
    }
  };

  return (
    <AppearanceContext.Provider value={{ theme, onToggle }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  return useContext(AppearanceContext);
}
