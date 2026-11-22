import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService Unit Tests', () => {
  let service: UsersService;
  let prisma: any;

  const mockUser = {
    id: 'user-1',
    email: 'demo@ploty.app',
    username: 'fabio_demo',
    passwordHash: 'hashed_secret',
    avatarUrl: 'https://images.unsplash.com/photo-1.png',
    xp: 650,
    level: 3,
    coins: 480,
    currentStreak: 5,
    longestStreak: 9,
    equippedThemeId: 'theme-1',
    equippedMedalId: 'medal-1',
    equippedFrameId: 'frame-1',
    equippedTitleId: 'title-1',
    equippedTheme: { id: 'theme-1', code: 'THEME_DEFAULT' },
    equippedMedal: { id: 'medal-1', code: 'MEDAL_STREAK_3' },
    equippedFrame: { id: 'frame-1', code: 'FRAME_PLASMA_RING' },
    equippedTitle: { id: 'title-1', code: 'TITLE_FP_MASTER' },
    unlockedItems: [{ item: { id: 'medal-1', code: 'MEDAL_STREAK_3' } }],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateProfile (PATCH /users/me)', () => {
    it('should update username and avatarUrl and return sanitized profile without passwordHash', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        username: 'fabio_legend',
        avatarUrl: 'https://images.unsplash.com/new-avatar.png',
      });

      const result = await service.updateProfile('user-1', {
        username: 'fabio_legend',
        avatarUrl: 'https://images.unsplash.com/new-avatar.png',
      });

      expect(result.username).toBe('fabio_legend');
      expect(result.avatarUrl).toBe('https://images.unsplash.com/new-avatar.png');
      expect(result.equippedFrameId).toBe('frame-1');
      expect(result.equippedTitleId).toBe('title-1');
      expect((result as any).passwordHash).toBeUndefined();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: {
            username: 'fabio_legend',
            avatarUrl: 'https://images.unsplash.com/new-avatar.png',
          },
        }),
      );
    });

    it('should allow clearing avatarUrl when empty string "" or null is sent', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        avatarUrl: null,
      });

      const result = await service.updateProfile('user-1', {
        avatarUrl: '',
      });

      expect(result.avatarUrl).toBeNull();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { avatarUrl: null },
        }),
      );
    });

    it('should throw 409 ConflictException when new username is already taken by another user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.findFirst.mockResolvedValue({
        id: 'other-user-2',
        username: 'ana_dev',
      });

      await expect(
        service.updateProfile('user-1', { username: 'ana_dev' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('missing-user', { username: 'new_name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
