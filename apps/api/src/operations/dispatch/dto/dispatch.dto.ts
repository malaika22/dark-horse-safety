import { Type } from 'class-transformer';
import {
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
  @IsString()
  @MaxLength(2000)
  note?: string;
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
