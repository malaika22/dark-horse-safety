import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
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
import { JwtAuthGuard } from './guards/auth.guards';
import { InviteTokenPipe } from '../common/validators/invite-token.pipe';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @ApiOperation({
    summary: 'Login with email or mobile number and password',
  })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user (Swagger / internal)',
    description:
      'Create admin or technician users. Provide email, phone, or both (at least one required). Seed admin login remains available separately.',
  })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('google')
  @ApiOperation({ summary: 'Login with Google ID token (GIS)' })
  googleToken(@Body() dto: GoogleTokenDto) {
    return this.auth.loginWithGoogleIdToken(dto);
  }

  @Get('google')
  @ApiOperation({
    summary: 'Start Google OAuth redirect flow',
    description: 'Browser redirect — open in browser, not Swagger Try it out.',
  })
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    return;
  }

  @Get('google/callback')
  @ApiOperation({
    summary: 'Google OAuth callback',
    description: 'Redirects to dashboard with accessToken query param.',
  })
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req()
    req: {
      user: {
        googleId: string;
        email: string;
        firstName?: string;
        lastName?: string;
      };
    },
    @Res() res: Response,
  ) {
    const result = await this.auth.upsertGoogleUser(req.user);
    const frontend = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const token = result.data.tokens.accessToken;
    return res.redirect(
      `${frontend}/auth/google/callback?accessToken=${encodeURIComponent(token)}`,
    );
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('resend-reset')
  @ApiOperation({ summary: 'Resend password reset email' })
  resendReset(@Body() dto: ForgotPasswordDto) {
    return this.auth.resendReset(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Set a new password using reset token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Get('invite/:token')
  @ApiOperation({ summary: 'Preview invite by token' })
  @ApiParam({ name: 'token', description: 'Raw invite token from URL' })
  getInvite(@Param('token', InviteTokenPipe) token: string) {
    return this.auth.getInvite(token);
  }

  @Post('invite/accept')
  @ApiOperation({ summary: 'Accept invite and activate account' })
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.auth.acceptInvite(dto);
  }

  @Post('invite/request')
  @ApiOperation({ summary: 'Request a new invite from admin' })
  requestInvite(@Body() dto: RequestInviteDto) {
    return this.auth.requestInvite(dto);
  }

  @Post('invite/resend')
  @ApiOperation({ summary: 'Resend invite email' })
  resendInvite(@Body() dto: ResendInviteDto) {
    return this.auth.resendInvite(dto);
  }
}
