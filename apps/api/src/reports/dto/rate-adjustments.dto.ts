import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class RateAdjustmentsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  adjustedById?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  /** Absolute dollar delta threshold */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  deltaThreshold?: number;

  @IsOptional()
  @IsIn(['date', 'delta', 'customer', 'ticket'])
  sort?: 'date' | 'delta' | 'customer' | 'ticket';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  direction?: 'asc' | 'desc';
}
