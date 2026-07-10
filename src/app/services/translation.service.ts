import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import enData from '../translations/en.json';
import trData from '../translations/tr.json';

// ============================================================================
// TRANSLATION SERVICE — signal-based i18n for zoneless Angular v22.
// ----------------------------------------------------------------------------
// Why not @angular/localize?
//   It's build-time only: one bundle per locale, full page reload to switch.
//   For a marketing site where users flip languages live, that UX is poor.
//
// Why not ngx-translate?
//   Extra runtime dep + RxJS observables we don't need. Signals do the job
//   natively in v22.
//
// Approach here:
//   - Signals are first-class in v22 and integrate with zoneless change
//     detection. A `t()` call inside a template re-renders automatically
//     whenever the locale signal changes.
//   - Translations live in plain JSON for easy editing + clean git diffs.
//   - Missing keys fall back to English, then to the key itself.
//
// Only locales that have a shipped JSON file are listed in LANGUAGES —
// we don't advertise 40 languages and silently serve English for 38 of them.
// ============================================================================

export type Locale = 'en' | 'tr';

export interface LanguageMeta {
  code: Locale;
  label: string;          // native-language label, e.g. "Türkçe"
  englishLabel: string;   // English label, e.g. "Turkish"
  flag: string;           // emoji flag for the switcher
  dir: 'ltr' | 'rtl';
}

export const LANGUAGES: readonly LanguageMeta[] = [
  { code: 'en', label: 'English', englishLabel: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'tr', label: 'Türkçe',  englishLabel: 'Turkish', flag: '🇹🇷', dir: 'ltr' },
];

const STORAGE_KEY = 'zarestia-locale';
const DEFAULT_LOCALE: Locale = 'en';

const VALID_LOCALES: ReadonlySet<string> = new Set(LANGUAGES.map((l) => l.code));

type TranslationMap = Record<string, string>;

const TRANSLATIONS: Record<Locale, TranslationMap> = {
  en: enData,
  tr: trData,
};

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Currently active locale. Mutate via `setLocale()`. */
  readonly locale = signal<Locale>(this.readInitialLocale());

  /** All available languages, for the switcher UI. */
  readonly languages = LANGUAGES;

  /** The currently-active language metadata. */
  readonly currentLanguage = computed<LanguageMeta>(() => {
    return LANGUAGES.find((l) => l.code === this.locale()) ?? LANGUAGES[0];
  });

  /**
   * Translate a key, with optional {{param}} interpolation.
   *
   *   {{ t('nav.home') }}
   *   {{ t('footer.copyright', { year: 2025 }) }}
   *
   * Reads `locale()` so the call is reactive — any template that calls
   * `t()` re-renders when the locale changes. Falls back to English, then
   * to the raw key if neither has it.
   */
  t(key: string, params?: Record<string, string | number>): string {
    const locale = this.locale();
    const raw =
      TRANSLATIONS[locale]?.[key] ??
      TRANSLATIONS[DEFAULT_LOCALE]?.[key] ??
      key;
    if (!params) return raw;
    return raw.replace(/\{\{(\w+)\}\}/g, (_m, k: string) =>
      params[k] !== undefined ? String(params[k]) : `{{${k}}}`
    );
  }

  /** Switch the active locale, persist it, and sync <html lang/dir>. */
  setLocale(locale: Locale): void {
    if (locale === this.locale()) return;
    this.locale.set(locale);
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // localStorage unavailable — non-fatal, signal still updates in-memory.
    }
    this.applyHtmlAttributes(locale);
  }

  /** Apply `lang` and `dir` attributes to <html>. */
  private applyHtmlAttributes(locale: Locale): void {
    const meta = LANGUAGES.find((l) => l.code === locale);
    if (!meta) return;
    this.document.documentElement.setAttribute('lang', meta.code);
    this.document.documentElement.setAttribute('dir', meta.dir);
  }

  private readInitialLocale(): Locale {
    if (!this.isBrowser) return DEFAULT_LOCALE;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && VALID_LOCALES.has(stored)) {
        this.applyHtmlAttributes(stored as Locale);
        return stored as Locale;
      }
    } catch {
      // localStorage unavailable — fall through to browser detection.
    }

    const detected = this.detectBrowserLocale();
    this.applyHtmlAttributes(detected);
    return detected;
  }

  /** Map navigator.language to one of our supported locales. */
  private detectBrowserLocale(): Locale {
    if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
    const nav = (navigator.language || '').toLowerCase();
    if (!nav) return DEFAULT_LOCALE;

    // Exact match first (e.g. "tr", "en").
    if (VALID_LOCALES.has(nav)) return nav as Locale;

    // Primary subtag (e.g. "tr" from "tr-TR", "en" from "en-US").
    const primary = nav.split('-')[0];
    if (VALID_LOCALES.has(primary)) return primary as Locale;

    return DEFAULT_LOCALE;
  }
}
