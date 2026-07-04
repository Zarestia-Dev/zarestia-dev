# Zarestia Idle Farm — v3

A real-time idle farm-sim with **top-down 2D free-placement grid**, **real GitHub OAuth**,
and **zero mock data**. Built with zoneless Angular v22, CDK drag-and-drop,
SCSS-only animations, and full Turkish/English i18n.

- **Route:** `/playground/farm`
- **Folder:** `src/app/pages/playground/farm/`
- **Source:** [github.com/Zarestia-Dev/zarestia/tree/main/src/app/pages/playground/farm](https://github.com/Zarestia-Dev/zarestia/tree/main/src/app/pages/playground/farm)

---

## What changed in v3

| Area | v2 (previous) | v3 (current) |
|------|---------------|--------------|
| **Grid** | Fixed 6×4 slot array, items bound to predefined positions | Free 12×12 top-down 2D grid, every item freely placeable via drag-and-drop |
| **Data model** | `PlotState[]` with `kind: 'crop'\|'building'\|'decoration'\|'empty'` | `FarmItem[]` with `{id, kind, row, col}` + per-kind fields + footprint |
| **Rendering** | Flat card grid | Top-down 2D (simple linear: `x = col * CELL_W`, `y = row * CELL_H`) |
| **Mock data** | Sample leaderboard (19 fake players), starting 6 plots pre-placed | **Zero mock data.** Empty farm on first load, empty leaderboard until signed in |
| **Auth** | Stubbed `signIn()` with setTimeout | **Real GitHub OAuth** (Authorization Code + server-side token exchange) |
| **Onboarding** | None | Dismissible intro nudge for first-time players |
| **Persistence** | v2 save format | v3 save format (auto-migrates by detecting `version` field) |

> **Note on isometric:** an earlier v3 draft used isometric projection. It was
> reverted to top-down 2D because the iso math added complexity without visual
> benefit. The logical data model (`{row, col}`, footprint, occupancy grid)
> was unchanged — only the projection function and sprite style changed.

---

## GitHub OAuth setup (REQUIRED for cloud sync + leaderboard)

### 1. Register a GitHub OAuth App

Go to **https://github.com/settings/developers** → **OAuth Apps** → **New OAuth App**:

| Field | Value |
|-------|-------|
| Application name | `Zarestia Playground` (or whatever you prefer) |
| Homepage URL | `https://zarestia.dev` (or your dev URL `http://localhost:4200`) |
| Application description | (optional) |
| **Authorization callback URL** | `https://zarestia.dev/playground/farm` (or `http://localhost:4200/playground/farm`) |

After creating, you'll see:
- **Client ID** — copy this (safe to expose client-side)
- **Client Secret** — click "Generate a new client secret", copy this (NEVER expose client-side)

### 2. Configure environment variables

**Client-side** (in `src/environments/environment.ts` and `environment.prod.ts`):

```typescript
githubOAuthClientId: 'Iv1.xxxxxxxxxxxxxxxxx',  // your Client ID
```

**Server-side** (Cloudflare Worker — set via `wrangler secret put`):

```bash
GITHUB_OAUTH_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxx   # same as client-side
GITHUB_OAUTH_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_OAUTH_CALLBACK_URL=https://zarestia.dev/playground/farm
```

### 3. Implement the Worker endpoints

The client expects these routes on your Cloudflare Worker:

#### `POST /api/auth/github` — exchange code for token

```typescript
// Worker code (sketch)
app.post('/api/auth/github', async (c) => {
  const { code, state } = await c.req.json();

  // Exchange code for access token (server-side, uses CLIENT_SECRET)
  const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: c.env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: c.env.GITHUB_OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: c.env.GITHUB_OAUTH_CALLBACK_URL,
    }),
  });
  const { access_token } = await tokenResp.json();

  // Fetch user info
  const userResp = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const user = await userResp.json();

  // Store token in KV for server-side use (key: farm:user:<githubUserId>)
  await c.env.FARM_KV.put(`farm:user:${user.id}`, JSON.stringify({
    login: user.login,
    avatarUrl: user.avatar_url,
    accessToken: access_token,  // server-side only — never returned to client
  }));

  // Return safe user info to client (no access token)
  return c.json({
    user: {
      githubUserId: String(user.id),
      login: user.login,
      avatarUrl: user.avatar_url,
    },
  });
});
```

#### `POST /api/farm/save` — persist save data

```typescript
app.post('/api/farm/save', async (c) => {
  const user = await authenticate(c);  // reads session cookie / header
  const saveData = await c.req.text();

  // Upsert user record with denormalized leaderboard fields
  const existing = await c.env.FARM_KV.get(`farm:user:${user.githubUserId}`);
  const record = existing ? JSON.parse(existing) : {};
  record.login = user.login;
  record.avatarUrl = user.avatarUrl;
  record.farmSnapshot = JSON.parse(saveData);
  record.level = record.farmSnapshot?.xp ? levelForXp(record.farmSnapshot.xp) : 1;
  record.coins = record.farmSnapshot?.gold ?? 0;
  record.totalEarned = record.farmSnapshot?.stats?.totalEarned ?? 0;
  record.charm = computeCharm(record.farmSnapshot);
  record.updatedAt = new Date().toISOString();

  await c.env.FARM_KV.put(`farm:user:${user.githubUserId}`, JSON.stringify(record));

  // Refresh leaderboard cache (top 50)
  await refreshLeaderboardCache(c.env.FARM_KV);

  return c.json({ ok: true });
});
```

#### `GET /api/farm/leaderboard?n=50` — cached top-N

```typescript
app.get('/api/farm/leaderboard', async (c) => {
  const n = parseInt(c.req.query('n') ?? '50');
  const cached = await c.env.FARM_KV.get('farm:leaderboard');
  if (cached) {
    const entries = JSON.parse(cached);
    return c.json(entries.slice(0, n));
  }
  // Cache miss — rebuild by scanning all farm:user:* keys
  const list = await c.env.FARM_KV.list({ prefix: 'farm:user:' });
  const entries = [];
  for (const key of list.keys) {
    const raw = await c.env.FARM_KV.get(key.name);
    if (!raw) continue;
    const r = JSON.parse(raw);
    entries.push({
      githubUserId: key.name.replace('farm:user:', ''),
      username: r.login,
      avatarUrl: r.avatarUrl,
      level: r.level ?? 1,
      coins: r.coins ?? 0,
      totalEarned: r.totalEarned ?? 0,
      charm: r.charm ?? 0,
      updatedAt: r.updatedAt,
    });
  }
  entries.sort((a, b) => b.level - a.level || b.coins - a.coins);
  await c.env.FARM_KV.put('farm:leaderboard', JSON.stringify(entries));
  return c.json(entries.slice(0, n));
});
```

#### `GET /api/farm/visit/:userId` — read-only farm visit

```typescript
app.get('/api/farm/visit/:userId', async (c) => {
  const userId = c.req.param('userId');
  const raw = await c.env.FARM_KV.get(`farm:user:${userId}`);
  if (!raw) return c.json({ error: 'Not found' }, 404);
  const r = JSON.parse(raw);
  return c.json({
    login: r.login,
    avatarUrl: r.avatarUrl,
    level: r.level ?? 1,
    coins: r.coins ?? 0,
    charm: r.charm ?? 0,
    plots: r.farmSnapshot?.items ?? [],
    animals: r.farmSnapshot?.animals ?? [],
  });
});
```

### 4. Token expiry handling

The client handles 401 responses by:
1. Clearing the local session
2. Setting `sync.error = 'Session expired. Please sign in again.'`
3. Re-prompting sign-in on the next user action

No silent refresh — explicit re-auth keeps the security surface small.

---

## Top-down 2D grid architecture

### Logical model (decoupled from rendering)

Every placeable item has a logical `{row, col}` position and a `footprint {w, h}`.
The top-down projection is a **pure function** over this model — change the
projection, the game logic doesn't change.

```typescript
// farm-state.types.ts
interface PlaceableItem {
  id: string;
  kind: 'crop' | 'building' | 'decoration';
  row: number;  // top-left corner
  col: number;
}
```

### Projection utility (`grid-projection.ts`)

Simple linear mapping — no isometric math, no diagonal projection:

```typescript
// Forward: {row, col} → {x, y} pixel
x = col * cellW
y = row * cellH

// Inverse: {x, y} → {row, col} (for drag/drop)
row = floor(y / cellH)
col = floor(x / cellW)
```

Constants:
- `CELL_W = 64` (pixel width of one cell)
- `CELL_H = 64` (pixel height — square cells)

### No depth sorting needed

With top-down view, items don't overlap (collision detection prevents it),
so there's no painter's-algorithm z-index sorting. Items render in natural
DOM order. This is simpler than the isometric approach which required
back-to-front sorting by `row + col`.

### Occupancy grid

A computed `Map<string, string>` (`"row,col"` → `itemId`) for O(footprint)
collision detection. Updated reactively from `items()` signal.

### Drag-and-drop (Angular CDK)

- `cdkDrag` on each item (no `cdkDropList` — free dragging, not sortable)
- `cdkDragMoved` → convert pointer position to grid cell → show green/red preview
- `cdkDragEnded` → if preview was valid, commit `moveItem()`; otherwise CDK
  auto-animates the item back to its origin (CSS transition, no Angular Animations)
- `cdkDragDisabled` = true while in placement mode (so clicks place new items
  instead of dragging existing ones)

### Collision validation

`canPlaceAt(pos, footprint, ignoreItemId?)` checks:
1. In bounds: `row >= 0 && col >= 0 && row + footprint.h <= GRID_ROWS && col + footprint.w <= GRID_COLS`
2. No collision: every cell in the footprint must be empty in the occupancy map
   (or occupied by `ignoreItemId` — used when moving an item to a new position)

---

## No-mock-data policy

**v3 strips ALL mock/dummy/sample data:**

- `defaultSave()` returns a truly empty state: `items: []`, `gold: 50` (starting), `feed: 5` (starting). No pre-placed plots, no demo farm.
- `FarmLeaderboardService.entries` starts as `[]`. If the user isn't signed in or the Worker is unreachable, the leaderboard shows an empty state ("No farmers yet. Be the first!") — never fake players.
- `FarmSyncService.signIn()` no longer simulates success. It redirects to GitHub's real OAuth page.
- The previous `generateSampleLeaderboard()` method is deleted.

**Onboarding instead of demo data:** a dismissible intro nudge appears for
first-time players explaining they should place their first crop plot. No fake
farm is shown.

---

## v1 feature list (unchanged from v2)

### Crops — 10 types across 4 tiers

| Crop | Tier | Unlock | Cost | Grow time | Sell | XP |
|------|------|--------|------|-----------|------|----|
| Wheat | 1 | L1 | 2g | 5s | 8g | 1 |
| Carrot | 1 | L1 | 8g | 20s | 35g | 3 |
| Tomato | 1 | L1 | 20g | 45s | 90g | 6 |
| Corn | 2 | L5 | 60g | 2m | 240g | 14 |
| Strawberry | 2 | L5 | 150g | 5m | 650g | 28 |
| Pumpkin | 3 | L12 | 400g | 15m | 2000g | 70 |
| Blueberry | 3 | L12 | 800g | 30m | 4500g | 130 |
| Sunflower | 4 | L20 | 1800g | 1h | 9500g | 260 |
| Melon | 4 | L20 | 4500g | 2h | 24000g | 540 |
| Chili Pepper | 4 | L20 | 10000g | 4h | 65000g | 1200 |

### Livestock — 3 animals
- **Chicken** (L4, 200g, 1m cycle, eggs @ 25g) — housed in coop
- **Cow** (L8, 1500g, 5m cycle, milk @ 150g) — housed in barn
- **Sheep** (L14, 4000g, 20m cycle, wool @ 500g) — housed in barn

Animals need feeding (1/2/3 feed per visit). If unfed beyond grace window
(30m/2h/6h), production **pauses** until fed (no decay).

### Buildings — 4 types with footprints
- **Silo** (L3, 500g, 1×1) — +25 inventory cap per level
- **Chicken Coop** (L4, 800g, 2×2) — +2 chicken capacity per level
- **Barn** (L8, 2500g, 2×2) — +2 cow/sheep capacity per level
- **Market Stall** (L6, 1500g, 2×2) — unlocks instant-sell from inventory

### Land expansion — 12×12 free-placement grid
- Players start with the entire grid empty
- Crop plots are FREE to place (the gold sink is seeds, not plots)
- Buildings + decorations cost coins to place
- Everything is freely repositionable via drag-and-drop

### XP / Leveling — explicit table (L1-L20, cap at 20)
- L5 unlocks Tier 2 crops
- L12 unlocks Tier 3 crops
- L20 unlocks Tier 4 crops

### Quests — 13 total (8 one-time + 5 repeatable)
Tutorial arc + rotating crop/earn/feed/collect quests.

### Decorations — 6 types (1×1 each)
Purely cosmetic, contribute to charm score (no mechanical effect).

### Social / Leaderboard (GitHub-based, real)
- Top 50 players sorted by level DESC, coins DESC
- Read-only farm visits
- Backend: per-user KV record + denormalized leaderboard cache

---

## Data model summary

```typescript
// Placeable items (single items[] array, freely positioned)
interface PlaceableItem { id: string; kind: 'crop'|'building'|'decoration'; row: number; col: number; }
interface CropItem      extends PlaceableItem { kind: 'crop';       cropId: string|null; plantedAt: number; }
interface BuildingItem  extends PlaceableItem { kind: 'building';   buildingKind: BuildingKind; level: number; }
interface DecorationItem extends PlaceableItem { kind: 'decoration'; decorationKind: DecorationKind; }
type FarmItem = CropItem | BuildingItem | DecorationItem;

// Animals (live in buildings, not on grid)
interface AnimalState { id: string; kind: AnimalKind; housedIn: string; lastFedAt: number; lastCollectedAt: number; }

// Top-level save
interface FarmSaveData {
  version: 3;
  gold: number;
  xp: number;
  items: FarmItem[];           // ← all placeable things, freely positioned
  animals: AnimalState[];
  inventory: Record<string, number>;
  feed: number;
  questProgress: Record<string, QuestProgress>;
  stats: FarmStats;
  onboarding: OnboardingState;  // ← drives intro nudges
  savedAt: number;
}

// Leaderboard (GitHub-side, denormalized)
interface LeaderboardEntry {
  githubUserId: string; username: string; avatarUrl: string;
  level: number; coins: number; totalEarned: number; charm: number;
  updatedAt: string;
}
```

---

## Backend / sync notes

### Two-tier persistence

1. **LocalStorage (always on):** key `zarestia-farm-save-v3` — full save JSON, written on every change (debounced 400ms via microtask).
2. **GitHub (when signed in):** real OAuth flow → Worker stores save in KV under `farm:user:<githubUserId>`.

### Session storage

- `zarestia-farm-session` — `{githubUserId, login, avatarUrl}` for the signed-in user
- `zarestia-farm-last-sync` — ISO timestamp of last successful cloud sync
- `zarestia-farm-oauth-state` (sessionStorage) — CSRF nonce for OAuth flow

### Save versioning

Save data includes a `version` field. v3 saves are version 3. If a future
migration changes the shape, bump the version and the `loadSave()` function
will return `defaultSave()` for incompatible versions (no silent corruption).

---

## Known limitations / out of scope for v3

- **Multi-cell drag preview:** the green/red preview shows a single diamond; for 2×2 buildings it doesn't preview the full footprint shape. Functional but visually simple.
- **Save conflicts:** last-write-wins. No merge logic.
- **Animal housing is per-kind:** animals live "in any coop" or "in any barn" rather than tied to a specific building instance.
- **Iso sprites for ALL crop stages:** only wheat has 3 growth-stage sprites. Other crops fall back to Material Icons with CSS scale.
- **No mobile drag:** CDK free-drag works on desktop; touch support needs additional CDK config (deferred to v4).
- **Worker backend not yet implemented:** the 4 Worker routes are documented above but the Worker code itself needs to be written. Client-side UI is fully functional — sign-in just shows an error until the Worker is deployed.

---

## Asset status

Top-down pixel-art sprites are generated via Z.ai image generation API. Style:
16-bit SNES, top-down/front-facing, transparent background, Zarestia brand
palette (milky-white / lime / deep green / yellow accents).

| Asset | Status |
|-------|--------|
| `plot-{empty,tilled,watered}.png` (ground tiles) | ✅ |
| `mascot-{idle,action}.png` | ✅ |
| `crop-wheat-{sprout,growing,ready}.png` (3 stages) | ✅ |
| `crop-{carrot,tomato,corn,strawberry,pumpkin,blueberry,sunflower,melon,chili}-ready.png` (9 ready stages) | ✅ |
| `building-{silo,coop,barn,market}.png` | ✅ |
| `animal-{chicken,cow,sheep}.png` | ✅ |
| `deco-{fence,path,lantern,flowerbed,scarecrow,windvane}.png` | ✅ |
| Non-wheat crop growth stages (seed/sprout/growing) | ⚠️ Falls back to Material Icon with CSS scale |

**Total:** 30 top-down sprites. The only gap is non-wheat crop growth stages —
these use the Material Icon fallback with CSS scale to suggest growth.

---

## Suggested next steps / v4 ideas

- [ ] Implement the 4 Cloudflare Worker routes (auth, save, leaderboard, visit)
- [ ] Multi-cell drag preview shape (highlight all footprint cells)
- [ ] Touch/mobile drag support
- [ ] Iso sprites for ALL crop growth stages (seed/sprout/growing for non-wheat crops)
- [ ] Save conflict resolution (CRDT or timestamp merge)
- [ ] Rotate items (90° rotations for non-square footprints)
- [ ] Fences auto-connect to adjacent fences
- [ ] Weather events (rain doubles growth, drought pauses without watering)
- [ ] Co-op visits (water a neighbor's crops, 1/day)
- [ ] Achievements system (long-term badges)

---

## File map

```
src/app/pages/playground/farm/
├── farm.ts                       # root component with tabbed UI + top-down grid
├── farm.html                     # template with @switch over tabs
├── farm.scss                     # styles (top-down grid + tabs + panels)
├── farm-game.service.ts          # central state + placement + collision detection
├── farm-sync.service.ts          # REAL GitHub OAuth + cloud sync
├── farm-leaderboard.service.ts   # GitHub leaderboard (no mock data)
├── farm-state.types.ts           # data model (FarmItem, AnimalState, etc.)
├── grid-projection.ts            # pure {row,col} ↔ {x,y} (simple linear)
├── data/
│   ├── crops.data.ts             # 10 crops with footprints
│   ├── animals.data.ts           # 3 animals
│   ├── buildings.data.ts         # 4 buildings with footprints (1×1, 2×2)
│   ├── decorations.data.ts       # 6 decorations (all 1×1)
│   ├── quests.data.ts            # 13 quests
│   └── levels.data.ts            # explicit XP table L1-L20
└── README.md                     # this file
```

Public assets: `public/farm-sprites/*.png` (30 top-down pixel-art sprites).
