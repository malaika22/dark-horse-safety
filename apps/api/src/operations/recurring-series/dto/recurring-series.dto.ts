import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

const FREQUENCIES = [
  'WEEKLY',
  'FORTNIGHTLY',
  'MONTHLY',
  'QUARTERLY',
  'ANNUALLY',
] as const;

export class RecurringSeriesListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @IsOptional()
  @IsString()
  q?: string;

  /** ALL | ACTIVE | ENDED */
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateRecurringSeriesDto {
  @IsUUID()
  customerId!: string;

  @IsString()
  @MinLength(1)
  jobType!: string;

  @IsIn([...FREQUENCIES])
  frequency!: (typeof FREQUENCIES)[number];

  @IsOptional()
  @IsDateString()
  nextOccurrence?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  generatedCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  remainingCount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  dayRule?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  generateAheadDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  endsAfterOccurrences?: number;

  @IsOptional()
  @IsString()
  crewTemplate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedDurationHours?: number;

  @IsOptional()
  @IsString()
  requiredForms?: string;

  @IsOptional()
  @IsString()
  requiredEquipment?: string;
}

export class UpdateRecurringSeriesDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  jobType?: string;

  @IsOptional()
  @IsIn([...FREQUENCIES])
  frequency?: (typeof FREQUENCIES)[number];

  @IsOptional()
  @IsDateString()
  nextOccurrence?: string | null;

  @IsOptional()
  @IsString()
  dayRule?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  generateAheadDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  endsAfterOccurrences?: number;

  @IsOptional()
  @IsDateString()
  endsOnDate?: string | null;

  @IsOptional()
  @IsBoolean()
  endsNever?: boolean;

  @IsOptional()
  @IsString()
  crewTemplate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedDurationHours?: number;

  @IsOptional()
  @IsString()
  requiredForms?: string;

  @IsOptional()
  @IsString()
  requiredEquipment?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** FUTURE_ONLY | ALL_UNSTARTED — which generated WOs receive setting changes */
  @IsOptional()
  @IsIn(['FUTURE_ONLY', 'ALL_UNSTARTED'])
  updateScope?: 'FUTURE_ONLY' | 'ALL_UNSTARTED';
}

export class CancelRecurringSeriesDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
