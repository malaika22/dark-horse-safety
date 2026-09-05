import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Shared list query — search, sort, pagination for all CRM list endpoints. */
export class ListQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number = 25;

  @ApiPropertyOptional({ description: 'Sort field (entity-specific)' })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  direction?: 'asc' | 'desc' = 'desc';
}

export class ExportQueryDto extends ListQueryDto {
  @ApiPropertyOptional({
    enum: ['csv', 'pdf'],
    default: 'csv',
    description: 'Export format',
  })
  @IsOptional()
  @IsIn(['csv', 'pdf'])
  format?: 'csv' | 'pdf' = 'csv';

  @ApiPropertyOptional({
    description: 'Comma-separated IDs — export selection only',
  })
  @IsOptional()
  @IsString()
  ids?: string;
}

export class BulkIdsDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  ids?: string[];
}
