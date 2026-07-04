import { Injectable, signal } from '@angular/core';

// ============================================================================
// TAB SERVICE — single source of truth for the "current page".
//
// Mirrors the reference project's pattern: a signal-backed tab value synced
// to `window.location.pathname` via pushState. No Angular Router is used;
// the App component uses @switch on currentTab() to render the active page.
// ============================================================================

export type AppTab = 'home' | 'about' | 'projects' | 'profile' | 'support';

const PATH_MAP: Record<AppTab, string> = {
  home: '',
  about: 'about',
  projects: 'projects',
  profile: 'profile',
  support: 'support',
};

const PATH_TO_TAB: { match: RegExp; tab: AppTab }[] = [
  { match: /^\/about/,    tab: 'about' },
  { match: /^\/projects/, tab: 'projects' },
  { match: /^\/profile/,  tab: 'profile' },
  { match: /^\/support/,  tab: 'support' },
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

  /** Switch tab, update the URL, and scroll back to the top of the page. */
  setTab(tab: AppTab): void {
    if (this.currentTab() === tab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    this.currentTab.set(tab);
    window.scrollTo(0, 0);
    const suffix = PATH_MAP[tab];
    const path = suffix ? `${this.basePath}/${suffix}` : `${this.basePath}/`;
    history.pushState(null, '', path);
  }

  /** Re-sync the signal to the current URL (used on popstate). */
  syncFromUrl(): void {
    this.currentTab.set(this.readTabFromPath());
  }

  private readTabFromPath(): AppTab {
    if (typeof window === 'undefined') return 'home';
    const path = window.location.pathname.replace(this.basePath, '');
    for (const { match, tab } of PATH_TO_TAB) {
      if (match.test(path)) return tab;
    }
    return 'home';
  }
}
