import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  Type,
  effect,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslationService } from '../../services/translation.service';
import { TabService } from '../../services/tab.service';
import { RevealDirective } from '../../directives/reveal.directive';
import { GAMES, GameEntry, GameAccent, findGame } from './games.registry';

// ============================================================================
// PLAYGROUND — Games hub + lazy-loaded game router.
// ----------------------------------------------------------------------------
// Renders two distinct views based on `tabService.playgroundGameId()`:
//
//   1. Hub  (/playground)       — lists GAMES as cards. Lightweight: only
//                                  imports the registry, never any game.
//   2. Game (/playground/<id>)  — lazily `import()`s the game component
//                                  (code-split per game) and renders it via
//                                  NgComponentOutlet. A back link returns to
//                                  the hub. Unknown IDs show a 404 state.
//
// Adding a new game = add an entry to GAMES + create the component file.
// This Playground component never needs to change.
// ============================================================================

interface LoadState {
  component: Type<unknown> | null;
  loading: boolean;
  notFound: boolean;
}

@Component({
  selector: 'app-playground',
  imports: [MatIconModule, MatProgressSpinnerModule, NgComponentOutlet, RevealDirective],
  templateUrl: './playground.html',
  styleUrl: './playground.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Playground {
  protected readonly tabService = inject(TabService);
  protected readonly i18n = inject(TranslationService);
  private readonly injector = inject(Injector);

  /** Static registry reference for the hub view. */
  readonly games = GAMES;

  /** Currently-active game entry, derived from the URL signal. */
  readonly activeGame = computed<GameEntry | undefined>(() =>
    findGame(this.tabService.playgroundGameId())
  );

  /** Load state for the active game's component chunk. */
  private readonly loadState = signal<LoadState>({
    component: null,
    loading: false,
    notFound: false,
  });

  /** Component class to render, or null while loading / not found. */
  readonly gameComponent = computed(() => this.loadState().component);
  readonly isLoading = computed(() => this.loadState().loading);
  readonly isNotFound = computed(() => this.loadState().notFound);

  constructor() {
    // Trigger a lazy load whenever the active game changes.
    effect(() => {
      const game = this.activeGame();
      // runInInjectionContext isn't strictly required for an async fetch,
      // but keeps the effect's reactive reads explicit.
      runInInjectionContext(this.injector, () => {
        void this.loadGame(game);
      });
    });
  }

  private async loadGame(game: GameEntry | undefined): Promise<void> {
    if (!game) {
      // We're on the hub page, or the URL points to an unknown game ID.
      const id = this.tabService.playgroundGameId();
      this.loadState.set({
        component: null,
        loading: false,
        notFound: !!id, // unknown ID → 404 state
      });
      return;
    }

    this.loadState.set({ component: null, loading: true, notFound: false });
    try {
      const component = await game.load();
      this.loadState.set({ component, loading: false, notFound: false });
    } catch (err) {
      console.error(`[playground] failed to load game "${game.id}"`, err);
      this.loadState.set({ component: null, loading: false, notFound: true });
    }
  }

  // ---- Hub navigation ----

  playGame(game: GameEntry): void {
    this.tabService.goPlaygroundGame(game.id);
  }

  backToHub(): void {
    this.tabService.goPlayground();
  }

  // ---- Card helpers ----

  accentClass(accent: GameAccent): string {
    return `accent-${accent}`;
  }

  /** Returns the game's localized title (or its id as a fallback). */
  title(game: GameEntry): string {
    return this.i18n.t(game.titleKey);
  }

  /** Returns the game's localized short description. */
  description(game: GameEntry): string {
    return this.i18n.t(game.descriptionKey);
  }

  /** Returns the game's localized tagline (falls back to description). */
  tagline(game: GameEntry): string {
    return this.i18n.t(game.taglineKey ?? game.descriptionKey);
  }
}
