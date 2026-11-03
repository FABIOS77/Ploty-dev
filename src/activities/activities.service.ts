import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityPriority, ActivityType, RecurrencePattern } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { FilterActivitiesDto } from './dto/filter-activities.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import {
  calculateActivityBaseRewards,
  calculateLevel,
  calculateNextDueDate,
  computeCompletionRewards,
  evaluateActivityStatus,
  evaluateAutoUnlocks,
  evaluateStreak,
  map,
  pipe,
} from '../common/fp';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a single or recurring activity (individual or project-bound)
   */
  async createActivity(userId: string, dto: CreateActivityDto) {
    if (dto.projectId) {
      const membership = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: dto.projectId,
            userId,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenException(
          'You must be a member of the project to add activities to it',
        );
      }

      if (dto.assigneeId) {
        const assigneeMembership = await this.prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId: dto.projectId,
              userId: dto.assigneeId,
            },
          },
        });

        if (!assigneeMembership) {
          throw new BadRequestException(
            'Assigned user must be a member of the project',
          );
        }
      }
    }

    // Pure fallback calculation for XP and Coin rewards based on priority
    const baseRewards = calculateActivityBaseRewards(dto.priority);
    const xpReward = dto.xpReward !== undefined ? dto.xpReward : baseRewards.xpReward;
    const coinReward =
      dto.coinReward !== undefined ? dto.coinReward : baseRewards.coinReward;

    const activity = await this.prisma.activity.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type || ActivityType.SINGLE,
        recurrence: dto.recurrence || RecurrencePattern.NONE,
        recurrenceInterval: dto.recurrenceInterval || 1,
        priority: dto.priority || ActivityPriority.MEDIUM,
        xpReward,
        coinReward,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        projectId: dto.projectId || null,
        creatorId: userId,
        assigneeId: dto.assigneeId || null,
      },
      include: {
        creator: {
          select: { id: true, username: true, email: true, avatarUrl: true },
        },
        assignee: {
          select: { id: true, username: true, email: true, avatarUrl: true },
        },
        project: {
          select: { id: true, name: true, colorHex: true, icon: true },
        },
        _count: {
          select: { logs: true },
        },
      },
    });

    const evaluatedStatus = evaluateActivityStatus(activity, new Date());
    return {
      ...activity,
      status: evaluatedStatus,
    };
  }

  /**
   * List activities with pure status evaluation and filtering
   */
  async listActivities(userId: string, filterDto: FilterActivitiesDto) {
    if (filterDto.projectId) {
      const membership = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: filterDto.projectId,
            userId,
          },
        },
      });
      if (!membership) {
        throw new ForbiddenException(
          'You do not have access to activities for this project',
        );
      }
    }

    const whereClause: any = {
      ...(filterDto.projectId
        ? { projectId: filterDto.projectId }
        : {
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
          }),
    };

    if (filterDto.assignedToMe) {
      whereClause.assigneeId = userId;
    }
    if (filterDto.status) {
      whereClause.status = filterDto.status;
    }
    if (filterDto.type) {
      whereClause.type = filterDto.type;
    }
    if (filterDto.priority) {
      whereClause.priority = filterDto.priority;
    }

    const activities = await this.prisma.activity.findMany({
      where: whereClause,
      include: {
        creator: {
          select: { id: true, username: true, email: true, avatarUrl: true },
        },
        assignee: {
          select: { id: true, username: true, email: true, avatarUrl: true },
        },
        project: {
          select: { id: true, name: true, colorHex: true, icon: true },
        },
        _count: {
          select: { logs: true },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    const now = new Date();
    return pipe(
      activities,
      map((activity) => ({
        ...activity,
        status: evaluateActivityStatus(activity, now),
        executionCount: activity._count.logs,
      })),
    );
  }

  /**
   * Get single activity detail along with chronological logs
   */
  async getActivityById(activityId: string, userId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        creator: {
          select: { id: true, username: true, email: true, avatarUrl: true },
        },
        assignee: {
          select: { id: true, username: true, email: true, avatarUrl: true },
        },
        project: {
          include: {
            members: true,
          },
        },
        logs: {
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true },
            },
          },
          orderBy: {
            completedAt: 'desc',
          },
        },
        _count: {
          select: { logs: true },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException(`Activity '${activityId}' not found`);
    }

    // Access check
    const isCreator = activity.creatorId === userId;
    const isAssignee = activity.assigneeId === userId;
    const isProjectMember = activity.project?.members.some(
      (m) => m.userId === userId,
    );

    if (!isCreator && !isAssignee && !isProjectMember) {
      throw new ForbiddenException('Access denied to this activity');
    }

    const evaluatedStatus = evaluateActivityStatus(activity, new Date());
    return {
      ...activity,
      status: evaluatedStatus,
      executionCount: activity._count.logs,
    };
  }

  /**
   * Update an activity
   */
  async updateActivity(
    activityId: string,
    userId: string,
    dto: UpdateActivityDto,
  ) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        project: {
          include: { members: true },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException(`Activity '${activityId}' not found`);
    }

    const isCreator = activity.creatorId === userId;
    const isProjectManager = activity.project?.members.some(
      (m) =>
        m.userId === userId && (m.role === 'OWNER' || m.role === 'ADMIN'),
    );

    if (!isCreator && !isProjectManager) {
      throw new ForbiddenException(
        'Only activity creator or project managers can update this activity',
      );
    }

    const updated = await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        recurrence: dto.recurrence,
        recurrenceInterval: dto.recurrenceInterval,
        status: dto.status,
        priority: dto.priority,
        xpReward: dto.xpReward,
        coinReward: dto.coinReward,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assigneeId: dto.assigneeId,
      },
      include: {
        creator: {
          select: { id: true, username: true, email: true, avatarUrl: true },
        },
        assignee: {
          select: { id: true, username: true, email: true, avatarUrl: true },
        },
        project: {
          select: { id: true, name: true, colorHex: true, icon: true },
        },
        _count: {
          select: { logs: true },
        },
      },
    });

    return {
      ...updated,
      status: evaluateActivityStatus(updated, new Date()),
    };
  }

  /**
   * Delete an activity
   */
  async deleteActivity(activityId: string, userId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        project: {
          include: { members: true },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException(`Activity '${activityId}' not found`);
    }

    const isCreator = activity.creatorId === userId;
    const isProjectManager = activity.project?.members.some(
      (m) =>
        m.userId === userId && (m.role === 'OWNER' || m.role === 'ADMIN'),
    );

    if (!isCreator && !isProjectManager) {
      throw new ForbiddenException(
        'Not authorized to delete this activity',
      );
    }

    await this.prisma.activity.delete({
      where: { id: activityId },
    });

    return {
      message: 'Activity deleted successfully',
      deletedActivityId: activityId,
    };
  }

  /**
   * Star Endpoint: Complete an activity with atomic gamification calculation
   */
  async completeActivity(activityId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch activity and user
      const activity = await tx.activity.findUnique({
        where: { id: activityId },
        include: {
          project: {
            include: { members: true },
          },
        },
      });

      if (!activity) {
        throw new NotFoundException(`Activity '${activityId}' not found`);
      }

      if (activity.type === 'SINGLE' && activity.status === 'COMPLETED') {
        throw new BadRequestException('Esta actividad única ya fue completada');
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // 2. Fetch last completed log for streak calculation
      const lastLog = await tx.activityLog.findFirst({
        where: { userId },
        orderBy: { completedAt: 'desc' },
      });

      const now = new Date();

      // 3. Pure streak calculation
      const streakResult = evaluateStreak(
        user.currentStreak,
        user.longestStreak,
        lastLog ? lastLog.completedAt : null,
        now,
      );

      // 4. Pure completion rewards calculation with streak multiplier
      const rewardsResult = computeCompletionRewards(
        activity.xpReward,
        activity.coinReward,
        streakResult.newStreak,
      );

      // 5. Create immutable ActivityLog
      const log = await tx.activityLog.create({
        data: {
          activityId: activity.id,
          userId: user.id,
          completedAt: now,
          xpEarned: rewardsResult.xpEarned,
          coinsEarned: rewardsResult.coinsEarned,
          streakBonusApplied: rewardsResult.streakBonusApplied,
        },
      });

      // 6. Update Activity state according to SINGLE or RECURRING
      let updatedActivity: any;
      if (activity.type === 'SINGLE') {
        updatedActivity = await tx.activity.update({
          where: { id: activity.id },
          data: {
            status: 'COMPLETED',
          },
        });
      } else {
        // RECURRING: calculate next cycle due date, keep status PENDING
        const nextDueDate = calculateNextDueDate(
          activity.dueDate || now,
          activity.recurrence,
          activity.recurrenceInterval,
        );

        updatedActivity = await tx.activity.update({
          where: { id: activity.id },
          data: {
            dueDate: nextDueDate,
            status: 'PENDING',
          },
        });
      }

      // 7. Update User stats
      const newXp = user.xp + rewardsResult.xpEarned;
      const newCoins = user.coins + rewardsResult.coinsEarned;
      const previousLevel = user.level;
      const newLevel = calculateLevel(newXp);
      const levelUp = newLevel > previousLevel;

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          xp: newXp,
          coins: newCoins,
          level: newLevel,
          currentStreak: streakResult.newStreak,
          longestStreak: streakResult.newLongestStreak,
        },
      });

      // 8. Evaluate and award auto-unlocked medals
      const totalCompletedActivities = await tx.activityLog.count({
        where: { userId: user.id },
      });

      const teamActivitiesCompleted = await tx.activityLog.count({
        where: {
          userId: user.id,
          activity: {
            projectId: { not: null },
          },
        },
      });

      const catalog = await tx.gamificationItem.findMany();
      const currentUnlocks = await tx.userUnlock.findMany({
        where: { userId: user.id },
      });
      const currentUnlockedIds = currentUnlocks.map((u) => u.itemId);

      const newlyUnlocked = evaluateAutoUnlocks(
        {
          level: newLevel,
          currentStreak: streakResult.newStreak,
          totalCompletedActivities,
          teamActivitiesCompleted,
        },
        catalog,
        currentUnlockedIds,
      );

      for (const item of newlyUnlocked) {
        await tx.userUnlock.create({
          data: {
            userId: user.id,
            itemId: item.id,
          },
        });
      }

      return {
        activity: updatedActivity,
        log,
        rewards: {
          xpEarned: rewardsResult.xpEarned,
          coinsEarned: rewardsResult.coinsEarned,
          streakBonusApplied: rewardsResult.streakBonusApplied,
          streakBonusMultiplier: rewardsResult.streakBonusMultiplier,
        },
        levelUp,
        previousLevel,
        newLevel,
        newlyUnlockedItems: newlyUnlocked,
        updatedStats: {
          xp: updatedUser.xp,
          level: updatedUser.level,
          coins: updatedUser.coins,
          currentStreak: updatedUser.currentStreak,
          longestStreak: updatedUser.longestStreak,
        },
      };
    });
  }
}
