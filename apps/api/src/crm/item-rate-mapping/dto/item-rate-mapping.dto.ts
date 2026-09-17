import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class ItemRateMappingQueryDto extends ListQueryDto {
  @ApiPropertyOptional({
    description: 'MAPPED | REVIEW | UNMAPPED | VARIANCE',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  autoSync?: string;

  @ApiPropertyOptional({ description: 'ACTIVE | CURRENT | FUTURE chip filters' })
  @IsOptional()
  @IsString()
  window?: string;
}

export class MapItemRateDto {
  @ApiPropertyOptional({ example: 'NS-ITM-01' })
  @IsString()
  @Matches(/^NS-ITM-[A-Z0-9-]+$/i, {
    message: 'NetSuite Item ID must match NS-ITM-##',
  })
  netsuiteItemId!: string;

  @ApiPropertyOptional({ example: 160 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  netsuiteRate?: number;
}

export class UpdateItemRateAutoSyncDto {
  @ApiPropertyOptional()
  @Type(() => Boolean)
  @IsBoolean()
  autoSync!: boolean;
}

export class UpdateItemRateDhsDto {
  @ApiPropertyOptional({ example: 160 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  dhsRate!: number;
}

export class BulkItemRateIdsDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  ids?: string[];
}
