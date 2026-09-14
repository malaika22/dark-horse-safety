import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class FormRuleListQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hardGate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeArchived?: boolean;
}

export class CreateFormRuleDto {
  @ApiProperty()
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobType?: string;

  @ApiProperty()
  @IsString()
  formTemplate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hardGate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  blocksToggle?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  due?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  appliesFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  appliesToEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trigger?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appliesTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  versionMode?: string;

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
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

export class UpdateFormRuleDto extends PartialType(CreateFormRuleDto) {}

export class BulkFormRuleIdsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class CopyFormRuleDto {
  @ApiProperty()
  @IsUUID()
  customerId!: string;
}

export class TestFormRuleDto {
  @ApiProperty({ description: 'Job type to test against the rule' })
  @IsString()
  jobType!: string;
}

/** Live impact preview for Add Form Rule. */
export class FormRulePreviewQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hardGate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rolloutMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  excludeId?: string;
}
