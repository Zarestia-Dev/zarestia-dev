import { Injectable, signal } from '@angular/core';

// ============================================================================
// TAB SERVICE — single source of truth for the "current page".
//
// Mirrors the reference project's pattern: a signal-backed tab value synced
// to `window.location.pathname` via pushState. No Angular Router is used;
// the App component uses @switch on currentTab() to render the active page.
//
// Playground routes are nested under /playground/* and are handled by the
// Playground component itself (it renders the hub when no game is selected,
// or the selected game via a lazy-loaded component). The TabService only
// tracks the active game ID as a separate signal so the URL stays in sync.
// ============================================================================

export type AppTab = 'home' | 'about' | 'projects' | 'profile' | 'support' | 'playground';

const PATH_MAP: Record<AppTab, string> = {
  home: '',
  about: 'about',
  projects: 'projects',
  profile: 'profile',
  support: 'support',
  playground: 'playground',
};

const PATH_TO_TAB: { match: RegExp; tab: AppTab }[] = [
  { match: /^\/playground/, tab: 'playground' },
  { match: /^\/about/,      tab: 'about' },
  { match: /^\/projects/,   tab: 'projects' },
  { match: /^\/profile/,    tab: 'profile' },
  { match: /^\/support/,    tab: 'support' },
];

@Injectable({ providedIn: 'root' })
export class TabService {
  /** Reads <base href> baked in by Angular build. '' in dev, '/zarestia' in prod. */
  public get basePath(): string {
    if (typeof document === 'undefined') return '';
    const href = document.querySelector('base')?.getAttribute('href') ?? '/';
    return href === '/' ? '' : href.replace(/\/$/, '');
  }

  readonly currentTab = signal<AppTab>(this.readTabFromPath());

  /**
   * Active playground game ID, or null when on the hub page.
   * Examples: 'farm', null. Drives lazy-loaded game components.
   */
  readonly playgroundGameId = signal<string | null>(this.readGameIdFromPath());

  /** Switch tab, update the URL, and scroll back to the top of the page. */
  setTab(tab: AppTab, options?: { gameId?: string | null }): void {
    const gameId = options?.gameId ?? null;
    if (this.currentTab() === tab && this.playgroundGameId() === gameId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    this.currentTab.set(tab);
    this.playgroundGameId.set(gameId);
    window.scrollTo(0, 0);

    const suffix = PATH_MAP[tab];
    let path: string;
    if (tab === 'playground') {
      path = gameId
        ? `${this.basePath}/playground/${gameId}`
        : `${this.basePath}/playground`;
    } else {
      path = suffix ? `${this.basePath}/${suffix}` : `${this.basePath}/`;
    }
    history.pushState(null, '', path);
  }

  /** Convenience: open the playground hub. */
  goPlayground(): void {
    this.setTab('playground', { gameId: null });
  }

  /** Convenience: open a specific game. */
  goPlaygroundGame(gameId: string): void {
    this.setTab('playground', { gameId });
  }

  /** Re-sync the signal to the current URL (used on popstate). */
  syncFromUrl(): void {
    this.currentTab.set(this.readTabFromPath());
    this.playgroundGameId.set(this.readGameIdFromPath());
  }

  private readTabFromPath(): AppTab {
    if (typeof window === 'undefined') return 'home';
    const path = window.location.pathname.replace(this.basePath, '');
    for (const { match, tab } of PATH_TO_TAB) {
      if (match.test(path)) return tab;
    }
    return 'home';
  }

  private readGameIdFromPath(): string | null {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname.replace(this.basePath, '');
    const match = path.match(/^\/playground\/([a-z0-9-]+)/i);
    return match ? match[1] : null;
  }
}
