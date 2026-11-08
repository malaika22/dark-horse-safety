import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { LogoutDto, OtpRequestDto, OtpVerifyDto, ResetPasswordDto } from './dto/mobile.dto';
import { MobileAuthService } from './mobile-auth.service';
import { MobileOp } from './mobile-swagger';

const session = {
  accessToken: '<jwt>',
  expiresAt: '2026-11-14T16:00:00.000Z',
  user: {
    id: 'uuid',
    email: 'tech@example.com',
    phone: '15550101234',
    role: 'technician',
    status: 'active',
    displayName: 'Ada Lovelace',
    firstName: 'Ada',
    lastName: 'Lovelace',
  },
};

const otpSent = { sent: true, codeLength: 5, expiresInSeconds: 600, resendAfterSeconds: 90 };

@ApiTags('mobile-auth')
@Controller('mobile/v1/auth')
export class MobileAuthController {
  constructor(private readonly svc: MobileAuthService) {}

  @Post('otp/request')
  @HttpCode(200)
  @MobileOp('AU-1 Send a 5-digit verification code', otpSent)
  request(@Body() dto: OtpRequestDto) {
    return this.svc.requestOtp(dto);
  }

  @Post('otp/verify')
  @HttpCode(200)
  @MobileOp('AU-2 Verify code. LOGIN returns a session. RESET_PASSWORD returns resetToken.', session)
  verify(@Body() dto: OtpVerifyDto) {
    return this.svc.verifyOtp(dto);
  }

  @Post('otp/resend')
  @HttpCode(200)
  @MobileOp('AU-3 Resend code (90 second cooldown). Same body and response as request.', otpSent)
  resend(@Body() dto: OtpRequestDto) {
    return this.svc.requestOtp(dto);
  }

  @Post('reset-password')
  @HttpCode(200)
  @MobileOp('AU-4 Set a new password using a resetToken', { reset: true })
  reset(@Body() dto: ResetPasswordDto) {
    return this.svc.resetPassword(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @MobileOp('AU-5 Sliding session refresh. No body. Same session shape as login.', session)
  refresh(@CurrentUser() user: AuthUser) {
    return this.svc.refresh(user.id);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @MobileOp('AU-6 Logout and unregister the device', { loggedOut: true })
  logout(@CurrentUser() user: AuthUser, @Body() dto: LogoutDto) {
    return this.svc.logout(user.id, dto.deviceId);
  }
}
