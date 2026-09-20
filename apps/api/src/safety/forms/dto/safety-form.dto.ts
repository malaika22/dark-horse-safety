import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SafetyFormListQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class SafetyFormFieldDto {
  @IsString()
  @MinLength(1)
  id!: string;

  @IsString()
  @MinLength(1)
  type!: string;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
}

export class SafetyFormSectionDto {
  @IsString()
  @MinLength(1)
  id!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SafetyFormFieldDto)
  fields!: SafetyFormFieldDto[];
}

export class UpdateSafetyFormDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'ARCHIVED'])
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SafetyFormSectionDto)
  sections?: SafetyFormSectionDto[];

  @IsOptional()
  @IsObject()
  definition?: Record<string, unknown>;
}
