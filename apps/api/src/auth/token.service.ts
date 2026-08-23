import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { AccountStatus, User, UserRole } from '@prisma/client';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
};

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  signAccessToken(user: User) {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email ?? user.phone ?? '',
      role: user.role,
      status: user.status,
    };

    const expiresInConfig = this.config.get<string>('JWT_EXPIRES_IN', '7d');
    const accessToken = this.jwt.sign(payload, {
      expiresIn: expiresInConfig as JwtSignOptions['expiresIn'],
    });
    const expiresAt = this.resolveExpiry(expiresInConfig);

    return {
      accessToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  toSessionUser(user: User) {
    return {
      id: user.id,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
      role: user.role.toLowerCase(),
      status: user.status.toLowerCase(),
      displayName:
        [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        user.email?.split('@')[0] ||
        user.phone ||
        undefined,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
    };
  }

  private resolveExpiry(expiresIn: string): Date {
    const match = /^(\d+)([smhd])$/i.exec(expiresIn.trim());
    const now = Date.now();
    if (!match) {
      return new Date(now + 7 * 24 * 60 * 60 * 1000);
    }
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const ms =
      unit === 's'
        ? amount * 1000
        : unit === 'm'
          ? amount * 60 * 1000
          : unit === 'h'
            ? amount * 60 * 60 * 1000
            : amount * 24 * 60 * 60 * 1000;
    return new Date(now + ms);
  }
}
