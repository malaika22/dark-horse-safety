import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsStrongPassword } from '../../common/validators/is-strong-password.decorator';

export class Idem {
  @IsOptional() @IsString() @MaxLength(100) clientRequestId?: string;
}

export class PageQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

// ── Auth ──
export class OtpRequestDto {
  @IsString() @IsNotEmpty() @MaxLength(255) identifier!: string;
  @IsIn(['LOGIN', 'RESET_PASSWORD']) purpose!: 'LOGIN' | 'RESET_PASSWORD';
}
export class OtpVerifyDto extends OtpRequestDto {
  @IsString() @MinLength(5) @MaxLength(5) code!: string;
}
export class ResetPasswordDto {
  @IsString() @IsNotEmpty() resetToken!: string;
  @IsStrongPassword() newPassword!: string;
}
export class LogoutDto {
  @IsOptional() @IsString() deviceId?: string;
}

// ── Profile ──
export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(60) emergencyContactName?: string;
  @IsOptional() @IsString() @MaxLength(30) emergencyContactPhone?: string;
}
export class HomeLocationDto {
  @IsString() @IsNotEmpty() @MaxLength(300) address!: string;
  @IsNumber() @Min(-90) @Max(90) lat!: number;
  @IsNumber() @Min(-180) @Max(180) lng!: number;
}
export class HomeLocationChangeDto extends HomeLocationDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
export class ChangePasswordDto {
  @IsString() @IsNotEmpty() currentPassword!: string;
  @IsStrongPassword() newPassword!: string;
}
export class SettingsDto {
  @IsOptional() @IsIn(['REGULAR', 'ON_JOB_TRAINING', 'NON_BILLABLE']) defaultTimeCategory?: string;
  @IsOptional() @IsBoolean() notificationsEnabled?: boolean;
}
export class DeviceDto {
  @IsString() @IsNotEmpty() @MaxLength(120) deviceId!: string;
  @IsIn(['ios', 'android']) platform!: 'ios' | 'android';
  @IsOptional() @IsString() @MaxLength(500) pushToken?: string;
  @IsOptional() @IsString() @MaxLength(30) appVersion?: string;
  @IsOptional() @IsIn(['ALWAYS', 'WHILE_USING', 'DENIED']) locationPermission?: string;
  @IsOptional() @IsBoolean() pushEnabled?: boolean;
}
export class NoteDto extends Idem {
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
export class SupervisorMessageDto extends Idem {
  @IsOptional() @IsString() @MaxLength(150) subject?: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) body!: string;
  @IsOptional() @IsString() workOrderId?: string;
}

// ── Clock ──
export class GeoDto extends Idem {
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsNumber() accuracyM?: number;
  @IsOptional() @IsDateString() capturedAt?: string;
}
export class ClockInDto extends GeoDto {
  @IsOptional() @IsString() workOrderId?: string;
  @IsOptional() @IsString() assignmentId?: string;
  @IsOptional() @IsIn(['REGULAR', 'ON_JOB_TRAINING', 'NON_BILLABLE']) category?: string;
  @IsOptional() @IsString() @MaxLength(200) nonBillableReason?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
export class PauseDto extends Idem {
  @IsIn(['BREAK', 'WAITING_ON_CUSTOMER', 'EQUIPMENT_ISSUE', 'TRAVEL_STANDBY', 'ADMIN_TASK', 'NON_BILLABLE_CUSTOMER_DELAY', 'OTHER'])
  reason!: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @IsString() @MaxLength(500) photoUrl?: string;
  @IsOptional() @IsDateString() capturedAt?: string;
}
export class ResumeDto extends Idem {
  @IsOptional() @IsDateString() capturedAt?: string;
}
export class SyncEventDto {
  @IsString() @IsNotEmpty() clientRequestId!: string;
  @IsIn(['CLOCK_IN', 'CLOCK_OUT', 'PAUSE', 'RESUME']) type!: string;
  @IsObject() payload!: Record<string, unknown>;
}
export class SyncDto {
  @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => SyncEventDto) events!: SyncEventDto[];
}
export class GpsExplanationDto extends Idem {
  @IsString() @IsNotEmpty() gpsFlagId!: string;
  @IsString() @IsNotEmpty() @MaxLength(500) text!: string;
  @IsOptional() @IsString() @MaxLength(500) attachmentUrl?: string;
}

// ── Jobs ──
export class JobsQuery extends PageQuery {
  @IsOptional() @IsIn(['ASSIGNED', 'ACCEPTED', 'RECENT', 'COMPLETED']) tab?: string;
}
export class DeclineDto extends Idem {
  @IsIn(['NOT_AVAILABLE', 'WRONG_ASSIGNMENT', 'CERTIFICATION_ISSUE', 'EQUIPMENT_ISSUE', 'SCHEDULE_CONFLICT', 'OTHER'])
  reason!: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
export class CloseoutDto extends Idem {
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsOptional() @IsString() @MaxLength(500) signatureUrl?: string;
}
export class SalesLineDto {
  @IsString() @IsNotEmpty() item!: string;
  @IsNumber() @Min(0) hours!: number;
  @IsNumber() @Min(0) rate!: number;
}
export class SalesTicketDto extends Idem {
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => SalesLineDto) lineItems!: SalesLineDto[];
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

// ── Forms ──
export class FormsQuery {
  @IsOptional() @IsIn(['REQUIRED', 'DRAFT', 'OPTIONAL', 'SUBMITTED']) tab?: string;
  @IsOptional() @IsString() workOrderId?: string;
}
export class FormSubmitDto extends Idem {
  @IsOptional() @IsString() workOrderId?: string;
  @IsObject() values!: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(500) signatureUrl?: string;
  @IsOptional() @IsDateString() capturedAt?: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
}
export class CorrectionResubmitDto extends Idem {
  @IsObject() values!: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
export class AdditionalFormDto extends Idem {
  @IsString() @IsNotEmpty() workOrderId!: string;
  @IsString() @IsNotEmpty() @MaxLength(150) formType!: string;
  @IsString() @IsNotEmpty() @MaxLength(300) reason!: string;
  @IsString() @IsNotEmpty() @MaxLength(500) scopeChangeDescription!: string;
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'HIGH_WORK_STOPPED']) urgency!: string;
  @IsOptional() @IsString() @MaxLength(500) photoUrl?: string;
}
export class AdditionalFormRespondDto extends Idem {
  @IsString() @IsNotEmpty() @MaxLength(500) message!: string;
  @IsOptional() @IsString() @MaxLength(500) attachmentUrl?: string;
}

// ── Timesheet ──
export class TimesheetQuery {
  @IsOptional() @IsIn(['CURRENT_WEEK', 'PREVIOUS_DAY', 'LAST_WEEK']) range?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
export class EditRequestDto extends Idem {
  @IsString() @IsNotEmpty() timeEntryId!: string;
  @IsOptional() @IsString() @MaxLength(5) requestedClockIn?: string;
  @IsOptional() @IsString() @MaxLength(5) requestedClockOut?: string;
  @IsString() @IsNotEmpty() @MaxLength(60) reasonCode!: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
export class EditRespondDto extends Idem {
  @IsString() @IsNotEmpty() @MaxLength(500) message!: string;
  @IsOptional() @IsString() @MaxLength(500) attachmentUrl?: string;
}
export class EntryNotesDto {
  @IsString() @MaxLength(500) notes!: string;
}

// ── Time off ──
export class TimeOffPreviewDto {
  @IsIn(['PTO', 'SICK', 'HOLIDAY', 'UNPAID']) type!: string;
  @IsDateString() startAt!: string;
  @IsDateString() endAt!: string;
  @IsOptional() @IsBoolean() partialDay?: boolean;
  @IsOptional() @IsNumber() @Min(0.5) @Max(24) partialHours?: number;
}
export class TimeOffCreateDto extends TimeOffPreviewDto {
  @IsOptional() @IsString() clientRequestId?: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @IsOptional() @IsString() @MaxLength(500) signatureUrl?: string;
}

// ── Notifications ──
export class NotificationsQuery extends PageQuery {
  @IsOptional() @IsIn(['ALL', 'UNREAD', 'ACTION_REQUIRED', 'RESOLVED']) tab?: string;
}
