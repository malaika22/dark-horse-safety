import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class QuoteVarianceQueryDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  repId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  /** Absolute variance % threshold, e.g. 10 means |pct| >= 10 */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  varianceThreshold?: number;
}
