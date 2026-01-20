'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: ResolvedMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const STORAGE_KEY = 'sfp-theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [resolvedMode, setResolvedMode] = useState<ResolvedMode>('light');

  useEffect(() => {
    setMode(getStoredMode());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (nextMode: ThemeMode) => {
      const resolved: ResolvedMode =
        nextMode === 'system' ? (media.matches ? 'dark' : 'light') : nextMode;
      setResolvedMode(resolved);
      const root = document.documentElement;
      root.setAttribute('data-theme', resolved);
      root.style.colorScheme = resolved;
      window.localStorage.setItem(STORAGE_KEY, nextMode);
    };

    applyTheme(mode);

    const handleSystemChange = () => {
      if (mode === 'system') {
        applyTheme('system');
      }
    };

    media.addEventListener('change', handleSystemChange);
    return () => media.removeEventListener('change', handleSystemChange);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      resolvedMode,
      setMode,
      toggle: () => setMode(resolvedMode === 'dark' ? 'light' : 'dark'),
    }),
    [mode, resolvedMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
