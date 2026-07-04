# Zarestia Playground

A growing collection of browser games and interactive experiments, built in the open
under the Zarestia organization. Each game is open source — every card on the hub
links directly to its source code on GitHub.

## Hub structure

- **Route:** `/playground` (hub) — lists all registered games as cards.
- **Per-game routes:** `/playground/<game-id>` — each game lives at its own sub-route.
- **Lazy-loaded:** each game's code is dynamically `import()`ed only when visited,
  so the hub itself stays lightweight and unrelated games' code is never downloaded.

## Adding a new game

1. Create a new folder: `src/app/pages/playground/<id>/`
2. Add a standalone Angular component (e.g. `<id>.ts` / `.html` / `.scss`).
3. Add a new entry to `GAMES` in `src/app/pages/playground/games.registry.ts`:

```typescript
{
  id: 'my-game',
  titleKey: 'playground.my-game.title',
  descriptionKey: 'playground.my-game.description',
  thumbnailIcon: 'sports_esports',
  accent: 'lime',
  load: () => import('./my-game/my-game').then((m) => m.MyGame),
  sourceRepoUrl: 'https://github.com/Zarestia-Dev/zarestia/tree/main/src/app/pages/playground/my-game',
}
```

4. Add the i18n keys to `src/app/translations/en.json` and `tr.json`.
5. Commit and push — the hub picks up the new game automatically.

**Required fields:** `id`, `titleKey`, `descriptionKey`, `load`, `sourceRepoUrl`.
No game ships without a working GitHub source link.

## Games

| Game | Route | README | Source |
|------|-------|--------|--------|
| Idle Farm v1 | `/playground/farm` | [farm/README.md](./farm/README.md) | [src/app/pages/playground/farm](https://github.com/Zarestia-Dev/zarestia/tree/main/src/app/pages/playground/farm) |

## Tech constraints (apply to all games)

- Angular v22, zoneless, no deprecated APIs.
- Control flow: `@if` / `@for` / `@switch` (no `*ngIf` / `*ngFor`).
- No Angular Animations module — all motion is pure SCSS/CSS.
- i18n-ready (Turkish / English) via `TranslationService`.
- OnPush change detection everywhere.
- Each game is responsible for its own state, persistence, and sync.

## Hub file map

```
src/app/pages/playground/
├── games.registry.ts        # typed array of GameEntry — add games here
├── playground.ts            # hub component + lazy game router
├── playground.html          # hub grid + per-game chrome (back/source links)
├── playground.scss          # hub styles
└── farm/                    # the first game (see farm/README.md)
```
