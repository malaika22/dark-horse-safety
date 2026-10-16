import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CustomerOwnedStatus } from '@prisma/client';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class CustomerOwnedListQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: CustomerOwnedStatus })
  @IsOptional()
  @IsEnum(CustomerOwnedStatus)
  status?: CustomerOwnedStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  asset?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
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
