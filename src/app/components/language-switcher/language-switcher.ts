import { MatIcon } from '@angular/material/icon';
import { Component, inject, signal, computed, ChangeDetectionStrategy, ElementRef, HostListener } from '@angular/core';
import { TranslationService, Locale } from '../../services/translation.service';

// ============================================================================
// LANGUAGE SWITCHER — compact dropdown for the navbar.
// ============================================================================

@Component({
  selector: 'app-language-switcher',
  imports: [MatIcon],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcher {
  protected readonly i18n = inject(TranslationService);
  readonly isOpen = signal(false);
  readonly localeCode = computed(() => this.i18n.locale().toUpperCase());

  private readonly elementRef = inject(ElementRef);

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
    const target = event.target;
    const host = this.elementRef.nativeElement as HTMLElement;
    if (target instanceof Node && !host.contains(target)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape', [])
  onEscape(): void {
    this.close();
  }
}
