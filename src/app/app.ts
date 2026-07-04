import {
  Component,
  inject,
  afterNextRender,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
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

  /** True once the app has rendered at least once — used to gate entrance animations. */
  readonly booted = signal(false);

  constructor() {
    afterNextRender(() => {
      window.addEventListener('popstate', () => {
        this.tabService.syncFromUrl();
      });
      window.dispatchEvent(new Event('zarestia:booted'));
      requestAnimationFrame(() => this.booted.set(true));
    });
  }
}
