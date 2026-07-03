import { Injectable, signal, effect } from '@angular/core';

// ============================================================================
// THEME SERVICE — light/dark/system preference, signal-backed.
// Persists to localStorage so reloads stay sticky. Listens to OS
// `prefers-color-scheme` only when preference is 'system'.
// ============================================================================

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'zarestia-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.readStored());
  /** The currently applied theme (resolved from mode + system pref). */
  readonly resolved = signal<'light' | 'dark'>(this.resolve(this.mode()));

  private mql?: MediaQueryList;
  private mqlListener?: (e: MediaQueryListEvent) => void;

  constructor() {
    // Apply theme immediately whenever mode or resolved theme changes
    effect(() => {
      const resolved = this.resolved();
      this.applyToDom(resolved);
    });

    // When mode is 'system', we need to listen to OS changes
    effect(() => {
      const mode = this.mode();
      this.setupSystemListener(mode);
      this.resolved.set(this.resolve(mode));
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }

  toggle(): void {
    const next: ThemeMode = this.resolved() === 'dark' ? 'light' : 'dark';
    this.setMode(next);
  }

  cycle(): void {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    const idx = order.indexOf(this.mode());
    this.setMode(order[(idx + 1) % order.length]);
  }

  private resolve(mode: ThemeMode): 'light' | 'dark' {
    if (mode === 'system') {
      if (typeof window === 'undefined' || !window.matchMedia) return 'light';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  }

  private applyToDom(theme: 'light' | 'dark'): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#0F1410' : '#FAFBF7');
    }
  }

  private setupSystemListener(mode: ThemeMode): void {
    // Clean up previous listener
    if (this.mql && this.mqlListener) {
      this.mql.removeEventListener('change', this.mqlListener);
      this.mqlListener = undefined;
      this.mql = undefined;
    }

    if (mode !== 'system' || typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    this.mql = window.matchMedia('(prefers-color-scheme: dark)');
    this.mqlListener = (e: MediaQueryListEvent) => {
      this.resolved.set(e.matches ? 'dark' : 'light');
    };
    this.mql.addEventListener('change', this.mqlListener);
  }

  private readStored(): ThemeMode {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'light' || v === 'dark' || v === 'system') return v;
    } catch {
      // ignore
    }
    return 'system';
  }
}
