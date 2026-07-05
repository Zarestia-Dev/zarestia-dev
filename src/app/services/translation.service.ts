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
//   - Any language in LANGUAGES is "system-supported": if a key is missing
//     from a locale's JSON file, `t()` falls back to English, then to the
//     key itself. So adding a language is a one-line change to LANGUAGES —
//     no full translation pass required to ship.
// ============================================================================

// Languages with a shipped translation file. Other languages in `LANGUAGES`
// will fall back to English for every key. Currently: en, tr.
// To ship a new translation: drop a `<code>.json` in `translations/`, import
// it below, and register it in `TRANSLATIONS`.

// Union of every supported locale code (translated + untranslated).
export type Locale =
  | 'en' | 'tr' | 'de' | 'fr' | 'es' | 'it' | 'pt' | 'pt-BR' | 'ru'
  | 'ar' | 'ja' | 'zh' | 'zh-TW' | 'ko' | 'hi' | 'nl' | 'pl' | 'sv'
  | 'fi' | 'da' | 'nb' | 'cs' | 'el' | 'he' | 'fa' | 'ur' | 'id' | 'ms'
  | 'th' | 'vi' | 'uk' | 'ro' | 'hu' | 'sk' | 'bg' | 'sr' | 'hr' | 'sl'
  | 'et' | 'lv' | 'lt';

export interface LanguageMeta {
  code: Locale;
  label: string;          // native-language label, e.g. "Türkçe"
  englishLabel: string;   // English label, e.g. "Turkish"
  flag: string;           // emoji flag for quick visual switcher
  dir: 'ltr' | 'rtl';
}

export const LANGUAGES: LanguageMeta[] = [
  // ---- Fully translated ----
  { code: 'en',    label: 'English',       englishLabel: 'English',           flag: '🇬🇧', dir: 'ltr' },
  { code: 'tr',    label: 'Türkçe',        englishLabel: 'Turkish',            flag: '🇹🇷', dir: 'ltr' },

  // ---- System-supported (English fallback until a translation pass ships) ----
  { code: 'de',    label: 'Deutsch',       englishLabel: 'German',             flag: '🇩🇪', dir: 'ltr' },
  { code: 'fr',    label: 'Français',      englishLabel: 'French',             flag: '🇫🇷', dir: 'ltr' },
  { code: 'es',    label: 'Español',       englishLabel: 'Spanish',            flag: '🇪🇸', dir: 'ltr' },
  { code: 'it',    label: 'Italiano',      englishLabel: 'Italian',            flag: '🇮🇹', dir: 'ltr' },
  { code: 'pt',    label: 'Português',     englishLabel: 'Portuguese',         flag: '🇵🇹', dir: 'ltr' },
  { code: 'pt-BR', label: 'Português (BR)',englishLabel: 'Brazilian Portuguese',flag: '🇧🇷', dir: 'ltr' },
  { code: 'ru',    label: 'Русский',       englishLabel: 'Russian',            flag: '🇷🇺', dir: 'ltr' },
  { code: 'ar',    label: 'العربية',        englishLabel: 'Arabic',             flag: '🇸🇦', dir: 'rtl' },
  { code: 'ja',    label: '日本語',         englishLabel: 'Japanese',           flag: '🇯🇵', dir: 'ltr' },
  { code: 'zh',    label: '简体中文',       englishLabel: 'Simplified Chinese', flag: '🇨🇳', dir: 'ltr' },
  { code: 'zh-TW', label: '繁體中文',       englishLabel: 'Traditional Chinese',flag: '🇹🇼', dir: 'ltr' },
  { code: 'ko',    label: '한국어',         englishLabel: 'Korean',             flag: '🇰🇷', dir: 'ltr' },
  { code: 'hi',    label: 'हिन्दी',          englishLabel: 'Hindi',              flag: '🇮🇳', dir: 'ltr' },
  { code: 'nl',    label: 'Nederlands',    englishLabel: 'Dutch',              flag: '🇳🇱', dir: 'ltr' },
  { code: 'pl',    label: 'Polski',        englishLabel: 'Polish',             flag: '🇵🇱', dir: 'ltr' },
  { code: 'sv',    label: 'Svenska',       englishLabel: 'Swedish',            flag: '🇸🇪', dir: 'ltr' },
  { code: 'fi',    label: 'Suomi',         englishLabel: 'Finnish',            flag: '🇫🇮', dir: 'ltr' },
  { code: 'da',    label: 'Dansk',         englishLabel: 'Danish',             flag: '🇩🇰', dir: 'ltr' },
  { code: 'nb',    label: 'Norsk',         englishLabel: 'Norwegian Bokmål',   flag: '🇳🇴', dir: 'ltr' },
  { code: 'cs',    label: 'Čeština',       englishLabel: 'Czech',              flag: '🇨🇿', dir: 'ltr' },
  { code: 'el',    label: 'Ελληνικά',       englishLabel: 'Greek',              flag: '🇬🇷', dir: 'ltr' },
  { code: 'he',    label: 'עברית',          englishLabel: 'Hebrew',             flag: '🇮🇱', dir: 'rtl' },
  { code: 'fa',    label: 'فارسی',          englishLabel: 'Persian',            flag: '🇮🇷', dir: 'rtl' },
  { code: 'ur',    label: 'اردو',           englishLabel: 'Urdu',               flag: '🇵🇰', dir: 'rtl' },
  { code: 'id',    label: 'Bahasa Indonesia',englishLabel: 'Indonesian',        flag: '🇮🇩', dir: 'ltr' },
  { code: 'ms',    label: 'Bahasa Melayu', englishLabel: 'Malay',              flag: '🇲🇾', dir: 'ltr' },
  { code: 'th',    label: 'ไทย',            englishLabel: 'Thai',               flag: '🇹🇭', dir: 'ltr' },
  { code: 'vi',    label: 'Tiếng Việt',    englishLabel: 'Vietnamese',         flag: '🇻🇳', dir: 'ltr' },
  { code: 'uk',    label: 'Українська',    englishLabel: 'Ukrainian',          flag: '🇺🇦', dir: 'ltr' },
  { code: 'ro',    label: 'Română',        englishLabel: 'Romanian',           flag: '🇷🇴', dir: 'ltr' },
  { code: 'hu',    label: 'Magyar',        englishLabel: 'Hungarian',          flag: '🇭🇺', dir: 'ltr' },
  { code: 'sk',    label: 'Slovenčina',    englishLabel: 'Slovak',             flag: '🇸🇰', dir: 'ltr' },
  { code: 'bg',    label: 'Български',     englishLabel: 'Bulgarian',          flag: '🇧🇬', dir: 'ltr' },
  { code: 'sr',    label: 'Српски',         englishLabel: 'Serbian',            flag: '🇷🇸', dir: 'ltr' },
  { code: 'hr',    label: 'Hrvatski',      englishLabel: 'Croatian',           flag: '🇭🇷', dir: 'ltr' },
  { code: 'sl',    label: 'Slovenščina',   englishLabel: 'Slovenian',          flag: '🇸🇮', dir: 'ltr' },
  { code: 'et',    label: 'Eesti',         englishLabel: 'Estonian',           flag: '🇪🇪', dir: 'ltr' },
  { code: 'lv',    label: 'Latviešu',      englishLabel: 'Latvian',            flag: '🇱🇻', dir: 'ltr' },
  { code: 'lt',    label: 'Lietuvių',      englishLabel: 'Lithuanian',         flag: '🇱🇹', dir: 'ltr' },
];

const STORAGE_KEY = 'zarestia-locale';
const DEFAULT_LOCALE: Locale = 'en';

// All valid locale codes — used to validate stored / browser-detected values.
const VALID_LOCALES: ReadonlySet<string> = new Set(LANGUAGES.map((l) => l.code));

type TranslationMap = Record<string, string>;

// Only `en` and `tr` have shipped JSON files. Other locales transparently
// fall back to English inside `t()`.
const TRANSLATIONS: Record<string, TranslationMap> = {
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
    if (typeof document === 'undefined') return DEFAULT_LOCALE;
    let initial: Locale = DEFAULT_LOCALE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && VALID_LOCALES.has(stored)) {
        initial = stored as Locale;
      } else {
        initial = this.detectBrowserLocale();
      }
    } catch {
      // localStorage unavailable; fall back to default
    }
    queueMicrotask(() => this.applyHtmlAttributes(initial));
    return initial;
  }

  /** Map navigator.language to one of our supported locales. */
  private detectBrowserLocale(): Locale {
    if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
    const nav = (navigator.language || '').toLowerCase();
    if (!nav) return DEFAULT_LOCALE;

    // Try exact match first (e.g. "pt-br", "zh-tw").
    if (VALID_LOCALES.has(nav)) return nav as Locale;

    // Try the primary subtag (e.g. "pt" from "pt-PT", "zh" from "zh-CN").
    const primary = nav.split('-')[0];
    if (VALID_LOCALES.has(primary)) return primary as Locale;

    return DEFAULT_LOCALE;
  }
}
