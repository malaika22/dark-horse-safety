import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { RESET_REASONS } from '../mobile-sync.defaults';
import { Type } from 'class-transformer';

export class CompanyProfileDto {
  @IsString() @MaxLength(160) companyName!: string;
  @IsString() @MaxLength(160) establishmentName!: string;
  @IsString() @MaxLength(200) streetAddress!: string;
  @IsString() @MaxLength(120) cityStateZip!: string;
  @IsString() @MaxLength(40) phone!: string;
  @IsString() @MaxLength(40) ein!: string;
  @IsString() @MaxLength(160) naicsCode!: string;
  @IsString() @MaxLength(160) sicCode!: string;
  @IsString() @MaxLength(80) annualAverageEmployees!: string;
  @IsString() @MaxLength(80) totalHoursWorked!: string;
  @IsString() @MaxLength(120) companyExecutive!: string;
  @IsString() @MaxLength(120) recordkeepingContact!: string;
}

export class UpdateBusinessRuleDto {
  @IsOptional() @IsString() @MaxLength(40) status?: string;
  @IsOptional() @IsString() @MaxLength(40) statusLabel?: string;
  @IsOptional() @IsString() @MaxLength(80) owner?: string;
  @IsOptional() @IsString() @MaxLength(80) enforcement?: string;
}

export class UpdateRetentionClassDto {
  @IsOptional() @IsString() @MaxLength(80) proposedPeriod?: string;
  @IsOptional() @IsString() @MaxLength(80) afterExpiry?: string;
  @IsOptional() @IsString() @MaxLength(40) legalHold?: string;
  @IsOptional() @IsString() @MaxLength(40) owner?: string;
}

export class GlobalDefaultsDto {
  @IsString() @MaxLength(80) closeoutEscalation!: string;
  @IsString() @MaxLength(80) closeoutOwner!: string;
  @IsString() @MaxLength(80) workStoppedEscalation!: string;
  @IsString() @MaxLength(80) workStoppedOwner!: string;
  @IsString() @MaxLength(80) recurringGeneration!: string;
  @IsString() @MaxLength(80) recurringOwner!: string;
  @IsString() @MaxLength(80) payCycle!: string;
  @IsString() @MaxLength(80) payCycleOwner!: string;
  @IsString() @MaxLength(120) poApproval!: string;
  @IsString() @MaxLength(80) poOwner!: string;
  @IsString() @MaxLength(80) missingPoBlock!: string;
  @IsString() @MaxLength(80) missingPoOwner!: string;
  @IsString() @MaxLength(80) requiredForms!: string;
  @IsString() @MaxLength(80) requiredFormsOwner!: string;
  @IsString() @MaxLength(80) geofenceFallback!: string;
  @IsString() @MaxLength(80) geofenceOwner!: string;
  @IsString() @MaxLength(80) msaEnforcement!: string;
  @IsString() @MaxLength(80) msaOwner!: string;
}

export class RecipientItemDto {
  @IsString() id!: string;
  @IsString() @MaxLength(80) primary!: string;
  @IsString() @MaxLength(80) ccEscalate!: string;
  @IsString() @MaxLength(40) channel!: string;
  @IsString() @MaxLength(80) trigger!: string;
}

export class UpdateRecipientsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipientItemDto)
  items!: RecipientItemDto[];
}

export class TimeCategoryDto {
  @IsString() @MaxLength(80) name!: string;
  @IsBoolean() paid!: boolean;
  @IsBoolean() billable!: boolean;
  @IsBoolean() countsToOt!: boolean;
  @IsString() @MaxLength(40) payrollCode!: string;
}

export class ReorderIdsDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}

export class PayrollRulesDto {
  @IsString() @MaxLength(40) payCycleLength!: string;
  @IsString() @MaxLength(40) currentCycleStart!: string;
  @IsString() @MaxLength(40) overtimeThreshold!: string;
  @IsString() @MaxLength(40) longShiftFlag!: string;
  @IsBoolean() seventhDayRule!: boolean;
  @IsBoolean() autoApproveClean!: boolean;
  @IsString() @MaxLength(40) roundClockEntries!: string;
  @IsBoolean() requireAdminNote!: boolean;
  @IsString() @MaxLength(40) gracePeriod!: string;
  @IsString() @MaxLength(40) minimumShift!: string;
  @IsString() @MaxLength(80) exportTo!: string;
}

export class DeviceIdsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];
}

export class ResetDeviceDto {
  @IsString()
  @IsIn(RESET_REASONS)
  reason!: string;
}

export class DiscardItemDto {
  @IsString()
  @MaxLength(200)
  reason!: string;
}

export class StepDoneDto {
  @IsBoolean()
  done!: boolean;
}

export class AccessUserDto {
  @IsString() @MaxLength(80) name!: string;
  @IsString() @MaxLength(160) email!: string;
  @IsString() @MaxLength(40) phone!: string;
  @IsString() @MaxLength(40) role!: string;
  @IsString() @MaxLength(80) team!: string;
  @IsString() @MaxLength(40) region!: string;
  @IsBoolean() mobileEnabled!: boolean;
  @IsBoolean() adminAccess!: boolean;
  @IsArray() @IsString({ each: true }) modules!: string[];
}

export class DeactivateUserDto {
  @IsOptional() @IsString() @MaxLength(200) reason?: string;
}

export class AccessRoleDto {
  @IsString() @MaxLength(80) name!: string;
  @IsString() @MaxLength(200) description!: string;
  @IsString() @MaxLength(200) modules!: string;
  @IsString() @MaxLength(120) dashboards!: string;
  @IsString() @MaxLength(200) hidden!: string;
  @IsString() @MaxLength(40) accessLabel!: string;
}

export class AddTeamMemberDto {
  @IsString() @MaxLength(80) name!: string;
  @IsString() @MaxLength(40) role!: string;
  @IsOptional() @IsString() @MaxLength(120) note?: string;
}

export class OnCallRulesDto {
  @Type(() => Number) @IsInt() maxConsecutiveDays!: number;
  @Type(() => Number) @IsInt() minRestDays!: number;
  @Type(() => Number) @IsInt() leadHours!: number;
  @IsBoolean() balanceEvenly!: boolean;
  @IsBoolean() autoPublish!: boolean;
  @IsBoolean() requireBackup!: boolean;
  @IsBoolean() sameZoneSwaps!: boolean;
  @IsBoolean() notifyBeforeShift!: boolean;
}

export class FormFieldDto {
  @IsString() @MaxLength(40) id!: string;
  @IsString() @MaxLength(120) label!: string;
  @IsString() @MaxLength(20) kind!: string;
  @IsString() @MaxLength(120) placeholder!: string;
}

export class FormSectionDto {
  @IsString() @MaxLength(40) id!: string;
  @IsString() @MaxLength(120) title!: string;
  @IsBoolean() required!: boolean;
  @IsArray() @ValidateNested({ each: true }) @Type(() => FormFieldDto) fields!: FormFieldDto[];
}

export class NotificationChannelsDto {
  @IsBoolean() inApp!: boolean;
  @IsBoolean() email!: boolean;
  @IsBoolean() sms!: boolean;
}

export class FormDraftDto {
  @IsString() @MaxLength(120) title!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => FormSectionDto) sections!: FormSectionDto[];
}

export class AccessTeamDto {
  @IsString() @MaxLength(80) name!: string;
  @IsString() @MaxLength(80) lead!: string;
  @IsString() @MaxLength(40) region!: string;
  @IsString() @MaxLength(120) modules!: string;
  @IsString() @MaxLength(80) dashboards!: string;
  @IsString() @MaxLength(80) owner!: string;
  @IsString() @MaxLength(20) access!: string;
  @IsString() @MaxLength(20) kind!: string;
}
