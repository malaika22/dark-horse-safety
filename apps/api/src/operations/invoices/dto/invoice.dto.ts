import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class SendInvoiceDto {
  @IsString()
  @MinLength(3)
  recipient!: string;

  @IsOptional()
  @IsString()
  cc?: string;

  @IsString()
  @MinLength(3)
  subject!: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  scheduleMode?: 'NOW' | 'LATER';

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  /** Demo path for Delivery Failed UI */
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  forceFail?: boolean;
}

export class SaveInvoiceDto {
  @IsOptional()
  @IsString()
  invoiceNotes?: string;

  @IsOptional()
  @IsString()
  netsuiteRef?: string;
}
