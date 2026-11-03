import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import {
  canManageProjectMembers,
  computeProjectSummary,
  map,
  pipe,
  sanitizeSearchTerm,
} from '../common/fp';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an individual or team project and auto-assign creator as OWNER in ProjectMember
   */
  async createProject(userId: string, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        colorHex: dto.colorHex || '#6366F1',
        icon: dto.icon || 'folder',
        isTeamProject: dto.isTeamProject ?? false,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: ProjectRole.OWNER,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
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
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const summary = computeProjectSummary(project.activities);

    return {
      ...project,
      memberCount: project.members.length,
      progressSummary: summary,
    };
  }

  /**
   * List projects where the user is a member, transformed via pure functions
   */
  async listUserProjects(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
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
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Pure functional transformation adding aggregations
    return pipe(
      projects,
      map((project) => {
        const summary = computeProjectSummary(project.activities);
        return Object.freeze({
          id: project.id,
          name: project.name,
          description: project.description,
          colorHex: project.colorHex,
          icon: project.icon,
          isTeamProject: project.isTeamProject,
          ownerId: project.ownerId,
          owner: project.owner,
          memberCount: project.members.length,
          members: project.members,
          progressSummary: summary,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        });
      }),
    );
  }

  /**
   * Get project detail with members and indicators
   */
  async getProjectById(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                level: true,
                currentStreak: true,
              },
            },
          },
        },
        activities: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            type: true,
            xpReward: true,
            coinReward: true,
            dueDate: true,
            assigneeId: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID '${projectId}' not found`);
    }

    const isMember = project.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const summary = computeProjectSummary(project.activities);

    return {
      ...project,
      memberCount: project.members.length,
      progressSummary: summary,
    };
  }

  /**
   * Add a member to a project.
   * Validated using pure authorization function (canManageProjectMembers: OWNER or ADMIN).
   */
  async addMember(
    projectId: string,
    requesterUserId: string,
    dto: AddProjectMemberDto,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID '${projectId}' not found`);
    }

    const requesterMember = project.members.find(
      (m) => m.userId === requesterUserId,
    );

    if (!requesterMember || !canManageProjectMembers(requesterMember.role)) {
      throw new ForbiddenException(
        'Only project OWNER or ADMIN can invite or add members',
      );
    }

    // Resolve target user
    let targetUserId = dto.userId;
    if (!targetUserId && dto.usernameOrEmail) {
      const sanitized = sanitizeSearchTerm(dto.usernameOrEmail);
      const targetUser = await this.prisma.user.findFirst({
        where: {
          OR: [{ username: sanitized }, { email: sanitized }],
        },
      });

      if (!targetUser) {
        throw new NotFoundException(
          `User '${dto.usernameOrEmail}' was not found`,
        );
      }
      targetUserId = targetUser.id;
    }

    if (!targetUserId) {
      throw new BadRequestException(
        'Either userId or usernameOrEmail must be provided',
      );
    }

    const alreadyMember = project.members.some(
      (m) => m.userId === targetUserId,
    );
    if (alreadyMember) {
      throw new ConflictException(
        'The specified user is already a member of this project',
      );
    }

    const newMember = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: targetUserId,
        role: dto.role || ProjectRole.MEMBER,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            level: true,
          },
        },
      },
    });

    return {
      message: 'Member successfully added to project',
      member: newMember,
    };
  }

  /**
   * Remove a member from a project.
   * Allowed for OWNER or ADMIN, or when a member leaves by themselves.
   */
  async removeMember(
    projectId: string,
    requesterUserId: string,
    targetUserId: string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID '${projectId}' not found`);
    }

    const requesterMember = project.members.find(
      (m) => m.userId === requesterUserId,
    );
    const targetMember = project.members.find((m) => m.userId === targetUserId);

    if (!targetMember) {
      throw new NotFoundException('Member does not belong to this project');
    }

    if (targetMember.role === ProjectRole.OWNER) {
      throw new ForbiddenException('Cannot remove the OWNER from the project');
    }

    const isSelfRemoval = requesterUserId === targetUserId;
    const isManager = requesterMember && canManageProjectMembers(requesterMember.role);

    if (!isSelfRemoval && !isManager) {
      throw new ForbiddenException(
        'Not authorized to remove this member from the project',
      );
    }

    await this.prisma.projectMember.delete({
      where: {
        id: targetMember.id,
      },
    });

    return {
      message: 'Member removed from project successfully',
      removedUserId: targetUserId,
    };
  }
}
