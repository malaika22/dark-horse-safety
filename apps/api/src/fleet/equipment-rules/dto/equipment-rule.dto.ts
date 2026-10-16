import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  EquipmentEnforcement,
  EquipmentPerUnit,
  EquipmentRuleStatus,
} from '@prisma/client';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class EquipmentRuleListQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobType?: string;

  @ApiPropertyOptional({ enum: EquipmentEnforcement })
  @IsOptional()
  @IsEnum(EquipmentEnforcement)
  enforcement?: EquipmentEnforcement;

  @ApiPropertyOptional({ enum: EquipmentRuleStatus })
  @IsOptional()
  @IsEnum(EquipmentRuleStatus)
  status?: EquipmentRuleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupBy?: string;
}

export class CreateEquipmentRuleDto {
  @IsString()
  @MaxLength(200)
  equipment!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty?: number;

  @IsOptional()
  @IsEnum(EquipmentPerUnit)
  per?: EquipmentPerUnit;

  @IsOptional()
  @IsEnum(EquipmentEnforcement)
  enforcement?: EquipmentEnforcement;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  substitutes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  appliesTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  condition?: string;

  @IsString()
  @MaxLength(200)
  jobType!: string;

  @IsOptional()
  @IsEnum(EquipmentRuleStatus)
  status?: EquipmentRuleStatus;
}

export class UpdateEquipmentRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  equipment?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty?: number;

  @IsOptional()
  @IsEnum(EquipmentPerUnit)
  per?: EquipmentPerUnit;

  @IsOptional()
  @IsEnum(EquipmentEnforcement)
  enforcement?: EquipmentEnforcement;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  substitutes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  appliesTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  condition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  jobType?: string;

  @IsOptional()
  @IsEnum(EquipmentRuleStatus)
  status?: EquipmentRuleStatus;
}

export class CopyEquipmentRuleDto {
  @IsString()
  @MaxLength(200)
  jobType!: string;
}

export class AddCustomerOverrideDto {
  @IsString()
  customerId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty?: number;
}

export class DeactivateEquipmentRuleDto {
  @IsOptional()
  @IsBoolean()
  forceFail?: boolean;
}
