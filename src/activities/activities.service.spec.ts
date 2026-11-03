import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ActivityPriority, ActivityType, RecurrencePattern } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivitiesService } from './activities.service';

describe('ActivitiesService Unit Tests', () => {
  let service: ActivitiesService;
  let prisma: any;

  const mockUser = {
    id: 'user-uuid-1',
    username: 'alex_gamer',
    email: 'alex@ploty.app',
    xp: 0,
    level: 1,
    coins: 0,
    currentStreak: 0,
    longestStreak: 0,
  };

  const mockSingleActivity = {
    id: 'act-single-1',
    title: 'Deploy to Production',
    description: 'Release v1.0.0',
    type: ActivityType.SINGLE,
    recurrence: RecurrencePattern.NONE,
    recurrenceInterval: 1,
    status: 'PENDING',
    priority: ActivityPriority.HIGH,
    xpReward: 75,
    coinReward: 25,
    dueDate: new Date('2026-11-10T12:00:00.000Z'),
    projectId: null,
    creatorId: 'user-uuid-1',
    assigneeId: null,
    creator: mockUser,
    assignee: null,
    project: null,
    _count: { logs: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRecurringActivity = {
    id: 'act-recurring-1',
    title: 'Daily Code Review',
    description: 'Check open PRs',
    type: ActivityType.RECURRING,
    recurrence: RecurrencePattern.DAILY,
    recurrenceInterval: 1,
    status: 'PENDING',
    priority: ActivityPriority.MEDIUM,
    xpReward: 50,
    coinReward: 15,
    dueDate: new Date('2026-11-03T10:00:00.000Z'),
    projectId: null,
    creatorId: 'user-uuid-1',
    assigneeId: null,
    creator: mockUser,
    assignee: null,
    project: null,
    _count: { logs: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      activity: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      activityLog: {
        create: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      projectMember: {
        findUnique: jest.fn(),
      },
      gamificationItem: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      userUnlock: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(prisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createActivity', () => {
    it('should create an activity with priority-calculated rewards if omitted', async () => {
      prisma.activity.create.mockResolvedValue(mockSingleActivity);

      const result = await service.createActivity('user-uuid-1', {
        title: 'Deploy to Production',
        priority: ActivityPriority.HIGH,
      });

      expect(prisma.activity.create).toHaveBeenCalled();
      expect(result.id).toBe('act-single-1');
      expect(result.status).toBe('PENDING');
    });

    it('should verify project membership when projectId is provided', async () => {
      prisma.projectMember.findUnique.mockResolvedValue(null);

      await expect(
        service.createActivity('user-uuid-1', {
          title: 'Project Activity',
          projectId: 'project-uuid-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('completeActivity (Gamification Star Endpoint)', () => {
    it('should complete a SINGLE activity, award rewards and set status to COMPLETED', async () => {
      prisma.activity.findUnique.mockResolvedValue(mockSingleActivity);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.activityLog.findFirst.mockResolvedValue(null);
      prisma.activityLog.create.mockResolvedValue({
        id: 'log-1',
        activityId: 'act-single-1',
        userId: 'user-uuid-1',
        xpEarned: 75,
        coinsEarned: 25,
        streakBonusApplied: false,
      });
      prisma.activity.update.mockResolvedValue({
        ...mockSingleActivity,
        status: 'COMPLETED',
      });
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        xp: 79,
        coins: 26,
        level: 1,
        currentStreak: 1,
        longestStreak: 1,
      });
      prisma.activityLog.count.mockResolvedValue(1);

      const result = await service.completeActivity('act-single-1', 'user-uuid-1');

      expect(result.activity.status).toBe('COMPLETED');
      // With streak = 1, multiplier = 1.05 -> round(75 * 1.05) = 79, round(25 * 1.05) = 26
      expect(result.rewards.xpEarned).toBe(79);
      expect(result.rewards.coinsEarned).toBe(26);
      expect(result.reward.xpGained).toBe(79);
      expect(result.reward.coinsGained).toBe(26);
      expect(result.updatedStats.xp).toBe(79);
      expect(result.updatedStats.currentStreak).toBe(1);
      expect(result.updatedUser.xp).toBe(79);
      expect(result.updatedUser.level).toBe(1);
      expect(result.userStats.progressToNextLevelPercent).toBeDefined();
    });

    it('should reject completing an already COMPLETED SINGLE activity', async () => {
      prisma.activity.findUnique.mockResolvedValue({
        ...mockSingleActivity,
        status: 'COMPLETED',
      });

      await expect(
        service.completeActivity('act-single-1', 'user-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reschedule RECURRING activity to next cycle while keeping status PENDING', async () => {
      prisma.activity.findUnique.mockResolvedValue(mockRecurringActivity);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.activityLog.findFirst.mockResolvedValue(null);
      prisma.activityLog.create.mockResolvedValue({
        id: 'log-2',
        activityId: 'act-recurring-1',
        userId: 'user-uuid-1',
        xpEarned: 50,
        coinsEarned: 15,
        streakBonusApplied: false,
      });
      prisma.activity.update.mockResolvedValue({
        ...mockRecurringActivity,
        status: 'PENDING',
        dueDate: new Date('2026-11-04T10:00:00.000Z'),
      });
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        xp: 50,
        coins: 15,
      });
      prisma.activityLog.count.mockResolvedValue(1);

      const result = await service.completeActivity('act-recurring-1', 'user-uuid-1');

      expect(result.activity.status).toBe('PENDING');
      expect(prisma.activity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });
  });
});
