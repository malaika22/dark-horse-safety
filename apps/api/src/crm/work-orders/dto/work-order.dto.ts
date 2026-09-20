import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
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
