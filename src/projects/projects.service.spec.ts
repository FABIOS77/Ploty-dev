import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';

describe('ProjectsService Unit Tests', () => {
  let service: ProjectsService;
  let prisma: any;

  const mockOwner = {
    id: 'owner-uuid',
    username: 'project_owner',
    email: 'owner@ploty.app',
    avatarUrl: null,
  };

  const mockProject = {
    id: 'project-uuid-1',
    name: 'Cyberpunk Game App',
    description: 'Level up while organizing tasks',
    colorHex: '#6366F1',
    icon: 'gamepad',
    isTeamProject: true,
    ownerId: 'owner-uuid',
    owner: mockOwner,
    members: [
      {
        id: 'member-1',
        projectId: 'project-uuid-1',
        userId: 'owner-uuid',
        role: ProjectRole.OWNER,
        user: mockOwner,
      },
    ],
    activities: [
      { id: 'act-1', status: 'COMPLETED' },
      { id: 'act-2', status: 'PENDING' },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      project: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      projectMember: {
        create: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a project and assign creator as OWNER in ProjectMember', async () => {
      prisma.project.create.mockResolvedValue(mockProject);

      const result = await service.createProject('owner-uuid', {
        name: 'Cyberpunk Game App',
        description: 'Level up while organizing tasks',
        colorHex: '#6366F1',
        icon: 'gamepad',
        isTeamProject: true,
      });

      expect(prisma.project.create).toHaveBeenCalled();
      expect(result.id).toBe('project-uuid-1');
      expect(result.memberCount).toBe(1);
      expect(result.progressSummary.progressPercent).toBe(50);
    });
  });

  describe('listUserProjects', () => {
    it('should list projects and transform each using pure functions', async () => {
      prisma.project.findMany.mockResolvedValue([mockProject]);

      const results = await service.listUserProjects('owner-uuid');

      expect(prisma.project.findMany).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0].memberCount).toBe(1);
      expect(results[0].progressSummary.total).toBe(2);
      expect(results[0].progressSummary.completed).toBe(1);
      expect(results[0].progressSummary.progressPercent).toBe(50);
    });
  });

  describe('getProjectById', () => {
    it('should return project details when user is a member', async () => {
      prisma.project.findUnique.mockResolvedValue(mockProject);

      const result = await service.getProjectById('project-uuid-1', 'owner-uuid');

      expect(prisma.project.findUnique).toHaveBeenCalled();
      expect(result.id).toBe('project-uuid-1');
      expect(result.progressSummary.progressPercent).toBe(50);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.getProjectById('invalid-id', 'owner-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not a member', async () => {
      prisma.project.findUnique.mockResolvedValue(mockProject);

      await expect(
        service.getProjectById('project-uuid-1', 'stranger-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addMember', () => {
    it('should add a member when requester is OWNER', async () => {
      prisma.project.findUnique.mockResolvedValue(mockProject);
      prisma.user.findFirst.mockResolvedValue({
        id: 'new-user-uuid',
        username: 'invited_user',
        email: 'invited@ploty.app',
      });
      prisma.projectMember.create.mockResolvedValue({
        id: 'member-2',
        projectId: 'project-uuid-1',
        userId: 'new-user-uuid',
        role: ProjectRole.MEMBER,
      });

      const result = await service.addMember('project-uuid-1', 'owner-uuid', {
        usernameOrEmail: 'invited_user',
        role: ProjectRole.MEMBER,
      });

      expect(prisma.projectMember.create).toHaveBeenCalled();
      expect(result.message).toBe('Member successfully added to project');
    });

    it('should reject adding a member when requester is only a MEMBER', async () => {
      const projectWithMemberRequester = {
        ...mockProject,
        members: [
          {
            id: 'member-1',
            projectId: 'project-uuid-1',
            userId: 'regular-member-uuid',
            role: ProjectRole.MEMBER,
          },
        ],
      };
      prisma.project.findUnique.mockResolvedValue(projectWithMemberRequester);

      await expect(
        service.addMember('project-uuid-1', 'regular-member-uuid', {
          userId: 'target-user-uuid',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject adding a user who is already a member', async () => {
      prisma.project.findUnique.mockResolvedValue(mockProject);

      await expect(
        service.addMember('project-uuid-1', 'owner-uuid', {
          userId: 'owner-uuid',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeMember', () => {
    it('should remove a member when requester is OWNER', async () => {
      const projectWithTwoMembers = {
        ...mockProject,
        members: [
          { id: 'm1', projectId: 'project-uuid-1', userId: 'owner-uuid', role: ProjectRole.OWNER },
          { id: 'm2', projectId: 'project-uuid-1', userId: 'user-to-remove', role: ProjectRole.MEMBER },
        ],
      };
      prisma.project.findUnique.mockResolvedValue(projectWithTwoMembers);
      prisma.projectMember.delete.mockResolvedValue({});

      const result = await service.removeMember('project-uuid-1', 'owner-uuid', 'user-to-remove');
      expect(prisma.projectMember.delete).toHaveBeenCalledWith({
        where: { id: 'm2' },
      });
      expect(result.removedUserId).toBe('user-to-remove');
    });

    it('should forbid removing the OWNER', async () => {
      prisma.project.findUnique.mockResolvedValue(mockProject);

      await expect(
        service.removeMember('project-uuid-1', 'owner-uuid', 'owner-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
