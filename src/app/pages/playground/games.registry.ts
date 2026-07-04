import { Type } from '@angular/core';

// ============================================================================
// GAME REGISTRY — single source of truth for the Playground hub.
// ----------------------------------------------------------------------------
// Adding a new game = ONE entry in this array + the game's own component
// module under ./<id>/. The hub loops over this array to render cards and
// uses `load()` for lazy code-splitting per game (Angular v22 dynamic
// imports + NgComponentOutlet). The hub itself never imports any game
// component statically, so unrelated games' code is never downloaded
// until the user visits them.
//
// REQUIRED FIELDS:
//   - sourceRepoUrl: every game ships with a working GitHub source link.
//     If the game lives in the same monorepo as the site (as is the case
//     today), point this at the specific subfolder on GitHub, e.g.
//     https://github.com/Zarestia-Dev/<repo>/tree/main/src/app/pages/playground/<id>
//     so users land on the exact source tree, not the repo root.
// ============================================================================

export type GameAccent = 'lime' | 'green' | 'yellow' | 'silver';

export interface GameEntry {
  /** URL-safe identifier, used in the route: /playground/<id> */
  id: string;
  /** i18n key for the game's display title, e.g. 'playground.farm.title' */
  titleKey: string;
  /** i18n key for the short card description, e.g. 'playground.farm.description' */
  descriptionKey: string;
  /**
   * i18n key for the longer in-page tagline shown on the game page header.
   * Falls back to descriptionKey if not provided.
   */
  taglineKey?: string;
  /** Material Icons name used for the thumbnail (placeholder before sprites exist). */
  thumbnailIcon: string;
  /** Accent color for the card thumbnail and game-page chrome. */
  accent: GameAccent;
  /** Material Icons name for the small badge in the corner, e.g. 'eco', 'casino'. */
  badgeIcon?: string;
  /**
   * Lazy component loader. Returns the standalone game component class.
   * Each game is code-split into its own chunk by Angular's build.
   */
  load: () => Promise<Type<unknown>>;
  /**
   * DIRECT link to this game's source code on GitHub.
   * For monorepo games, point at the specific subfolder, not the repo root.
   * REQUIRED — no game ships without a working source link.
   */
  sourceRepoUrl: string;
}

// Lazy import paths are intentionally written as relative strings so the
// Angular build can split each game into its own chunk. DO NOT convert
// these to top-level static imports — that defeats the lazy-loading.
export const GAMES: readonly GameEntry[] = [
  {
    id: 'farm',
    titleKey: 'playground.farm.title',
    descriptionKey: 'playground.farm.description',
    taglineKey: 'playground.farm.tagline',
    thumbnailIcon: 'agriculture',
    accent: 'lime',
    badgeIcon: 'eco',
    load: () => import('./farm/farm').then((m) => m.Farm),
    sourceRepoUrl:
      'https://github.com/Zarestia-Dev/zarestia/tree/main/src/app/pages/playground/farm',
  },
];

/** Lookup helper. Returns undefined for unknown game IDs. */
export function findGame(id: string | null | undefined): GameEntry | undefined {
  if (!id) return undefined;
  return GAMES.find((g) => g.id === id);
}
