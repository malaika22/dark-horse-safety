import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { SalesActivityType } from '@prisma/client';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

function toOptionalBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
}

export class SalesActivityListQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  repId?: string;

  @ApiPropertyOptional({ enum: SalesActivityType })
  @IsOptional()
  @IsEnum(SalesActivityType)
  type?: SalesActivityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outcome?: string;

  @ApiPropertyOptional({
    description: 'NONE | OPEN | OVERDUE | DONE',
    enum: ['NONE', 'OPEN', 'OVERDUE', 'DONE'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['NONE', 'OPEN', 'OVERDUE', 'DONE'])
  followUpStatus?: 'NONE' | 'OPEN' | 'OVERDUE' | 'DONE';

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toOptionalBool(value))
  @IsBoolean()
  hasLinkedQuote?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toOptionalBool(value))
  @IsBoolean()
  hasExpenseLogged?: boolean;

  @ApiPropertyOptional({ description: 'ISO date YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class SalesActivityAttendeeDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiPropertyOptional({ enum: ['contact', 'user'] })
  @IsOptional()
  @IsString()
  kind?: string;
}

export class CreateSalesActivityDto {
  @ApiPropertyOptional({ enum: SalesActivityType })
  @IsOptional()
  @IsEnum(SalesActivityType)
  type?: SalesActivityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outcome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextAction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  followUpAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  createFollowUpTask?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  logExpense?: boolean;

  @ApiPropertyOptional({ type: [SalesActivityAttendeeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesActivityAttendeeDto)
  attendees?: SalesActivityAttendeeDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  repId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  activityAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  linkedQuoteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateSalesActivityDto extends CreateSalesActivityDto {}

export class FollowUpDto {
  @ApiProperty()
  @IsDateString()
  followUpAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
