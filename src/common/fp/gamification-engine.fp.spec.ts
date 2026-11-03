import {
  canPurchaseItem,
  computeCompletionRewards,
  evaluateAutoUnlocks,
  evaluateStreak,
  toUtcDayString,
} from './gamification-engine.fp';
import { isErr, isOk, unwrapOr } from './fp-utils';

describe('Gamification Engine (gamification-engine.fp)', () => {
  describe('toUtcDayString', () => {
    it('should format date to YYYY-MM-DD correctly', () => {
      const date = new Date('2026-11-03T18:30:00.000Z');
      expect(toUtcDayString(date)).toBe('2026-11-03');
    });
  });

  describe('evaluateStreak', () => {
    const today = new Date('2026-11-03T12:00:00.000Z');

    it('should start streak at 1 if lastCompletedAt is null', () => {
      const res = evaluateStreak(0, 0, null, today);
      expect(res.newStreak).toBe(1);
      expect(res.newLongestStreak).toBe(1);
      expect(res.streakUpdated).toBe(true);
      expect(res.streakBonusApplied).toBe(false);
    });

    it('should maintain streak if completed again today', () => {
      const earlierToday = new Date('2026-11-03T08:00:00.000Z');
      const res = evaluateStreak(3, 5, earlierToday, today);
      expect(res.newStreak).toBe(3);
      expect(res.newLongestStreak).toBe(5);
      expect(res.streakUpdated).toBe(false);
      expect(res.streakBonusApplied).toBe(true);
    });

    it('should increment streak if completed yesterday', () => {
      const yesterday = new Date('2026-11-02T16:00:00.000Z');
      const res = evaluateStreak(4, 4, yesterday, today);
      expect(res.newStreak).toBe(5);
      expect(res.newLongestStreak).toBe(5);
      expect(res.streakUpdated).toBe(true);
      expect(res.streakBonusApplied).toBe(true);
    });

    it('should reset streak to 1 if more than 1 day has passed', () => {
      const threeDaysAgo = new Date('2026-10-31T12:00:00.000Z');
      const res = evaluateStreak(10, 15, threeDaysAgo, today);
      expect(res.newStreak).toBe(1);
      expect(res.newLongestStreak).toBe(15);
      expect(res.streakUpdated).toBe(true);
      expect(res.streakBonusApplied).toBe(false);
    });
  });

  describe('computeCompletionRewards', () => {
    it('should calculate base rewards with 1.0x multiplier when streak is 0', () => {
      const res = computeCompletionRewards(50, 20, 0);
      expect(res.streakBonusMultiplier).toBe(1);
      expect(res.xpEarned).toBe(50);
      expect(res.coinsEarned).toBe(20);
      expect(res.streakBonusApplied).toBe(false);
    });

    it('should apply 5% bonus per streak day up to maximum 50%', () => {
      // Streak 4: 1 + (4 * 0.05) = 1.20
      const res4 = computeCompletionRewards(100, 50, 4);
      expect(res4.streakBonusMultiplier).toBe(1.2);
      expect(res4.xpEarned).toBe(120);
      expect(res4.coinsEarned).toBe(60);
      expect(res4.streakBonusApplied).toBe(true);

      // Streak 20: capped at 1.50
      const res20 = computeCompletionRewards(100, 50, 20);
      expect(res20.streakBonusMultiplier).toBe(1.5);
      expect(res20.xpEarned).toBe(150);
      expect(res20.coinsEarned).toBe(75);
    });
  });

  describe('evaluateAutoUnlocks', () => {
    const catalog = [
      {
        id: 'item-1',
        code: 'MEDAL_FIRST_BLOOD',
        name: 'Primer Paso',
        description: 'Primera actividad cumplida',
        type: 'MEDAL',
        unlockLevel: 1,
        costCoins: 0,
      },
      {
        id: 'item-2',
        code: 'MEDAL_STREAK_3',
        name: 'Llama Constante',
        description: 'Racha de 3 días',
        type: 'MEDAL',
        unlockLevel: 1,
        costCoins: 50,
      },
      {
        id: 'item-3',
        code: 'MEDAL_STREAK_7',
        name: 'Maestro del Hábito',
        description: 'Racha de 7 días',
        type: 'MEDAL',
        unlockLevel: 2,
        costCoins: 150,
      },
      {
        id: 'item-4',
        code: 'MEDAL_CENTURION',
        name: 'Centurión Productivo',
        description: 'Nivel 3 o 10 actividades',
        type: 'MEDAL',
        unlockLevel: 3,
        costCoins: 200,
      },
    ];

    it('should unlock MEDAL_FIRST_BLOOD upon first activity completion', () => {
      const stats = {
        level: 1,
        currentStreak: 1,
        totalCompletedActivities: 1,
      };
      const newly = evaluateAutoUnlocks(stats, catalog, []);
      expect(newly.map((i) => i.code)).toContain('MEDAL_FIRST_BLOOD');
    });

    it('should not re-unlock items already in currentUnlockedItemIds', () => {
      const stats = {
        level: 1,
        currentStreak: 1,
        totalCompletedActivities: 1,
      };
      const newly = evaluateAutoUnlocks(stats, catalog, ['item-1']);
      expect(newly).toHaveLength(0);
    });

    it('should unlock streak medals when threshold is met', () => {
      const stats = {
        level: 2,
        currentStreak: 7,
        totalCompletedActivities: 8,
      };
      const newly = evaluateAutoUnlocks(stats, catalog, ['item-1']);
      const codes = newly.map((i) => i.code);
      expect(codes).toContain('MEDAL_STREAK_3');
      expect(codes).toContain('MEDAL_STREAK_7');
    });
  });

  describe('canPurchaseItem', () => {
    const item = {
      id: 'theme-cyberpunk',
      unlockLevel: 2,
      costCoins: 100,
    };

    it('should reject purchase if item is already unlocked', () => {
      const user = { level: 5, coins: 500 };
      const res = canPurchaseItem(user, item, ['theme-cyberpunk']);
      expect(isErr(res)).toBe(true);
      if (isErr(res)) {
        expect(res.error).toBe('Item is already unlocked by user');
      }
    });

    it('should reject purchase if user level is lower than unlockLevel', () => {
      const user = { level: 1, coins: 500 };
      const res = canPurchaseItem(user, item, []);
      expect(isErr(res)).toBe(true);
      if (isErr(res)) {
        expect(res.error).toContain('Level 2 is required');
      }
    });

    it('should reject purchase if user has insufficient coins', () => {
      const user = { level: 2, coins: 80 };
      const res = canPurchaseItem(user, item, []);
      expect(isErr(res)).toBe(true);
      if (isErr(res)) {
        expect(res.error).toContain('Insufficient coins');
      }
    });

    it('should approve purchase and return remaining coins when all criteria are met', () => {
      const user = { level: 2, coins: 150 };
      const res = canPurchaseItem(user, item, []);
      expect(isOk(res)).toBe(true);
      expect(unwrapOr(res, { remainingCoins: 0 }).remainingCoins).toBe(50);
    });
  });
});
