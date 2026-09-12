import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class ContactListQueryDto extends ListQueryDto {
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
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeArchived?: boolean;
}

export class ContactCustomerLinkDto {
  @ApiProperty()
  @IsUUID('4')
  customerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleAtCustomer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateContactDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Enter a full name.' })
  @MaxLength(200)
  fullName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @ValidateIf((_, v) => typeof v === 'string' && v.trim().length > 0)
  @IsEmail({}, { message: 'Enter a valid email.' })
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  officePhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkedFromScan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkedIn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeZone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  doNotContact?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  howWeMet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  primaryCustomerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedRepId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationLabel?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  customerIds?: string[];

  @ApiPropertyOptional({ type: [ContactCustomerLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactCustomerLinkDto)
  customerLinks?: ContactCustomerLinkDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateContactDto extends PartialType(CreateContactDto) {}

export class BulkContactIdsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class SetPrimaryContactDto {
  @ApiProperty()
  @IsUUID()
  customerId!: string;
}
