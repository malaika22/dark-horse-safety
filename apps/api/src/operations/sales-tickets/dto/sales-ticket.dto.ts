import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SalesTicketListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  sort?: string;
}

export class SaveSalesTicketDto {
  @IsOptional()
  @IsString()
  netsuiteReason?: string;

  @IsOptional()
  @IsString()
  netsuiteReference?: string;

  @IsOptional()
  @IsBoolean()
  markNetsuiteUpdated?: boolean;
}

export class CreateSalesTicketFromWoDto {
  @IsOptional()
  @IsString()
  workOrderId?: string;
}

export class AdjustSalesTicketRateDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  adjustedRate!: number;

  @IsString()
  @MinLength(3)
  reason!: string;
}

export class SalesTicketCorrectionItemDto {
  @IsString()
  @MinLength(1)
  field!: string;

  @IsString()
  @MinLength(1)
  issue!: string;

  @IsString()
  @MinLength(1)
  expected!: string;
}

export class ReturnSalesTicketDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesTicketCorrectionItemDto)
  corrections!: SalesTicketCorrectionItemDto[];

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  dueBackBy?: string;

  @IsOptional()
  @IsBoolean()
  notifyPush?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyEmail?: boolean;
}
