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

export class NetSuiteCustomerMappingQueryDto extends ListQueryDto {
  @ApiPropertyOptional({
    description: 'MAPPED | PENDING | UNMATCHED | FAILED',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastResult?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  autoExport?: string;
}

export class MapNetSuiteCustomerDto {
  @ApiPropertyOptional({ example: 'NS-0004471' })
  @IsString()
  @Matches(/^NS-\d{7}$/i, {
    message: 'NetSuite ID must match NS-#######',
  })
  netsuiteId!: string;
}

export class UpdateNetSuiteAutoExportDto {
  @ApiPropertyOptional()
  @Type(() => Boolean)
  @IsBoolean()
  autoExport!: boolean;
}

export class BulkNetSuiteCustomerIdsDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  ids?: string[];
}
