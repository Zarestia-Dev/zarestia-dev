import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ElementRef,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { TranslationService } from '../../../services/translation.service';
import { FarmGameService } from './farm-game.service';
import { FarmSyncService } from './farm-sync.service';
import { FarmLeaderboardService, VisitFarm } from './farm-leaderboard.service';
import { CROPS, CROP_IDS, CropStage } from './data/crops.data';
import { ANIMALS, ANIMAL_KINDS, AnimalKind } from './data/animals.data';
import { BUILDINGS, BUILDING_KINDS, BuildingKind, upgradeCost } from './data/buildings.data';
import { DECORATIONS, DECORATION_KINDS, DecorationKind } from './data/decorations.data';
import { QUESTS, QuestDef } from './data/quests.data';
import {
  FarmItem,
  CropItem,
  BuildingItem,
  DecorationItem,
  AnimalState,
} from './farm-state.types';
import {
  GridPos,
  CELL_W,
  CELL_H,
  project,
  projectFootprint,
  unproject,
  cellKey,
} from './grid-projection';
import type { CdkDragMove, CdkDragEnd } from '@angular/cdk/drag-drop';

// ============================================================================
// FARM GAME v3 — top-down 2D grid with free drag-and-drop placement.
// ----------------------------------------------------------------------------
// Every placeable item (crop, building, decoration) lives at a logical
// {row, col} position with a footprint. The top-down projection converts to
// screen coordinates for rendering (simple linear: x = col * CELL_W).
// Drag-and-drop converts back to logical coordinates to determine the target
// cell. No isometric math, no depth sorting — items don't overlap.
//
// Tabs:
//   - Field     : the grid + crop palette + inventory
//   - Animals   : livestock management
//   - Buildings : building shop (place onto grid via Field tab)
//   - Shop      : crops + decorations
//   - Quests    : quest log
//   - Leaderboard : real GitHub leaderboard (empty if not signed in)
//
// Onboarding: a dismissible intro nudge appears for first-time players
// explaining they should place their first crop plot. NO mock data.
// ============================================================================

type FarmTab = 'field' | 'animals' | 'buildings' | 'shop' | 'quests' | 'leaderboard';
type ShopMode = 'crops' | 'decorations';
type PlacementMode =
  | { kind: 'crop-plot' }
  | { kind: 'building'; buildingKind: BuildingKind }
  | { kind: 'decoration'; decorationKind: DecorationKind }
  | null;

interface RenderedItem {
  item: FarmItem;
  /** Screen position of the item's top-left corner. */
  x: number;
  y: number;
  /** Bounding box width/height in pixels. */
  width: number;
  height: number;
}

interface InventoryItem {
  key: string;
  qty: number;
  sellPrice: number;
  isCrop: boolean;
}

@Component({
  selector: 'app-farm',
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, DragDropModule],
  templateUrl: './farm.html',
  styleUrl: './farm.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Farm {
  protected readonly i18n = inject(TranslationService);
  readonly game = inject(FarmGameService);
  readonly sync = inject(FarmSyncService);
  readonly leaderboard = inject(FarmLeaderboardService);

  private readonly gridEl = viewChild<ElementRef<HTMLElement>>('gridEl');

  // ---- Static data refs for templates ----
  readonly crops = CROPS;
  readonly cropIds = CROP_IDS;
  readonly animals = ANIMALS;
  readonly animalKinds = ANIMAL_KINDS;
  readonly buildings = BUILDINGS;
  readonly buildingKinds = BUILDING_KINDS;
  readonly decorations = DECORATIONS;
  readonly decorationKinds = DECORATION_KINDS;
  readonly allQuests = QUESTS;
  readonly Math = Math;

  // ---- UI state ----
  readonly activeTab = signal<FarmTab>('field');
  readonly shopMode = signal<ShopMode>('crops');
  readonly selectedCrop = signal<string>('wheat');
  readonly placementMode = signal<PlacementMode>(null);
  readonly visitingFarm = signal<VisitFarm | null>(null);

  /** Preview position during drag (for the green/red ghost). */
  readonly dragPreview = signal<{ pos: GridPos; valid: boolean } | null>(null);

  // ---- Tabs ----
  readonly tabs: readonly { id: FarmTab; labelKey: string; icon: string }[] = [
    { id: 'field',       labelKey: 'playground.farm.tab.field',       icon: 'agriculture' },
    { id: 'animals',     labelKey: 'playground.farm.tab.animals',     icon: 'pets' },
    { id: 'buildings',   labelKey: 'playground.farm.tab.buildings',   icon: 'home_work' },
    { id: 'shop',        labelKey: 'playground.farm.tab.shop',        icon: 'storefront' },
    { id: 'quests',      labelKey: 'playground.farm.tab.quests',      icon: 'task_alt' },
    { id: 'leaderboard', labelKey: 'playground.farm.tab.leaderboard', icon: 'leaderboard' },
  ];

  // ---- Game state signals (re-exported from service) ----
  readonly gold = this.game.gold;
  readonly level = this.game.level;
  readonly xp = this.game.xp;
  readonly items = this.game.items;
  readonly animalsState = this.game.animals;
  readonly inventory = this.game.inventory;
  readonly feed = this.game.feed;
  readonly stats = this.game.stats;
  readonly questProgress = this.game.questProgress;
  readonly maxXpForLevel = this.game.maxXpForLevel;
  readonly xpInLevel = this.game.xpInLevel;
  readonly atMaxLevel = this.game.atMaxLevel;
  readonly totalCharm = this.game.totalCharm;
  readonly inventoryCap = this.game.inventoryCap;
  readonly inventoryUsed = this.game.inventoryUsed;
  readonly inventoryFull = this.game.inventoryFull;
  readonly hasMarket = this.game.hasMarket;
  readonly siloLevel = this.game.siloLevel;
  readonly coopLevel = this.game.coopLevel;
  readonly barnLevel = this.game.barnLevel;
  readonly marketLevel = this.game.marketLevel;
  readonly onboarding = this.game.onboarding;
  readonly isEmptyFarm = this.game.isEmptyFarm;
  readonly gridRows = this.game.gridRows;
  readonly gridCols = this.game.gridCols;

  // ---- Sync state ----
  readonly signedIn = this.sync.signedIn;
  readonly syncing = this.sync.syncing;
  readonly pending = this.sync.pending;
  readonly lastSync = this.sync.lastSync;
  readonly syncError = this.sync.error;
  readonly syncUser = this.sync.user;

  // ---- Leaderboard state ----
  readonly leaderboardEntries = this.leaderboard.entries;
  readonly leaderboardLoading = this.leaderboard.loading;
  readonly leaderboardError = this.leaderboard.error;
  readonly myRank = this.leaderboard.myRank;

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  // (No ngOnInit needed — top-down grid starts at (0,0), no origin computation.
  //  The FarmLeaderboardService pre-load previously here is now triggered
  //  lazily when the user opens the leaderboard tab.)

  // ========================================================================
  // RENDERED ITEMS (computed projection)
  // ========================================================================

  /**
   * Compute the rendered position of every item on the grid.
   * No z-index sorting needed — with top-down view, items don't overlap
   * (collision detection prevents it), so DOM order doesn't matter.
   */
  readonly renderedItems = computed<RenderedItem[]>(() => {
    const items = this.items();
    return items.map((item) => {
      const fp = this.game.footprintOf(item);
      const proj = projectFootprint({ row: item.row, col: item.col }, fp);
      return {
        item,
        x: proj.topLeft.x,
        y: proj.topLeft.y,
        width: proj.width,
        height: proj.height,
      };
    });
  });

  /**
   * Compute all grid cells (for the background tile render). Each cell is
   * rendered as a simple square in a standard top-down layout.
   */
  readonly gridCells = computed<{ row: number; col: number; x: number; y: number }[]>(() => {
    const cells: { row: number; col: number; x: number; y: number }[] = [];
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const p = project({ row, col });
        cells.push({ row, col, x: p.x, y: p.y });
      }
    }
    return cells;
  });

  /** Total pixel dimensions of the grid bounding box. */
  readonly gridSizePx = computed(() => {
    return {
      width: this.gridCols * CELL_W,
      height: this.gridRows * CELL_H,
    };
  });

  // ========================================================================
  // TAB NAVIGATION
  // ========================================================================

  setTab(tab: FarmTab): void {
    this.activeTab.set(tab);
    if (tab === 'leaderboard' && this.signedIn() && this.leaderboardEntries().length === 0) {
      void this.leaderboard.loadTopN(50);
    }
    // Cancel any placement mode when switching tabs
    this.placementMode.set(null);
  }

  setShopMode(mode: ShopMode): void {
    this.shopMode.set(mode);
  }

  // ========================================================================
  // PLACEMENT MODE (shop → field)
  // ========================================================================

  startPlacingCropPlot(): void {
    this.placementMode.set({ kind: 'crop-plot' });
    this.activeTab.set('field');
  }

  startPlacingBuilding(kind: BuildingKind): void {
    this.placementMode.set({ kind: 'building', buildingKind: kind });
    this.activeTab.set('field');
  }

  startPlacingDecoration(kind: DecorationKind): void {
    this.placementMode.set({ kind: 'decoration', decorationKind: kind });
    this.activeTab.set('field');
  }

  cancelPlacement(): void {
    this.placementMode.set(null);
  }

  // ========================================================================
  // GRID CLICK (place items)
  // ========================================================================

  /**
   * Click handler for grid background. If in placement mode, place the
   * currently-selected item at the clicked cell.
   */
  onGridClick(event: MouseEvent): void {
    const mode = this.placementMode();
    if (!mode) return;
    const pos = this.screenToGrid(event.clientX, event.clientY);
    if (!pos) return;

    switch (mode.kind) {
      case 'crop-plot':
        this.game.placeCropPlot(pos);
        break;
      case 'building':
        this.game.placeBuilding(mode.buildingKind, pos);
        break;
      case 'decoration':
        this.game.placeDecoration(mode.decorationKind, pos);
        break;
    }

    // Stay in placement mode for rapid placement; user cancels via Esc or button
  }

  /**
   * Keyboard fallback for grid interaction (accessibility). Places at the
   * grid center when Enter is pressed while grid is focused.
   */
  onGridKeyActivate(_event: Event): void {
    const mode = this.placementMode();
    if (!mode) return;
    // Place at grid center
    const pos: GridPos = {
      row: Math.floor(this.gridRows / 2),
      col: Math.floor(this.gridCols / 2),
    };
    switch (mode.kind) {
      case 'crop-plot':
        this.game.placeCropPlot(pos);
        break;
      case 'building':
        this.game.placeBuilding(mode.buildingKind, pos);
        break;
      case 'decoration':
        this.game.placeDecoration(mode.decorationKind, pos);
        break;
    }
  }

  /**
   * Convert a screen click position to a logical grid cell.
   * Returns null if the click is outside the grid bounds.
   */
  private screenToGrid(clientX: number, clientY: number): GridPos | null {
    const gridEl = this.gridEl()?.nativeElement;
    if (!gridEl) return null;
    const rect = gridEl.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const pos = unproject({ x, y });
    if (pos.row < 0 || pos.col < 0 || pos.row >= this.gridRows || pos.col >= this.gridCols) {
      return null;
    }
    return pos;
  }

  // ========================================================================
  // ITEM CLICK (interact with placed items)
  // ========================================================================

  onItemClick(item: FarmItem, event: Event): void {
    event.stopPropagation();
    if (this.placementMode() !== null) {
      // If in placement mode, clicking an item cancels placement
      this.cancelPlacement();
      return;
    }
    if (item.kind === 'crop') {
      if (item.cropId === null) {
        this.game.plant(item, this.selectedCrop());
      } else if (this.game.cropReady(item)) {
        this.game.harvest(item);
      }
    }
  }

  // ========================================================================
  // DRAG AND DROP
  // ========================================================================

  /**
   * While dragging an item, update the preview position.
   * Called on cdkDragMove.
   */
  onDragMove(item: FarmItem, event: CdkDragMove): void {
    const gridEl = this.gridEl()?.nativeElement;
    if (!gridEl) return;
    const rect = gridEl.getBoundingClientRect();
    const x = event.pointerPosition.x - rect.left;
    const y = event.pointerPosition.y - rect.top;
    const pos = unproject({ x, y });
    const fp = this.game.footprintOf(item);
    const valid = this.game.canPlaceAt(pos, fp, item.id);
    this.dragPreview.set({ pos, valid });
  }

  /**
   * On drag end, commit the move if valid; otherwise the cdkDrag
   * auto-animates the item back to its origin (CSS transition).
   */
  onDragEnd(item: FarmItem, _event: CdkDragEnd): void {
    const preview = this.dragPreview();
    this.dragPreview.set(null);
    if (!preview) return;
    if (preview.valid) {
      this.game.moveItem(item.id, preview.pos);
    }
    // If invalid, do nothing — cdkDrag returns the element to its origin
  }

  // ========================================================================
  // SPRITE URLS
  // ========================================================================

  cropSpriteUrl(cropId: string, stage: CropStage): string {
    return `farm-sprites/crop-${cropId}-${stage}.png`;
  }

  animalSpriteUrl(kind: AnimalKind): string {
    return `farm-sprites/animal-${kind}.png`;
  }

  buildingSpriteUrl(kind: BuildingKind): string {
    return `farm-sprites/building-${kind}.png`;
  }

  decoSpriteUrl(kind: DecorationKind): string {
    return `farm-sprites/deco-${kind}.png`;
  }

  groundTileUrl(): string {
    return 'farm-sprites/plot-tilled.png';
  }

  mascotSpriteUrl(pose: 'idle' | 'action'): string {
    return `farm-sprites/mascot-${pose}.png`;
  }

  // ========================================================================
  // CROP HELPERS
  // ========================================================================

  cropProgress(item: CropItem): number {
    return this.game.cropProgress(item);
  }

  cropStage(item: CropItem): CropStage {
    return this.game.cropStage(item);
  }

  cropReady(item: CropItem): boolean {
    return this.game.cropReady(item);
  }

  cropRemainingMs(item: CropItem): number {
    return this.game.cropRemainingMs(item);
  }

  cropTitle(cropId: string): string {
    return this.i18n.t(CROPS[cropId]?.titleKey ?? '');
  }

  animalTitle(kind: AnimalKind): string {
    return this.i18n.t(ANIMALS[kind].titleKey);
  }

  buildingTitle(kind: BuildingKind): string {
    return this.i18n.t(BUILDINGS[kind].titleKey);
  }

  decoTitle(kind: DecorationKind): string {
    return this.i18n.t(DECORATIONS[kind].titleKey);
  }

  canPlant(cropId: string): boolean {
    const crop = CROPS[cropId];
    if (!crop) return false;
    if (this.level() < crop.unlockLevel) return false;
    return this.gold() >= crop.seedCost;
  }

  // ========================================================================
  // ANIMAL HELPERS
  // ========================================================================

  animalIsProducing(a: AnimalState): boolean {
    return this.game.animalIsProducing(a);
  }

  animalIsProducingById(animalId: string): boolean {
    const a = this.animalsState().find((x) => x.id === animalId);
    return a ? this.game.animalIsProducing(a) : false;
  }

  animalHasProductById(animalId: string): boolean {
    const a = this.animalsState().find((x) => x.id === animalId);
    return a ? this.game.animalHasProduct(a) : false;
  }

  animalMsToProductById(animalId: string): number {
    const a = this.animalsState().find((x) => x.id === animalId);
    return a ? this.game.animalMsToProduct(a) : 0;
  }

  animalProductLabel(resource: 'egg' | 'milk' | 'wool'): string {
    const map = { egg: '🥚', milk: '🥛', wool: '🧶' } as const;
    return map[resource];
  }

  animalCapacityFor(kind: 'coop' | 'barn'): number {
    return this.game.animalCapacityFor(kind);
  }

  animalCountFor(kind: 'coop' | 'barn'): number {
    return this.game.animalCountFor(kind);
  }

  canHouseAnimal(kind: AnimalKind): boolean {
    return this.game.canHouseAnimal(kind);
  }

  buyAnimal(kind: AnimalKind): void {
    this.game.buyAnimal(kind);
  }

  feedAnimal(animalId: string): void {
    this.game.feedAnimal(animalId);
  }

  feedAllAnimals(): void {
    this.game.feedAllAnimals();
  }

  collectAnimal(animalId: string): void {
    this.game.collectAnimal(animalId);
  }

  // ========================================================================
  // BUILDING HELPERS
  // ========================================================================

  upgradeBuilding(item: BuildingItem): void {
    this.game.upgradeBuilding(item);
  }

  buildingUpgradeCost(kind: BuildingKind, currentLevel: number): number {
    return upgradeCost(BUILDINGS[kind], currentLevel);
  }

  // ========================================================================
  // INVENTORY
  // ========================================================================

  readonly inventoryItems = computed<InventoryItem[]>(() => {
    const inv = this.inventory();
    const out: InventoryItem[] = [];
    for (const [key, qty] of Object.entries(inv)) {
      const crop = CROPS[key];
      if (crop) {
        out.push({ key, qty, sellPrice: crop.sellPrice, isCrop: true });
      } else if (key === 'egg' || key === 'milk' || key === 'wool') {
        const prices = { egg: 25, milk: 150, wool: 500 } as const;
        out.push({ key, qty, sellPrice: prices[key], isCrop: false });
      }
    }
    return out.sort((a, b) => b.sellPrice * b.qty - a.sellPrice * a.qty);
  });

  sellItem(key: string): void {
    if (CROPS[key]) this.game.sell(key);
    else this.game.sellProduct(key as 'egg' | 'milk' | 'wool');
  }

  sellAll(): void {
    this.game.sellAll();
  }

  // ========================================================================
  // FEED
  // ========================================================================

  buyFeed(): void { this.game.buyFeed(1); }
  craftFeed(): void { this.game.craftFeed(1); }
  canCraftFeed(): boolean {
    return (this.inventory()['wheat'] ?? 0) >= this.game.feedCraftWheat;
  }

  // ========================================================================
  // QUESTS
  // ========================================================================

  readonly questsVisible = computed<QuestDef[]>(() => {
    return QUESTS.filter((q) => q.unlockLevel <= this.level());
  });

  questProgressFor(questId: string) {
    return this.questProgress()[questId] ?? null;
  }

  claimRepeatable(questId: string): void {
    this.game.claimRepeatable(questId);
  }

  // ========================================================================
  // LEADERBOARD
  // ========================================================================

  refreshLeaderboard(): void {
    void this.leaderboard.loadTopN(50);
  }

  async visitFarm(userId: string): Promise<void> {
    const farm = await this.leaderboard.visitFarm(userId);
    this.visitingFarm.set(farm);
  }

  closeVisit(): void {
    this.visitingFarm.set(null);
  }

  // ========================================================================
  // ONBOARDING
  // ========================================================================

  dismissIntro(): void {
    this.game.dismissIntro();
  }

  // ========================================================================
  // SYNC
  // ========================================================================

  signIn(): void {
    this.sync.signIn();
  }

  async signOut(): Promise<void> {
    await this.sync.signOut();
  }

  async cloudSync(): Promise<void> {
    await this.game.cloudSync();
  }

  reset(): void {
    if (window.confirm(this.i18n.t('playground.farm.reset.confirm'))) {
      this.game.reset();
    }
  }

  // ========================================================================
  // FORMAT HELPERS
  // ========================================================================

  formatRemaining(ms: number): string {
    const s = Math.ceil(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const remS = s % 60;
    if (m < 60) return `${m}m ${remS}s`;
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}h ${remM}m`;
  }

  lastSyncDisplay(): string {
    const iso = this.lastSync();
    if (!iso) return '—';
    try { return new Date(iso).toLocaleTimeString(); } catch { return '—'; }
  }

  // ---- Type guards for templates ----
  isCropItem(i: FarmItem): i is CropItem { return i.kind === 'crop'; }
  isBuildingItem(i: FarmItem): i is BuildingItem { return i.kind === 'building'; }
  isDecorationItem(i: FarmItem): i is DecorationItem { return i.kind === 'decoration'; }

  // ---- Constants for templates ----
  readonly CELL_W = CELL_W;
  readonly CELL_H = CELL_H;
  readonly cellKey = cellKey;
  readonly project = project;
}
