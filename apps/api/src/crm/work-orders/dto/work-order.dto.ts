import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class WorkOrderListQueryDto extends ListQueryDto {
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
  quoteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class HoldCancelWorkOrderDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string;

  @ApiPropertyOptional({
    description: 'Simulate hold failure for UI error path',
  })
  @IsOptional()
  @IsBoolean()
  forceFail?: boolean;
}

export class CancelWorkOrderDto {
  @ApiProperty({
    example: 'CUSTOMER CANCELLED',
  })
  @IsString()
  @MaxLength(200)
  reason!: string;

  @ApiPropertyOptional({
    enum: ['KEEP_BILLABLE', 'KEEP_NON_BILLABLE', 'VOID'],
  })
  @IsOptional()
  @IsIn(['KEEP_BILLABLE', 'KEEP_NON_BILLABLE', 'VOID'])
  timeHandling?: 'KEEP_BILLABLE' | 'KEEP_NON_BILLABLE' | 'VOID';

  @ApiPropertyOptional({
    description: 'PO keep/cancel decisions keyed by PO code',
  })
  @IsOptional()
  @IsObject()
  poActions?: Record<string, 'KEEP' | 'CANCEL'>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyTechnicians?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string;
}

export class RequestPurchaseOrderDto {
  @ApiProperty()
  @IsString()
  @MaxLength(300)
  to!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  cc?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  subject!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  message?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  neededBy?: string;
}

export class AttachPurchaseOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  poNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(260)
  fileName?: string;
}

export class ExportJobPacketDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  include?: string[];

  @ApiPropertyOptional({ enum: ['NONE', 'DRAFT', 'FINAL'] })
  @IsOptional()
  @IsIn(['NONE', 'DRAFT', 'FINAL'])
  watermark?: 'NONE' | 'DRAFT' | 'FINAL';
}

export class RequestDocumentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  documentName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class CreateWorkOrderDto {
  @ApiProperty()
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  serviceDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scheduledStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scheduledEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  quoteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedRepId?: string;
}
