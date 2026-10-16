import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  FleetInspectionResult,
  FleetInspectionStatus,
  FleetRepairPriority,
} from '@prisma/client';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class InspectionListQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: FleetInspectionStatus })
  @IsOptional()
  @IsEnum(FleetInspectionStatus)
  status?: FleetInspectionStatus;

  @ApiPropertyOptional({ enum: FleetInspectionResult })
  @IsOptional()
  @IsEnum(FleetInspectionResult)
  result?: FleetInspectionResult;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

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
  inspector?: string;

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
  hasLinkedRepair?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  payrollBlocking?: boolean;
}

export class BulkReviewDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reviewedBy?: string;
}

export class CreateCorrectiveActionDto {
  @IsString()
  @MaxLength(500)
  rootCause!: string;

  @IsString()
  @MaxLength(2000)
  description!: string;

  @IsString()
  @MaxLength(120)
  assignedTo!: string;

  @IsOptional()
  @IsString()
  dueAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  priority?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  findings?: string[];
}

export class ReinspectDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recheckLabels?: string[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeAll?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  inspectorName?: string;

  @IsOptional()
  @IsString()
  dueAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class EditChecklistItemDto {
  @IsString()
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  result?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class EditInspectionDto {
  @IsString()
  @MaxLength(80)
  reason!: string;

  @IsString()
  @MaxLength(4000)
  details!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  result?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  findingsSummary?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EditChecklistItemDto)
  checklistItems?: EditChecklistItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  editedBy?: string;
}

export class CreateRepairFromInspectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  issue?: string;

  @IsOptional()
  @IsEnum(FleetRepairPriority)
  priority?: FleetRepairPriority;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  vendorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  assignedName?: string;
}
