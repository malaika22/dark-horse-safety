import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { FleetCalibrationResult, FleetCalibrationStatus } from '@prisma/client';
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

export class CalibrationReadingDto {
  @IsString()
  @MaxLength(40)
  gas!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  reading?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  expected?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  result?: string;
}

export class SaveCalibrationDto {
  @IsString()
  @MaxLength(40)
  assetCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  assetLabel?: string;

  @IsOptional()
  @IsEnum(FleetCalibrationResult)
  result?: FleetCalibrationResult;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  lastCalAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  frequencyDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  technician?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lot?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  calType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  parentTruck?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  lotExpiry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  bumpGas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  bumpResponse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  bumpResult?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  certificateUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  overrideReason?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalibrationReadingDto)
  readings?: CalibrationReadingDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class AdjustFrequencyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  frequencyDays!: number;
}
