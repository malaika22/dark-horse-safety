import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiPropertyOptional({ example: '3f1c2a40-7b1e-4d2a-9c11-0a1b2c3d4e5f', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100) clientRequestId?: string;
}

export class PageQuery {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional({ example: 25, minimum: 1, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class OtpRequestDto {
  @ApiProperty({ example: 'tech@example.com', description: 'Email or phone. Phone is matched on digits only.' })
  @IsString() @IsNotEmpty() @MaxLength(255) identifier!: string;
  @ApiProperty({ enum: ['LOGIN', 'RESET_PASSWORD'], example: 'LOGIN' })
  @IsIn(['LOGIN', 'RESET_PASSWORD']) purpose!: 'LOGIN' | 'RESET_PASSWORD';
}
export class OtpVerifyDto extends OtpRequestDto {
  @ApiProperty({ example: '04821', minLength: 5, maxLength: 5 })
  @IsString() @MinLength(5) @MaxLength(5) code!: string;
}
export class ResetPasswordDto {
  @ApiProperty({ example: 'hex-reset-token-from-verify' })
  @IsString() @IsNotEmpty() resetToken!: string;
  @ApiProperty({ example: 'Newpass1', description: '7–128 chars, at least one letter and one number.' })
  @IsStrongPassword() newPassword!: string;
}
export class LogoutDto {
  @ApiPropertyOptional({ example: 'install-uuid' })
  @IsOptional() @IsString() deviceId?: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '15550101234' })
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional({ example: 'Sam' })
  @IsOptional() @IsString() @MaxLength(60) emergencyContactName?: string;
  @ApiPropertyOptional({ example: '15550109999' })
  @IsOptional() @IsString() @MaxLength(30) emergencyContactPhone?: string;
}
export class HomeLocationDto {
  @ApiProperty({ example: '1 Main St, Dallas, TX' })
  @IsString() @IsNotEmpty() @MaxLength(300) address!: string;
  @ApiProperty({ example: 32.78, minimum: -90, maximum: 90 })
  @IsNumber() @Min(-90) @Max(90) lat!: number;
  @ApiProperty({ example: -96.8, minimum: -180, maximum: 180 })
  @IsNumber() @Min(-180) @Max(180) lng!: number;
}
export class HomeLocationChangeDto extends HomeLocationDto {
  @ApiPropertyOptional({ example: 'Moved across town' })
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
export class ChangePasswordDto {
  @ApiProperty({ example: 'Oldpass1' })
  @IsString() @IsNotEmpty() currentPassword!: string;
  @ApiProperty({ example: 'Newpass1' })
  @IsStrongPassword() newPassword!: string;
}
export class SettingsDto {
  @ApiPropertyOptional({ enum: ['REGULAR', 'ON_JOB_TRAINING', 'NON_BILLABLE'], example: 'REGULAR' })
  @IsOptional() @IsIn(['REGULAR', 'ON_JOB_TRAINING', 'NON_BILLABLE']) defaultTimeCategory?: string;
  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() notificationsEnabled?: boolean;
}
export class DeviceDto {
  @ApiProperty({ example: 'install-uuid' })
  @IsString() @IsNotEmpty() @MaxLength(120) deviceId!: string;
  @ApiProperty({ enum: ['ios', 'android'], example: 'ios' })
  @IsIn(['ios', 'android']) platform!: 'ios' | 'android';
  @ApiPropertyOptional({ example: 'apns-or-fcm-token' })
  @IsOptional() @IsString() @MaxLength(500) pushToken?: string;
  @ApiPropertyOptional({ example: '1.4.0' })
  @IsOptional() @IsString() @MaxLength(30) appVersion?: string;
  @ApiPropertyOptional({ enum: ['ALWAYS', 'WHILE_USING', 'DENIED'], example: 'WHILE_USING' })
  @IsOptional() @IsIn(['ALWAYS', 'WHILE_USING', 'DENIED']) locationPermission?: string;
  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() pushEnabled?: boolean;
}
export class NoteDto extends Idem {
  @ApiPropertyOptional({ example: 'Need a hand with the vessel entry' })
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
export class SupervisorMessageDto extends Idem {
  @ApiPropertyOptional({ example: 'Gate code' })
  @IsOptional() @IsString() @MaxLength(150) subject?: string;
  @ApiProperty({ example: 'Customer changed the muster point.' })
  @IsString() @IsNotEmpty() @MaxLength(1000) body!: string;
  @ApiPropertyOptional({ example: 'work-order-uuid' })
  @IsOptional() @IsString() workOrderId?: string;
}

export class GeoDto extends Idem {
  @ApiPropertyOptional({ example: 32.78 })
  @IsOptional() @IsNumber() lat?: number;
  @ApiPropertyOptional({ example: -96.8 })
  @IsOptional() @IsNumber() lng?: number;
  @ApiPropertyOptional({ example: 8 })
  @IsOptional() @IsNumber() accuracyM?: number;
  @ApiPropertyOptional({ example: '2026-11-07T12:05:00.000Z' })
  @IsOptional() @IsDateString() capturedAt?: string;
}
export class ClockInDto extends GeoDto {
  @ApiPropertyOptional({ example: 'work-order-uuid' })
  @IsOptional() @IsString() workOrderId?: string;
  @ApiPropertyOptional({ example: 'assignment-uuid' })
  @IsOptional() @IsString() assignmentId?: string;
  @ApiPropertyOptional({ enum: ['REGULAR', 'ON_JOB_TRAINING', 'NON_BILLABLE'], example: 'REGULAR' })
  @IsOptional() @IsIn(['REGULAR', 'ON_JOB_TRAINING', 'NON_BILLABLE']) category?: string;
  @ApiPropertyOptional({ example: 'Waiting on customer', description: 'Required when category is NON_BILLABLE.' })
  @IsOptional() @IsString() @MaxLength(200) nonBillableReason?: string;
  @ApiPropertyOptional({ example: 'Arrived at north gate' })
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
export class PauseDto extends Idem {
  @ApiProperty({
    enum: ['BREAK', 'WAITING_ON_CUSTOMER', 'EQUIPMENT_ISSUE', 'TRAVEL_STANDBY', 'ADMIN_TASK', 'NON_BILLABLE_CUSTOMER_DELAY', 'OTHER'],
    example: 'BREAK',
  })
  @IsIn(['BREAK', 'WAITING_ON_CUSTOMER', 'EQUIPMENT_ISSUE', 'TRAVEL_STANDBY', 'ADMIN_TASK', 'NON_BILLABLE_CUSTOMER_DELAY', 'OTHER'])
  reason!: string;
  @ApiPropertyOptional({ example: 'Lunch', description: 'Required when reason is OTHER.' })
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @ApiPropertyOptional({ example: 'https://cdn.example/photo.jpg' })
  @IsOptional() @IsString() @MaxLength(500) photoUrl?: string;
  @ApiPropertyOptional({ example: '2026-11-07T16:00:00.000Z' })
  @IsOptional() @IsDateString() capturedAt?: string;
}
export class ResumeDto extends Idem {
  @ApiPropertyOptional({ example: '2026-11-07T16:30:00.000Z' })
  @IsOptional() @IsDateString() capturedAt?: string;
}
export class SyncEventDto {
  @ApiProperty({ example: 'uuid-1' })
  @IsString() @IsNotEmpty() clientRequestId!: string;
  @ApiProperty({ enum: ['CLOCK_IN', 'CLOCK_OUT', 'PAUSE', 'RESUME'], example: 'CLOCK_IN' })
  @IsIn(['CLOCK_IN', 'CLOCK_OUT', 'PAUSE', 'RESUME']) type!: string;
  @ApiProperty({
    example: { workOrderId: 'uuid', lat: 32.78, lng: -96.8, capturedAt: '2026-11-07T12:05:00.000Z' },
  })
  @IsObject() payload!: Record<string, unknown>;
}
export class SyncDto {
  @ApiProperty({ type: [SyncEventDto] })
  @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => SyncEventDto) events!: SyncEventDto[];
}
export class GpsExplanationDto extends Idem {
  @ApiProperty({ example: 'gps-flag-uuid' })
  @IsString() @IsNotEmpty() gpsFlagId!: string;
  @ApiProperty({ example: 'Clocked in from the yard gate, job pin is on the pad.' })
  @IsString() @IsNotEmpty() @MaxLength(500) text!: string;
  @ApiPropertyOptional({ example: 'https://cdn.example/photo.jpg' })
  @IsOptional() @IsString() @MaxLength(500) attachmentUrl?: string;
}

export class JobsQuery extends PageQuery {
  @ApiPropertyOptional({ enum: ['ASSIGNED', 'ACCEPTED', 'RECENT', 'COMPLETED'], example: 'ASSIGNED' })
  @IsOptional() @IsIn(['ASSIGNED', 'ACCEPTED', 'RECENT', 'COMPLETED']) tab?: string;
}
export class DeclineDto extends Idem {
  @ApiProperty({
    enum: ['NOT_AVAILABLE', 'WRONG_ASSIGNMENT', 'CERTIFICATION_ISSUE', 'EQUIPMENT_ISSUE', 'SCHEDULE_CONFLICT', 'OTHER'],
    example: 'SCHEDULE_CONFLICT',
  })
  @IsIn(['NOT_AVAILABLE', 'WRONG_ASSIGNMENT', 'CERTIFICATION_ISSUE', 'EQUIPMENT_ISSUE', 'SCHEDULE_CONFLICT', 'OTHER'])
  reason!: string;
  @ApiPropertyOptional({ example: 'Already on another pad', description: 'Required when reason is OTHER.' })
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
export class CloseoutDto extends Idem {
  @ApiPropertyOptional({ example: 'Job complete, customer signed.' })
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @ApiPropertyOptional({ example: 'https://cdn.example/signature.png' })
  @IsOptional() @IsString() @MaxLength(500) signatureUrl?: string;
}
export class SalesLineDto {
  @ApiProperty({ example: 'Technician labor' })
  @IsString() @IsNotEmpty() item!: string;
  @ApiProperty({ example: 8, minimum: 0 })
  @IsNumber() @Min(0) hours!: number;
  @ApiProperty({ example: 95, minimum: 0 })
  @IsNumber() @Min(0) rate!: number;
}
export class SalesTicketDto extends Idem {
  @ApiProperty({ type: [SalesLineDto] })
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => SalesLineDto) lineItems!: SalesLineDto[];
  @ApiPropertyOptional({ example: 'Standby included' })
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class FormsQuery {
  @ApiPropertyOptional({ enum: ['REQUIRED', 'DRAFT', 'OPTIONAL', 'SUBMITTED'], example: 'REQUIRED' })
  @IsOptional() @IsIn(['REQUIRED', 'DRAFT', 'OPTIONAL', 'SUBMITTED']) tab?: string;
  @ApiPropertyOptional({ example: 'work-order-uuid' })
  @IsOptional() @IsString() workOrderId?: string;
}
export class FormSubmitDto extends Idem {
  @ApiPropertyOptional({ example: 'work-order-uuid' })
  @IsOptional() @IsString() workOrderId?: string;
  @ApiProperty({ example: { hazard: 'H2S', controls: 'Monitor' } })
  @IsObject() values!: Record<string, unknown>;
  @ApiPropertyOptional({ example: 'https://cdn.example/signature.png' })
  @IsOptional() @IsString() @MaxLength(500) signatureUrl?: string;
  @ApiPropertyOptional({ example: '2026-11-07T18:00:00.000Z' })
  @IsOptional() @IsDateString() capturedAt?: string;
  @ApiPropertyOptional({ example: 32.78 })
  @IsOptional() @IsNumber() lat?: number;
  @ApiPropertyOptional({ example: -96.8 })
  @IsOptional() @IsNumber() lng?: number;
}
export class CorrectionResubmitDto extends Idem {
  @ApiProperty({ example: { hazard: 'H2S' } })
  @IsObject() values!: Record<string, unknown>;
  @ApiPropertyOptional({ example: 'Signed and resent' })
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
export class AdditionalFormDto extends Idem {
  @ApiProperty({ example: 'work-order-uuid' })
  @IsString() @IsNotEmpty() workOrderId!: string;
  @ApiProperty({ example: 'Confined space' })
  @IsString() @IsNotEmpty() @MaxLength(150) formType!: string;
  @ApiProperty({ example: 'Customer added a vessel' })
  @IsString() @IsNotEmpty() @MaxLength(300) reason!: string;
  @ApiProperty({ example: 'Entry into the new vessel was not on the original scope.' })
  @IsString() @IsNotEmpty() @MaxLength(500) scopeChangeDescription!: string;
  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH', 'HIGH_WORK_STOPPED'], example: 'HIGH' })
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'HIGH_WORK_STOPPED']) urgency!: string;
  @ApiPropertyOptional({ example: 'https://cdn.example/photo.jpg' })
  @IsOptional() @IsString() @MaxLength(500) photoUrl?: string;
}
export class AdditionalFormRespondDto extends Idem {
  @ApiProperty({ example: 'Vessel is the west separator.' })
  @IsString() @IsNotEmpty() @MaxLength(500) message!: string;
  @ApiPropertyOptional({ example: 'https://cdn.example/photo.jpg' })
  @IsOptional() @IsString() @MaxLength(500) attachmentUrl?: string;
}

export class TimesheetQuery {
  @ApiPropertyOptional({ enum: ['CURRENT_WEEK', 'PREVIOUS_DAY', 'LAST_WEEK'], example: 'CURRENT_WEEK' })
  @IsOptional() @IsIn(['CURRENT_WEEK', 'PREVIOUS_DAY', 'LAST_WEEK']) range?: string;
  @ApiPropertyOptional({ example: '2026-11-02' })
  @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional({ example: '2026-11-08' })
  @IsOptional() @IsDateString() to?: string;
}
export class EditRequestDto extends Idem {
  @ApiProperty({ example: 'time-entry-uuid' })
  @IsString() @IsNotEmpty() timeEntryId!: string;
  @ApiPropertyOptional({ example: '07:00', description: 'HH:mm. At least one of clock in or clock out is required.' })
  @IsOptional() @IsString() @MaxLength(5) requestedClockIn?: string;
  @ApiPropertyOptional({ example: '17:30' })
  @IsOptional() @IsString() @MaxLength(5) requestedClockOut?: string;
  @ApiProperty({ example: 'FORGOT_CLOCK_OUT' })
  @IsString() @IsNotEmpty() @MaxLength(60) reasonCode!: string;
  @ApiPropertyOptional({ example: 'Radio was dead' })
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
export class EditRespondDto extends Idem {
  @ApiProperty({ example: 'Arrived at 07:00, radio was dead.' })
  @IsString() @IsNotEmpty() @MaxLength(500) message!: string;
  @ApiPropertyOptional({ example: 'https://cdn.example/photo.jpg' })
  @IsOptional() @IsString() @MaxLength(500) attachmentUrl?: string;
}
export class EntryNotesDto {
  @ApiProperty({ example: 'Waited on crane', description: 'Send an empty string to clear the note.' })
  @IsString() @MaxLength(500) notes!: string;
}

export class TimeOffPreviewDto {
  @ApiProperty({ enum: ['PTO', 'SICK', 'HOLIDAY', 'UNPAID'], example: 'PTO' })
  @IsIn(['PTO', 'SICK', 'HOLIDAY', 'UNPAID']) type!: string;
  @ApiProperty({ example: '2026-11-20' })
  @IsDateString() startAt!: string;
  @ApiProperty({ example: '2026-11-21' })
  @IsDateString() endAt!: string;
  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean() partialDay?: boolean;
  @ApiPropertyOptional({ example: 4, minimum: 0.5, maximum: 24 })
  @IsOptional() @IsNumber() @Min(0.5) @Max(24) partialHours?: number;
}
export class TimeOffCreateDto extends TimeOffPreviewDto {
  @ApiPropertyOptional({ example: '3f1c2a40-7b1e-4d2a-9c11-0a1b2c3d4e5f' })
  @IsOptional() @IsString() clientRequestId?: string;
  @ApiPropertyOptional({ example: 'Family' })
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @ApiPropertyOptional({ example: 'https://cdn.example/signature.png' })
  @IsOptional() @IsString() @MaxLength(500) signatureUrl?: string;
}

export class MobileChecklistItemDto {
  @ApiProperty({ example: 'HOUSING INTACT' })
  @IsString() @MaxLength(160) label!: string;
  @ApiProperty({ enum: ['PASS', 'FAIL', 'N/A'], example: 'PASS' })
  @IsIn(['PASS', 'FAIL', 'N/A', 'NA']) result!: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(40) tag?: string;
}

/** Writes a fleet inspection through the same record the admin inspections page lists. */
export class MobileInspectionDto {
  @ApiPropertyOptional({ example: '3f1c2a40-7b1e-4d2a-9c11-0a1b2c3d4e5f' })
  @IsOptional() @IsString() clientRequestId?: string;
  @ApiProperty({ example: 'GAS-001' })
  @IsString() @MaxLength(40) assetCode!: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(160) assetLabel?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(80) serial?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(80) parentTruck?: string;
  @ApiProperty({ example: '2026-11-08T14:00:00.000Z' })
  @IsString() inspectedAt!: string;
  @ApiProperty({ enum: ['MONTHLY', 'PRE-JOB', 'ANNUAL', 'POST-INCIDENT', 'RE-INSPECTION'] })
  @IsIn(['MONTHLY', 'PRE-JOB', 'ANNUAL', 'POST-INCIDENT', 'RE-INSPECTION']) type!: string;
  @ApiProperty({ type: [MobileChecklistItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => MobileChecklistItemDto) checklistItems!: MobileChecklistItemDto[];
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(4000) findingsSummary?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) photoUrls?: string[];
  @ApiPropertyOptional()
  @IsOptional() @IsBoolean() createRepair?: boolean;
  @ApiPropertyOptional()
  @IsOptional() @IsBoolean() markOutOfService?: boolean;
  @ApiPropertyOptional()
  @IsOptional() @IsBoolean() reinspectionRequired?: boolean;
  @ApiPropertyOptional()
  @IsOptional() @IsString() reinspectionDueAt?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(80) parentInspectionId?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(80) incidentReference?: string;
}

export class MobileCalibrationDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100) clientRequestId?: string;
  @ApiProperty({ example: 'GAS-001' })
  @IsString() @MaxLength(40) assetCode!: string;
  @ApiPropertyOptional({ enum: ['PASS', 'PASS_WITH_ADJUSTMENT', 'FAILED', 'NOT_DONE'] })
  @IsOptional() @IsIn(['PASS', 'PASS_WITH_ADJUSTMENT', 'FAILED', 'NOT_DONE']) result?: 'PASS' | 'PASS_WITH_ADJUSTMENT' | 'FAILED' | 'NOT_DONE';
  @ApiPropertyOptional()
  @IsOptional() @IsString() lastCalAt?: string;
  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) frequencyDays?: number;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(80) calType?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(80) lot?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class MobileRepairDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100) clientRequestId?: string;
  @ApiProperty({ example: 'GAS-001' })
  @IsString() @MaxLength(40) assetCode!: string;
  @ApiProperty({ example: 'Sensor did not respond' })
  @IsString() @MaxLength(4000) issue!: string;
  @ApiPropertyOptional({ enum: ['URGENT', 'HIGH', 'MEDIUM', 'LOW'] })
  @IsOptional() @IsIn(['URGENT', 'HIGH', 'MEDIUM', 'LOW']) priority?: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class MobileMoveDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100) clientRequestId?: string;
  @ApiProperty({ example: 'TRK-05' })
  @IsString() @MaxLength(80) to!: string;
  @ApiProperty({ example: 'Returned after the job' })
  @IsString() @MaxLength(200) reason!: string;
}

export class MobileAssetNoteDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100) clientRequestId?: string;
  @ApiProperty()
  @IsString() @MaxLength(2000) text!: string;
}

export class NotificationsQuery extends PageQuery {
  @ApiPropertyOptional({ enum: ['ALL', 'UNREAD', 'ACTION_REQUIRED', 'RESOLVED'], example: 'ALL' })
  @IsOptional() @IsIn(['ALL', 'UNREAD', 'ACTION_REQUIRED', 'RESOLVED']) tab?: string;
}
