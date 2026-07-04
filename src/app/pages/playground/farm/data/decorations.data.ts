// ============================================================================
// DECORATION DATA — purely cosmetic items placeable on the farm grid.
// ----------------------------------------------------------------------------
// Per spec: "Contribute to a simple 'charm' score, cosmetic only, no
// mechanical effect on production — avoids balance complexity."
//
// Each decoration has a fixed charm value. Total charm = sum across all
// placed decorations. The charm score is displayed in the stats panel
// and on the leaderboard (cosmetic-only tiebreaker feel).
// ============================================================================

export type DecorationKind =
  | 'fence'
  | 'lantern'
  | 'scarecrow'
  | 'flowerbed'
  | 'windvane'
  | 'path';

export interface DecorationDef {
  kind: DecorationKind;
  /** i18n key for the decoration's display name. */
  titleKey: string;
  /** i18n key for the short description. */
  descKey: string;
  cost: number;
  /** Charm points contributed to the farm's total charm score. */
  charm: number;
  /** Player level required to unlock. */
  unlockLevel: number;
  /** Footprint on the logical grid (in cells). */
  footprint: { w: number; h: number };
  /** Sprite key — maps to /farm-sprites/iso-deco-<kind>.png. */
  spriteKey: string;
}

export const DECORATIONS: Record<DecorationKind, DecorationDef> = {
  fence: {
    kind: 'fence',
    titleKey: 'playground.farm.deco.fence',
    descKey: 'playground.farm.deco.fence.desc',
    cost: 50, charm: 1, unlockLevel: 2,
    footprint: { w: 1, h: 1 },
    spriteKey: 'fence',
  },
  path: {
    kind: 'path',
    titleKey: 'playground.farm.deco.path',
    descKey: 'playground.farm.deco.path.desc',
    cost: 100, charm: 2, unlockLevel: 2,
    footprint: { w: 1, h: 1 },
    spriteKey: 'path',
  },
  lantern: {
    kind: 'lantern',
    titleKey: 'playground.farm.deco.lantern',
    descKey: 'playground.farm.deco.lantern.desc',
    cost: 200, charm: 4, unlockLevel: 4,
    footprint: { w: 1, h: 1 },
    spriteKey: 'lantern',
  },
  flowerbed: {
    kind: 'flowerbed',
    titleKey: 'playground.farm.deco.flowerbed',
    descKey: 'playground.farm.deco.flowerbed.desc',
    cost: 350, charm: 7, unlockLevel: 6,
    footprint: { w: 1, h: 1 },
    spriteKey: 'flowerbed',
  },
  scarecrow: {
    kind: 'scarecrow',
    titleKey: 'playground.farm.deco.scarecrow',
    descKey: 'playground.farm.deco.scarecrow.desc',
    cost: 750, charm: 12, unlockLevel: 8,
    footprint: { w: 1, h: 1 },
    spriteKey: 'scarecrow',
  },
  windvane: {
    kind: 'windvane',
    titleKey: 'playground.farm.deco.windvane',
    descKey: 'playground.farm.deco.windvane.desc',
    cost: 2000, charm: 25, unlockLevel: 12,
    footprint: { w: 1, h: 1 },
    spriteKey: 'windvane',
  },
};

export const DECORATION_KINDS: DecorationKind[] = [
  'fence', 'path', 'lantern', 'flowerbed', 'scarecrow', 'windvane',
];

/** Returns all decorations available at the given player level. */
export function decorationsUnlockedAt(level: number): DecorationDef[] {
  return DECORATION_KINDS
    .map((k) => DECORATIONS[k])
    .filter((d) => d.unlockLevel <= level);
}
