import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  OnCallCoverage,
  OnCallPattern,
  OnCallStatus,
  OnCallSwapType,
  OnCallZone,
} from '@prisma/client';

export class OnCallMonthQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  month?: number;
}

export class UpdateOnCallAssignmentDto {
  @IsOptional()
  @IsString()
  employeeId?: string | null;

  @IsOptional()
  @IsString()
  backupId?: string | null;

  @IsOptional()
  @IsEnum(OnCallZone)
  zone?: OnCallZone | null;

  @IsOptional()
  @IsEnum(OnCallStatus)
  status?: OnCallStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class CreateOnCallSwapDto {
  @IsString()
  assignmentId!: string;

  @IsOptional()
  @IsString()
  toEmployeeId?: string;

  @IsOptional()
  @IsEnum(OnCallSwapType)
  swapType?: OnCallSwapType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class GenerateOnCallDto {
  @IsString()
  fromDate!: string;

  @IsString()
  toDate!: string;

  @IsOptional()
  @IsEnum(OnCallCoverage)
  coverage?: OnCallCoverage;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  technicianIds!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @IsOptional()
  @IsEnum(OnCallPattern)
  pattern?: OnCallPattern;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxConsecutive?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minGap?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  respectTimeOff?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  respectDispatch?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  notify?: boolean;
}
