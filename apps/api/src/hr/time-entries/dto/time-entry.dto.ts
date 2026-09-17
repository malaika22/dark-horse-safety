import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class TimeEntryQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  technicianId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gpsFlagged?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  missingClockOut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billable?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locked?: string;
}

export class BulkApproveTimeEntriesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class AddTimeEntryNoteDto {
  @IsString()
  text!: string;
}

export class RequestCorrectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nonBillableReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  nonBillableHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nonBillableContext?: string;
}

export class SaveAdminNoteDto {
  @IsString()
  adminNote!: string;
}

export class RejectTimeEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateTimeEntryAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  hours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  payrollHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  billableHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  correctionApplied?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  correctionReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clockIn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clockOut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nonBillableReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  nonBillableHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nonBillableContext?: string;
}
