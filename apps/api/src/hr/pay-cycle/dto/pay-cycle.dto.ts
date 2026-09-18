import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateOvertimeRulesDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dailyOtThresholdHrs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weeklyOtThresholdHrs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otMultiplier?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  doubleTimeAfterHrs?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  minBillableBlock?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  roundTo?: string;
}

export class UpdatePtoRulesDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  annualPtoDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  accrualRatePerPeriod?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  annualSickDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  carryoverCapDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  noticeRequiredDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  blackout?: string;
}

export class UpdateCadenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  cadence?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cycleLengthDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  lockTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  autoApproveRules?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;
}

export class UpdateHolidayDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hoursCredited?: number;

  @IsOptional()
  @IsString()
  observedOn?: string;
}

export class AddPayCycleNoteDto {
  @IsString()
  @MaxLength(2000)
  text!: string;
}
