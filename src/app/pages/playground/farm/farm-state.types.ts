// ============================================================================
// FARM GAME STATE — v3 data model with free-placement isometric grid.
// ----------------------------------------------------------------------------
// Every placeable thing (crop plot, building, animal enclosure, decoration)
// lives in a single `items` array with a logical {row, col} position and a
// footprint. The isometric view is a pure projection layer over this model.
//
// No mock data anywhere. A new player starts with zero items placed and a
// small starting balance — onboarding nudges them to place their first plot.
// ============================================================================

import { AnimalKind } from './data/animals.data';
import { BuildingKind } from './data/buildings.data';
import { DecorationKind } from './data/decorations.data';

// ---- Placeable items ----

export type ItemKind = 'crop' | 'building' | 'decoration';

/**
 * Base shape shared by every placeable item.
 * The {row, col} position is the TOP-LEFT corner of the item's footprint.
 */
export interface PlaceableItem {
  /** Unique instance id (uuid-ish). */
  id: string;
  kind: ItemKind;
  /** Top-left corner of the footprint on the logical grid. */
  row: number;
  col: number;
}

export interface CropItem extends PlaceableItem {
  kind: 'crop';
  /** Crop id, or null when nothing is planted. */
  cropId: string | null;
  /** Timestamp (ms) when the current crop was planted. */
  plantedAt: number;
}

export interface BuildingItem extends PlaceableItem {
  kind: 'building';
  buildingKind: BuildingKind;
  level: number;
}

export interface DecorationItem extends PlaceableItem {
  kind: 'decoration';
  decorationKind: DecorationKind;
}

export type FarmItem = CropItem | BuildingItem | DecorationItem;

// ---- Animals (live in buildings, not on the grid) ----

export interface AnimalState {
  id: string;
  kind: AnimalKind;
  /** Building instance id the animal is housed in. */
  housedIn: string;
  lastFedAt: number;
  lastCollectedAt: number;
}

// ---- Quests ----

export interface QuestProgress {
  questId: string;
  progress: number;
  completed: boolean;
  completedAt: number | null;
  timesCompleted: number;
}

// ---- Stats ----

export interface FarmStats {
  totalPlanted: number;
  totalHarvested: number;
  totalCollected: number;
  totalFed: number;
  totalEarned: number;
  startedAt: number;
}

// ---- Inventory ----

/**
 * Inventory: cropId → count of harvested (unsold) crops.
 * Animal products (egg/milk/wool) stored under those keys.
 * Feed is stored under 'feed'.
 */
export type InventoryMap = Record<string, number>;

// ---- Onboarding ----

/**
 * Onboarding flags — drive tutorial nudges for first-time players.
 * NO demo data is shown; these flags just control which nudge appears next.
 */
export interface OnboardingState {
  hasPlacedFirstPlot: boolean;
  hasPlantedFirstCrop: boolean;
  hasHarvestedFirstCrop: boolean;
  hasBuiltFirstBuilding: boolean;
  hasBoughtFirstAnimal: boolean;
  hasDismissedIntro: boolean;
}

// ---- Top-level save data ----

export interface FarmSaveData {
  version: 3;                // v3 = free-placement iso grid model
  gold: number;
  xp: number;
  items: FarmItem[];         // all placeable items on the grid
  animals: AnimalState[];
  inventory: InventoryMap;
  feed: number;
  questProgress: Record<string, QuestProgress>;
  stats: FarmStats;
  onboarding: OnboardingState;
  savedAt: number;
}

export const SAVE_VERSION = 3 as const;

// ---- Grid constants ----

/**
 * Logical grid dimensions. The isometric view projects this 2D grid onto the
 * screen. Players can place items anywhere within these bounds.
 */
export const GRID_ROWS = 12;
export const GRID_COLS = 12;

/**
 * Starting state for a brand-new player.
 * NO mock data — zero items, just a small starting balance so they can
 * afford their first wheat plot + a few seeds.
 */
export const STARTING_GOLD = 50;
export const STARTING_FEED = 5;

/**
 * Footprint sizes per item kind. Crops are always 1x1; buildings vary;
 * decorations are typically 1x1 (some larger).
 * These are read from the data files via `footprintFor()`.
 */
export interface Footprint {
  w: number;
  h: number;
}
