import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RewardType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { formatUserProfile } from '../common/fp';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Ensures the default visual theme exists in the database.
   */
  private async ensureDefaultTheme() {
    return this.prisma.gamificationItem.upsert({
      where: { code: 'THEME_DEFAULT' },
      update: {},
      create: {
        code: 'THEME_DEFAULT',
        name: 'Ploty Classic Dark',
        description: 'Default obsidian theme with neon purple accents',
        type: RewardType.THEME,
        unlockLevel: 1,
        costCoins: 0,
        metadata: {
          primaryColor: '#6366F1',
          backgroundColor: '#0F172A',
          textColor: '#F8FAFC',
        },
      },
    });
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existing) {
      if (existing.email === dto.email) {
        throw new ConflictException('A user with this email already exists');
      }
      throw new ConflictException('A user with this username already exists');
    }

    const defaultTheme = await this.ensureDefaultTheme();
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
        avatarUrl: dto.avatarUrl,
        xp: 0,
        level: 1,
        coins: 0,
        currentStreak: 0,
        longestStreak: 0,
        equippedThemeId: defaultTheme.id,
        unlockedItems: {
          create: {
            itemId: defaultTheme.id,
          },
        },
      },
      include: {
        equippedTheme: true,
        equippedMedal: true,
      },
    });

    const tokenPayload = {
      sub: newUser.id,
      email: newUser.email,
      username: newUser.username,
    };
    const access_token = await this.jwtService.signAsync(tokenPayload);

    return {
      message: 'User registered successfully',
      access_token,
      user: formatUserProfile(newUser),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        equippedTheme: true,
        equippedMedal: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };
    const access_token = await this.jwtService.signAsync(tokenPayload);

    return {
      access_token,
      user: formatUserProfile(user),
    };
  }
}
