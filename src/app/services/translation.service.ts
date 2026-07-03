import { Injectable, signal, computed, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import enData from '../translations/en.json';
import trData from '../translations/tr.json';

// ============================================================================
// TRANSLATION SERVICE — signal-based i18n for zoneless Angular v22.
// ----------------------------------------------------------------------------
// WHY NOT @angular/localize?
//   - `@angular/localize` (the official Angular i18n package) is build-time
//     only. It compiles a separate bundle per locale and requires a full
//     page reload to switch languages. For a marketing site where users
//     expect to flip languages live, that UX is poor.
//
// WHY NOT ngx-translate?
//   - It depends on RxJS Observables and (in older versions) on zone-based
//     change detection. It works with zoneless Angular but adds an extra
//     runtime dep we don't strictly need.
//
// WHY THIS APPROACH?
//   - Signals are first-class in Angular v22 and integrate natively with
//     zoneless change detection. A signal-backed `t()` function recomputes
//     only when the locale changes, and template bindings like
//     `{{ t('nav.home') }}` re-render automatically.
//   - Zero external dependencies, ~80 lines of code.
//   - Translations live in plain JSON files (en.json, tr.json) for easy
//     editing by non-developers and clean git diffs.
//   - Future languages (de, fr, ar, ja, …) can be added by dropping a new
//     .json file in `translations/` and registering it in `LANGUAGES` below.
// ============================================================================

export type Locale = 'en' | 'tr';

export interface LanguageMeta {
  code: Locale;
  label: string;          // native-language label, e.g. "Türkçe"
  englishLabel: string;   // English label, e.g. "Turkish"
  flag: string;           // emoji flag for quick visual switcher
  dir: 'ltr' | 'rtl';
}

export const LANGUAGES: LanguageMeta[] = [
  { code: 'en', label: 'English', englishLabel: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'tr', label: 'Türkçe',  englishLabel: 'Turkish', flag: '🇹🇷', dir: 'ltr' },
];

const STORAGE_KEY = 'zarestia-locale';
const DEFAULT_LOCALE: Locale = 'en';

type TranslationMap = Record<string, string>;

const TRANSLATIONS: Record<Locale, TranslationMap> = {
  en: enData as TranslationMap,
  tr: trData as TranslationMap,
};

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly document = inject(DOCUMENT);

  /** Currently active locale. Mutable via `setLocale()`. */
  readonly locale = signal<Locale>(this.readStoredLocale());

  /** All available languages, for the switcher UI. */
  readonly languages = LANGUAGES;

  /** The currently-active language metadata. */
  readonly currentLanguage = computed<LanguageMeta>(() => {
    return LANGUAGES.find((l) => l.code === this.locale()) ?? LANGUAGES[0];
  });

  /**
   * Translate a key, with optional interpolation params.
   *
   * Usage in templates:
   *   {{ t('nav.home') }}
   *   {{ t('footer.copyright', { year: 2025 }) }}
   *
   * Falls back to English if the key is missing in the current locale,
   * and to the key itself if missing in English too (shouldn't happen).
   */
  t(key: string, params?: Record<string, string | number>): string {
    const locale = this.locale();
    const raw =
      TRANSLATIONS[locale]?.[key] ??
      TRANSLATIONS[DEFAULT_LOCALE]?.[key] ??
      key;
    if (!params) return raw;
    return raw.replace(/\{\{(\w+)\}\}/g, (_match: string, k: string) =>
      params[k] !== undefined ? String(params[k]) : `{{${k}}}`
    );
  }

  /** Switch the active locale. Persists to localStorage and updates <html lang>. */
  setLocale(locale: Locale): void {
    if (locale === this.locale()) return;
    this.locale.set(locale);
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // localStorage may be unavailable; ignore
    }
    this.applyHtmlAttributes(locale);
  }

  /** Cycle to the next language (used by the navbar toggle if needed). */
  cycle(): void {
    const idx = LANGUAGES.findIndex((l) => l.code === this.locale());
    const next = LANGUAGES[(idx + 1) % LANGUAGES.length];
    this.setLocale(next.code);
  }

  /** Apply `lang` and `dir` attributes to <html>. Called on init + changes. */
  private applyHtmlAttributes(locale: Locale): void {
    if (typeof document === 'undefined') return;
    const meta = LANGUAGES.find((l) => l.code === locale);
    if (!meta) return;
    const html = this.document.documentElement;
    html.setAttribute('lang', meta.code);
    html.setAttribute('dir', meta.dir);
  }

  private readStoredLocale(): Locale {
    if (typeof document !== 'undefined') {
      let initial: Locale = DEFAULT_LOCALE;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'en' || stored === 'tr') {
          initial = stored;
        } else {
          const nav = navigator.language?.toLowerCase() ?? '';
          if (nav.startsWith('tr')) initial = 'tr';
        }
      } catch {
        // ignore
      }
      queueMicrotask(() => this.applyHtmlAttributes(initial));
      return initial;
    }
    return DEFAULT_LOCALE;
  }
}
