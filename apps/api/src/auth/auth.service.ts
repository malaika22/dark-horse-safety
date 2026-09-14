import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountStatus, InviteStatus, User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { generateToken, hashToken } from '../common/utils/token.util';
import { MailService } from './mail.service';
import { TokenService } from './token.service';
import {
  AcceptInviteDto,
  ForgotPasswordDto,
  GoogleTokenDto,
  LoginDto,
  RegisterDto,
  RequestInviteDto,
  ResendInviteDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { findUserByLoginIdentifier } from '../common/utils/user-lookup.util';
import { normalizePhone } from '../common/utils/phone.util';

const MAX_ATTEMPTS_DEFAULT = 5;
const LOCK_MINUTES_DEFAULT = 15;

type IdentifierFailure = {
  attempts: number;
  lockedUntil?: number;
};

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  /** Tracks failed logins for unknown / passwordless identifiers (anti-enumeration). */
  private readonly identifierFailures = new Map<string, IdentifierFailure>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.config.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  private maxAttempts() {
    return Number(this.config.get('MAX_LOGIN_ATTEMPTS', MAX_ATTEMPTS_DEFAULT));
  }

  private lockMinutes() {
    return Number(
      this.config.get('LOCK_DURATION_MINUTES', LOCK_MINUTES_DEFAULT),
    );
  }

  private frontendUrl() {
    return this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  private normalizeIdentifier(raw: string) {
    return raw.trim().toLowerCase();
  }

  private incorrectCredentialsMessage(attemptsLeft: number) {
    if (attemptsLeft <= 0) {
      return 'Incorrect email or password.';
    }
    return `Incorrect email or password. ${attemptsLeft} attempt${
      attemptsLeft === 1 ? '' : 's'
    } left.`;
  }

  private remainingLockMinutes(lockedUntil: Date | number) {
    const until =
      lockedUntil instanceof Date ? lockedUntil.getTime() : lockedUntil;
    return Math.max(1, Math.ceil((until - Date.now()) / 60_000));
  }

  private clearIdentifierFailures(identifier: string) {
    this.identifierFailures.delete(this.normalizeIdentifier(identifier));
  }

  private assertIdentifierNotLocked(identifier: string) {
    const key = this.normalizeIdentifier(identifier);
    const entry = this.identifierFailures.get(key);
    if (!entry?.lockedUntil) return;

    if (entry.lockedUntil > Date.now()) {
      const minutes = this.remainingLockMinutes(entry.lockedUntil);
      throw new HttpException(
        {
          code: 'ACCOUNT_LOCKED',
          message: `Too many failed attempts. Your account is locked for ${minutes} minute${minutes === 1 ? '' : 's'}. Try again after the lock expires, or reset your password.`,
          lockedUntil: new Date(entry.lockedUntil).toISOString(),
          lockDurationMinutes: minutes,
          maxLoginAttempts: this.maxAttempts(),
          attemptsLeft: 0,
        },
        HttpStatus.LOCKED,
      );
    }

    // Lock window ended — resume fresh attempts
    this.identifierFailures.delete(key);
  }

  private handleUnknownLogin(identifier: string): never {
    this.assertIdentifierNotLocked(identifier);

    const key = this.normalizeIdentifier(identifier);
    const max = this.maxAttempts();
    const prev = this.identifierFailures.get(key)?.attempts ?? 0;
    const attempts = prev + 1;
    const remaining = Math.max(max - attempts, 0);

    if (attempts >= max) {
      const lockedUntil = Date.now() + this.lockMinutes() * 60_000;
      this.identifierFailures.set(key, { attempts, lockedUntil });
      throw new HttpException(
        {
          code: 'ACCOUNT_LOCKED',
          message: `Too many failed attempts. Your account is locked for ${this.lockMinutes()} minutes. Try again after the lock expires, or reset your password.`,
          lockedUntil: new Date(lockedUntil).toISOString(),
          attemptsLeft: 0,
          lockDurationMinutes: this.lockMinutes(),
          maxLoginAttempts: max,
        },
        HttpStatus.LOCKED,
      );
    }

    this.identifierFailures.set(key, { attempts });
    throw new UnauthorizedException({
      code: 'UNAUTHORIZED',
      message: this.incorrectCredentialsMessage(remaining),
      attemptsLeft: remaining,
      maxLoginAttempts: max,
    });
  }

  private authResponse(user: User) {
    const token = this.tokens.signAccessToken(user);
    return {
      data: {
        tokens: token,
        user: this.tokens.toSessionUser(user),
        userId: user.id,
      },
    };
  }

  async login(dto: LoginDto) {
    const identifier = dto.email;
    let user = await findUserByLoginIdentifier(this.prisma, identifier);

    if (!user || !user.passwordHash) {
      this.handleUnknownLogin(identifier);
    }

    user = await this.resumeIfLockExpired(user);
    this.assertStillLocked(user);
    this.assertIdentifierNotLocked(identifier);

    const passwordHash = user.passwordHash;
    if (!passwordHash) {
      this.handleUnknownLogin(identifier);
    }

    const valid = await bcrypt.compare(dto.password, passwordHash);
    if (!valid) {
      return this.handleFailedLogin(user, identifier);
    }

    if (
      user.status === AccountStatus.DISABLED ||
      user.status === AccountStatus.INVITED ||
      user.status === AccountStatus.PENDING_PASSWORD
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Account is not active. Complete invite activation first.',
      });
    }

    this.clearIdentifierFailures(identifier);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        status:
          user.status === AccountStatus.LOCKED
            ? AccountStatus.ACTIVE
            : user.status,
      },
    });

    return this.authResponse(updated);
  }

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Passwords do not match',
      });
    }

    const email = dto.email?.trim().toLowerCase();
    const phone = dto.phone?.trim() ? normalizePhone(dto.phone) : undefined;

    if (!email && !phone) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Either email or phone is required.',
        details: {
          email: ['Either email or phone is required.'],
          phone: ['Either email or phone is required.'],
        },
      });
    }

    if (email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existingEmail) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'A user with this email already exists.',
          details: { email: ['A user with this email already exists.'] },
        });
      }
    }

    if (phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone },
      });
      if (existingPhone) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'A user with this phone already exists.',
          details: { phone: ['A user with this phone already exists.'] },
        });
      }
    }

    const role = dto.role === 'admin' ? UserRole.ADMIN : UserRole.TECHNICIAN;
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: email ?? null,
        phone: phone ?? null,
        passwordHash,
        firstName: dto.firstName?.trim() || null,
        lastName: dto.lastName?.trim() || null,
        role,
        status: AccountStatus.ACTIVE,
      },
    });

    return {
      data: {
        message: 'User registered successfully. You can sign in now.',
        user: this.tokens.toSessionUser(user),
      },
    };
  }

  /**
   * After the 15-minute lock window ends, clear lock state so the user can
   * sign in again with a fresh attempt counter.
   */
  private async resumeIfLockExpired(user: User): Promise<User> {
    const lockExpired =
      Boolean(user.lockedUntil) && user.lockedUntil! <= new Date();
    const staleLockStatus =
      user.status === AccountStatus.LOCKED &&
      (!user.lockedUntil || user.lockedUntil <= new Date());

    if (!lockExpired && !staleLockStatus) {
      return user;
    }

    this.clearIdentifierFailures(user.email ?? user.phone ?? user.id);

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        status: AccountStatus.ACTIVE,
      },
    });
  }

  private assertStillLocked(user: User) {
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = this.remainingLockMinutes(user.lockedUntil);
      throw new HttpException(
        {
          code: 'ACCOUNT_LOCKED',
          message: `Too many failed attempts. Your account is locked for ${minutes} minute${minutes === 1 ? '' : 's'}. Try again after the lock expires, or reset your password.`,
          lockedUntil: user.lockedUntil.toISOString(),
          lockDurationMinutes: minutes,
          maxLoginAttempts: this.maxAttempts(),
          attemptsLeft: 0,
        },
        HttpStatus.LOCKED,
      );
    }
  }

  private async handleFailedLogin(user: User, identifier: string) {
    const max = this.maxAttempts();
    const attempts = user.failedLoginAttempts + 1;
    const remaining = Math.max(max - attempts, 0);

    if (attempts >= max) {
      const lockedUntil = new Date(Date.now() + this.lockMinutes() * 60 * 1000);
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil,
          status: AccountStatus.LOCKED,
        },
      });
      this.identifierFailures.set(this.normalizeIdentifier(identifier), {
        attempts,
        lockedUntil: lockedUntil.getTime(),
      });

      throw new HttpException(
        {
          code: 'ACCOUNT_LOCKED',
          message: `Too many failed attempts. Your account is locked for ${this.lockMinutes()} minutes. Try again after the lock expires, or reset your password.`,
          lockedUntil: lockedUntil.toISOString(),
          attemptsLeft: 0,
          lockDurationMinutes: this.lockMinutes(),
          maxLoginAttempts: max,
        },
        HttpStatus.LOCKED,
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: attempts },
    });

    throw new UnauthorizedException({
      code: 'UNAUTHORIZED',
      message: this.incorrectCredentialsMessage(remaining),
      attemptsLeft: remaining,
      maxLoginAttempts: max,
    });
  }

  async loginWithGoogleIdToken(dto: GoogleTokenDto) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Google login is not configured',
      });
    }

    let idToken = dto.idToken?.trim();

    // GIS popup sends an auth code; exchange with redirect_uri=postmessage
    if (!idToken && dto.code) {
      if (!clientSecret) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Google client secret is not configured',
        });
      }
      try {
        const oauth = new OAuth2Client(clientId, clientSecret, 'postmessage');
        const { tokens } = await oauth.getToken(dto.code.trim());
        idToken = tokens.id_token ?? undefined;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Google code exchange failed';
        throw new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message,
        });
      }
    }

    if (!idToken) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Provide Google idToken or authorization code',
      });
    }

    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid Google token',
      });
    }

    return this.upsertGoogleUser({
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      firstName: payload.given_name,
      lastName: payload.family_name,
    });
  }

  async upsertGoogleUser(profile: {
    googleId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }) {
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: profile.googleId }, { email: profile.email }],
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          googleId: profile.googleId,
          firstName: profile.firstName,
          lastName: profile.lastName,
          status: AccountStatus.ACTIVE,
          role: UserRole.OPERATOR,
        },
      });
    } else {
      if (user.status === AccountStatus.DISABLED) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Account is disabled',
        });
      }

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId ?? profile.googleId,
          firstName: user.firstName ?? profile.firstName,
          lastName: user.lastName ?? profile.lastName,
          status:
            user.status === AccountStatus.INVITED ||
            user.status === AccountStatus.PENDING_PASSWORD
              ? AccountStatus.ACTIVE
              : user.status === AccountStatus.LOCKED
                ? AccountStatus.ACTIVE
                : user.status,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    }

    return this.authResponse(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'User not found',
      });
    }
    return { data: this.tokens.toSessionUser(user) };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always succeed to avoid email enumeration
    if (user?.passwordHash) {
      const raw = generateToken();
      const minutes = Number(
        this.config.get('PASSWORD_RESET_EXPIRES_MINUTES', 60),
      );
      const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

      await this.prisma.passwordResetToken.create({
        data: {
          tokenHash: hashToken(raw),
          userId: user.id,
          expiresAt,
        },
      });

      const resetUrl = `${this.frontendUrl()}/reset-password/set-new?token=${raw}`;
      await this.mail.sendPasswordReset(email, resetUrl, false);
    }

    return {
      data: {
        message: 'If an account exists, a reset link has been sent',
        expiresInSeconds:
          Number(this.config.get('PASSWORD_RESET_EXPIRES_MINUTES', 60)) * 60,
      },
    };
  }

  async resendReset(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user?.passwordHash) {
      const raw = generateToken();
      const minutes = Number(
        this.config.get('PASSWORD_RESET_EXPIRES_MINUTES', 60),
      );
      const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

      await this.prisma.passwordResetToken.create({
        data: {
          tokenHash: hashToken(raw),
          userId: user.id,
          expiresAt,
        },
      });

      const resetUrl = `${this.frontendUrl()}/reset-password/set-new?token=${raw}`;
      await this.mail.sendPasswordReset(email, resetUrl, true);
    }

    return {
      data: {
        message: 'If an account exists, a reset link has been sent',
        expiresInSeconds:
          Number(this.config.get('PASSWORD_RESET_EXPIRES_MINUTES', 60)) * 60,
      },
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Passwords do not match',
      });
    }

    const tokenHash = hashToken(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Reset link is invalid or expired',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = record.user;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: AccountStatus.ACTIVE,
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Clear in-memory lock tracking so login works immediately after reset
    if (user.email) this.clearIdentifierFailures(user.email);
    if (user.phone) this.clearIdentifierFailures(user.phone);

    return {
      data: { message: 'Password updated successfully' },
    };
  }

  async getInvite(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const invite = await this.prisma.invite.findUnique({
      where: { tokenHash },
      include: { inviter: true },
    });

    if (!invite) {
      throw new BadRequestException({
        code: 'NOT_FOUND',
        message: 'Invite not found',
      });
    }

    if (
      invite.status !== InviteStatus.PENDING ||
      invite.expiresAt < new Date()
    ) {
      if (invite.status === InviteStatus.PENDING) {
        await this.prisma.invite.update({
          where: { id: invite.id },
          data: { status: InviteStatus.EXPIRED },
        });
      }
      throw new HttpException(
        {
          code: 'INVITE_EXPIRED',
          message: 'This invite link has expired',
        },
        HttpStatus.GONE,
      );
    }

    return {
      data: {
        email: invite.email,
        role: invite.role.toLowerCase(),
        inviterName: invite.inviter
          ? [invite.inviter.firstName, invite.inviter.lastName]
              .filter(Boolean)
              .join(' ') || invite.inviter.email
          : undefined,
        expiresAt: invite.expiresAt.toISOString(),
      },
    };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Passwords do not match',
      });
    }

    const tokenHash = hashToken(dto.inviteToken);
    const invite = await this.prisma.invite.findUnique({
      where: { tokenHash },
    });

    if (
      !invite ||
      invite.status !== InviteStatus.PENDING ||
      invite.expiresAt < new Date()
    ) {
      throw new HttpException(
        {
          code: 'INVITE_EXPIRED',
          message: 'This invite link has expired',
        },
        HttpStatus.GONE,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const email = invite.email.toLowerCase();

    const user = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email } });
      const saved = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              passwordHash,
              role: invite.role,
              status: AccountStatus.ACTIVE,
              failedLoginAttempts: 0,
              lockedUntil: null,
            },
          })
        : await tx.user.create({
            data: {
              email,
              passwordHash,
              role: invite.role,
              status: AccountStatus.ACTIVE,
            },
          });

      await tx.invite.update({
        where: { id: invite.id },
        data: {
          status: InviteStatus.ACCEPTED,
          acceptedAt: new Date(),
          inviteeId: saved.id,
        },
      });

      return saved;
    });

    return this.authResponse(user);
  }

  async requestInvite(dto: RequestInviteDto) {
    const email = dto.email.trim().toLowerCase();
    await this.mail.notifyInviteRequest(email);
    return {
      data: {
        message:
          'Your administrator will receive a request to send a new invite',
        email,
      },
    };
  }

  async resendInvite(dto: ResendInviteDto) {
    const email = dto.email.trim().toLowerCase();
    const result = await this.issueAndSendInvite(email, true);
    return {
      data: {
        message: 'Invite resent',
        email: result.email,
        expiresAt: result.expiresAt,
        expiresInDays: result.expiresInDays,
      },
    };
  }

  /** Create or refresh invite token and email the accept URL to the user. */
  private async issueAndSendInvite(email: string, isResend: boolean) {
    const days = Number(this.config.get('INVITE_EXPIRES_DAYS', 7));

    const pending = await this.prisma.invite.findFirst({
      where: {
        email,
        status: { in: [InviteStatus.PENDING, InviteStatus.EXPIRED] },
      },
      orderBy: { createdAt: 'desc' },
      include: { inviter: true },
    });

    const raw = generateToken();
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    if (pending) {
      await this.prisma.invite.update({
        where: { id: pending.id },
        data: {
          tokenHash: hashToken(raw),
          status: InviteStatus.PENDING,
          expiresAt,
          acceptedAt: null,
        },
      });
    } else {
      await this.prisma.invite.create({
        data: {
          email,
          tokenHash: hashToken(raw),
          role: UserRole.OPERATOR,
          status: InviteStatus.PENDING,
          expiresAt,
        },
      });

      await this.prisma.user.upsert({
        where: { email },
        create: {
          email,
          status: AccountStatus.INVITED,
          role: UserRole.OPERATOR,
        },
        update: { status: AccountStatus.INVITED },
      });
    }

    const inviteUrl = `${this.frontendUrl()}/invite/accept?token=${raw}&email=${encodeURIComponent(email)}`;
    await this.mail.sendInvite(
      email,
      inviteUrl,
      pending?.inviter
        ? [pending.inviter.firstName, pending.inviter.lastName]
            .filter(Boolean)
            .join(' ')
        : undefined,
      isResend,
    );

    return {
      email,
      expiresAt: expiresAt.toISOString(),
      expiresInDays: days,
      inviteUrl,
    };
  }
}
