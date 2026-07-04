// ============================================================================
// CROP DATA — 10 crops across 4 tiers.
// ----------------------------------------------------------------------------
// Each tier has progressively longer grow times and higher payouts, gated by
// player level. Grow times are in MS and use timestamp-diff for offline
// progress (no interval needed for the actual growth calculation).
//
// Tier 1:  minutes (fast)        — Level 1 (default)
// Tier 2:  tens of minutes       — Level 5
// Tier 3:  ~1 hour               — Level 12
// Tier 4:  multi-hour            — Level 20
//
// All values are deliberately tuned for a soft idle-game curve: a new player
// can reach tier 2 within ~10 minutes of active play, tier 3 within an hour,
// tier 4 within a few hours of mixed active/idle play.
// ============================================================================

export type CropTier = 1 | 2 | 3 | 4;
export type CropStage = 'seed' | 'sprout' | 'growing' | 'ready';

export interface CropDef {
  id: string;
  /** i18n key for the crop's display name. */
  titleKey: string;
  /** i18n key for the short flavor description. */
  descKey: string;
  tier: CropTier;
  /** Player level required to unlock this crop. */
  unlockLevel: number;
  /** Cost in coins to plant one seed. */
  seedCost: number;
  /** Base grow time in milliseconds (before speed upgrades). */
  baseMs: number;
  /** Sell price in coins when harvested. */
  sellPrice: number;
  /** XP awarded on harvest. */
  xp: number;
  /** Footprint on the logical grid — crops are always 1x1. */
  footprint: { w: 1; h: 1 };
  /** Sprite key — maps to /farm-sprites/iso-crop-<id>-<stage>.png. */
  spriteKey: string;
  /** Accent for placeholder CSS / chip styling. */
  accent: 'lime' | 'yellow' | 'orange' | 'red' | 'blue' | 'purple' | 'pink';
}

export const CROPS: Record<string, CropDef> = {
  // ---- Tier 1: minutes (fast) — Level 1 ----
  wheat: {
    id: 'wheat',
    titleKey: 'playground.farm.crop.wheat',
    descKey: 'playground.farm.crop.wheat.desc',
    tier: 1, unlockLevel: 1,
    seedCost: 2, baseMs: 5_000, sellPrice: 8, xp: 1,
    footprint: { w: 1, h: 1 }, spriteKey: 'wheat', accent: 'lime',
  },
  carrot: {
    id: 'carrot',
    titleKey: 'playground.farm.crop.carrot',
    descKey: 'playground.farm.crop.carrot.desc',
    tier: 1, unlockLevel: 1,
    seedCost: 8, baseMs: 20_000, sellPrice: 35, xp: 3,
    footprint: { w: 1, h: 1 }, spriteKey: 'carrot', accent: 'orange',
  },
  tomato: {
    id: 'tomato',
    titleKey: 'playground.farm.crop.tomato',
    descKey: 'playground.farm.crop.tomato.desc',
    tier: 1, unlockLevel: 1,
    seedCost: 20, baseMs: 45_000, sellPrice: 90, xp: 6,
    footprint: { w: 1, h: 1 }, spriteKey: 'tomato', accent: 'red',
  },

  // ---- Tier 2: tens of minutes — Level 5 ----
  corn: {
    id: 'corn',
    titleKey: 'playground.farm.crop.corn',
    descKey: 'playground.farm.crop.corn.desc',
    tier: 2, unlockLevel: 5,
    seedCost: 60, baseMs: 120_000, sellPrice: 240, xp: 14,
    footprint: { w: 1, h: 1 }, spriteKey: 'corn', accent: 'yellow',
  },
  strawberry: {
    id: 'strawberry',
    titleKey: 'playground.farm.crop.strawberry',
    descKey: 'playground.farm.crop.strawberry.desc',
    tier: 2, unlockLevel: 5,
    seedCost: 150, baseMs: 300_000, sellPrice: 650, xp: 28,
    footprint: { w: 1, h: 1 }, spriteKey: 'strawberry', accent: 'pink',
  },

  // ---- Tier 3: ~1hr — Level 12 ----
  pumpkin: {
    id: 'pumpkin',
    titleKey: 'playground.farm.crop.pumpkin',
    descKey: 'playground.farm.crop.pumpkin.desc',
    tier: 3, unlockLevel: 12,
    seedCost: 400, baseMs: 900_000, sellPrice: 2000, xp: 70,
    footprint: { w: 1, h: 1 }, spriteKey: 'pumpkin', accent: 'orange',
  },
  blueberry: {
    id: 'blueberry',
    titleKey: 'playground.farm.crop.blueberry',
    descKey: 'playground.farm.crop.blueberry.desc',
    tier: 3, unlockLevel: 12,
    seedCost: 800, baseMs: 1_800_000, sellPrice: 4500, xp: 130,
    footprint: { w: 1, h: 1 }, spriteKey: 'blueberry', accent: 'blue',
  },

  // ---- Tier 4: multi-hour — Level 20 ----
  sunflower: {
    id: 'sunflower',
    titleKey: 'playground.farm.crop.sunflower',
    descKey: 'playground.farm.crop.sunflower.desc',
    tier: 4, unlockLevel: 20,
    seedCost: 1800, baseMs: 3_600_000, sellPrice: 9500, xp: 260,
    footprint: { w: 1, h: 1 }, spriteKey: 'sunflower', accent: 'yellow',
  },
  melon: {
    id: 'melon',
    titleKey: 'playground.farm.crop.melon',
    descKey: 'playground.farm.crop.melon.desc',
    tier: 4, unlockLevel: 20,
    seedCost: 4500, baseMs: 7_200_000, sellPrice: 24000, xp: 540,
    footprint: { w: 1, h: 1 }, spriteKey: 'melon', accent: 'lime',
  },
  chili: {
    id: 'chili',
    titleKey: 'playground.farm.crop.chili',
    descKey: 'playground.farm.crop.chili.desc',
    tier: 4, unlockLevel: 20,
    seedCost: 10000, baseMs: 14_400_000, sellPrice: 65000, xp: 1200,
    footprint: { w: 1, h: 1 }, spriteKey: 'chili', accent: 'red',
  },
};

export const CROP_IDS = Object.keys(CROPS);

/** Returns all crops available at the given player level. */
export function cropsUnlockedAt(level: number): CropDef[] {
  return CROP_IDS
    .map((id) => CROPS[id])
    .filter((c) => c.unlockLevel <= level);
}

/** Returns the next crop a player will unlock after the given level, if any. */
export function nextUnlockAt(level: number): CropDef | null {
  return CROP_IDS
    .map((id) => CROPS[id])
    .filter((c) => c.unlockLevel > level)
    .sort((a, b) => a.unlockLevel - b.unlockLevel)[0] ?? null;
}

/**
 * Map a growth progress (0..1) to a stage name.
 * Thresholds: 0     → seed
 *             <0.25 → sprout
 *             <0.85 → growing
 *             >=0.85 → ready (visual cue slightly before actual harvestability
 *                      so the player sees the "ready" sprite a moment early)
 */
export function stageForProgress(p: number): CropStage {
  if (p <= 0) return 'seed';
  if (p < 0.25) return 'sprout';
  if (p < 0.85) return 'growing';
  return 'ready';
}
