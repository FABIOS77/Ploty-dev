import {
  buildActionProgressReport,
  buildDailyCompletionSeries,
  buildPriorityBreakdown,
  buildRecurrenceVsSingleStats,
  buildStatusDistribution,
  buildTeamContributionReport,
} from './analytics.fp';

describe('Analytics & Reporting Pure Engine (analytics.fp)', () => {
  const sampleActivities = [
    { id: '1', title: 'Task A', type: 'SINGLE', status: 'COMPLETED', priority: 'HIGH' },
    { id: '2', title: 'Task B', type: 'SINGLE', status: 'PENDING', priority: 'MEDIUM' },
    { id: '3', title: 'Task C', type: 'RECURRING', status: 'IN_PROGRESS', priority: 'LOW' },
    { id: '4', title: 'Task D', type: 'RECURRING', status: 'OVERDUE', priority: 'CRITICAL' },
  ];

  const sampleLogs = [
    {
      id: 'l1',
      activityId: '1',
      userId: 'u1',
      completedAt: '2026-11-03T10:00:00.000Z',
      xpEarned: 100,
      coinsEarned: 25,
      activity: { type: 'SINGLE' },
    },
    {
      id: 'l2',
      activityId: '3',
      userId: 'u2',
      completedAt: '2026-11-02T15:00:00.000Z',
      xpEarned: 50,
      coinsEarned: 15,
      activity: { type: 'RECURRING' },
    },
    {
      id: 'l3',
      activityId: '1',
      userId: 'u1',
      completedAt: '2026-11-03T14:00:00.000Z',
      xpEarned: 100,
      coinsEarned: 25,
      activity: { type: 'SINGLE' },
    },
  ];

  describe('buildStatusDistribution', () => {
    it('should calculate counts and percentages across all four statuses', () => {
      const dist = buildStatusDistribution(sampleActivities);
      expect(dist).toHaveLength(4);

      const completed = dist.find((d) => d.status === 'COMPLETED');
      expect(completed?.count).toBe(1);
      expect(completed?.percentage).toBe(25);

      const pending = dist.find((d) => d.status === 'PENDING');
      expect(pending?.count).toBe(1);
      expect(pending?.percentage).toBe(25);
    });
  });

  describe('buildPriorityBreakdown', () => {
    it('should aggregate total and completed activities per priority', () => {
      const breakdown = buildPriorityBreakdown(sampleActivities);
      expect(breakdown).toHaveLength(4);

      const high = breakdown.find((b) => b.priority === 'HIGH');
      expect(high?.total).toBe(1);
      expect(high?.completed).toBe(1);
      expect(high?.completionRate).toBe(100);

      const medium = breakdown.find((b) => b.priority === 'MEDIUM');
      expect(medium?.total).toBe(1);
      expect(medium?.completed).toBe(0);
      expect(medium?.completionRate).toBe(0);
    });
  });

  describe('buildDailyCompletionSeries', () => {
    it('should generate a continuous daily timeline for N days', () => {
      const refDate = new Date('2026-11-03T23:59:59.000Z');
      const series = buildDailyCompletionSeries(sampleLogs, 3, refDate);

      expect(series).toHaveLength(3);
      expect(series[2].date).toBe('2026-11-03');
      expect(series[2].completedCount).toBe(2);
      expect(series[2].xpEarned).toBe(200);
      expect(series[2].coinsEarned).toBe(50);

      expect(series[1].date).toBe('2026-11-02');
      expect(series[1].completedCount).toBe(1);
      expect(series[1].xpEarned).toBe(50);

      expect(series[0].date).toBe('2026-11-01');
      expect(series[0].completedCount).toBe(0);
      expect(series[0].xpEarned).toBe(0);
    });
  });

  describe('buildRecurrenceVsSingleStats', () => {
    it('should differentiate execution totals and XP between single and recurring', () => {
      const stats = buildRecurrenceVsSingleStats(sampleActivities, sampleLogs);
      expect(stats.single.totalCreated).toBe(2);
      expect(stats.single.totalExecutions).toBe(2);
      expect(stats.single.xpEarned).toBe(200);

      expect(stats.recurring.totalCreated).toBe(2);
      expect(stats.recurring.totalExecutions).toBe(1);
      expect(stats.recurring.xpEarned).toBe(50);
    });
  });

  describe('buildActionProgressReport', () => {
    it('should calculate individual progress and rewards', () => {
      const activitiesWithLogs = [
        {
          id: '1',
          title: 'Single Task',
          type: 'SINGLE',
          status: 'COMPLETED',
          priority: 'HIGH',
          logs: [sampleLogs[0]],
        },
        {
          id: '2',
          title: 'Recurring Task',
          type: 'RECURRING',
          status: 'PENDING',
          priority: 'MEDIUM',
          logs: [sampleLogs[1], sampleLogs[1]],
        },
      ];

      const report = buildActionProgressReport(activitiesWithLogs);
      expect(report).toHaveLength(2);
      expect(report[0].progressPercent).toBe(100);
      expect(report[0].totalExecutions).toBe(1);
      expect(report[1].totalExecutions).toBe(2);
      expect(report[1].progressPercent).toBe(50);
    });
  });

  describe('buildTeamContributionReport', () => {
    it('should calculate individual contributions to project accomplishments', () => {
      const members = [
        {
          id: 'm1',
          userId: 'u1',
          role: 'OWNER',
          user: { id: 'u1', username: 'alice', email: 'alice@ploty.app', avatarUrl: null },
        },
        {
          id: 'm2',
          userId: 'u2',
          role: 'MEMBER',
          user: { id: 'u2', username: 'bob', email: 'bob@ploty.app', avatarUrl: null },
        },
      ];

      const report = buildTeamContributionReport(members, sampleActivities, sampleLogs);
      expect(report).toHaveLength(2);

      const alice = report.find((r) => r.userId === 'u1');
      expect(alice?.completedCount).toBe(2);
      expect(alice?.xpContributed).toBe(200);
      expect(alice?.contributionPercentage).toBe(80); // 200 out of 250 total XP = 80%

      const bob = report.find((r) => r.userId === 'u2');
      expect(bob?.completedCount).toBe(1);
      expect(bob?.xpContributed).toBe(50);
      expect(bob?.contributionPercentage).toBe(20);
    });
  });
});
