import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  formatUserProfile,
  map,
  pipe,
  sanitizeSearchTerm,
} from '../common/fp';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        equippedTheme: true,
        equippedMedal: true,
        equippedFrame: true,
        equippedTitle: true,
        unlockedItems: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const baseProfile = formatUserProfile(user);

    // Pure functional extraction of unlocked items
    const unlockedMedals = pipe(
      user.unlockedItems,
      map((unlock) => unlock.item),
    );

    return {
      ...baseProfile,
      unlockedMedals,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    if (dto.username !== undefined && dto.username !== currentUser.username) {
      const existingUsername = await this.prisma.user.findFirst({
        where: {
          username: dto.username,
          id: { not: userId },
        },
      });

      if (existingUsername) {
        throw new ConflictException('Ese nombre de usuario ya está en uso');
      }
    }

    const normalizedAvatarUrl =
      dto.avatarUrl === undefined
        ? undefined
        : dto.avatarUrl === null || dto.avatarUrl.trim() === ''
          ? null
          : dto.avatarUrl.trim();

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.username !== undefined ? { username: dto.username } : {}),
        ...(normalizedAvatarUrl !== undefined
          ? { avatarUrl: normalizedAvatarUrl }
          : {}),
      },
      include: {
        equippedTheme: true,
        equippedMedal: true,
        equippedFrame: true,
        equippedTitle: true,
        unlockedItems: {
          include: {
            item: true,
          },
        },
      },
    });

    const baseProfile = formatUserProfile(updatedUser);
    const unlockedMedals = pipe(
      updatedUser.unlockedItems ?? [],
      map((unlock) => unlock.item),
    );

    return {
      ...baseProfile,
      unlockedMedals,
    };
  }

  async searchUsers(query: string, currentUserId?: string) {
    const sanitized = sanitizeSearchTerm(query);
    if (!sanitized || sanitized.length < 2) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          currentUserId ? { id: { not: currentUserId } } : {},
          {
            OR: [
              { username: { contains: sanitized, mode: 'insensitive' } },
              { email: { contains: sanitized, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        xp: true,
        level: true,
        currentStreak: true,
      },
      take: 20,
    });

    // Pure functional mapping and sanitization of search results
    return pipe(
      users,
      map((user) =>
        Object.freeze({
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          level: user.level,
          xp: user.xp,
          currentStreak: user.currentStreak,
        }),
      ),
    );
  }
}
