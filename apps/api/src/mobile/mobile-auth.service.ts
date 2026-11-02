import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt } from 'crypto';
import { MailService } from '../auth/mail.service';
import { TokenService } from '../auth/token.service';
import { PrismaService } from '../prisma/prisma.service';
import { findUserByLoginIdentifier, parseLoginIdentifier } from '../common/utils/user-lookup.util';
import { OtpRequestDto, OtpVerifyDto, ResetPasswordDto } from './dto/mobile.dto';

const CODE_LENGTH = 5;
const CODE_TTL_MIN = 10;
const RESEND_SECONDS = 90;
const MAX_ATTEMPTS = 5;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class MobileAuthService {
  private readonly log = new Logger(MobileAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
  ) {}

  private key(identifier: string) {
    const p = parseLoginIdentifier(identifier);
    return p.email ?? p.phone ?? identifier.trim();
  }

  /** AU-1 / AU-3. Always answers 200 so identifiers cannot be enumerated. */
  async requestOtp(dto: OtpRequestDto) {
    const identifier = this.key(dto.identifier);
    const last = await this.prisma.mobileOtpCode.findFirst({
      where: { identifier, purpose: dto.purpose },
      orderBy: { createdAt: 'desc' },
    });
    if (last) {
      const waited = (Date.now() - last.createdAt.getTime()) / 1000;
      if (waited < RESEND_SECONDS) {
        throw new HttpException(
          {
            code: 'RATE_LIMITED',
            message: 'Please wait before requesting another code.',
            resendAfterSeconds: Math.ceil(RESEND_SECONDS - waited),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const user = await findUserByLoginIdentifier(this.prisma, dto.identifier);
    if (user) {
      const code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
      await this.prisma.mobileOtpCode.create({
        data: {
          identifier,
          purpose: dto.purpose,
          codeHash: sha(`${identifier}:${code}`),
          expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60_000),
        },
      });
      await this.deliver(user.email, identifier, code);
    }
    return {
      data: {
        sent: true,
        codeLength: CODE_LENGTH,
        expiresInSeconds: CODE_TTL_MIN * 60,
        resendAfterSeconds: RESEND_SECONDS,
      },
    };
  }

  private async deliver(email: string | null, identifier: string, code: string) {
    if (email) {
      try {
        await this.mail.sendCrmEmail({
          to: email,
          subject: 'Your Dark Horse Safety verification code',
          title: 'Verification code',
          bodyHtml: `<p>Your verification code is <strong style="font-size:22px;letter-spacing:4px">${code}</strong>.</p><p>It expires in ${CODE_TTL_MIN} minutes.</p>`,
          kind: 'mobile-otp',
        });
        return;
      } catch (e) {
        this.log.warn(`OTP email failed: ${(e as Error).message}`);
      }
    }
    // No SMS provider is configured yet (see integration guide, open question).
    if (process.env.NODE_ENV !== 'production') {
      this.log.log(`[dev] OTP for ${identifier}: ${code}`);
    }
  }

  /** AU-2. LOGIN returns a session; RESET_PASSWORD returns a one-time resetToken. */
  async verifyOtp(dto: OtpVerifyDto) {
    const identifier = this.key(dto.identifier);
    const row = await this.prisma.mobileOtpCode.findFirst({
      where: { identifier, purpose: dto.purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    const invalid = () =>
      new BadRequestException({
        code: 'INVALID_CODE',
        message: 'The code is incorrect or has expired.',
      });
    if (!row || row.expiresAt < new Date()) throw invalid();
    if (row.attempts >= MAX_ATTEMPTS) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many attempts. Request a new code.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (row.codeHash !== sha(`${identifier}:${dto.code}`)) {
      await this.prisma.mobileOtpCode.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
      });
      throw invalid();
    }
    await this.prisma.mobileOtpCode.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });

    const user = await findUserByLoginIdentifier(this.prisma, dto.identifier);
    if (!user) throw invalid();

    if (dto.purpose === 'LOGIN') {
      this.assertActive(user.status);
      return { data: this.session(user) };
    }
    const resetToken = randomBytes(32).toString('hex');
    await this.prisma.mobileOtpCode.create({
      data: {
        identifier: user.id,
        purpose: 'RESET_TOKEN',
        codeHash: sha(resetToken),
        expiresAt: new Date(Date.now() + 15 * 60_000),
      },
    });
    return { data: { resetToken, expiresInSeconds: 900 } };
  }

  /** AU-4. */
  async resetPassword(dto: ResetPasswordDto) {
    const row = await this.prisma.mobileOtpCode.findFirst({
      where: {
        purpose: 'RESET_TOKEN',
        codeHash: sha(dto.resetToken),
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!row) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'The reset link has expired. Start again.',
      });
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.mobileOtpCode.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: row.identifier },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      }),
    ]);
    return { data: { reset: true } };
  }

  /** AU-5: sliding session — trade a valid token for a fresh one. */
  async refresh(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Session expired' });
    this.assertActive(user.status);
    return { data: this.session(user) };
  }

  /** AU-6: drop the device's push registration. */
  async logout(userId: string, deviceId?: string) {
    if (deviceId) {
      await this.prisma.mobileDevice.deleteMany({ where: { userId, deviceId } });
    }
    return { data: { loggedOut: true } };
  }

  private session(user: Parameters<TokenService['signAccessToken']>[0]) {
    const t = this.tokens.signAccessToken(user);
    return { ...t, user: this.tokens.toSessionUser(user) };
  }

  private assertActive(status: AccountStatus) {
    if (status === AccountStatus.DISABLED || status === AccountStatus.INVITED || status === AccountStatus.PENDING_PASSWORD) {
      throw new UnauthorizedException({ code: 'FORBIDDEN', message: 'Account is not active.' });
    }
  }
}
