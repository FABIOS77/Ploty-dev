import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

describe('ReportsService Unit Tests', () => {
  let service: ReportsService;
  let prisma: any;

  const mockUser = {
    id: 'user-1',
    username: 'alex_gamer',
    email: 'alex@ploty.app',
    xp: 500,
    level: 3,
    coins: 150,
    currentStreak: 4,
    longestStreak: 5,
  };

  const mockProject = {
    id: 'proj-1',
    name: 'Cyberpunk Quest',
    description: 'Game project',
    colorHex: '#6366F1',
    icon: 'target',
    isTeamProject: true,
    members: [
      {
        id: 'm1',
        projectId: 'proj-1',
        userId: 'user-1',
        role: 'OWNER',
        user: { id: 'user-1', username: 'alex_gamer', email: 'alex@ploty.app', avatarUrl: null },
      },
    ],
    activities: [
      { id: 'act-1', title: 'Task 1', type: 'SINGLE', status: 'COMPLETED', priority: 'HIGH', logs: [] },
      { id: 'act-2', title: 'Task 2', type: 'RECURRING', status: 'PENDING', priority: 'MEDIUM', logs: [] },
    ],
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      activity: {
        findMany: jest.fn(),
      },
      activityLog: {
        findMany: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardReport', () => {
    it('should calculate complete aggregated metrics for dashboard', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.activity.findMany.mockResolvedValue(mockProject.activities);
      prisma.activityLog.findMany.mockResolvedValue([]);
      prisma.project.findMany.mockResolvedValue([mockProject]);

      const report = await service.getDashboardReport('user-1', 14);

      expect(report).toHaveProperty('overview');
      expect(report.overview.totalActivities).toBe(2);
      expect(report.overview.completedActivities).toBe(1);
      expect(report.overview.completionRate).toBe(50);
      expect(report).toHaveProperty('statusDistribution');
      expect(report).toHaveProperty('priorityBreakdown');
      expect(report).toHaveProperty('dailyTrend');
      expect(report).toHaveProperty('recurrenceVsSingle');
      expect(report).toHaveProperty('projectsProgress');
      expect(report.projectsProgress).toHaveLength(1);
      expect(report.projectsProgress[0].progressPercent).toBe(50);
      expect(report).toHaveProperty('actionProgressList');
    });
  });

  describe('getProjectReport', () => {
    it('should calculate project breakdown and team member contribution', async () => {
      prisma.project.findUnique.mockResolvedValue(mockProject);
      prisma.activityLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          activityId: 'act-1',
          userId: 'user-1',
          completedAt: new Date(),
          xpEarned: 100,
          coinsEarned: 25,
          activity: { type: 'SINGLE' },
        },
      ]);

      const report = await service.getProjectReport('proj-1', 'user-1');

      expect(report.project.id).toBe('proj-1');
      expect(report.project.progressPercent).toBe(50);
      expect(report.teamContributions).toHaveLength(1);
      expect(report.teamContributions[0].completedCount).toBe(1);
      expect(report.teamContributions[0].xpContributed).toBe(100);
      expect(report.teamContributions[0].contributionPercentage).toBe(100);
    });

    it('should throw ForbiddenException if user is not a member of project', async () => {
      prisma.project.findUnique.mockResolvedValue(mockProject);

      await expect(
        service.getProjectReport('proj-1', 'intruder-id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
