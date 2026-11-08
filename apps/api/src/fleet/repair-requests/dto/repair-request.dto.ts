import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  FleetRepairPriority,
  FleetRepairStatus,
} from '@prisma/client';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class RepairListQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: FleetRepairStatus })
  @IsOptional()
  @IsEnum(FleetRepairStatus)
  status?: FleetRepairStatus;

  @ApiPropertyOptional({ enum: FleetRepairPriority })
  @IsOptional()
  @IsEnum(FleetRepairPriority)
  priority?: FleetRepairPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  asset?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentTruck?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  overdueVsEta?: boolean;
}

export class UpdateRepairDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  vendorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  assignedName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  etaLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  purchaseOrder?: string;

  @IsOptional()
  @IsEnum(FleetRepairStatus)
  status?: FleetRepairStatus;

  @IsOptional()
  @IsEnum(FleetRepairPriority)
  priority?: FleetRepairPriority;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  issue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;
}

export class CreateRepairDto {
  @IsString()
  @MaxLength(40)
  assetCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  assetLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  parentTruck?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsString()
  @MaxLength(4000)
  issue!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  issueType?: string;

  @IsOptional()
  @IsEnum(FleetRepairPriority)
  priority?: FleetRepairPriority;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  vendorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  assignedName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  etaLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  inspectionCode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedCost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  partsNeeded?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  expectedDowntime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  reportedBy?: string;
}

export class RepairPartDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  vendor?: string;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  po?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  expectedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  workOrder?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customer?: string;

  @IsOptional()
  @IsBoolean()
  billable?: boolean;
}

export class RepairNoteDto {
  @IsString()
  @MaxLength(2000)
  text!: string;
}

export class ResolveRepairDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  resolution?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  resolvedBy?: string;

  @IsOptional()
  @IsNumber()
  actualCost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  partsUsed?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  returnTo?: string;

  @IsOptional()
  @IsBoolean()
  requiresReinspection?: boolean;

  @IsOptional()
  @IsBoolean()
  closeFollowUp?: boolean;
}

export class CancelRepairDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
