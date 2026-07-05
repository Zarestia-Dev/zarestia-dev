# Zarestia — Official Website

Website for **Zarestia**, an open-source organization building foundational
software and intuitive utilities. The site reflects the Zarestia brand
visual identity (milky-white, lime green, deep green, black, and bright
yellow) and ships with full English/Turkish language support,
live GitHub data, and pure-SCSS animations (no Angular Animations module).

## Tech Stack

- **Angular v22** — standalone components, new control-flow syntax (`@if`, `@for`, `@switch`)
- **Zoneless change detection** — `provideZonelessChangeDetection()`, no `zone.js` polyfill
- **Angular Material** — `MatIconModule` + Material Icons font for all UI icons
- **Pure SCSS animations** — no `@angular/animations`. All motion is CSS keyframes & transitions
- **TypeScript 6.0**
- **Signal-based i18n** — built in-house, no `@angular/localize` (which is build-time only)
  and no `ngx-translate` (which depends on RxJS). Supports live language switching.
- **Build-time GitHub data** — fetched via the GitHub REST + GraphQL APIs and bundled
  as static JSON. The site never hits GitHub's API at runtime.

## Pages

The site has 5 pages, kept intentionally simple and understated:

1. **Home** — Hero with brand logo + CTAs. One CTA band at the bottom.
2. **About** — Hero + mission text. Organizational voice ("we", not "I").
3. **Projects** — All repos from the `Zarestia-Dev` org with filter + sort. The only
   place projects appear (no duplication).
4. **Profile** — Maintainer's GitHub identity card + language breakdown chart.
5. **Support** — Low-pressure support page linking to GitHub Sponsors
   (the only payment platform that works reliably from Turkey). Also lists
   free ways to help: star, share, open an issue. No in-house donation system.

## Project Structure

```
src/
├── app/
│   ├── components/             # Reusable UI building blocks
│   │   ├── navbar/             # Top nav: logo, language switcher, theme toggle, mobile menu
│   │   ├── footer/             # Footer with newsletter + socials
│   │   ├── hero/               # Landing hero with brand logo visual
│   │   ├── cta-section/        # Reusable call-to-action band (Home only)
│   │   └── language-switcher/  # TR/EN dropdown for the navbar
│   ├── directives/
│   │   └── reveal.directive.ts # IntersectionObserver scroll-reveal
│   ├── constants/
│   │   └── navigation.constants.ts  # Nav links + social links (Material icon names)
│   ├── services/
│   │   ├── tab.service.ts          # Signal-driven page navigation
│   │   ├── theme.service.ts        # Light / dark / system theme
│   │   ├── translation.service.ts  # Signal-based i18n (40+ locales, English fallback)
│   │   └── github.service.ts       # Runtime GitHub data via Cloudflare Worker proxy
│   ├── translations/            # i18n dictionaries (one JSON file per locale)
│   │   ├── en.json
│   │   └── tr.json
│   ├── pages/                  # The 5 site pages
│   │   ├── home/
│   │   ├── about/
│   │   ├── projects/
│   │   ├── profile/
│   │   └── support/
│   ├── app.ts                  # Root component
│   ├── app.config.ts           # Zoneless providers
│   └── app.html                # Navbar + @switch page + Footer
├── animations.scss             # Global keyframes & animation utility classes
├── styles.scss                 # Theme tokens, palette, spacing, mobile optimizations
├── styles/_mixins.scss         # Reusable SCSS mixins
└── index.html                  # Shell + early theme detection + Material Icons font

public/                         # Static assets served as-is
├── logo.svg                   # Brand logo (SVG, scalable)
├── logo-192.png              # 192×192 PNG (apple-touch-icon, og:image)
├── logo-512.png              # 512×512 PNG (og:image, twitter:image)
├── favicon.png               # 64×64 favicon (PNG fallback)
├── favicon-32.png            # 32×32 favicon
└── favicon-16.png            # 16×16 favicon
```

## Design System

The Zarestia palette is drawn from the brand identity:

| Token                   | Hex        | Use                               |
| ----------------------- | ---------- | --------------------------------- |
| `--z-milky-100`         | `#FAFBF7`  | Page background (light)           |
| `--z-lime-400`          | `#A8E63A`  | Primary accent, brand highlight   |
| `--z-green-700/800/900` | `#2D7A3D`… | Deep green, brand primary         |
| `--z-yellow-400`        | `#FFD93D`  | Bright highlight accent           |
| `--z-ink-900`           | `#0F1410`  | Dark mode background, deep accent |
| `--z-silver-400`        | `#B8BCC0`  | Metallic accent, dividers         |

Light & dark themes are both defined. The `.light` / `.dark` class on `<html>`
switches the entire token set in one transition.

### Border rendering

All rounded elements use `box-shadow: 0 0 0 1px <color>` instead of
`border: 1px solid <color>` to avoid the browser's visible seam artifact at
the curve where border meets border-radius. Plain directional borders
(`border-bottom`, `border-top`) on non-rounded elements are left as-is.

## Internationalization (i18n)

This project uses a **lightweight signal-based i18n** approach instead of
`@angular/localize` or `ngx-translate`:

- **Why not `@angular/localize`?** It's build-time only — produces a separate
  bundle per locale and requires a full page reload to switch languages.
- **Why not `ngx-translate`?** Adds an RxJS dependency we don't strictly need
  in a zoneless Angular v22 app.
- **Why this approach?** Signals integrate natively with zoneless change
  detection. The `TranslationService.t()` method recomputes only when the
  locale changes. Zero external dependencies, ~100 lines.
- **Translations are plain JSON** (`en.json`, `tr.json`) — easy to edit by
  non-developers, clean git diffs, no TypeScript boilerplate.

**System-supported languages:** Every locale listed in `LANGUAGES` (in
`translation.service.ts`) is selectable in the navbar switcher. Only `en`
and `tr` ship a full translation file today; all other locales fall back to
English for every key. This lets users pick their preferred locale for
`<html lang>` / `dir` attributes right now, without waiting for a full
translation pass.

**Adding a new language (two flavors):**

- **System-supported only (English fallback):** add one entry to `LANGUAGES`
  in `translation.service.ts`. The switcher picks it up automatically.
- **Fully translated:** additionally create
  `src/app/translations/<code>.json` (copy `en.json` and translate every
  key), then import and register it in the `TRANSLATIONS` map at the top of
  `translation.service.ts`.

## GitHub Data Fetching

The site displays real GitHub data fetched at runtime from a Cloudflare
Worker proxy:

- **Profile** (bio, avatar, followers, etc.) comes from the personal account
  [`Hakanbaban53`](https://github.com/Hakanbaban53)
- **Repositories** and **language breakdown** come from the
  [`Zarestia-Dev`](https://github.com/Zarestia-Dev) organization

The Worker (configured via `environment.githubProxyUrl`) authenticates with
a GitHub token server-side and caches responses at the edge
(`s-maxage=900, max-age=300`). The Angular `GithubService` calls the Worker
under `/api/github/*` and exposes the data as signals. localStorage caches
the last successful fetch so the first paint is instant on repeat visits.

No GitHub token ever reaches the browser bundle, and no rebuild is required
when GitHub data changes — the cache simply ages out at the edge.

## Mobile Support

The site is mobile-first optimized:

- **Tap targets**: All interactive elements meet the 44px minimum height
  (Apple HIG / Material guideline). Mobile menu items are 64px tall.
- **Responsive typography**: Headings use `clamp()` for fluid scaling.
- **Tighter spacing on mobile**: `--section-gap` and `--content-padding`
  reduce automatically below 768px and 480px.
- **No horizontal scroll**: All grids collapse to single column on narrow
  viewports. Logo images scale down on small screens.
- **iOS-friendly inputs**: Newsletter input uses 16px font size to prevent
  iOS auto-zoom on focus.
- **Mobile menu controls**: Language switcher and theme toggle live inside
  the hamburger menu on mobile, keeping the header clean (just logo + hamburger).

## Development

```bash
npm install
npm start          # dev server on http://localhost:4200/
npm run build      # production build to dist/zarestia
npm run lint       # run ESLint (flat config, includes Angular template rules)
npm run lint:fix   # run ESLint and auto-fix what it can
```

### ESLint

The project uses ESLint with flat config (`eslint.config.js`) and includes:

- `@eslint/js` recommended rules
- `typescript-eslint` recommended + stylistic rules
- `angular-eslint` TS recommended + template recommended + template accessibility
- Custom rules: `app` prefix for directives/components, no unused vars,
  no non-null assertions, no empty lifecycle methods, track-by in `@for`

## Navigation

Page navigation is signal-driven (no Angular Router). The `TabService`
exposes a `currentTab()` signal; the App component uses `@switch` to render
the active page. The URL is synced via `history.pushState` so back/forward
buttons work, and deep links (e.g. `/about`) load the right page on first
paint.

## Theme & Language Toggles

- **Theme**: Click the theme button in the navbar to cycle: **light → dark →
  system**. Persists in `localStorage` under `zarestia-theme`.
- **Language**: Click the language button to open a dropdown listing all
  available languages. Persists in `localStorage` under `zarestia-locale`.
  Falls back to browser language on first visit.

## Constraints

- Angular v22, zoneless, no deprecated APIs
- New control-flow syntax (`@if`/`@for`/`@switch`) — no `*ngIf`/`*ngFor`
- No Angular Animations — SCSS/CSS-based animations only
- Zarestia brand visual theme (green + milky-white palette, SVG logo)
