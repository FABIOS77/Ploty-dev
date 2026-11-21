import {
  calculateCurrentLevelBaseXp,
  calculateLevel,
  calculateLevelProgressPercent,
  calculateNextLevelXp,
  calculateProjectProgress,
  canManageProjectMembers,
  computeGamificationStats,
  computeProjectSummary,
  formatUserProfile,
  isProjectOwner,
  resolveSafeActivityRewards,
  sanitizeSearchTerm,
} from './gamification-math.fp';

describe('Gamification Pure Math Functions (gamification-math.fp)', () => {
  describe('calculateLevel: floor(1 + sqrt(XP / 100))', () => {
    it('should return level 1 for 0 XP', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it('should return level 1 for negative XP', () => {
      expect(calculateLevel(-50)).toBe(1);
    });

    it('should return level 1 for XP under 100', () => {
      expect(calculateLevel(50)).toBe(1);
      expect(calculateLevel(99)).toBe(1);
    });

    it('should return level 2 at exactly 100 XP', () => {
      // 1 + sqrt(100/100) = 1 + 1 = 2
      expect(calculateLevel(100)).toBe(2);
    });

    it('should return level 2 for XP between 100 and 399', () => {
      expect(calculateLevel(250)).toBe(2);
      expect(calculateLevel(399)).toBe(2);
    });

    it('should return level 3 at exactly 400 XP', () => {
      // 1 + sqrt(400/100) = 1 + 2 = 3
      expect(calculateLevel(400)).toBe(3);
    });

    it('should return level 4 at exactly 900 XP', () => {
      // 1 + sqrt(900/100) = 1 + 3 = 4
      expect(calculateLevel(900)).toBe(4);
    });

    it('should return level 11 at 10000 XP', () => {
      // 1 + sqrt(10000/100) = 1 + 10 = 11
      expect(calculateLevel(10000)).toBe(11);
    });
  });

  describe('calculateNextLevelXp: 100 * level^2', () => {
    it('should compute XP needed for level 1 -> 2', () => {
      // 100 * 1^2 = 100
      expect(calculateNextLevelXp(1)).toBe(100);
    });

    it('should compute XP needed for level 2 -> 3', () => {
      // 100 * 2^2 = 400
      expect(calculateNextLevelXp(2)).toBe(400);
    });

    it('should compute XP needed for level 3 -> 4', () => {
      // 100 * 3^2 = 900
      expect(calculateNextLevelXp(3)).toBe(900);
    });

    it('should handle minimum level safe floor', () => {
      expect(calculateNextLevelXp(0)).toBe(100);
      expect(calculateNextLevelXp(-5)).toBe(100);
    });
  });

  describe('calculateLevelProgressPercent', () => {
    it('should be 0% at 0 XP', () => {
      expect(calculateLevelProgressPercent(0)).toBe(0);
    });

    it('should be 50% at 50 XP (base 0, next 100)', () => {
      expect(calculateLevelProgressPercent(50)).toBe(50);
    });

    it('should be 0% at exactly 100 XP (just reached level 2)', () => {
      // Base for level 2 is 100, next is 400
      expect(calculateLevelProgressPercent(100)).toBe(0);
    });

    it('should calculate 50% within level 2 at 250 XP', () => {
      // Level 2 range: 100 to 400. Range = 300. (250 - 100) / 300 = 150/300 = 50%
      expect(calculateLevelProgressPercent(250)).toBe(50);
    });
  });

  describe('computeGamificationStats', () => {
    it('should return frozen immutable stats for a user', () => {
      const stats = computeGamificationStats(250, 3, 5, 120);
      expect(stats.xp).toBe(250);
      expect(stats.level).toBe(2);
      expect(stats.currentLevelBaseXp).toBe(100);
      expect(stats.nextLevelXp).toBe(400);
      expect(stats.progressToNextLevelPercent).toBe(50);
      expect(stats.currentStreak).toBe(3);
      expect(stats.longestStreak).toBe(5);
      expect(stats.coins).toBe(120);
      expect(Object.isFrozen(stats)).toBe(true);
    });
  });

  describe('calculateProjectProgress: round((Completed / Total) * 100)', () => {
    it('should return 0 when activity list is empty', () => {
      expect(calculateProjectProgress([])).toBe(0);
    });

    it('should calculate 100% when all activities are COMPLETED', () => {
      const activities = [{ status: 'COMPLETED' }, { status: 'COMPLETED' }];
      expect(calculateProjectProgress(activities)).toBe(100);
    });

    it('should calculate 0% when no activities are COMPLETED', () => {
      const activities = [{ status: 'PENDING' }, { status: 'IN_PROGRESS' }];
      expect(calculateProjectProgress(activities)).toBe(0);
    });

    it('should calculate rounded percentage correctly for mixed statuses', () => {
      // 1 completed out of 3 = 33.333% -> 33%
      const activities = [
        { status: 'COMPLETED' },
        { status: 'PENDING' },
        { status: 'IN_PROGRESS' },
      ];
      expect(calculateProjectProgress(activities)).toBe(33);
    });

    it('should calculate 67% for 2 completed out of 3', () => {
      const activities = [
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
        { status: 'PENDING' },
      ];
      expect(calculateProjectProgress(activities)).toBe(67);
    });

    it('should count RECURRING activities with recorded logs as completed for current cycle progress', () => {
      const activities = [
        { status: 'PENDING', type: 'RECURRING', _count: { logs: 3 } },
        { status: 'PENDING', type: 'RECURRING', _count: { logs: 0 } },
      ];
      expect(calculateProjectProgress(activities)).toBe(50);

      const withLogsArray = [
        { status: 'PENDING', type: 'RECURRING', logs: [{ id: 'l1' }] },
        { status: 'COMPLETED', type: 'SINGLE' },
      ];
      expect(calculateProjectProgress(withLogsArray)).toBe(100);
    });
  });

  describe('resolveSafeActivityRewards (Anti-cheat priority ceilings)', () => {
    it('should clamp rewards to priority ceilings', () => {
      expect(resolveSafeActivityRewards('LOW', 999, 500)).toEqual({
        xpReward: 50,
        coinReward: 30,
      });
      expect(resolveSafeActivityRewards('MEDIUM', 500, 200)).toEqual({
        xpReward: 100,
        coinReward: 60,
      });
      expect(resolveSafeActivityRewards('HIGH', 450, 200)).toEqual({
        xpReward: 200,
        coinReward: 120,
      });
      expect(resolveSafeActivityRewards('CRITICAL', 500, 300)).toEqual({
        xpReward: 350,
        coinReward: 250,
      });
    });

    it('should compute priority defaults when omitted', () => {
      expect(resolveSafeActivityRewards('LOW')).toEqual({
        xpReward: 25,
        coinReward: 10,
      });
      expect(resolveSafeActivityRewards('CRITICAL')).toEqual({
        xpReward: 120,
        coinReward: 40,
      });
    });
  });

  describe('formatUserProfile', () => {
    it('should expose equippedFrameId, equippedTitleId and cosmetic relations', () => {
      const profile = formatUserProfile({
        id: 'u-1',
        email: 'demo@ploty.app',
        username: 'fabio_demo',
        xp: 450,
        coins: 200,
        equippedThemeId: 'theme-1',
        equippedMedalId: 'medal-1',
        equippedFrameId: 'frame-1',
        equippedTitleId: 'title-1',
        equippedFrame: { id: 'frame-1', code: 'FRAME_PLASMA_RING' },
        equippedTitle: { id: 'title-1', code: 'TITLE_ARCHITECT' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(profile.equippedFrameId).toBe('frame-1');
      expect(profile.equippedTitleId).toBe('title-1');
      expect(profile.equippedFrame.code).toBe('FRAME_PLASMA_RING');
      expect(profile.equippedTitle.code).toBe('TITLE_ARCHITECT');
    });
  });

  describe('computeProjectSummary', () => {
    it('should provide complete activity breakdown and progress', () => {
      const activities = [
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
        { status: 'PENDING' },
        { status: 'IN_PROGRESS' },
      ];
      const summary = computeProjectSummary(activities);
      expect(summary.total).toBe(4);
      expect(summary.completed).toBe(2);
      expect(summary.pending).toBe(1);
      expect(summary.inProgress).toBe(1);
      expect(summary.progressPercent).toBe(50);
    });
  });

  describe('Role authorization checks', () => {
    it('should allow OWNER and ADMIN to manage project members', () => {
      expect(canManageProjectMembers('OWNER')).toBe(true);
      expect(canManageProjectMembers('ADMIN')).toBe(true);
      expect(canManageProjectMembers('MEMBER')).toBe(false);
      expect(canManageProjectMembers(undefined)).toBe(false);
    });

    it('should verify project ownership', () => {
      expect(isProjectOwner('OWNER')).toBe(true);
      expect(isProjectOwner('ADMIN')).toBe(false);
      expect(isProjectOwner('MEMBER')).toBe(false);
    });
  });

  describe('sanitizeSearchTerm', () => {
    it('should trim, lowercase and strip unwanted characters', () => {
      expect(sanitizeSearchTerm('  John.Doe@Example.com! ')).toBe(
        'john.doe@example.com',
      );
      expect(sanitizeSearchTerm('  USER_Name-99!$# ')).toBe('user_name-99');
      expect(sanitizeSearchTerm('')).toBe('');
      expect(sanitizeSearchTerm(null)).toBe('');
    });
  });
});
