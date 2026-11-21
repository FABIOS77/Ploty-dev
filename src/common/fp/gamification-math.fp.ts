/**
 * Pure Mathematical & Business Logic for Gamification & Progress
 * All functions are pure, side-effect free and strictly typed.
 */

import { filter, pipe, reduce } from './fp-utils';

export interface ActivityProgressItem {
  readonly status: string;
  readonly type?: string;
  readonly logs?: readonly unknown[];
  readonly completionLogs?: readonly unknown[];
  readonly _count?: { readonly logs?: number };
  readonly completedCount?: number;
  readonly executionCount?: number;
  readonly lastCompletedAt?: Date | string | null;
}

/**
 * Pure check for whether an activity counts as completed in project progress.
 * SINGLE activities require status === 'COMPLETED'.
 * RECURRING activities return to PENDING after each cycle, so they count as completed
 * for the current cycle when at least one execution log/count is recorded.
 */
export const isActivityEffectivelyCompleted = (
  activity: ActivityProgressItem,
): boolean => {
  if (activity.status === 'COMPLETED') {
    return true;
  }
  if (activity.type === 'RECURRING') {
    const logCount =
      activity.logs?.length ??
      activity.completionLogs?.length ??
      activity._count?.logs ??
      activity.completedCount ??
      activity.executionCount ??
      0;
    return logCount > 0 || activity.lastCompletedAt != null;
  }
  return false;
};

/**
 * Pure anti-cheat reward ceilings per priority
 * LOW <= 50 XP, MEDIUM <= 100 XP, HIGH <= 200 XP, CRITICAL <= 350 XP
 */
export const PRIORITY_REWARD_CEILINGS: Readonly<
  Record<
    string,
    Readonly<{ maxXp: number; maxCoins: number; defaultXp: number; defaultCoins: number }>
  >
> = Object.freeze({
  LOW: Object.freeze({ maxXp: 50, maxCoins: 30, defaultXp: 25, defaultCoins: 10 }),
  MEDIUM: Object.freeze({ maxXp: 100, maxCoins: 60, defaultXp: 50, defaultCoins: 15 }),
  HIGH: Object.freeze({ maxXp: 200, maxCoins: 120, defaultXp: 75, defaultCoins: 25 }),
  CRITICAL: Object.freeze({ maxXp: 350, maxCoins: 250, defaultXp: 120, defaultCoins: 40 }),
});

export const resolveSafeActivityRewards = (
  priority: string = 'MEDIUM',
  requestedXp?: number,
  requestedCoins?: number,
): Readonly<{ xpReward: number; coinReward: number }> => {
  const limits =
    PRIORITY_REWARD_CEILINGS[priority] || PRIORITY_REWARD_CEILINGS.MEDIUM;
  const rawXp = requestedXp !== undefined ? requestedXp : limits.defaultXp;
  const rawCoins =
    requestedCoins !== undefined ? requestedCoins : limits.defaultCoins;

  const xpReward = Math.max(0, Math.min(Math.floor(rawXp), limits.maxXp, 500));
  const coinReward = Math.max(
    0,
    Math.min(Math.floor(rawCoins), limits.maxCoins, 250),
  );

  return Object.freeze({ xpReward, coinReward });
};

export interface GamificationProfileStats {
  readonly xp: number;
  readonly level: number;
  readonly nextLevelXp: number;
  readonly currentLevelBaseXp: number;
  readonly progressToNextLevelPercent: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly coins: number;
}

/**
 * Pure calculation of user Level from XP:
 * Level(XP) = floor(1 + sqrt(XP / 100))
 * Safe for negative inputs (floors to 1 minimum).
 */
export const calculateLevel = (xp: number): number => {
  const safeXp = Math.max(0, xp);
  return Math.floor(1 + Math.sqrt(safeXp / 100));
};

/**
 * Pure calculation of required XP for a given level:
 * XP_siguiente(nivel) = 100 * nivel^2
 * Level 1 requires 100 XP to reach Level 2.
 * Level 2 requires 400 XP to reach Level 3, etc.
 */
export const calculateNextLevelXp = (level: number): number => {
  const safeLevel = Math.max(1, Math.floor(level));
  return 100 * Math.pow(safeLevel, 2);
};

/**
 * Pure calculation of base XP at which the current level was reached:
 * For level L = 1, base XP is 0.
 * For level L > 1, base XP is 100 * (L - 1)^2.
 */
export const calculateCurrentLevelBaseXp = (level: number): number => {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel <= 1) return 0;
  return 100 * Math.pow(safeLevel - 1, 2);
};

/**
 * Pure calculation of the progress percentage towards the next level [0 - 100].
 */
export const calculateLevelProgressPercent = (xp: number): number => {
  const safeXp = Math.max(0, xp);
  const currentLevel = calculateLevel(safeXp);
  const baseXp = calculateCurrentLevelBaseXp(currentLevel);
  const nextXp = calculateNextLevelXp(currentLevel);
  const range = nextXp - baseXp;

  if (range <= 0) return 0;
  const progressRatio = (safeXp - baseXp) / range;
  const clampedRatio = Math.min(Math.max(progressRatio, 0), 1);
  return Math.round(clampedRatio * 100);
};

/**
 * Pure computation of complete gamification stats for a user.
 */
export const computeGamificationStats = (
  rawXp: number,
  currentStreak: number = 0,
  longestStreak: number = 0,
  coins: number = 0,
): Readonly<GamificationProfileStats> => {
  const xp = Math.max(0, rawXp);
  const level = calculateLevel(xp);
  const nextLevelXp = calculateNextLevelXp(level);
  const currentLevelBaseXp = calculateCurrentLevelBaseXp(level);
  const progressToNextLevelPercent = calculateLevelProgressPercent(xp);

  return Object.freeze({
    xp,
    level,
    nextLevelXp,
    currentLevelBaseXp,
    progressToNextLevelPercent,
    currentStreak: Math.max(0, currentStreak),
    longestStreak: Math.max(0, longestStreak),
    coins: Math.max(0, coins),
  });
};

/**
 * Pure calculation of project progress percentage based on an immutable list of activities:
 * Progress(%) = round((Completed Activities / Total Activities) * 100)
 * Returns 0 if there are no activities.
 */
export const calculateProjectProgress = (
  activities: readonly ActivityProgressItem[],
): number => {
  if (!activities || activities.length === 0) {
    return 0;
  }

  const completedCount = pipe(
    activities,
    filter(isActivityEffectivelyCompleted),
    (completed) => completed.length,
  );

  return Math.round((completedCount / activities.length) * 100);
};

/**
 * Pure summary calculation for project activities: total, completed, pending, and progress %.
 */
export interface ProjectActivitySummary {
  readonly total: number;
  readonly totalCount: number;
  readonly completed: number;
  readonly pending: number;
  readonly inProgress: number;
  readonly overdue: number;
  readonly progressPercent: number;
}

export const computeProjectSummary = (
  activities: readonly ActivityProgressItem[],
): Readonly<ProjectActivitySummary> => {
  const total = activities.length;
  if (total === 0) {
    return Object.freeze({
      total: 0,
      totalCount: 0,
      completed: 0,
      pending: 0,
      inProgress: 0,
      overdue: 0,
      progressPercent: 0,
    });
  }

  const counts = reduce(
    (acc: Record<string, number>, curr: ActivityProgressItem) => {
      const status = curr.status;
      return {
        ...acc,
        [status]: (acc[status] || 0) + 1,
      };
    },
    {} as Record<string, number>,
  )(activities);

  const completed = pipe(
    activities,
    filter(isActivityEffectivelyCompleted),
    (arr) => arr.length,
  );
  const inProgress = counts['IN_PROGRESS'] || 0;
  const overdue = counts['OVERDUE'] || 0;
  const pending = counts['PENDING'] || 0;
  const progressPercent = Math.round((completed / total) * 100);

  return Object.freeze({
    total,
    totalCount: total,
    completed,
    pending,
    inProgress,
    overdue,
    progressPercent,
  });
};

/**
 * Pure role authorization checks
 */
export type ValidProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export const canManageProjectMembers = (
  role: string | null | undefined,
): boolean => role === 'OWNER' || role === 'ADMIN';

export const isProjectOwner = (role: string | null | undefined): boolean =>
  role === 'OWNER';

/**
 * Pure text sanitization for search inputs (username/email)
 */
export const sanitizeSearchTerm = (rawTerm: string | null | undefined): string => {
  if (!rawTerm) return '';
  return rawTerm
    .trim()
    .toLowerCase()
    .replace(/[^\w@.-]/gi, '');
};

/**
 * Pure formatting of user entity into a clean gamified profile
 */
export interface UserEntityInput {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly avatarUrl?: string | null;
  readonly xp: number;
  readonly level?: number;
  readonly currentStreak?: number;
  readonly longestStreak?: number;
  readonly coins?: number;
  readonly equippedThemeId?: string | null;
  readonly equippedMedalId?: string | null;
  readonly equippedFrameId?: string | null;
  readonly equippedTitleId?: string | null;
  readonly equippedTheme?: any;
  readonly equippedMedal?: any;
  readonly equippedFrame?: any;
  readonly equippedTitle?: any;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const formatUserProfile = (user: UserEntityInput) => {
  const stats = computeGamificationStats(
    user.xp,
    user.currentStreak ?? 0,
    user.longestStreak ?? 0,
    user.coins ?? 0,
  );

  return Object.freeze({
    id: user.id,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl ?? null,
    // Root level stats for direct frontend access
    xp: stats.xp,
    level: stats.level,
    coins: stats.coins,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    nextLevelXp: stats.nextLevelXp,
    currentLevelBaseXp: stats.currentLevelBaseXp,
    progressToNextLevelPercent: stats.progressToNextLevelPercent,
    // Nested stats for backward-compatibility
    stats,
    equippedThemeId: user.equippedThemeId ?? user.equippedTheme?.id ?? null,
    equippedMedalId: user.equippedMedalId ?? user.equippedMedal?.id ?? null,
    equippedFrameId: user.equippedFrameId ?? user.equippedFrame?.id ?? null,
    equippedTitleId: user.equippedTitleId ?? user.equippedTitle?.id ?? null,
    equippedTheme: user.equippedTheme ?? null,
    equippedMedal: user.equippedMedal ?? null,
    equippedFrame: user.equippedFrame ?? null,
    equippedTitle: user.equippedTitle ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
};
