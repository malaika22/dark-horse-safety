import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { EnforcementLevel } from '@prisma/client';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class RequirementListQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requirementType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  enforcementLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeArchived?: boolean;
}

export class CreateRequirementDto {
  @ApiProperty()
  @IsUUID()
  customerId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requirementType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuingBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  minimumGrade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appliesTo?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appliesToRoles?: string[];

  @ApiPropertyOptional({ enum: EnforcementLevel })
  @IsOptional()
  @IsEnum(EnforcementLevel)
  enforcementLevel?: EnforcementLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  evidenceRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evidenceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evidenceUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  verificationMethod?: string;

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
  @IsString()
  rolloutMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  renewalLeadDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  validityPeriod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoCheckable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  renewalPeriod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewCycle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  docsRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

export class UpdateRequirementDto extends PartialType(CreateRequirementDto) {}

export class BulkRequirementIdsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}

/** Live validation + technician impact for Add Requirement form. */
export class RequirementPreviewQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requirementType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  renewalLeadDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  validityPeriod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appliesTo?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return undefined;
  })
  @IsArray()
  @IsString({ each: true })
  appliesToRoles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  enforcementLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rolloutMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  excludeId?: string;
}
