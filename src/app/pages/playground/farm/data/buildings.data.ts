// ============================================================================
// BUILDING DATA — 4 building types: silo, coop, barn, market.
// ----------------------------------------------------------------------------
// Buildings occupy grid slots (separate from crop plots) and provide:
//   - Silo:  increases crop inventory cap (default 50, +25 per level)
//   - Coop:  houses chickens (4 at L1, +2 per level)
//   - Barn:  houses cows + sheep (4 at L1, +2 per level)
//   - Market: enables instant-sell UI from the inventory panel (no travel)
//
// Buildings are upgradable. Each upgrade multiplies cost by 1.8x.
// ============================================================================

export type BuildingKind = 'silo' | 'coop' | 'barn' | 'market';

export interface BuildingDef {
  kind: BuildingKind;
  /** i18n key for the building's display name. */
  titleKey: string;
  /** i18n key for the short description. */
  descKey: string;
  /** Cost in coins to construct one (level 1). */
  baseCost: number;
  /** Player level required to unlock. */
  unlockLevel: number;
  /** Cost multiplier per upgrade level. */
  costMult: number;
  /** Footprint on the logical grid (in cells). */
  footprint: { w: number; h: number };
  /** Sprite key — maps to /farm-sprites/iso-building-<kind>.png. */
  spriteKey: string;
}

export const BUILDINGS: Record<BuildingKind, BuildingDef> = {
  silo: {
    kind: 'silo',
    titleKey: 'playground.farm.building.silo',
    descKey: 'playground.farm.building.silo.desc',
    baseCost: 500, unlockLevel: 3,
    costMult: 1.8,
    footprint: { w: 1, h: 1 },
    spriteKey: 'silo',
  },
  coop: {
    kind: 'coop',
    titleKey: 'playground.farm.building.coop',
    descKey: 'playground.farm.building.coop.desc',
    baseCost: 800, unlockLevel: 4,
    costMult: 1.8,
    footprint: { w: 2, h: 2 },
    spriteKey: 'coop',
  },
  barn: {
    kind: 'barn',
    titleKey: 'playground.farm.building.barn',
    descKey: 'playground.farm.building.barn.desc',
    baseCost: 2500, unlockLevel: 8,
    costMult: 1.9,
    footprint: { w: 2, h: 2 },
    spriteKey: 'barn',
  },
  market: {
    kind: 'market',
    titleKey: 'playground.farm.building.market',
    descKey: 'playground.farm.building.market.desc',
    baseCost: 1500, unlockLevel: 6,
    costMult: 1.7,
    footprint: { w: 2, h: 2 },
    spriteKey: 'market',
  },
};

export const BUILDING_KINDS: BuildingKind[] = ['silo', 'coop', 'barn', 'market'];

/** Returns the upgrade cost for a building at its current level (→ next level). */
export function upgradeCost(def: BuildingDef, currentLevel: number): number {
  return Math.round(def.baseCost * Math.pow(def.costMult, currentLevel - 1));
}

/** Returns the initial cost to construct a new building of this kind. */
export function constructCost(def: BuildingDef): number {
  return def.baseCost;
}

// ---- Effect helpers (how each building affects game state) ----

/** Crop inventory cap at a given silo level (no silo = 50, +25 per level). */
export function siloCapacity(siloLevel: number): number {
  return 50 + 25 * siloLevel;
}

/** Animal capacity for a coop/barn at a given level. */
export function animalCapacity(kind: 'coop' | 'barn', level: number): number {
  const base = kind === 'coop' ? 4 : 4;
  return base + 2 * (level - 1);
}

/** Whether the player has unlocked the instant-sell UI. */
export function hasMarket(marketLevel: number): boolean {
  return marketLevel > 0;
}
