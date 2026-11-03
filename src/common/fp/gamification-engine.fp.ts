/**
 * Pure Functional Gamification Engine
 * Streaks, XP multipliers, auto-unlock evaluation, and shop validation.
 */

import { Result, err, ok } from './fp-utils';

export interface StreakEvaluationResult {
  readonly newStreak: number;
  readonly newLongestStreak: number;
  readonly streakUpdated: boolean;
  readonly streakBonusApplied: boolean;
}

export interface CompletionRewardsResult {
  readonly xpEarned: number;
  readonly coinsEarned: number;
  readonly streakBonusMultiplier: number;
  readonly streakBonusApplied: boolean;
}

export interface UserStatsForUnlocks {
  readonly level: number;
  readonly currentStreak: number;
  readonly totalCompletedActivities: number;
  readonly teamActivitiesCompleted?: number;
}

export interface GamificationCatalogItem {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly type: string;
  readonly unlockLevel: number;
  readonly costCoins: number;
  readonly metadata?: any;
}

/**
 * Pure date helper: converts Date to UTC YYYY-MM-DD
 */
export const toUtcDayString = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Pure evaluation of daily streak:
 * - If last completion was today: streak is maintained, bonus applies if streak >= 2.
 * - If last completion was yesterday: streak increments by 1.
 * - If last completion was > 1 day ago or null: resets streak to 1.
 */
export const evaluateStreak = (
  currentStreak: number,
  longestStreak: number,
  lastCompletedAt: Date | string | null,
  now: Date = new Date(),
): Readonly<StreakEvaluationResult> => {
  if (!lastCompletedAt) {
    const newStreak = 1;
    return Object.freeze({
      newStreak,
      newLongestStreak: Math.max(longestStreak, newStreak),
      streakUpdated: true,
      streakBonusApplied: false,
    });
  }

  const lastDate = new Date(lastCompletedAt);
  const nowDayStr = toUtcDayString(now);
  const lastDayStr = toUtcDayString(lastDate);

  // If completed today
  if (nowDayStr === lastDayStr) {
    const safeStreak = Math.max(1, currentStreak);
    return Object.freeze({
      newStreak: safeStreak,
      newLongestStreak: Math.max(longestStreak, safeStreak),
      streakUpdated: false,
      streakBonusApplied: safeStreak >= 2,
    });
  }

  // Calculate day difference using UTC midnight timestamps
  const nowUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const lastUtcMidnight = Date.UTC(
    lastDate.getUTCFullYear(),
    lastDate.getUTCMonth(),
    lastDate.getUTCDate(),
  );

  const diffDays = Math.round(
    (nowUtcMidnight - lastUtcMidnight) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 1) {
    // Completed yesterday -> increment streak
    const newStreak = Math.max(0, currentStreak) + 1;
    return Object.freeze({
      newStreak,
      newLongestStreak: Math.max(longestStreak, newStreak),
      streakUpdated: true,
      streakBonusApplied: true,
    });
  }

  // Inactive for more than 1 day -> reset streak to 1
  const resetStreak = 1;
  return Object.freeze({
    newStreak: resetStreak,
    newLongestStreak: Math.max(longestStreak, resetStreak),
    streakUpdated: true,
    streakBonusApplied: false,
  });
};

/**
 * Pure calculation of final rewards with streak bonus multiplier:
 * Multiplier = 1 + min(streak * 0.05, 0.50)
 * xpEarned = round(baseXp * Multiplier)
 * coinsEarned = round(baseCoins * Multiplier)
 */
export const computeCompletionRewards = (
  baseXp: number,
  baseCoins: number,
  currentStreak: number,
): Readonly<CompletionRewardsResult> => {
  const safeStreak = Math.max(0, currentStreak);
  const streakBonus = Math.min(safeStreak * 0.05, 0.5);
  const multiplier = Number((1 + streakBonus).toFixed(2));

  const xpEarned = Math.round(baseXp * multiplier);
  const coinsEarned = Math.round(baseCoins * multiplier);
  const streakBonusApplied = safeStreak >= 2;

  return Object.freeze({
    xpEarned,
    coinsEarned,
    streakBonusMultiplier: multiplier,
    streakBonusApplied,
  });
};

/**
 * Pure evaluator for automatic unlocking of medals based on player accomplishments.
 * Checks criteria against unobtained catalog items.
 */
export const evaluateAutoUnlocks = (
  stats: UserStatsForUnlocks,
  catalog: readonly GamificationCatalogItem[],
  currentUnlockedItemIds: readonly string[],
): readonly GamificationCatalogItem[] => {
  const unlockedIdSet = new Set(currentUnlockedItemIds);

  const candidateItems = catalog.filter((item) => !unlockedIdSet.has(item.id));

  const newlyUnlocked = candidateItems.filter((item) => {
    switch (item.code) {
      case 'MEDAL_FIRST_BLOOD':
        return stats.totalCompletedActivities >= 1;

      case 'MEDAL_STREAK_3':
        return stats.currentStreak >= 3;

      case 'MEDAL_STREAK_7':
        return stats.currentStreak >= 7;

      case 'MEDAL_CENTURION':
        return stats.level >= 3 || stats.totalCompletedActivities >= 10;

      default:
        return false;
    }
  });

  return Object.freeze(newlyUnlocked);
};

/**
 * Pure validator for shop purchases returning a Result (Either).
 */
export const canPurchaseItem = (
  user: { readonly level: number; readonly coins: number },
  item: { readonly id: string; readonly unlockLevel: number; readonly costCoins: number },
  unlockedItemIds: readonly string[],
): Result<{ readonly remainingCoins: number }, string> => {
  if (unlockedItemIds.includes(item.id)) {
    return err('Item is already unlocked by user');
  }

  if (user.level < item.unlockLevel) {
    return err(
      `Level ${item.unlockLevel} is required to unlock this item (current level: ${user.level})`,
    );
  }

  if (user.coins < item.costCoins) {
    return err(
      `Insufficient coins: required ${item.costCoins}, but user has ${user.coins}`,
    );
  }

  return ok({
    remainingCoins: user.coins - item.costCoins,
  });
};
