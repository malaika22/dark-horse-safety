import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class TimeOffQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class TimeOffCalendarQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;
}

export class TimeOffAttachmentDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  size?: string;
}

export class CreateTimeOffDto {
  @IsString()
  employeeId!: string;

  @IsString()
  type!: string;

  @IsString()
  startDate!: string;

  @IsString()
  endDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'ALL_DAY | PARTIAL' })
  @IsOptional()
  @IsString()
  durationMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  partialHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coveragePersonId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coveragePersonName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowOverride?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  overrideRoles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireOverrideReason?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifySupervisor?: boolean;

  @ApiPropertyOptional({ type: [TimeOffAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeOffAttachmentDto)
  attachments?: TimeOffAttachmentDto[];
}

export class PreviewTimeOffDto {
  @IsString()
  employeeId!: string;

  @IsString()
  type!: string;

  @IsString()
  startDate!: string;

  @IsString()
  endDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  durationMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  partialHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coveragePersonId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coveragePersonName?: string;
}

export class DecideTimeOffDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
