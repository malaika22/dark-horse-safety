import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class CustomerListQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedRepId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: 'Include archived records' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeArchived?: boolean;
}

export class CreateCustomerDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalEntityName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedRepId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billingAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mailingAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  creditLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  taxExempt?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pricingTier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  netsuiteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isnId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  veriforceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  msaOnFile?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  msaExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  coiExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  w9OnFile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clockInRadius?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresPo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultRequiredForms?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

export class BulkCustomerIdsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class BulkUpdateCustomersDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedRepId?: string;
}

export class UpdateCustomerDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kind?: string;

  @ApiPropertyOptional({ description: 'ISO date or null to clear' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsDateString()
  expiresAt?: string | null;
}
