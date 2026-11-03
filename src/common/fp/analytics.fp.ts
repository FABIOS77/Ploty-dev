/**
 * Pure Functional Analytics & Reporting Engine for Ploty
 * Built exclusively using functional pipelines (pipe, map, filter, reduce, groupBy)
 * Ready to power visual charts (Donut, Stacked Bars, Area/Line Series, Tables).
 */

import { filter, groupBy, map, pipe, reduce } from './fp-utils';
import { toUtcDayString } from './gamification-engine.fp';

export interface ActivityAnalyticsInput {
  readonly id: string;
  readonly title?: string;
  readonly type: string;
  readonly status: string;
  readonly priority: string;
  readonly xpReward?: number;
  readonly coinReward?: number;
  readonly logs?: readonly ActivityLogAnalyticsInput[];
}

export interface ActivityLogAnalyticsInput {
  readonly id: string;
  readonly activityId: string;
  readonly userId: string;
  readonly completedAt: Date | string;
  readonly xpEarned: number;
  readonly coinsEarned: number;
  readonly activity?: {
    readonly type?: string;
  };
}

export interface TeamMemberAnalyticsInput {
  readonly id: string;
  readonly userId: string;
  readonly role: string;
  readonly user: {
    readonly id: string;
    readonly username: string;
    readonly email: string;
    readonly avatarUrl: string | null;
  };
}

/**
 * 1. buildStatusDistribution
 * Returns count and percentage per status for Donut / Pie charts.
 */
export interface StatusDistributionItem {
  readonly status: string;
  readonly count: number;
  readonly percentage: number;
}

export const buildStatusDistribution = (
  activities: readonly ActivityAnalyticsInput[],
): readonly StatusDistributionItem[] => {
  const total = activities.length;
  const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'];

  const grouped = groupBy((a: ActivityAnalyticsInput) => a.status)(activities);

  return pipe(
    statuses,
    map((status) => {
      const count = (grouped[status] || []).length;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return Object.freeze({
        status,
        count,
        percentage,
      });
    }),
  );
};

/**
 * 2. buildPriorityBreakdown
 * Returns breakdown per priority level with completion rates for stacked bar charts.
 */
export interface PriorityBreakdownItem {
  readonly priority: string;
  readonly total: number;
  readonly completed: number;
  readonly completionRate: number;
}

export const buildPriorityBreakdown = (
  activities: readonly ActivityAnalyticsInput[],
): readonly PriorityBreakdownItem[] => {
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const grouped = groupBy((a: ActivityAnalyticsInput) => a.priority)(activities);

  return pipe(
    priorities,
    map((priority) => {
      const items = grouped[priority] || [];
      const total = items.length;
      const completed = pipe(
        items,
        filter((item) => item.status === 'COMPLETED'),
        (arr) => arr.length,
      );
      const completionRate =
        total > 0 ? Math.round((completed / total) * 100) : 0;

      return Object.freeze({
        priority,
        total,
        completed,
        completionRate,
      });
    }),
  );
};

/**
 * 3. buildDailyCompletionSeries
 * Continuous time-series of the past N days for Area/Line progression charts.
 */
export interface DailyCompletionPoint {
  readonly date: string;
  readonly completedCount: number;
  readonly xpEarned: number;
  readonly coinsEarned: number;
}

export const buildDailyCompletionSeries = (
  logs: readonly ActivityLogAnalyticsInput[],
  daysCount: number = 14,
  referenceDate: Date = new Date(),
): readonly DailyCompletionPoint[] => {
  const count = Math.max(1, daysCount);

  // Group logs by YYYY-MM-DD
  const logsByDay = groupBy((log: ActivityLogAnalyticsInput) =>
    toUtcDayString(new Date(log.completedAt)),
  )(logs);

  // Generate sequence of dates from (referenceDate - daysCount + 1) to referenceDate
  const daysArray: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(referenceDate.getTime());
    d.setUTCDate(d.getUTCDate() - i);
    daysArray.push(toUtcDayString(d));
  }

  return pipe(
    daysArray,
    map((dateStr) => {
      const dayLogs = logsByDay[dateStr] || [];
      const completedCount = dayLogs.length;

      const totals = reduce(
        (
          acc: { xp: number; coins: number },
          curr: ActivityLogAnalyticsInput,
        ) => ({
          xp: acc.xp + curr.xpEarned,
          coins: acc.coins + curr.coinsEarned,
        }),
        { xp: 0, coins: 0 },
      )(dayLogs);

      return Object.freeze({
        date: dateStr,
        completedCount,
        xpEarned: totals.xp,
        coinsEarned: totals.coins,
      });
    }),
  );
};

/**
 * 4. buildRecurrenceVsSingleStats
 * Comparison between SINGLE and RECURRING activities (created, executions, XP).
 */
export interface RecurrenceVsSingleStats {
  readonly single: {
    readonly totalCreated: number;
    readonly totalExecutions: number;
    readonly xpEarned: number;
  };
  readonly recurring: {
    readonly totalCreated: number;
    readonly totalExecutions: number;
    readonly xpEarned: number;
  };
}

export const buildRecurrenceVsSingleStats = (
  activities: readonly ActivityAnalyticsInput[],
  logs: readonly ActivityLogAnalyticsInput[],
): Readonly<RecurrenceVsSingleStats> => {
  const singleActivities = activities.filter((a) => a.type === 'SINGLE');
  const recurringActivities = activities.filter((a) => a.type === 'RECURRING');

  const singleIdSet = new Set(singleActivities.map((a) => a.id));
  const recurringIdSet = new Set(recurringActivities.map((a) => a.id));

  const singleLogs = logs.filter(
    (log) =>
      singleIdSet.has(log.activityId) || log.activity?.type === 'SINGLE',
  );
  const recurringLogs = logs.filter(
    (log) =>
      recurringIdSet.has(log.activityId) || log.activity?.type === 'RECURRING',
  );

  const singleXp = singleLogs.reduce((acc, curr) => acc + curr.xpEarned, 0);
  const recurringXp = recurringLogs.reduce(
    (acc, curr) => acc + curr.xpEarned,
    0,
  );

  return Object.freeze({
    single: Object.freeze({
      totalCreated: singleActivities.length,
      totalExecutions: singleLogs.length,
      xpEarned: singleXp,
    }),
    recurring: Object.freeze({
      totalCreated: recurringActivities.length,
      totalExecutions: recurringLogs.length,
      xpEarned: recurringXp,
    }),
  });
};

/**
 * 5. buildActionProgressReport
 * Detailed progress per action highlighting completion %, logs count, and XP/coin generation.
 */
export interface ActionProgressItem {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly status: string;
  readonly priority: string;
  readonly totalExecutions: number;
  readonly progressPercent: number;
  readonly xpGenerated: number;
  readonly coinsGenerated: number;
}

export const buildActionProgressReport = (
  activities: readonly ActivityAnalyticsInput[],
): readonly ActionProgressItem[] => {
  return pipe(
    activities,
    map((activity) => {
      const logs = activity.logs || [];
      const totalExecutions = logs.length;

      const totals = reduce(
        (
          acc: { xp: number; coins: number },
          curr: ActivityLogAnalyticsInput,
        ) => ({
          xp: acc.xp + curr.xpEarned,
          coins: acc.coins + curr.coinsEarned,
        }),
        { xp: 0, coins: 0 },
      )(logs);

      // Progress percent:
      // SINGLE: 100% if status === 'COMPLETED' or logs > 0, else 0%
      // RECURRING: each completion is 1 cycle, capped at 100% per cycle or dynamic
      const progressPercent =
        activity.type === 'SINGLE'
          ? activity.status === 'COMPLETED'
            ? 100
            : 0
          : totalExecutions > 0
            ? Math.min(totalExecutions * 25, 100)
            : 0;

      return Object.freeze({
        id: activity.id,
        title: activity.title || 'Untitled Activity',
        type: activity.type,
        status: activity.status,
        priority: activity.priority,
        totalExecutions,
        progressPercent,
        xpGenerated: totals.xp,
        coinsGenerated: totals.coins,
      });
    }),
  );
};

/**
 * 6. buildTeamContributionReport
 * Computes collaborative project contribution metrics for each member.
 */
export interface TeamMemberContribution {
  readonly userId: string;
  readonly username: string;
  readonly email: string;
  readonly avatarUrl: string | null;
  readonly role: string;
  readonly completedCount: number;
  readonly xpContributed: number;
  readonly contributionPercentage: number;
}

export const buildTeamContributionReport = (
  members: readonly TeamMemberAnalyticsInput[],
  activities: readonly ActivityAnalyticsInput[],
  logs: readonly ActivityLogAnalyticsInput[],
): readonly TeamMemberContribution[] => {
  const totalXp = logs.reduce((acc, log) => acc + log.xpEarned, 0);

  const logsByUser = groupBy(
    (log: ActivityLogAnalyticsInput) => log.userId,
  )(logs);

  return pipe(
    members,
    map((member) => {
      const userLogs = logsByUser[member.userId] || [];
      const completedCount = userLogs.length;
      const xpContributed = userLogs.reduce(
        (acc, curr) => acc + curr.xpEarned,
        0,
      );
      const contributionPercentage =
        totalXp > 0 ? Math.round((xpContributed / totalXp) * 100) : 0;

      return Object.freeze({
        userId: member.userId,
        username: member.user.username,
        email: member.user.email,
        avatarUrl: member.user.avatarUrl,
        role: member.role,
        completedCount,
        xpContributed,
        contributionPercentage,
      });
    }),
  );
};
