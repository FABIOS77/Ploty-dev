import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RewardType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from './gamification.service';

describe('GamificationService Unit Tests', () => {
  let service: GamificationService;
  let prisma: any;

  const mockTheme = {
    id: 'theme-cyberpunk',
    code: 'THEME_CYBERPUNK_NEON',
    name: 'Cyberpunk Neon',
    type: RewardType.THEME,
    unlockLevel: 2,
    costCoins: 100,
    metadata: {},
  };

  const mockUser = {
    id: 'user-1',
    username: 'gamer_one',
    email: 'gamer@ploty.app',
    level: 3,
    coins: 200,
    xp: 800,
    currentStreak: 4,
    longestStreak: 5,
    equippedThemeId: null,
    equippedMedalId: null,
    unlockedItems: [],
  };

  beforeEach(async () => {
    prisma = {
      gamificationItem: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      userUnlock: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(prisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<GamificationService>(GamificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('seedInitialCatalog', () => {
    it('should upsert at least 10 items into GamificationItem catalog', async () => {
      prisma.gamificationItem.upsert.mockResolvedValue({});
      await service.seedInitialCatalog();
      expect(prisma.gamificationItem.upsert).toHaveBeenCalledTimes(10);
    });
  });

  describe('getCatalog', () => {
    it('should return catalog enriched with isUnlocked, isEquipped and canAfford', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.gamificationItem.findMany.mockResolvedValue([mockTheme]);

      const catalog = await service.getCatalog('user-1');

      expect(catalog).toHaveLength(1);
      expect(catalog[0].isUnlocked).toBe(false);
      expect(catalog[0].isEquipped).toBe(false);
      expect(catalog[0].canAfford).toBe(true); // User level 3 >= 2, coins 200 >= 100
    });
  });

  describe('buyItem', () => {
    it('should buy item, deduct coins and create UserUnlock entry', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.gamificationItem.findUnique.mockResolvedValue(mockTheme);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        coins: 100,
      });
      prisma.userUnlock.create.mockResolvedValue({
        id: 'unlock-1',
        userId: 'user-1',
        itemId: 'theme-cyberpunk',
        item: mockTheme,
      });

      const result = await service.buyItem('theme-cyberpunk', 'user-1');

      expect(result.message).toBe('Item purchased successfully');
      expect(result.remainingCoins).toBe(100);
      expect(prisma.userUnlock.create).toHaveBeenCalled();
    });

    it('should reject purchase if coins are insufficient', async () => {
      const poorUser = { ...mockUser, coins: 50 };
      prisma.user.findUnique.mockResolvedValue(poorUser);
      prisma.gamificationItem.findUnique.mockResolvedValue(mockTheme);

      await expect(
        service.buyItem('theme-cyberpunk', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject purchase if user level is lower than unlockLevel', async () => {
      const lowLevelUser = { ...mockUser, level: 1, coins: 500 };
      prisma.user.findUnique.mockResolvedValue(lowLevelUser);
      prisma.gamificationItem.findUnique.mockResolvedValue(mockTheme);

      await expect(
        service.buyItem('theme-cyberpunk', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject purchase if item is already unlocked', async () => {
      const userWithItem = {
        ...mockUser,
        unlockedItems: [{ itemId: 'theme-cyberpunk' }],
      };
      prisma.user.findUnique.mockResolvedValue(userWithItem);
      prisma.gamificationItem.findUnique.mockResolvedValue(mockTheme);

      await expect(
        service.buyItem('theme-cyberpunk', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('equipItem', () => {
    it('should equip theme when unlocked by user', async () => {
      const userWithItem = {
        ...mockUser,
        unlockedItems: [{ itemId: 'theme-cyberpunk' }],
      };
      prisma.user.findUnique.mockResolvedValue(userWithItem);
      prisma.user.update.mockResolvedValue({
        ...userWithItem,
        equippedThemeId: 'theme-cyberpunk',
        equippedTheme: mockTheme,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.equipItem('user-1', {
        themeId: 'theme-cyberpunk',
      });

      expect(result.message).toBe('Equipped items updated successfully');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should reject equipping item if user has not unlocked it', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.equipItem('user-1', { themeId: 'theme-cyberpunk' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
