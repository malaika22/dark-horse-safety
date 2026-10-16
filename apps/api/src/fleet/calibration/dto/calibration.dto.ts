import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { FleetCalibrationStatus } from '@prisma/client';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class CalibrationListQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: FleetCalibrationStatus })
  @IsOptional()
  @IsEnum(FleetCalibrationStatus)
  status?: FleetCalibrationStatus;

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
}

export class AdjustFrequencyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  frequencyDays!: number;
}
