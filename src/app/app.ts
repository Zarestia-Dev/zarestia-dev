import {
  Component,
  inject,
  afterNextRender,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { Home } from './pages/home/home';
import { About } from './pages/about/about';
import { Projects } from './pages/projects/projects';
import { Profile } from './pages/profile/profile';
import { Support } from './pages/support/support';
import { TabService } from './services/tab.service';
import { TranslationService } from './services/translation.service';

// ============================================================================
// ROOT APP COMPONENT
// ----------------------------------------------------------------------------
// Navbar + main content (with @switch on the current tab signal) + Footer.
// ============================================================================

@Component({
  selector: 'app-root',
  imports: [Navbar, Footer, Home, About, Projects, Profile, Support],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly tabService = inject(TabService);
  protected readonly i18n = inject(TranslationService);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      fromEvent(window, 'popstate')
        .pipe(takeUntilDestroyed(destroyRef))
        .subscribe(() => this.tabService.syncFromUrl());
    });
  }
}
