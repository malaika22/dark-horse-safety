import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ExpenseStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class ExpenseListQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  repId?: string;

  @ApiPropertyOptional({ enum: ExpenseStatus })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @ApiPropertyOptional({ description: 'ISO date YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class ExpenseAttendeeDto {
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

export class CreateExpenseDto {
  @ApiProperty({ description: 'ISO date YYYY-MM-DD or datetime' })
  @IsDateString()
  expenseDate!: string;

  @ApiProperty()
  @IsString()
  merchant!: string;

  @ApiProperty()
  @IsString()
  category!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty()
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ enum: ExpenseStatus })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  reimbursable?: boolean;

  @ApiPropertyOptional({ type: [ExpenseAttendeeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseAttendeeDto)
  attendees?: ExpenseAttendeeDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  noReceipt?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  missingReceiptReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptFileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  receiptFileSizeBytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptCaptureMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  receiptLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  receiptLng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  receiptCapturedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Job / well / location id' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  repId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  salesActivityId?: string;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
