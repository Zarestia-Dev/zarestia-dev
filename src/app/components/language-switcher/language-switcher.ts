import { MatIconModule } from '@angular/material/icon';
import { Component, inject, signal, computed, ChangeDetectionStrategy, ElementRef, HostListener } from '@angular/core';
import { TranslationService, Locale } from '../../services/translation.service';

// ============================================================================
// LANGUAGE SWITCHER — compact dropdown for the navbar.
// ============================================================================

@Component({
  selector: 'app-language-switcher',
  imports: [MatIconModule],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcher {
  protected readonly i18n = inject(TranslationService);
  readonly isOpen = signal(false);
  readonly localeCode = computed(() => this.i18n.locale().toUpperCase());

  private readonly elementRef = inject(ElementRef<HTMLElement>);

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  close(): void {
    this.isOpen.set(false);
  }

  select(locale: Locale): void {
    this.i18n.setLocale(locale);
    this.close();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape', [])
  onEscape(): void {
    this.close();
  }
}
