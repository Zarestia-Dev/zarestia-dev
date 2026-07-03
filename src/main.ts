import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// ============================================================================
// EARLY THEME DETECTION — runs before Angular bootstraps to avoid FOUC.
// Reads the user's saved theme preference (localStorage) and falls back
// to the OS `prefers-color-scheme` media query. Adds `.light` or `.dark`
// class to <html>.
// ============================================================================

const THEME_STORAGE_KEY = 'zarestia-theme';

type ThemePref = 'light' | 'dark' | 'system';

function setThemeClass(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove(theme === 'dark' ? 'light' : 'dark');
  root.classList.add(theme);

  // Update the meta theme-color so mobile browser chrome matches
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#0F1410' : '#FAFBF7');
  }
}

function getStoredTheme(): ThemePref | null {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // localStorage may be unavailable (private mode, sandboxed iframe); ignore
  }
  return null;
}

function initThemeDetection(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const stored = getStoredTheme();
  const mql = window.matchMedia('(prefers-color-scheme: dark)');

  // Explicit user preference wins; no listener attached so it stays sticky.
  if (stored === 'light' || stored === 'dark') {
    setThemeClass(stored);
    return;
  }

  // Otherwise, follow the OS preference and listen for changes.
  setThemeClass(mql.matches ? 'dark' : 'light');

  const listener = (e: MediaQueryListEvent | MediaQueryList) => {
    const matches = 'matches' in e ? e.matches : (e as MediaQueryList).matches;
    setThemeClass(matches ? 'dark' : 'light');
  };

  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', listener);
  } else if (typeof mql.addListener === 'function') {
    // Legacy Safari fallback
    mql.addListener(listener);
  }
}

// Run before bootstrap to prevent dark/light flicker
initThemeDetection();

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
