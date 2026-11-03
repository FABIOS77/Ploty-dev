import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedPasswordSample'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AuthService Unit Tests', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  const mockDefaultTheme = {
    id: 'theme-uuid-1',
    code: 'THEME_DEFAULT',
    name: 'Ploty Classic Dark',
    type: 'THEME',
  };

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@ploty.app',
    username: 'ploty_tester',
    passwordHash: '$2b$10$hashedPasswordSample',
    avatarUrl: null,
    xp: 0,
    level: 1,
    coins: 0,
    currentStreak: 0,
    longestStreak: 0,
    equippedThemeId: 'theme-uuid-1',
    equippedMedalId: null,
    equippedTheme: mockDefaultTheme,
    equippedMedal: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      gamificationItem: {
        upsert: jest.fn().mockResolvedValue(mockDefaultTheme),
      },
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mocked_jwt_token_ploty'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user with level 1 and default theme', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedPasswordSample');

      const result = await service.register({
        email: 'test@ploty.app',
        username: 'ploty_tester',
        password: 'Password123!',
      });

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: 'test@ploty.app' }, { username: 'ploty_tester' }],
        },
      });
      expect(prisma.gamificationItem.upsert).toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalled();
      expect(jwtService.signAsync).toHaveBeenCalled();
      expect(result.access_token).toBe('mocked_jwt_token_ploty');
      expect(result.user.username).toBe('ploty_tester');
      expect(result.user.stats.level).toBe(1);
    });

    it('should throw ConflictException if email is already taken', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-uuid-9',
        email: 'test@ploty.app',
        username: 'other_user',
      });

      await expect(
        service.register({
          email: 'test@ploty.app',
          username: 'ploty_tester',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if username is already taken', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-uuid-9',
        email: 'other@ploty.app',
        username: 'ploty_tester',
      });

      await expect(
        service.register({
          email: 'new@ploty.app',
          username: 'ploty_tester',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should authenticate user and return access token + profile', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@ploty.app',
        password: 'Password123!',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@ploty.app' },
        include: {
          equippedTheme: true,
          equippedMedal: true,
        },
      });
      expect(result.access_token).toBe('mocked_jwt_token_ploty');
      expect(result.user.email).toBe('test@ploty.app');
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@ploty.app',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'test@ploty.app',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
