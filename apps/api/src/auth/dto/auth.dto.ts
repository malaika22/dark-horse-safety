import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AUTH_LIMITS,
  TOKEN_REGEX,
  VALIDATION_MESSAGES,
} from '@dark-horse-safety/types/validation';
import { IsStrongPassword } from '../../common/validators/is-strong-password.decorator';
import { NormalizeEmail } from '../../common/validators/normalize-email.decorator';
import { IsLoginIdentifier } from '../../common/validators/is-login-identifier.decorator';
import { IsPhoneNumber } from '../../common/validators/is-phone-number.decorator';
import { RequireEmailOrPhoneConstraint } from '../../common/validators/require-email-or-phone.decorator';
import { Match } from './match.decorator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@darkhorseops.com',
    description: 'Email address or mobile number',
  })
  @IsString()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.required })
  @MaxLength(AUTH_LIMITS.emailMaxLength, {
    message: VALIDATION_MESSAGES.emailTooLong,
  })
  @IsLoginIdentifier()
  email!: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.required })
  @MaxLength(AUTH_LIMITS.passwordMaxLength, {
    message: VALIDATION_MESSAGES.passwordTooLong,
  })
  password!: string;
}

export class RegisterDto {
  @ApiPropertyOptional({ example: 'tech.user@darkhorseops.com' })
  @ValidateIf((dto: RegisterDto) => Boolean(dto.email?.trim()))
  @NormalizeEmail()
  @IsEmail({}, { message: VALIDATION_MESSAGES.emailInvalid })
  @MaxLength(AUTH_LIMITS.emailMaxLength, {
    message: VALIDATION_MESSAGES.emailTooLong,
  })
  email?: string;

  @ApiPropertyOptional({ example: '+15551234567' })
  @ValidateIf((dto: RegisterDto) => Boolean(dto.phone?.trim()))
  @IsString()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.required })
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty({
    enum: ['admin', 'technician'],
    example: 'technician',
    description: 'Admin for dashboard app, technician for technician app',
  })
  @Validate(RequireEmailOrPhoneConstraint)
  @IsIn(['admin', 'technician'], {
    message: 'Role must be admin or technician.',
  })
  role!: 'admin' | 'technician';

  @ApiPropertyOptional({ example: 'Alex' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Rivera' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @ApiProperty({ example: 'Password123!', minLength: 8 })
  @IsString()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.required })
  @MinLength(AUTH_LIMITS.passwordMinLength, {
    message: VALIDATION_MESSAGES.passwordTooShort,
  })
  @MaxLength(AUTH_LIMITS.passwordMaxLength, {
    message: VALIDATION_MESSAGES.passwordTooLong,
  })
  @IsStrongPassword()
  password!: string;

  @ApiProperty({ example: 'Password123!', minLength: 8 })
  @IsString()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.required })
  @Match('password', { message: VALIDATION_MESSAGES.passwordMismatch })
  confirmPassword!: string;
}

export class GoogleTokenDto {
  @ApiPropertyOptional({
    description: 'Google Identity Services ID token (credential)',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ValidateIf((o: GoogleTokenDto) => !o.code)
  @IsString()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.required })
  @MinLength(10, { message: VALIDATION_MESSAGES.tokenInvalid })
  idToken?: string;

  @ApiPropertyOptional({
    description:
      'Google Identity Services popup authorization code (ux_mode=popup). Backend exchanges with redirect_uri=postmessage.',
  })
  @ValidateIf((o: GoogleTokenDto) => !o.idToken)
  @IsString()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.required })
  @MinLength(10, { message: VALIDATION_MESSAGES.tokenInvalid })
  code?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@darkhorseops.com' })
  @NormalizeEmail()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.required })
  @IsEmail({}, { message: VALIDATION_MESSAGES.emailInvalid })
  @MaxLength(AUTH_LIMITS.emailMaxLength, {
    message: VALIDATION_MESSAGES.emailTooLong,
  })
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Raw token from reset email link' })
  @IsString()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.tokenMissing })
  @MinLength(AUTH_LIMITS.tokenMinLength, {
    message: VALIDATION_MESSAGES.tokenInvalid,
  })
  @MaxLength(AUTH_LIMITS.tokenMaxLength, {
    message: VALIDATION_MESSAGES.tokenInvalid,
  })
  @Matches(TOKEN_REGEX, { message: VALIDATION_MESSAGES.tokenInvalid })
  token!: string;

  @ApiProperty({ example: 'NewPassword123!', minLength: 8 })
  @IsString()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.required })
  @MinLength(AUTH_LIMITS.passwordMinLength, {
    message: VALIDATION_MESSAGES.passwordTooShort,
  })
  @MaxLength(AUTH_LIMITS.passwordMaxLength, {
    message: VALIDATION_MESSAGES.passwordTooLong,
  })
  @IsStrongPassword()
  password!: string;

  @ApiProperty({ example: 'NewPassword123!', minLength: 8 })
  @IsString()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.required })
  @Match('password', { message: VALIDATION_MESSAGES.passwordMismatch })
  confirmPassword!: string;
}

export class AcceptInviteDto {
  @ApiProperty({ description: 'Raw invite token from invite URL' })
  @IsString()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.tokenMissing })
  @MinLength(AUTH_LIMITS.tokenMinLength, {
    message: VALIDATION_MESSAGES.tokenInvalid,
  })
  @MaxLength(AUTH_LIMITS.tokenMaxLength, {
    message: VALIDATION_MESSAGES.tokenInvalid,
  })
  @Matches(TOKEN_REGEX, { message: VALIDATION_MESSAGES.tokenInvalid })
  inviteToken!: string;

  @ApiProperty({ example: 'Password123!', minLength: 8 })
  @IsString()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.required })
  @MinLength(AUTH_LIMITS.passwordMinLength, {
    message: VALIDATION_MESSAGES.passwordTooShort,
  })
  @MaxLength(AUTH_LIMITS.passwordMaxLength, {
    message: VALIDATION_MESSAGES.passwordTooLong,
  })
  @IsStrongPassword()
  password!: string;

  @ApiProperty({ example: 'Password123!', minLength: 8 })
  @IsString()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.required })
  @Match('password', { message: VALIDATION_MESSAGES.passwordMismatch })
  confirmPassword!: string;
}

export class RequestInviteDto {
  @ApiProperty({ example: 'jwhitfield@dhs.com' })
  @NormalizeEmail()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.required })
  @IsEmail({}, { message: VALIDATION_MESSAGES.emailInvalid })
  @MaxLength(AUTH_LIMITS.emailMaxLength, {
    message: VALIDATION_MESSAGES.emailTooLong,
  })
  email!: string;
}

export class ResendInviteDto {
  @ApiProperty({ example: 'jwhitfield@dhs.com' })
  @NormalizeEmail()
  @IsNotEmpty({ message: VALIDATION_MESSAGES.required })
  @IsEmail({}, { message: VALIDATION_MESSAGES.emailInvalid })
  @MaxLength(AUTH_LIMITS.emailMaxLength, {
    message: VALIDATION_MESSAGES.emailTooLong,
  })
  email!: string;
}
