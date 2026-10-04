import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DispatchAssignmentStatus,
  DispatchJobType,
} from '@prisma/client';

export class DispatchRangeQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  crew?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class AssignDispatchJobDto {
  @IsUUID()
  workOrderId!: string;

  @IsUUID()
  employeeId!: string;

  @IsDateString()
  scheduledDate!: string;

  @IsOptional()
  @IsEnum(DispatchJobType)
  jobType?: DispatchJobType;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  startTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  postToMobile?: boolean;
}

export class RescheduleDispatchDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class ReassignDispatchDto {
  @IsUUID()
  employeeId!: string;

  @IsOptional()
  @IsBoolean()
  notifyTechnician?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOriginal?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsBoolean()
  forceFail?: boolean;
}

export class RequestReassignOverrideDto {
  @IsUUID()
  employeeId!: string;

  @IsString()
  @MaxLength(2000)
  justification!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  overrideByName?: string;
}

export class OverrideDispatchDto {
  @IsString()
  @MaxLength(2000)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  overrideByName?: string;
}

export class PostNotifyDispatchDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  ids?: string[];

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  forceFail?: boolean;

  @IsOptional()
  @IsBoolean()
  forcePartial?: boolean;
}

export class DispatchAcceptanceQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(DispatchAssignmentStatus)
  status?: DispatchAssignmentStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
