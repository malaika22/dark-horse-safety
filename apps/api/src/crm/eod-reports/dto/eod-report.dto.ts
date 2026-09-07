import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class EodReportListQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  repId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class CreateEodReportDto {
  @ApiProperty()
  @IsDateString()
  reportDate!: string;

  @ApiProperty()
  @IsUUID()
  repId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateEodReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextDayPlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pipelineNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quotesNote?: string;
}
