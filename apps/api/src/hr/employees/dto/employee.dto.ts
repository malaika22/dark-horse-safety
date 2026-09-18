import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { EmployeeStatus } from '@prisma/client';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class EmployeeQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  crew?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supervisorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedTruck?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificationHeld?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certExpiringWithinDays?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  availableOnDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hasOpenTimeEdit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  missingBbs?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  onLeave?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unassignedTruck?: string;
}

export class CreateEmployeeDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsString()
  roleTitle!: string;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supervisorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedTruck?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  crew?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  homeAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hireDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payRate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  overtimeEligible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adpEmployeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultTimeCategory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificationHeld?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certIssueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certExpiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certIssuingBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  certReminderLeadDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedEquipment?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ppeIssued?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  companyCreditCard?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cardLast4?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moduleOverrides?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  mobileAppAccess?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  sendInvite?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  sseEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sseMentorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ssePeriodDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sseEvaluationSchedule?: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleTitle?: string;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supervisorId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedTruck?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  crew?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  homeAddress?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hireDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employmentType?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payType?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onLeave?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bbsThisWeek?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  missingBbs?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  maxClockInRadiusEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maxClockInRadius?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  minBillableBlock?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  autoFlagNoShow?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateOfBirth?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobTitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payRate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  overtimeEligible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adpEmployeeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultTimeCategory?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificationHeld?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certIssueDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certExpiryDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certIssuingBody?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  certReminderLeadDays?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedEquipment?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ppeIssued?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  companyCreditCard?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cardLast4?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleTemplate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moduleOverrides?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  mobileAppAccess?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  sendInvite?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  sseEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sseMentorId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ssePeriodDays?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sseEvaluationSchedule?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusChangeReason?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusEffectiveDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payRateEffectiveDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supervisorEffectiveDate?: string | null;
}

export class BulkEmployeeIdsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class BulkAssignDto extends BulkEmployeeIdsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supervisorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  crew?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trainingLabel?: string;
}

export class StartOffboardingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastDay?: string;
}

export class UpdateOffboardingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastDay?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OffboardingTaskDto)
  tasks?: OffboardingTaskDto[];
}

export class OffboardingTaskDto {
  @IsString()
  id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class AddNoteDto {
  @IsString()
  text!: string;
}

export class AddTrainingDto {
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}
