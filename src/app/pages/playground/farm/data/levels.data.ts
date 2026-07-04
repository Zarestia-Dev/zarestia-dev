// ============================================================================
// LEVELS DATA — explicit XP-per-level table.
// ----------------------------------------------------------------------------
// Per spec: "define an explicit XP-per-level table rather than an opaque
// formula". This table is the single source of truth — the LevelingService
// reads from LEVEL_THRESHOLDS directly, no math involved.
//
// Curve shape: linear-plus-multiplier.
//   Each level requires ~(prev + 100 * level) XP cumulative.
//   Level 20 is the v1 cap. Reaching it takes roughly 8-12 hours of mixed
//   active/idle play with the crop rotation meta.
// ============================================================================

export const LEVEL_THRESHOLDS: readonly number[] = [
  // index 0 = Level 1 (start)
  // value  = total XP required to REACH this level
  0,       // L1  — start
  100,     // L2
  250,     // L3
  500,     // L4
  1000,    // L5  — Tier 2 crops unlock
  1750,    // L6
  2750,    // L7
  4000,    // L8
  5500,    // L9
  7500,    // L10
  10000,   // L11
  13000,   // L12 — Tier 3 crops unlock
  16500,   // L13
  20500,   // L14
  25000,   // L15
  30000,   // L16
  35500,   // L17
  41500,   // L18
  48000,   // L19
  55000,   // L20 — Tier 4 crops unlock (cap)
];

export const MAX_LEVEL = LEVEL_THRESHOLDS.length; // 20

/**
 * Returns the player level for a given total XP amount.
 * Levels cap at MAX_LEVEL.
 */
export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, MAX_LEVEL);
}

/**
 * Returns the XP required to advance from the given level to the next.
 * Returns 0 if already at max level.
 */
export function xpToNext(level: number): number {
  if (level >= MAX_LEVEL) return 0;
  return LEVEL_THRESHOLDS[level] - LEVEL_THRESHOLDS[level - 1];
}

/**
 * Returns the XP accumulated so far within the current level.
 */
export function xpProgressInLevel(xp: number, level: number): number {
  if (level >= MAX_LEVEL) return 0;
  const base = LEVEL_THRESHOLDS[level - 1];
  return xp - base;
}

/**
 * Returns the level of the next major unlock (5, 12, or 20), or null if maxed.
 */
export function nextMilestoneLevel(level: number): number | null {
  if (level < 5) return 5;
  if (level < 12) return 12;
  if (level < 20) return 20;
  return null;
}
