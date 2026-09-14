import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class PricingRuleListQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceItem?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rateType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeArchived?: boolean;
}

export class CreatePricingRuleDto {
  @ApiProperty()
  @IsUUID('4', { message: 'Select a customer.' })
  @IsNotEmpty({ message: 'Select a customer.' })
  customerId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Select a service / item.' })
  serviceItem!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Select a rate type.' })
  rateType!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({}, { message: 'Enter a rate.' })
  @Min(0, { message: 'Enter a rate.' })
  rate!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minimumCharge?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  overtimeMultiplier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  overtimeThreshold?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  halfDayRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minimumQuantity?: number;

  @ApiProperty()
  @IsNotEmpty({ message: 'Select effective from.' })
  @IsDateString({}, { message: 'Select effective from.' })
  effectiveFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({}, { message: 'Enter a valid effective to date.' })
  effectiveTo?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Enter notes / justification.' })
  @MaxLength(500, { message: 'Max 500 characters.' })
  notes!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  netsuiteItem?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appliesTo?: string;

  @ApiPropertyOptional()
  @ValidateIf((o: CreatePricingRuleDto) =>
    (o.appliesTo ?? '').toUpperCase() === 'SPECIFIC_WELLS',
  )
  @IsArray({ message: 'Add at least one well, or set Applies To to All Sites.' })
  @ArrayMinSize(1, {
    message: 'Add at least one well, or set Applies To to All Sites.',
  })
  @IsString({ each: true })
  appliesToWells?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approvalStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  approvedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

export class UpdatePricingRuleDto extends PartialType(CreatePricingRuleDto) {}

export class BulkPricingRuleIdsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}
