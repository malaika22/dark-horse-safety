import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class WaiveExceptionDto {
  @ApiProperty()
  @IsString()
  reason!: string;
}

export class LinkExpenseDto {
  @ApiProperty()
  @IsUUID()
  expenseId!: string;
}

export class AddChargeDto {
  @ApiProperty()
  @IsDateString()
  exceptionDate!: string;

  @ApiProperty()
  @IsString()
  merchant!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;
}

export class FinishReconciliationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  force?: boolean;
}

export class EnsureReconciliationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  paymentCardId?: string;
}
