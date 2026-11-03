import {
  calculateActivityBaseRewards,
  calculateNextDueDate,
  evaluateActivityStatus,
} from './activity-recurrence.fp';

describe('Activity Recurrence & Priority Engine (activity-recurrence.fp)', () => {
  describe('calculateNextDueDate', () => {
    const baseDate = new Date('2026-11-01T12:00:00.000Z');

    it('should return null if pattern is NONE', () => {
      expect(calculateNextDueDate(baseDate, 'NONE', 1)).toBeNull();
    });

    it('should add interval days for DAILY pattern without mutating baseDate', () => {
      const nextDate = calculateNextDueDate(baseDate, 'DAILY', 3);
      expect(nextDate).not.toBeNull();
      expect(nextDate?.toISOString()).toBe('2026-11-04T12:00:00.000Z');
      expect(baseDate.toISOString()).toBe('2026-11-01T12:00:00.000Z');
    });

    it('should add interval * 7 days for WEEKLY pattern', () => {
      const nextDate = calculateNextDueDate(baseDate, 'WEEKLY', 2);
      expect(nextDate?.toISOString()).toBe('2026-11-15T12:00:00.000Z');
    });

    it('should add interval months for MONTHLY pattern', () => {
      const nextDate = calculateNextDueDate(baseDate, 'MONTHLY', 1);
      expect(nextDate?.toISOString()).toBe('2026-12-01T12:00:00.000Z');
    });

    it('should add interval days for CUSTOM_DAYS pattern', () => {
      const nextDate = calculateNextDueDate(baseDate, 'CUSTOM_DAYS', 5);
      expect(nextDate?.toISOString()).toBe('2026-11-06T12:00:00.000Z');
    });
  });

  describe('evaluateActivityStatus', () => {
    const now = new Date('2026-11-03T12:00:00.000Z');

    it('should preserve COMPLETED status even if dueDate is in the past', () => {
      const activity = {
        status: 'COMPLETED',
        dueDate: new Date('2026-11-01T12:00:00.000Z'),
      };
      expect(evaluateActivityStatus(activity, now)).toBe('COMPLETED');
    });

    it('should return OVERDUE if dueDate is before now and status is not COMPLETED', () => {
      const activity = {
        status: 'PENDING',
        dueDate: new Date('2026-11-02T12:00:00.000Z'),
      };
      expect(evaluateActivityStatus(activity, now)).toBe('OVERDUE');
    });

    it('should keep original status if dueDate is in the future', () => {
      const activity = {
        status: 'IN_PROGRESS',
        dueDate: new Date('2026-11-05T12:00:00.000Z'),
      };
      expect(evaluateActivityStatus(activity, now)).toBe('IN_PROGRESS');
    });

    it('should keep original status if dueDate is null', () => {
      const activity = {
        status: 'PENDING',
        dueDate: null,
      };
      expect(evaluateActivityStatus(activity, now)).toBe('PENDING');
    });
  });

  describe('calculateActivityBaseRewards', () => {
    it('should return 40 XP and 10 coins for LOW priority', () => {
      expect(calculateActivityBaseRewards('LOW')).toEqual({
        xpReward: 40,
        coinReward: 10,
      });
    });

    it('should return 50 XP and 15 coins for MEDIUM priority', () => {
      expect(calculateActivityBaseRewards('MEDIUM')).toEqual({
        xpReward: 50,
        coinReward: 15,
      });
    });

    it('should return 75 XP and 25 coins for HIGH priority', () => {
      expect(calculateActivityBaseRewards('HIGH')).toEqual({
        xpReward: 75,
        coinReward: 25,
      });
    });

    it('should return 100 XP and 40 coins for CRITICAL priority', () => {
      expect(calculateActivityBaseRewards('CRITICAL')).toEqual({
        xpReward: 100,
        coinReward: 40,
      });
    });

    it('should default to MEDIUM rewards for unknown priority', () => {
      expect(calculateActivityBaseRewards(null)).toEqual({
        xpReward: 50,
        coinReward: 15,
      });
    });
  });
});
