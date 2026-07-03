import { MatIconModule } from '@angular/material/icon';
import {
  Component,
  HostListener,
  inject,
  signal,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TabService, AppTab } from '../../services/tab.service';
import { ThemeService } from '../../services/theme.service';
import { TranslationService } from '../../services/translation.service';
import { NAV_LINKS } from '../../constants/navigation.constants';
import { LanguageSwitcher } from '../language-switcher/language-switcher';

// ============================================================================
// NAVBAR — fixed top navigation.
// - Logo (brand SVG) + name → click → home
// - Desktop nav links (signal-driven active state, i18n labels)
// - Language switcher (TR/EN dropdown)
// - Theme toggle (light / dark / system)
// - Mobile hamburger → slide-down menu
// - Subtle "scrolled" state: shrinks + adds backdrop blur after 50px scroll
// ============================================================================

@Component({
  selector: 'app-navbar',
  imports: [MatIconModule, LanguageSwitcher],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  protected readonly tabService = inject(TabService);
  protected readonly themeService = inject(ThemeService);
  protected readonly i18n = inject(TranslationService);

  protected readonly navLinks = NAV_LINKS;

  readonly isScrolled = signal(false);
  readonly isMobileMenuOpen = signal(false);

  constructor() {
    // Auto-close mobile menu when scaling up to desktop
    effect(() => {
      if (typeof window === 'undefined') return;
      if (window.innerWidth > 860 && this.isMobileMenuOpen()) {
        this.isMobileMenuOpen.set(false);
      }
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.isScrolled.set(window.scrollY > 50);
  }

  @HostListener('window:resize', [])
  onResize(): void {
    if (window.innerWidth > 860 && this.isMobileMenuOpen()) {
      this.isMobileMenuOpen.set(false);
    }
  }

  setTab(tab: AppTab): void {
    this.tabService.setTab(tab);
    this.closeMobileMenu();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  cycleTheme(): void {
    this.themeService.cycle();
  }

  themeIcon(): string {
    const mode = this.themeService.mode();
    if (mode === 'light') return 'light_mode';
    if (mode === 'dark')  return 'dark_mode';
    return 'brightness_auto';
  }

  themeLabel(): string {
    return this.i18n.t('common.theme.' + this.themeService.mode());
  }
}
