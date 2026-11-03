import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { RewardType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EquipItemDto } from './dto/equip-item.dto';
import {
  canPurchaseItem,
  formatUserProfile,
  isErr,
  map,
  pipe,
} from '../common/fp';

@Injectable()
export class GamificationService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedInitialCatalog();
  }

  /**
   * Automatically populates the item catalog with at least 10 extreme items on startup
   */
  async seedInitialCatalog() {
    const items = [
      // 5 Themes (Level 0 base + 4 unlockable themes)
      {
        code: 'THEME_DEFAULT',
        name: 'Ploty Tactile Bento (Nivel 0)',
        description:
          'Tema base oficial Tactile Bento con canvas Sage #C5D4CA, tarjetas blancas y bordes táctiles',
        type: RewardType.THEME,
        unlockLevel: 1,
        costCoins: 0,
        metadata: {
          primaryColor: '#7477FF',
          backgroundColor: '#C5D4CA',
          accentColor: '#F66554',
          glowEffect: false,
        },
      },
      {
        code: 'THEME_DEFAULT_PLOTY',
        name: 'Ploty Indigo Core',
        description:
          'Tema oscuro Obsidian Deep con acentos Indigo y azul eléctrico de alto contraste',
        type: RewardType.THEME,
        unlockLevel: 1,
        costCoins: 0,
        metadata: {
          primaryColor: '#6366F1',
          backgroundColor: '#0F172A',
          accentColor: '#818CF8',
          glowEffect: false,
        },
      },
      {
        code: 'THEME_CYBERPUNK_NEON',
        name: 'Cyberpunk Neon Overdrive',
        description:
          'High-contrast neon cyan and magenta palette with radioactive glow',
        type: RewardType.THEME,
        unlockLevel: 2,
        costCoins: 100,
        metadata: {
          primaryColor: '#F43F5E',
          backgroundColor: '#09090B',
          accentColor: '#06B6D4',
          glowEffect: true,
        },
      },
      {
        code: 'THEME_SOLAR_GOLD',
        name: 'Solar Flare Executive',
        description:
          'Opulent gold and warm amber gradients over deep obsidian',
        type: RewardType.THEME,
        unlockLevel: 3,
        costCoins: 250,
        metadata: {
          primaryColor: '#F59E0B',
          backgroundColor: '#18181B',
          accentColor: '#FBBF24',
          glowEffect: true,
        },
      },
      {
        code: 'THEME_EMERALD_MATRIX',
        name: 'Emerald Matrix Hacker',
        description:
          'Terminal green digital rain style with phosphorescent styling',
        type: RewardType.THEME,
        unlockLevel: 4,
        costCoins: 400,
        metadata: {
          primaryColor: '#10B981',
          backgroundColor: '#022C22',
          accentColor: '#34D399',
          glowEffect: true,
        },
      },
      // 4 Medals
      {
        code: 'MEDAL_FIRST_BLOOD',
        name: 'Primer Paso',
        description: 'Completar tu primera actividad en Ploty',
        type: RewardType.MEDAL,
        unlockLevel: 1,
        costCoins: 0,
        metadata: {
          icon: 'sparkles',
          tier: 'BRONZE',
          color: '#CD7F32',
        },
      },
      {
        code: 'MEDAL_STREAK_3',
        name: 'Llama Constante',
        description: 'Alcanzar una racha activa de 3 días consecutivos',
        type: RewardType.MEDAL,
        unlockLevel: 1,
        costCoins: 50,
        metadata: {
          icon: 'flame',
          tier: 'SILVER',
          color: '#C0C0C0',
        },
      },
      {
        code: 'MEDAL_STREAK_7',
        name: 'Maestro del Hábito',
        description: 'Mantener una racha legendaria de 7 días consecutivos',
        type: RewardType.MEDAL,
        unlockLevel: 2,
        costCoins: 150,
        metadata: {
          icon: 'trophy',
          tier: 'GOLD',
          color: '#FFD700',
        },
      },
      {
        code: 'MEDAL_CENTURION',
        name: 'Centurión Productivo',
        description: 'Alcanzar nivel 3 o completar 10 actividades en total',
        type: RewardType.MEDAL,
        unlockLevel: 3,
        costCoins: 200,
        metadata: {
          icon: 'shield',
          tier: 'PLATINUM',
          color: '#E5E4E2',
        },
      },
      // 2 Frames/Titles
      {
        code: 'FRAME_PLASMA_RING',
        name: 'Anillo de Plasma',
        description: 'Marco holográfico pulsante para el avatar del jugador',
        type: RewardType.AVATAR_FRAME,
        unlockLevel: 2,
        costCoins: 120,
        metadata: {
          borderColor: '#A855F7',
          animation: 'pulse',
        },
      },
      {
        code: 'TITLE_ARCHITECT',
        name: 'Arquitecto del Tiempo',
        description: 'Título honorable otorgado a estrategas de proyectos',
        type: RewardType.TITLE,
        unlockLevel: 3,
        costCoins: 180,
        metadata: {
          badgeText: 'Arquitecto',
          fontStyle: 'uppercase',
        },
      },
    ];

    for (const item of items) {
      await this.prisma.gamificationItem.upsert({
        where: { code: item.code },
        update: {
          name: item.name,
          description: item.description,
          type: item.type,
          unlockLevel: item.unlockLevel,
          costCoins: item.costCoins,
          metadata: item.metadata,
        },
        create: item,
      });
    }
  }

  /**
   * Get item catalog enriched with user ownership and affordability
   */
  async getCatalog(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        unlockedItems: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const catalog = await this.prisma.gamificationItem.findMany({
      orderBy: [{ unlockLevel: 'asc' }, { costCoins: 'asc' }],
    });

    const unlockedIdSet = new Set(user.unlockedItems.map((u) => u.itemId));

    return pipe(
      catalog,
      map((item) => {
        const isUnlocked = unlockedIdSet.has(item.id);
        const isEquipped =
          user.equippedThemeId === item.id || user.equippedMedalId === item.id;
        const canAfford =
          user.coins >= item.costCoins && user.level >= item.unlockLevel;

        return Object.freeze({
          ...item,
          isUnlocked,
          isEquipped,
          canAfford,
        });
      }),
    );
  }

  /**
   * Purchase an item from the shop with pure validation
   */
  async buyItem(itemId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        unlockedItems: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const item = await this.prisma.gamificationItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Item '${itemId}' not found in catalog`);
    }

    const unlockedIds = user.unlockedItems.map((u) => u.itemId);
    const purchaseResult = canPurchaseItem(
      { level: user.level, coins: user.coins },
      item,
      unlockedIds,
    );

    if (isErr(purchaseResult)) {
      throw new BadRequestException(purchaseResult.error);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          coins: purchaseResult.value.remainingCoins,
        },
      });

      const unlock = await tx.userUnlock.create({
        data: {
          userId,
          itemId: item.id,
        },
        include: {
          item: true,
        },
      });

      return {
        message: 'Item purchased successfully',
        item: unlock.item,
        remainingCoins: purchaseResult.value.remainingCoins,
      };
    });
  }

  /**
   * Equip theme or medal
   */
  async equipItem(userId: string, dto: EquipItemDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        unlockedItems: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const unlockedIdSet = new Set(user.unlockedItems.map((u) => u.itemId));
    const updateData: any = {};

    if (dto.themeId) {
      if (!unlockedIdSet.has(dto.themeId)) {
        throw new ForbiddenException(
          'You have not unlocked this visual theme yet',
        );
      }
      updateData.equippedThemeId = dto.themeId;
    }

    if (dto.medalId) {
      if (!unlockedIdSet.has(dto.medalId)) {
        throw new ForbiddenException(
          'You have not unlocked this medal yet',
        );
      }
      updateData.equippedMedalId = dto.medalId;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        equippedTheme: true,
        equippedMedal: true,
      },
    });

    return {
      message: 'Equipped items updated successfully',
      user: formatUserProfile(updatedUser),
    };
  }

  /**
   * Leaderboard (global or project-filtered)
   */
  async getLeaderboard(projectId?: string) {
    const whereClause: any = {};

    if (projectId) {
      whereClause.memberships = {
        some: { projectId },
      };
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      include: {
        equippedTheme: true,
        equippedMedal: true,
      },
      orderBy: [{ xp: 'desc' }, { currentStreak: 'desc' }],
      take: 50,
    });

    return users.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      level: user.level,
      xp: user.xp,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      equippedTheme: user.equippedTheme,
      equippedMedal: user.equippedMedal,
    }));
  }
}
