import * as dotenv from 'dotenv';
dotenv.config();

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.trim().length === 0) {
      throw new Error(
        'FATAL: JWT_SECRET environment variable is required and cannot use an insecure fallback.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        equippedTheme: true,
        equippedMedal: true,
        equippedFrame: true,
        equippedTitle: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists or session is invalid');
    }

    return user;
  }
}
