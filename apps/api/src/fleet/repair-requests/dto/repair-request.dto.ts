import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
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
}

export class CancelRepairDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
