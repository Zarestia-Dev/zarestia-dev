// ============================================================================
// ANIMAL DATA — 3 animal types, each producing a resource on a timer.
// ----------------------------------------------------------------------------
// Animals live in buildings (Coop for chickens, Barn for cows + sheep).
// They produce on a timer, but need periodic feeding. If unfed for longer
// than `feedGraceMs`, production PAUSES (not decays) until fed again.
//
// Feed is a single shared resource (one "Feed" stack) purchasable from the
// shop or craftable from harvested wheat (5 wheat = 1 feed). This keeps the
// feed loop tied to the crop loop without introducing a separate production
// chain in v1.
// ============================================================================

export type AnimalKind = 'chicken' | 'cow' | 'sheep';

export interface AnimalDef {
  kind: AnimalKind;
  /** i18n key for the animal's display name. */
  titleKey: string;
  /** i18n key for the short description. */
  descKey: string;
  /** Cost in coins to acquire one. */
  cost: number;
  /** Player level required to unlock. */
  unlockLevel: number;
  /** Building type this animal must be housed in. */
  housedIn: 'coop' | 'barn';
  /** Production interval in milliseconds. */
  produceMs: number;
  /** Resource produced (key into inventory). */
  produces: 'egg' | 'milk' | 'wool';
  /** Quantity produced per cycle. */
  produceQty: number;
  /** Sell price per produced unit. */
  sellPrice: number;
  /** XP awarded per production cycle (on collect). */
  xp: number;
  /** How long the animal can go without feeding before production pauses. */
  feedGraceMs: number;
  /** How much feed is consumed per feeding. */
  feedPerVisit: number;
  /** Sprite key — maps to /farm-sprites/animal-<kind>.png. */
  spriteKey: string;
}

export const ANIMALS: Record<AnimalKind, AnimalDef> = {
  chicken: {
    kind: 'chicken',
    titleKey: 'playground.farm.animal.chicken',
    descKey: 'playground.farm.animal.chicken.desc',
    cost: 200, unlockLevel: 4,
    housedIn: 'coop',
    produceMs: 60_000, // 1 min
    produces: 'egg', produceQty: 1, sellPrice: 25, xp: 2,
    feedGraceMs: 30 * 60_000, // 30 min
    feedPerVisit: 1,
    spriteKey: 'chicken',
  },
  cow: {
    kind: 'cow',
    titleKey: 'playground.farm.animal.cow',
    descKey: 'playground.farm.animal.cow.desc',
    cost: 1500, unlockLevel: 8,
    housedIn: 'barn',
    produceMs: 5 * 60_000, // 5 min
    produces: 'milk', produceQty: 1, sellPrice: 150, xp: 8,
    feedGraceMs: 2 * 60 * 60_000, // 2 hours
    feedPerVisit: 2,
    spriteKey: 'cow',
  },
  sheep: {
    kind: 'sheep',
    titleKey: 'playground.farm.animal.sheep',
    descKey: 'playground.farm.animal.sheep.desc',
    cost: 4000, unlockLevel: 14,
    housedIn: 'barn',
    produceMs: 20 * 60_000, // 20 min
    produces: 'wool', produceQty: 1, sellPrice: 500, xp: 22,
    feedGraceMs: 6 * 60 * 60_000, // 6 hours
    feedPerVisit: 3,
    spriteKey: 'sheep',
  },
};

export const ANIMAL_KINDS: AnimalKind[] = ['chicken', 'cow', 'sheep'];

/** Returns all animals available at the given player level. */
export function animalsUnlockedAt(level: number): AnimalDef[] {
  return ANIMAL_KINDS
    .map((k) => ANIMALS[k])
    .filter((a) => a.unlockLevel <= level);
}

/** Sell price lookup for produced resources (used by the sell action). */
export const RESOURCE_SELL_PRICES: Record<'egg' | 'milk' | 'wool', number> = {
  egg: 25,
  milk: 150,
  wool: 500,
};
