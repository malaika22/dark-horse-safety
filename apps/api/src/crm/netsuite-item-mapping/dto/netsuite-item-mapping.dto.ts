import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class NetSuiteItemMappingQueryDto extends ListQueryDto {
  @ApiPropertyOptional({
    description: 'MATCHED | PENDING | UNMATCHED | FAILED',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  health?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  autoSync?: string;

  @ApiPropertyOptional({ description: 'ACTIVE | CURRENT | FUTURE chip filters' })
  @IsOptional()
  @IsString()
  window?: string;
}

export class MapNetSuiteItemDto {
  @ApiPropertyOptional({ example: 'NS-ITM-01' })
  @IsString()
  @Matches(/^NS-ITM-[A-Z0-9-]+$/i, {
    message: 'NetSuite Item ID must match NS-ITM-##',
  })
  netsuiteItemId!: string;
}

export class UpdateNetSuiteItemAutoSyncDto {
  @ApiPropertyOptional()
  @Type(() => Boolean)
  @IsBoolean()
  autoSync!: boolean;
}

export class BulkNetSuiteItemIdsDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  ids?: string[];
}
