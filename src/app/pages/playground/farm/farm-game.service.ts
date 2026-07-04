import {
  Injectable,
  signal,
  computed,
  effect,
  inject,
  DestroyRef,
} from '@angular/core';
import { FarmSyncService } from './farm-sync.service';
import {
  FarmSaveData,
  FarmItem,
  CropItem,
  BuildingItem,
  DecorationItem,
  AnimalState,
  QuestProgress,
  SAVE_VERSION,
  GRID_ROWS,
  GRID_COLS,
  STARTING_GOLD,
  STARTING_FEED,
  OnboardingState,
} from './farm-state.types';
import {
  CROPS,
  CropStage,
  stageForProgress,
} from './data/crops.data';
import {
  ANIMALS,
  AnimalKind,
  RESOURCE_SELL_PRICES,
} from './data/animals.data';
import {
  BUILDINGS,
  BuildingKind,
  upgradeCost,
  siloCapacity,
  animalCapacity,
} from './data/buildings.data';
import { DECORATIONS, DecorationKind } from './data/decorations.data';
import {
  QUESTS,
  QuestDef,
  QuestEvent,
  matchesCondition,
} from './data/quests.data';
import {
  levelForXp,
  xpToNext,
  xpProgressInLevel,
  MAX_LEVEL,
} from './data/levels.data';
import {
  GridPos,
  isInBounds,
  cellsOccupiedBy,
} from './grid-projection';

// ============================================================================
// FARM GAME SERVICE v3 — free-placement top-down 2D grid model.
// ----------------------------------------------------------------------------
// All state is signal-backed. The component layer is purely declarative.
//
// FREE PLACEMENT MODEL:
//   Every placeable thing (crop plot, building, decoration) is a `FarmItem`
//   with a logical {row, col} position and a footprint. The top-down view
//   is a pure projection layer over this — change the projection, the game
//   logic doesn't change.
//
// OCCUPANCY GRID:
//   A computed Map<string, string> ("row,col" → itemId) lets placement
//   validation be O(footprint) instead of O(items).
//
// REAL-TIME PROGRESSION:
//   Crop growth + animal production are timestamp-diff (offline-capable).
//   A 1s UI tick signal exists ONLY to refresh progress bars.
//
// NO MOCK DATA:
//   A new player starts with zero items placed, STARTING_GOLD coins, and
//   STARTING_FEED feed. Onboarding flags drive tutorial nudges.
// ============================================================================

const SAVE_KEY = 'zarestia-farm-save-v3';
const TICK_MS = 1000;
const FEED_CRAFT_WHEAT = 5;

function freshOnboarding(): OnboardingState {
  return {
    hasPlacedFirstPlot: false,
    hasPlantedFirstCrop: false,
    hasHarvestedFirstCrop: false,
    hasBuiltFirstBuilding: false,
    hasBoughtFirstAnimal: false,
    hasDismissedIntro: false,
  };
}

/**
 * Brand-new save state. NO mock data — zero items, just starting balance.
 * Onboarding flags are all false → first nudge appears immediately.
 */
function defaultSave(): FarmSaveData {
  return {
    version: SAVE_VERSION,
    gold: STARTING_GOLD,
    xp: 0,
    items: [],
    animals: [],
    inventory: {},
    feed: STARTING_FEED,
    questProgress: {},
    stats: {
      totalPlanted: 0,
      totalHarvested: 0,
      totalCollected: 0,
      totalFed: 0,
      totalEarned: 0,
      startedAt: Date.now(),
    },
    onboarding: freshOnboarding(),
    savedAt: Date.now(),
  };
}

function makeItemId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Returns the footprint for any item kind. */
function footprintOfItem(item: FarmItem): { w: number; h: number } {
  if (item.kind === 'crop') return { w: 1, h: 1 };
  if (item.kind === 'building') return BUILDINGS[item.buildingKind].footprint;
  return DECORATIONS[item.decorationKind].footprint;
}

@Injectable({ providedIn: 'root' })
export class FarmGameService {
  private readonly sync = inject(FarmSyncService);
  private readonly destroyRef = inject(DestroyRef);

  // ---- Reactive state ----
  private readonly data = signal<FarmSaveData>(this.loadSave());

  // ---- Public readable signals ----
  readonly gold = computed(() => this.data().gold);
  readonly xp = computed(() => this.data().xp);
  readonly items = computed(() => this.data().items);
  readonly animals = computed(() => this.data().animals);
  readonly inventory = computed(() => this.data().inventory);
  readonly feed = computed(() => this.data().feed);
  readonly stats = computed(() => this.data().stats);
  readonly questProgress = computed(() => this.data().questProgress);
  readonly onboarding = computed(() => this.data().onboarding);

  // ---- Occupancy grid: "row,col" → itemId (computed from items) ----
  readonly occupancy = computed<Map<string, string>>(() => {
    const map = new Map<string, string>();
    for (const item of this.items()) {
      const fp = footprintOfItem(item);
      for (const cell of cellsOccupiedBy({ row: item.row, col: item.col }, fp)) {
        map.set(cell, item.id);
      }
    }
    return map;
  });

  // ---- Derived signals ----
  readonly level = computed(() => levelForXp(this.xp()));
  readonly maxXpForLevel = computed(() => xpToNext(this.level()));
  readonly xpInLevel = computed(() => xpProgressInLevel(this.xp(), this.level()));
  readonly atMaxLevel = computed(() => this.level() >= MAX_LEVEL);

  /** Building level by kind (0 if not built). */
  readonly buildingLevels = computed<Record<BuildingKind, number>>(() => {
    const out: Record<BuildingKind, number> = {
      silo: 0, coop: 0, barn: 0, market: 0,
    };
    for (const item of this.items()) {
      if (item.kind === 'building') {
        out[item.buildingKind] = Math.max(out[item.buildingKind], item.level);
      }
    }
    return out;
  });

  readonly siloLevel = computed(() => this.buildingLevels().silo);
  readonly coopLevel = computed(() => this.buildingLevels().coop);
  readonly barnLevel = computed(() => this.buildingLevels().barn);
  readonly marketLevel = computed(() => this.buildingLevels().market);
  readonly hasMarket = computed(() => this.marketLevel() > 0);

  readonly inventoryCap = computed(() => siloCapacity(this.siloLevel()));
  readonly inventoryUsed = computed(() =>
    Object.values(this.inventory()).reduce((s, n) => s + n, 0)
  );
  readonly inventoryFull = computed(() => this.inventoryUsed() >= this.inventoryCap());

  readonly totalCharm = computed(() => {
    let charm = 0;
    for (const item of this.items()) {
      if (item.kind === 'decoration') charm += DECORATIONS[item.decorationKind].charm;
    }
    return charm;
  });

  /** True when the player has placed nothing yet — drives the intro nudge. */
  readonly isEmptyFarm = computed(() => this.items().length === 0);

  // ---- UI tick (visual refresh only) ----
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  readonly uiTick = signal(0);

  constructor() {
    this.startTick();

    let saveScheduled = false;
    effect(() => {
      void this.data();
      if (saveScheduled) return;
      saveScheduled = true;
      queueMicrotask(() => {
        saveScheduled = false;
        this.persist();
        this.sync.markPending();
      });
    });

    this.destroyRef.onDestroy(() => this.stopTick());
  }

  private startTick(): void {
    if (this.tickTimer !== null) return;
    this.tickTimer = setInterval(() => {
      this.uiTick.update((n) => (n + 1) % 1_000_000);
    }, TICK_MS);
  }

  private stopTick(): void {
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  // ========================================================================
  // PLACEMENT VALIDATION
  // ========================================================================

  /**
   * Returns true if a footprint at the given position can be placed without
   * colliding with existing items or going out of bounds.
   *
   * Pass `ignoreItemId` to allow moving an item to a new position (it won't
   * collide with itself).
   */
  canPlaceAt(pos: GridPos, footprint: { w: number; h: number }, ignoreItemId?: string): boolean {
    if (!isInBounds(pos, footprint, GRID_ROWS, GRID_COLS)) return false;
    const occ = this.occupancy();
    for (const cell of cellsOccupiedBy(pos, footprint)) {
      const occupier = occ.get(cell);
      if (occupier && occupier !== ignoreItemId) return false;
    }
    return true;
  }

  /** Lookup an item by id. */
  itemById(id: string): FarmItem | undefined {
    return this.items().find((i) => i.id === id);
  }

  // ========================================================================
  // PLACE / MOVE / REMOVE ITEMS
  // ========================================================================

  /**
   * Place a new crop plot at the given position. Free — no cost.
   * (Crop plots are the basic unit of the farm; charging for them felt
   * punitive. Seeds are where the gold sink is.)
   */
  placeCropPlot(pos: GridPos): void {
    if (!this.canPlaceAt(pos, { w: 1, h: 1 })) return;
    const item: CropItem = {
      id: makeItemId('crop'),
      kind: 'crop',
      row: pos.row,
      col: pos.col,
      cropId: null,
      plantedAt: 0,
    };
    this.data.update((d) => ({
      ...d,
      items: [...d.items, item],
      onboarding: { ...d.onboarding, hasPlacedFirstPlot: true },
    }));
  }

  /** Place a new building. Costs coins. */
  placeBuilding(kind: BuildingKind, pos: GridPos): void {
    const def = BUILDINGS[kind];
    if (!def) return;
    if (this.level() < def.unlockLevel) return;
    if (this.gold() < def.baseCost) return;
    if (!this.canPlaceAt(pos, def.footprint)) return;

    const item: BuildingItem = {
      id: makeItemId('building'),
      kind: 'building',
      row: pos.row,
      col: pos.col,
      buildingKind: kind,
      level: 1,
    };
    this.data.update((d) => ({
      ...d,
      gold: d.gold - def.baseCost,
      items: [...d.items, item],
      onboarding: { ...d.onboarding, hasBuiltFirstBuilding: true },
    }));
    this.emitQuestEvent({ kind: 'build', subject: kind, amount: 1 });
  }

  /** Place a new decoration. Costs coins. */
  placeDecoration(kind: DecorationKind, pos: GridPos): void {
    const def = DECORATIONS[kind];
    if (!def) return;
    if (this.level() < def.unlockLevel) return;
    if (this.gold() < def.cost) return;
    if (!this.canPlaceAt(pos, def.footprint)) return;

    const item: DecorationItem = {
      id: makeItemId('deco'),
      kind: 'decoration',
      row: pos.row,
      col: pos.col,
      decorationKind: kind,
    };
    this.data.update((d) => ({
      ...d,
      gold: d.gold - def.cost,
      items: [...d.items, item],
    }));
    this.emitQuestEvent({ kind: 'charm', amount: def.charm });
  }

  /**
   * Move an existing item to a new position. Used by drag-and-drop.
   * Validates the new position; if invalid, the caller animates the item
   * back to its old position (the service doesn't do animation).
   */
  moveItem(id: string, newPos: GridPos): boolean {
    const item = this.itemById(id);
    if (!item) return false;
    const fp = footprintOfItem(item);
    if (!this.canPlaceAt(newPos, fp, id)) return false;
    this.data.update((d) => ({
      ...d,
      items: d.items.map((it) =>
        it.id === id ? ({ ...it, row: newPos.row, col: newPos.col } as FarmItem) : it
      ),
    }));
    return true;
  }

  /** Remove an item from the grid. No refund. */
  removeItem(id: string): void {
    this.data.update((d) => ({
      ...d,
      items: d.items.filter((it) => it.id !== id),
    }));
  }

  // ========================================================================
  // CROP LOGIC
  // ========================================================================

  readonly speedMultiplier = computed(() => 1);

  /** Returns current growth progress (0..1) for a crop item. */
  cropProgress(item: CropItem): number {
    if (!item.cropId) return 0;
    const crop = CROPS[item.cropId];
    if (!crop) return 0;
    void this.uiTick();
    const elapsed = Date.now() - item.plantedAt;
    return Math.min(1, elapsed / (crop.baseMs * this.speedMultiplier()));
  }

  cropStage(item: CropItem): CropStage {
    if (!item.cropId) return 'seed';
    return stageForProgress(this.cropProgress(item));
  }

  cropReady(item: CropItem): boolean {
    if (!item.cropId) return false;
    return this.cropProgress(item) >= 1;
  }

  cropRemainingMs(item: CropItem): number {
    if (!item.cropId) return 0;
    const crop = CROPS[item.cropId];
    if (!crop) return 0;
    void this.uiTick();
    const totalMs = crop.baseMs * this.speedMultiplier();
    return Math.max(0, totalMs - (Date.now() - item.plantedAt));
  }

  /** Plant the currently-selected crop in the given plot. */
  plant(item: CropItem, cropId: string): void {
    const crop = CROPS[cropId];
    if (!crop) return;
    if (item.cropId !== null) return;
    if (this.level() < crop.unlockLevel) return;
    if (this.gold() < crop.seedCost) return;

    this.data.update((d) => ({
      ...d,
      gold: d.gold - crop.seedCost,
      items: d.items.map((it) =>
        it.id === item.id
          ? { ...it, cropId, plantedAt: Date.now() } as FarmItem
          : it
      ),
      stats: { ...d.stats, totalPlanted: d.stats.totalPlanted + 1 },
      onboarding: { ...d.onboarding, hasPlantedFirstCrop: true },
    }));
    this.emitQuestEvent({ kind: 'plant', subject: cropId, amount: 1 });
  }

  /** Harvest a ready crop. */
  harvest(item: CropItem): void {
    if (!item.cropId) return;
    if (!this.cropReady(item)) return;
    if (this.inventoryFull()) return;

    const crop = CROPS[item.cropId];
    const inv = { ...this.data().inventory };
    inv[crop.id] = (inv[crop.id] ?? 0) + 1;

    this.data.update((d) => ({
      ...d,
      items: d.items.map((it) =>
        it.id === item.id
          ? { ...it, cropId: null, plantedAt: 0 } as FarmItem
          : it
      ),
      inventory: inv,
      stats: { ...d.stats, totalHarvested: d.stats.totalHarvested + 1 },
      xp: d.xp + crop.xp,
      onboarding: { ...d.onboarding, hasHarvestedFirstCrop: true },
    }));
    this.emitQuestEvent({ kind: 'harvest', subject: crop.id, amount: 1 });
    this.checkLevelUp();
  }

  // ========================================================================
  // SELLING
  // ========================================================================

  sell(cropId: string, qty?: number): void {
    const inv = this.data().inventory;
    const have = inv[cropId] ?? 0;
    if (have <= 0) return;
    const sellQty = Math.min(qty ?? have, have);
    const crop = CROPS[cropId];
    if (!crop) return;
    const earned = sellQty * crop.sellPrice;

    const newInv = { ...inv };
    newInv[cropId] = have - sellQty;
    if (newInv[cropId] <= 0) delete newInv[cropId];

    this.data.update((d) => ({
      ...d,
      inventory: newInv,
      gold: d.gold + earned,
      stats: { ...d.stats, totalEarned: d.stats.totalEarned + earned },
    }));
    this.emitQuestEvent({ kind: 'earn', amount: earned });
  }

  sellProduct(resource: 'egg' | 'milk' | 'wool', qty?: number): void {
    const inv = this.data().inventory;
    const have = inv[resource] ?? 0;
    if (have <= 0) return;
    const sellQty = Math.min(qty ?? have, have);
    const price = RESOURCE_SELL_PRICES[resource];
    const earned = sellQty * price;

    const newInv = { ...inv };
    newInv[resource] = have - sellQty;
    if (newInv[resource] <= 0) delete newInv[resource];

    this.data.update((d) => ({
      ...d,
      inventory: newInv,
      gold: d.gold + earned,
      stats: { ...d.stats, totalEarned: d.stats.totalEarned + earned },
    }));
    this.emitQuestEvent({ kind: 'earn', amount: earned });
  }

  sellAll(): void {
    if (!this.hasMarket()) return;
    const inv = this.data().inventory;
    let total = 0;
    for (const [key, qty] of Object.entries(inv)) {
      const price = CROPS[key]?.sellPrice ?? RESOURCE_SELL_PRICES[key as 'egg' | 'milk' | 'wool'] ?? 0;
      total += price * qty;
    }
    if (total <= 0) return;
    this.data.update((d) => ({
      ...d,
      inventory: {},
      gold: d.gold + total,
      stats: { ...d.stats, totalEarned: d.stats.totalEarned + total },
    }));
    this.emitQuestEvent({ kind: 'earn', amount: total });
  }

  // ========================================================================
  // BUILDING UPGRADES
  // ========================================================================

  upgradeBuilding(item: BuildingItem): void {
    const def = BUILDINGS[item.buildingKind];
    if (!def) return;
    const cost = upgradeCost(def, item.level);
    if (this.gold() < cost) return;

    this.data.update((d) => ({
      ...d,
      gold: d.gold - cost,
      items: d.items.map((it) => {
        if (it.id !== item.id) return it;
        if (it.kind !== 'building') return it;
        return { ...it, level: it.level + 1 } as FarmItem;
      }),
    }));
  }

  animalCapacityFor(kind: 'coop' | 'barn'): number {
    return this.items()
      .filter((i): i is BuildingItem => i.kind === 'building' && i.buildingKind === kind)
      .reduce((sum, item) => sum + animalCapacity(kind, item.level), 0);
  }

  animalCountFor(kind: 'coop' | 'barn'): number {
    return this.animals().filter((a) => ANIMALS[a.kind].housedIn === kind).length;
  }

  canHouseAnimal(kind: AnimalKind): boolean {
    const def = ANIMALS[kind];
    return this.animalCountFor(def.housedIn) < this.animalCapacityFor(def.housedIn);
  }

  // ========================================================================
  // ANIMALS
  // ========================================================================

  buyAnimal(kind: AnimalKind): void {
    const def = ANIMALS[kind];
    if (!def) return;
    if (this.level() < def.unlockLevel) return;
    if (this.gold() < def.cost) return;
    if (!this.canHouseAnimal(kind)) return;

    // Find a building of the right kind to house the animal in
    const housing = this.items().find(
      (i): i is BuildingItem => i.kind === 'building' && i.buildingKind === def.housedIn
    );
    if (!housing) return;

    const id = makeItemId('animal');
    const now = Date.now();
    const animal: AnimalState = {
      id,
      kind,
      housedIn: housing.id,
      lastFedAt: now,
      lastCollectedAt: now,
    };
    this.data.update((d) => ({
      ...d,
      gold: d.gold - def.cost,
      animals: [...d.animals, animal],
      onboarding: { ...d.onboarding, hasBoughtFirstAnimal: true },
    }));
  }

  animalIsProducing(animal: AnimalState): boolean {
    void this.uiTick();
    const def = ANIMALS[animal.kind];
    return Date.now() - animal.lastFedAt < def.feedGraceMs;
  }

  animalHasProduct(animal: AnimalState): boolean {
    if (!this.animalIsProducing(animal)) return false;
    void this.uiTick();
    const def = ANIMALS[animal.kind];
    return Date.now() - animal.lastCollectedAt >= def.produceMs;
  }

  animalMsToProduct(animal: AnimalState): number {
    if (!this.animalIsProducing(animal)) return 0;
    void this.uiTick();
    const def = ANIMALS[animal.kind];
    return Math.max(0, def.produceMs - (Date.now() - animal.lastCollectedAt));
  }

  collectAnimal(animalId: string): void {
    const animals = this.data().animals;
    const animal = animals.find((a) => a.id === animalId);
    if (!animal) return;
    if (!this.animalHasProduct(animal)) return;
    if (this.inventoryFull()) return;

    const def = ANIMALS[animal.kind];
    const resource = def.produces;
    const inv = { ...this.data().inventory };
    inv[resource] = (inv[resource] ?? 0) + def.produceQty;

    const newAnimals = animals.map((a) =>
      a.id === animalId ? { ...a, lastCollectedAt: Date.now() } : a
    );

    this.data.update((d) => ({
      ...d,
      animals: newAnimals,
      inventory: inv,
      stats: { ...d.stats, totalCollected: d.stats.totalCollected + 1 },
      xp: d.xp + def.xp,
    }));
    this.emitQuestEvent({ kind: 'collect', subject: resource, amount: def.produceQty });
    this.checkLevelUp();
  }

  feedAnimal(animalId: string): void {
    const animals = this.data().animals;
    const animal = animals.find((a) => a.id === animalId);
    if (!animal) return;
    const def = ANIMALS[animal.kind];
    if (this.feed() < def.feedPerVisit) return;

    const newAnimals = animals.map((a) =>
      a.id === animalId ? { ...a, lastFedAt: Date.now() } : a
    );
    this.data.update((d) => ({
      ...d,
      animals: newAnimals,
      feed: d.feed - def.feedPerVisit,
      stats: { ...d.stats, totalFed: d.stats.totalFed + 1 },
    }));
    this.emitQuestEvent({ kind: 'feed', amount: 1 });
  }

  feedAllAnimals(): void {
    const animals = this.data().animals;
    for (const a of animals) {
      if (!this.animalIsProducing(a)) this.feedAnimal(a.id);
    }
  }

  buyFeed(qty = 1): void {
    const cost = qty * 10;
    if (this.gold() < cost) return;
    this.data.update((d) => ({ ...d, gold: d.gold - cost, feed: d.feed + qty }));
  }

  craftFeed(qty = 1): void {
    const wheatNeeded = qty * FEED_CRAFT_WHEAT;
    const have = this.inventory()['wheat'] ?? 0;
    if (have < wheatNeeded) return;
    const inv = { ...this.data().inventory };
    inv['wheat'] = have - wheatNeeded;
    if (inv['wheat'] <= 0) delete inv['wheat'];
    this.data.update((d) => ({ ...d, inventory: inv, feed: d.feed + qty }));
  }

  // ========================================================================
  // ONBOARDING
  // ========================================================================

  dismissIntro(): void {
    this.data.update((d) => ({
      ...d,
      onboarding: { ...d.onboarding, hasDismissedIntro: true },
    }));
  }

  // ========================================================================
  // LEVELING / QUESTS
  // ========================================================================

  private checkLevelUp(): void {
    const oldLevel = this.level();
    const newLevel = levelForXp(this.data().xp);
    if (newLevel > oldLevel) {
      this.emitQuestEvent({ kind: 'level', amount: newLevel });
    }
  }

  private emitQuestEvent(event: QuestEvent): void {
    const progress = { ...this.data().questProgress };
    let changed = false;
    for (const quest of QUESTS) {
      if (quest.unlockLevel > this.level()) continue;
      const cur = progress[quest.id] ?? {
        questId: quest.id, progress: 0, completed: false, completedAt: null, timesCompleted: 0,
      };
      if (cur.completed && quest.type === 'one-time') continue;

      if (matchesCondition(quest.condition, event)) {
        cur.progress = cur.progress + event.amount;
        if (quest.condition.kind === 'earn') {
          if (cur.progress >= quest.condition.target) {
            this.completeQuest(quest, cur);
          }
        } else if (quest.condition.kind === 'level') {
          if (this.level() >= quest.condition.target) {
            this.completeQuest(quest, cur);
          }
        } else if (cur.progress >= quest.condition.target) {
          this.completeQuest(quest, cur);
        }
        progress[quest.id] = cur;
        changed = true;
      }
    }
    if (changed) {
      this.data.update((d) => ({ ...d, questProgress: progress }));
    }
  }

  private completeQuest(quest: QuestDef, progress: QuestProgress): void {
    progress.completed = true;
    progress.completedAt = Date.now();
    progress.timesCompleted += 1;
    this.data.update((d) => ({
      ...d,
      gold: d.gold + quest.rewardCoins,
      xp: d.xp + quest.rewardXp,
      stats: { ...d.stats, totalEarned: d.stats.totalEarned + quest.rewardCoins },
    }));
  }

  claimRepeatable(questId: string): void {
    const quest = QUESTS.find((q) => q.id === questId);
    if (!quest || quest.type !== 'repeatable') return;
    const progress = { ...this.data().questProgress };
    const cur = progress[questId];
    if (!cur?.completed) return;
    progress[questId] = {
      ...cur,
      progress: 0,
      completed: false,
    };
    this.data.update((d) => ({ ...d, questProgress: progress }));
  }

  // ========================================================================
  // RESET / SYNC
  // ========================================================================

  reset(): void {
    this.data.set(defaultSave());
    this.persist();
  }

  private loadSave(): FarmSaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw) as FarmSaveData;
      if (parsed.version !== SAVE_VERSION) return defaultSave();
      if (!Array.isArray(parsed.items)) return defaultSave();
      return parsed;
    } catch {
      return defaultSave();
    }
  }

  private persist(): void {
    try {
      const snapshot: FarmSaveData = { ...this.data(), savedAt: Date.now() };
      localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
    } catch {
      // ignore
    }
  }

  async cloudSync(): Promise<boolean> {
    const json = JSON.stringify({ ...this.data(), savedAt: Date.now() });
    return this.sync.pushSave(json);
  }

  // ---- Constants exposed for templates ----
  readonly gridRows = GRID_ROWS;
  readonly gridCols = GRID_COLS;
  readonly maxLevel = MAX_LEVEL;
  readonly feedCraftWheat = FEED_CRAFT_WHEAT;

  /** Helper for templates: footprint lookup. */
  footprintOf(item: FarmItem): { w: number; h: number } {
    return footprintOfItem(item);
  }
}
