import { Injectable, signal, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// ============================================================================
// THEME SERVICE — single source of truth for the active color theme.
// ----------------------------------------------------------------------------
// Responsibilities:
//   - Read the persisted preference ('light' | 'dark' | 'system') on init
//   - Resolve the effective theme from mode + OS preference
//   - Apply the .light / .dark class to <html> + sync the meta theme-color
//   - Listen to OS prefers-color-scheme changes while mode === 'system'
//   - Persist user-selected modes to localStorage
//
// The early FOUC-prevention snippet in index.html sets the initial <html>
// class before Angular bootstraps; this service then takes over and keeps
// the DOM in sync with the signal state.
// ============================================================================

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'zarestia-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** User-selected preference (sticky across reloads). */
  readonly mode = signal<ThemeMode>(this.readStoredMode());

  /** Live OS preference (only tracked in the browser). */
  private readonly systemPrefersDark = signal<boolean>(this.readSystemPref());

  /** The actually-applied theme, derived from mode + OS preference. */
  readonly resolved = computed<ResolvedTheme>(() => {
    const m = this.mode();
    if (m === 'system') return this.systemPrefersDark() ? 'dark' : 'light';
    return m;
  });

  constructor() {
    // Apply to DOM whenever the resolved theme changes.
    effect(() => this.applyToDom(this.resolved()));

    // Start OS-pref listener once, in the browser only.
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      this.startSystemListener();
    }
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    this.persist(mode);
  }

  /** Convenience: toggle between the two concrete themes (ignores 'system'). */
  toggle(): void {
    this.setMode(this.resolved() === 'dark' ? 'light' : 'dark');
  }

  /** Cycle through light → dark → system, used by the navbar chip. */
  cycle(): void {
    const order: readonly ThemeMode[] = ['light', 'dark', 'system'] as const;
    const idx = order.indexOf(this.mode());
    this.setMode(order[(idx + 1) % order.length]);
  }

  // ---- internals -----------------------------------------------------------

  private readStoredMode(): ThemeMode {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'light' || v === 'dark' || v === 'system') return v;
    } catch {
      // localStorage may be unavailable (private mode, sandboxed iframe).
    }
    return 'system';
  }

  private readSystemPref(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private startSystemListener(): void {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    // addEventListener is supported on all evergreen browsers; the legacy
    // addListener fallback was dropped years ago.
    mql.addEventListener('change', (e: MediaQueryListEvent) => {
      this.systemPrefersDark.set(e.matches);
    });
  }

  private applyToDom(theme: ResolvedTheme): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#0F1410' : '#FAFBF7');
    }
  }

  private persist(mode: ThemeMode): void {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }
}
