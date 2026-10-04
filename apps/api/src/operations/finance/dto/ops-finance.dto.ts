import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class MarkBillingReviewedDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  netsuiteRef?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  markNetsuiteUpdated?: boolean;
}

export class PoLineItemDto {
  @IsString()
  @MinLength(1)
  item!: string;

  @IsNumber()
  @Type(() => Number)
  qty!: number;

  @IsNumber()
  @Type(() => Number)
  unitPrice!: number;
}

export class CreatePurchaseOrderDto {
  @IsString()
  @MinLength(1)
  vendor!: string;

  @IsOptional()
  @IsString()
  vendorContact?: string;

  @IsOptional()
  @IsString()
  orderDate?: string;

  @IsOptional()
  @IsString()
  expectedDelivery?: string;

  @IsOptional()
  @IsString()
  workOrderId?: string;

  @IsOptional()
  @IsString()
  ticketId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PoLineItemDto)
  lineItems?: PoLineItemDto[];

  @IsOptional()
  @IsString()
  deliveryLocation?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  received?: boolean;

  @IsOptional()
  @IsString()
  receivedBy?: string;

  @IsOptional()
  @IsString()
  receivedDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  billBack?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  markupPct?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  blocksPayroll?: boolean;
}
