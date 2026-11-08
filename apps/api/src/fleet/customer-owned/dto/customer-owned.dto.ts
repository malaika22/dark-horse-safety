import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CustomerOwnedStatus } from '@prisma/client';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class CustomerOwnedListQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: CustomerOwnedStatus })
  @IsOptional()
  @IsEnum(CustomerOwnedStatus)
  status?: CustomerOwnedStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  asset?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}

export class SaveCustomerOwnedDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(40)
  type!: string;

  @IsString()
  @MaxLength(120)
  customerName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  operationalStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  frequency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  formName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  nextDue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  lastInspected?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  lastResult?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  photoUrl?: string;
}

export class BulkReviewDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reviewedBy?: string;
}
