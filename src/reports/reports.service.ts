import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildActionProgressReport,
  buildDailyCompletionSeries,
  buildPriorityBreakdown,
  buildRecurrenceVsSingleStats,
  buildStatusDistribution,
  buildTeamContributionReport,
  calculateProjectProgress,
  computeGamificationStats,
  evaluateActivityStatus,
  map,
  pipe,
} from '../common/fp';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Main dashboard analytics endpoint
   */
  async getDashboardReport(userId: string, daysCount: number = 14) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 1. Fetch user activities (created, assigned, or in user projects)
    const rawActivities = await this.prisma.activity.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
          {
            project: {
              members: {
                some: { userId },
              },
            },
          },
        ],
      },
      include: {
        logs: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    // Evaluate overdue status purely
    const activities = pipe(
      rawActivities,
      map((a) => ({
        ...a,
        status: evaluateActivityStatus(a, now),
      })),
    );

    // 2. Fetch user activity logs for trends
    const logs = await this.prisma.activityLog.findMany({
      where: { userId },
      include: {
        activity: {
          select: { type: true },
        },
      },
      orderBy: { completedAt: 'asc' },
    });

    // 3. Pure transformations
    const statusDistribution = buildStatusDistribution(activities);
    const priorityBreakdown = buildPriorityBreakdown(activities);
    const dailyTrend = buildDailyCompletionSeries(logs, daysCount, now);
    const recurrenceVsSingle = buildRecurrenceVsSingleStats(activities, logs);
    const actionProgressList = buildActionProgressReport(activities);

    // 4. Projects progress
    const userProjects = await this.prisma.project.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        activities: {
          select: { status: true },
        },
      },
    });

    const projectsProgress = pipe(
      userProjects,
      map((proj) => {
        const total = proj.activities.length;
        const completed = proj.activities.filter(
          (a) => a.status === 'COMPLETED',
        ).length;
        const progressPercent = calculateProjectProgress(proj.activities);

        return Object.freeze({
          id: proj.id,
          name: proj.name,
          colorHex: proj.colorHex,
          icon: proj.icon,
          isTeamProject: proj.isTeamProject,
          totalActivities: total,
          completedActivities: completed,
          progressPercent,
        });
      }),
    );

    // 5. Overview calculations
    const totalActivities = activities.length;
    const completedActivities = activities.filter(
      (a) => a.status === 'COMPLETED',
    ).length;
    const completionRate =
      totalActivities > 0
        ? Math.round((completedActivities / totalActivities) * 100)
        : 0;

    const stats = computeGamificationStats(
      user.xp,
      user.currentStreak,
      user.longestStreak,
      user.coins,
    );

    return {
      overview: {
        totalActivities,
        completedActivities,
        completionRate,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        xp: user.xp,
        level: user.level,
        coins: user.coins,
        gamificationStats: stats,
      },
      statusDistribution,
      priorityBreakdown,
      dailyTrend,
      recurrenceVsSingle,
      projectsProgress,
      actionProgressList,
    };
  }

  /**
   * Project-specific visual report and team contribution
   */
  async getProjectReport(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        activities: {
          include: {
            logs: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project '${projectId}' not found`);
    }

    const isMember = project.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException(
        'You do not have access to reports for this project',
      );
    }

    const now = new Date();
    const activities = pipe(
      project.activities,
      map((a) => ({
        ...a,
        status: evaluateActivityStatus(a, now),
      })),
    );

    // Fetch all logs belonging to this project's activities
    const activityIds = activities.map((a) => a.id);
    const logs = await this.prisma.activityLog.findMany({
      where: {
        activityId: { in: activityIds },
      },
      include: {
        activity: {
          select: { type: true },
        },
      },
      orderBy: { completedAt: 'asc' },
    });

    const statusDistribution = buildStatusDistribution(activities);
    const priorityBreakdown = buildPriorityBreakdown(activities);
    const dailyTrend = buildDailyCompletionSeries(logs, 14, now);
    const actionProgress = buildActionProgressReport(activities);
    const teamContributions = buildTeamContributionReport(
      project.members,
      activities,
      logs,
    );
    const progressPercent = calculateProjectProgress(activities);

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        colorHex: project.colorHex,
        icon: project.icon,
        isTeamProject: project.isTeamProject,
        memberCount: project.members.length,
        totalActivities: activities.length,
        progressPercent,
      },
      statusDistribution,
      priorityBreakdown,
      dailyTrend,
      actionProgress,
      teamContributions,
    };
  }
}
