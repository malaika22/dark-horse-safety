import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { LogoutDto, OtpRequestDto, OtpVerifyDto, ResetPasswordDto } from './dto/mobile.dto';
import { MobileAuthService } from './mobile-auth.service';

@ApiTags('mobile-auth')
@Controller('mobile/v1/auth')
export class MobileAuthController {
  constructor(private readonly svc: MobileAuthService) {}

  @Post('otp/request')
  @HttpCode(200)
  @ApiOperation({ summary: 'AU-1 Send a 5-digit verification code' })
  request(@Body() dto: OtpRequestDto) {
    return this.svc.requestOtp(dto);
  }

  @Post('otp/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'AU-2 Verify code (LOGIN returns a session, RESET_PASSWORD returns resetToken)' })
  verify(@Body() dto: OtpVerifyDto) {
    return this.svc.verifyOtp(dto);
  }

  @Post('otp/resend')
  @HttpCode(200)
  @ApiOperation({ summary: 'AU-3 Resend code (90 second cooldown)' })
  resend(@Body() dto: OtpRequestDto) {
    return this.svc.requestOtp(dto);
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'AU-4 Set a new password using a resetToken' })
  reset(@Body() dto: ResetPasswordDto) {
    return this.svc.resetPassword(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'AU-5 Sliding session refresh' })
  refresh(@CurrentUser() user: AuthUser) {
    return this.svc.refresh(user.id);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'AU-6 Logout and unregister the device' })
  logout(@CurrentUser() user: AuthUser, @Body() dto: LogoutDto) {
    return this.svc.logout(user.id, dto.deviceId);
  }
}
