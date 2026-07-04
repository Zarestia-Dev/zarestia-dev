// ============================================================================
// QUEST DATA — one-time + repeatable quests.
// ----------------------------------------------------------------------------
// Quests are the player's structured progression path. One-time quests guide
// the player through core mechanics (plant, build, expand). Repeatable quests
// give long-term goals (harvest N of crop, earn N coins, feed animals N times).
//
// Quest condition types:
//   - 'plant'        — plant N of a specific crop (or any crop)
//   - 'harvest'      — harvest N of a specific crop (or any crop)
//   - 'collect'      — collect N animal products
//   - 'feed'         — feed animals N times
//   - 'earn'         — earn N coins total (cumulative)
//   - 'build'        — construct N buildings of a given kind
//   - 'level'        — reach player level N
//   - 'charm'        — reach total charm N
//
// Each quest's progress is tracked by the QuestService based on event emissions
// from the FarmGameService. See `matchEvent()` below for the event shape.
// ============================================================================

export type QuestType = 'one-time' | 'repeatable';

export type QuestConditionKind =
  | 'plant'
  | 'harvest'
  | 'collect'
  | 'feed'
  | 'earn'
  | 'build'
  | 'level'
  | 'charm';

export interface QuestCondition {
  kind: QuestConditionKind;
  /** Optional subject filter (e.g. cropId, animalKind, buildingKind). */
  subject?: string;
  /** Target count to complete. */
  target: number;
}

export interface QuestDef {
  id: string;
  /** i18n key for the quest's display title. */
  titleKey: string;
  /** i18n key for the description shown to the player. */
  descKey: string;
  type: QuestType;
  condition: QuestCondition;
  /** Coin reward on completion. */
  rewardCoins: number;
  /** XP reward on completion. */
  rewardXp: number;
  /** Player level required to be visible. */
  unlockLevel: number;
  /** For repeatable quests, the cooldown in ms before re-completion (0 = no cooldown). */
  cooldownMs?: number;
}

export const QUESTS: QuestDef[] = [
  // ---- One-time: tutorial arc ----
  {
    id: 'first-plant',
    titleKey: 'playground.farm.quest.first-plant.title',
    descKey: 'playground.farm.quest.first-plant.desc',
    type: 'one-time',
    condition: { kind: 'plant', target: 1 },
    rewardCoins: 25, rewardXp: 5, unlockLevel: 1,
  },
  {
    id: 'first-harvest',
    titleKey: 'playground.farm.quest.first-harvest.title',
    descKey: 'playground.farm.quest.first-harvest.desc',
    type: 'one-time',
    condition: { kind: 'harvest', target: 1 },
    rewardCoins: 50, rewardXp: 10, unlockLevel: 1,
  },
  {
    id: 'first-silo',
    titleKey: 'playground.farm.quest.first-silo.title',
    descKey: 'playground.farm.quest.first-silo.desc',
    type: 'one-time',
    condition: { kind: 'build', subject: 'silo', target: 1 },
    rewardCoins: 100, rewardXp: 25, unlockLevel: 3,
  },
  {
    id: 'first-coop',
    titleKey: 'playground.farm.quest.first-coop.title',
    descKey: 'playground.farm.quest.first-coop.desc',
    type: 'one-time',
    condition: { kind: 'build', subject: 'coop', target: 1 },
    rewardCoins: 200, rewardXp: 40, unlockLevel: 4,
  },
  {
    id: 'first-barn',
    titleKey: 'playground.farm.quest.first-barn.title',
    descKey: 'playground.farm.quest.first-barn.desc',
    type: 'one-time',
    condition: { kind: 'build', subject: 'barn', target: 1 },
    rewardCoins: 500, rewardXp: 80, unlockLevel: 8,
  },
  {
    id: 'level-5',
    titleKey: 'playground.farm.quest.level-5.title',
    descKey: 'playground.farm.quest.level-5.desc',
    type: 'one-time',
    condition: { kind: 'level', target: 5 },
    rewardCoins: 300, rewardXp: 0, unlockLevel: 1,
  },
  {
    id: 'level-12',
    titleKey: 'playground.farm.quest.level-12.title',
    descKey: 'playground.farm.quest.level-12.desc',
    type: 'one-time',
    condition: { kind: 'level', target: 12 },
    rewardCoins: 1500, rewardXp: 0, unlockLevel: 5,
  },
  {
    id: 'level-20',
    titleKey: 'playground.farm.quest.level-20.title',
    descKey: 'playground.farm.quest.level-20.desc',
    type: 'one-time',
    condition: { kind: 'level', target: 20 },
    rewardCoins: 5000, rewardXp: 0, unlockLevel: 12,
  },

  // ---- Repeatable: rotating crop quests ----
  {
    id: 'rep-harvest-wheat-5',
    titleKey: 'playground.farm.quest.rep-harvest-wheat-5.title',
    descKey: 'playground.farm.quest.rep-harvest-wheat-5.desc',
    type: 'repeatable',
    condition: { kind: 'harvest', subject: 'wheat', target: 5 },
    rewardCoins: 30, rewardXp: 5, unlockLevel: 1,
    cooldownMs: 0,
  },
  {
    id: 'rep-harvest-carrot-5',
    titleKey: 'playground.farm.quest.rep-harvest-carrot-5.title',
    descKey: 'playground.farm.quest.rep-harvest-carrot-5.desc',
    type: 'repeatable',
    condition: { kind: 'harvest', subject: 'carrot', target: 5 },
    rewardCoins: 100, rewardXp: 12, unlockLevel: 1,
    cooldownMs: 0,
  },
  {
    id: 'rep-earn-1000',
    titleKey: 'playground.farm.quest.rep-earn-1000.title',
    descKey: 'playground.farm.quest.rep-earn-1000.desc',
    type: 'repeatable',
    condition: { kind: 'earn', target: 1000 },
    rewardCoins: 200, rewardXp: 30, unlockLevel: 3,
    cooldownMs: 0,
  },
  {
    id: 'rep-feed-3',
    titleKey: 'playground.farm.quest.rep-feed-3.title',
    descKey: 'playground.farm.quest.rep-feed-3.desc',
    type: 'repeatable',
    condition: { kind: 'feed', target: 3 },
    rewardCoins: 150, rewardXp: 20, unlockLevel: 4,
    cooldownMs: 0,
  },
  {
    id: 'rep-collect-10',
    titleKey: 'playground.farm.quest.rep-collect-10.title',
    descKey: 'playground.farm.quest.rep-collect-10.desc',
    type: 'repeatable',
    condition: { kind: 'collect', target: 10 },
    rewardCoins: 250, rewardXp: 35, unlockLevel: 4,
    cooldownMs: 0,
  },
];

/** Returns all quests visible at the given player level. */
export function questsUnlockedAt(level: number): QuestDef[] {
  return QUESTS.filter((q) => q.unlockLevel <= level);
}

// ---- Event matching ----
//
// QuestService emits events as the player takes actions. This helper checks
// whether a given event matches a quest condition (and contributes progress).

export interface QuestEvent {
  kind: QuestConditionKind;
  subject?: string;
  amount: number;
}

export function matchesCondition(condition: QuestCondition, event: QuestEvent): boolean {
  if (condition.kind !== event.kind) return false;
  if (condition.subject && condition.subject !== event.subject) return false;
  return true;
}
