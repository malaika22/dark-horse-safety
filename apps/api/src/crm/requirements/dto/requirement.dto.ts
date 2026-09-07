import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
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
  appliesTo?: string;

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
