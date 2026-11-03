import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  formatUserProfile,
  map,
  pipe,
  sanitizeSearchTerm,
} from '../common/fp';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        equippedTheme: true,
        equippedMedal: true,
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
