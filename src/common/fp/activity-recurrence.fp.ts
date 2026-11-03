/**
 * Pure Functional Activity Recurrence & Priority Engine
 * Strictly pure functions, immutable Date calculations, and zero side-effects.
 */

export type RecurrencePatternType =
  | 'NONE'
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'CUSTOM_DAYS';

export type ActivityPriorityType = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface BaseRewards {
  readonly xpReward: number;
  readonly coinReward: number;
}

/**
 * Pure calculation of the next due date based on recurrence pattern and interval.
 * Returns null if pattern is NONE or not recurrent.
 * Does not mutate baseDate.
 */
export const calculateNextDueDate = (
  baseDate: Date,
  pattern: RecurrencePatternType | string,
  interval: number = 1,
): Date | null => {
  if (!baseDate || pattern === 'NONE') {
    return null;
  }

  const safeInterval = Math.max(1, Math.floor(interval));
  const next = new Date(baseDate.getTime());

  switch (pattern) {
    case 'DAILY':
      next.setUTCDate(next.getUTCDate() + safeInterval);
      return next;

    case 'WEEKLY':
      next.setUTCDate(next.getUTCDate() + safeInterval * 7);
      return next;

    case 'MONTHLY':
      next.setUTCMonth(next.getUTCMonth() + safeInterval);
      return next;

    case 'CUSTOM_DAYS':
      next.setUTCDate(next.getUTCDate() + safeInterval);
      return next;

    default:
      return null;
  }
};

/**
 * Pure evaluation of activity status based on current time and due date.
 * If status is not COMPLETED and dueDate has passed, marks as OVERDUE.
 */
export const evaluateActivityStatus = (
  activity: {
    readonly status: string;
    readonly dueDate?: Date | string | null;
  },
  now: Date = new Date(),
): string => {
  if (activity.status === 'COMPLETED') {
    return 'COMPLETED';
  }

  if (activity.dueDate) {
    const dueTime = new Date(activity.dueDate).getTime();
    if (dueTime < now.getTime()) {
      return 'OVERDUE';
    }
  }

  return activity.status;
};

/**
 * Pure calculation of base rewards for an activity based on its priority level:
 * - LOW: 40 XP, 10 Coins
 * - MEDIUM: 50 XP, 15 Coins
 * - HIGH: 75 XP, 25 Coins
 * - CRITICAL: 100 XP, 40 Coins
 */
export const calculateActivityBaseRewards = (
  priority: ActivityPriorityType | string | null | undefined,
): Readonly<BaseRewards> => {
  const normPriority = (priority || 'MEDIUM').toUpperCase();

  switch (normPriority) {
    case 'LOW':
      return Object.freeze({ xpReward: 40, coinReward: 10 });
    case 'MEDIUM':
      return Object.freeze({ xpReward: 50, coinReward: 15 });
    case 'HIGH':
      return Object.freeze({ xpReward: 75, coinReward: 25 });
    case 'CRITICAL':
      return Object.freeze({ xpReward: 100, coinReward: 40 });
    default:
      return Object.freeze({ xpReward: 50, coinReward: 15 });
  }
};
