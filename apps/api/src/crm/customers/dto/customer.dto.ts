import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null ? undefined : value;

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
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Enter a customer name.' })
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(200)
  legalEntityName?: string;

  @ApiProperty({ example: 'ACTIVE' })
  @Transform(emptyToUndefined)
  @IsString()
  @IsNotEmpty({ message: 'Select a status.' })
  @IsIn(['ACTIVE', 'INACTIVE', 'NEEDS_REVIEW'], {
    message: 'Status must be Active, Inactive, or Needs review.',
  })
  status!: string;

  @ApiProperty()
  @Transform(emptyToUndefined)
  @IsUUID('4', { message: 'Select an assigned rep.' })
  @IsNotEmpty({ message: 'Select an assigned rep.' })
  assignedRepId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  industry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Matches(/^https?:\/\/([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i, {
    message: 'Enter a valid URL, e.g. https://example.com',
  })
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(254)
  email?: string;

  @ApiProperty({ example: 'OPERATOR' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Select a customer type.' })
  @MaxLength(80)
  customerType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(5000)
  accountNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(2000)
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID('4')
  parentCompanyId?: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Enter a billing address.' })
  @MaxLength(1000)
  billingAddress!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(1000)
  mailingAddress?: string;

  @ApiProperty({ example: 'Net 30' })
  @Transform(emptyToUndefined)
  @IsString()
  @IsNotEmpty({ message: 'Select payment terms.' })
  @MaxLength(80)
  paymentTerms!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,\s]/g, '');
      if (!cleaned) return undefined;
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : value;
    }
    return value;
  })
  @IsNumber({}, { message: 'Enter a number.' })
  @Min(0, { message: 'Enter a number.' })
  @Type(() => Number)
  creditLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  taxExempt?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  taxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  pricingTier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Matches(/^NS-\d{7}$/i, { message: 'Must match format NS-#######.' })
  netsuiteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Matches(/^ISN-\d{8}$/i, { message: 'Must match format ISN-########.' })
  isnId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Matches(/^VF-\d{7}$/i, { message: 'Must match format VF-#######.' })
  veriforceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  msaOnFile?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString({}, { message: 'Enter a valid date.' })
  msaExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString({}, { message: 'Enter a valid date.' })
  coiExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(300)
  w9OnFile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  clockInRadius?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  minBillableBlock?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  autoFlagNoShow?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresPo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
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

export class CreateCustomerDocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  kind?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Base64 file contents (optional)' })
  @IsOptional()
  @IsString()
  contentBase64?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsDateString()
  expiresAt?: string | null;
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
