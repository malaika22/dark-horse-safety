import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class RouteRuleListQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  gpsRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeArchived?: boolean;
}

export class CreateRouteRuleDto {
  @ApiProperty()
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  geofenceRadius?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  gpsRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clockInWindow?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  routeFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expectedTravelTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mileageRateOverride?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  routeLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

export class UpdateRouteRuleDto extends PartialType(CreateRouteRuleDto) {}

export class BulkRouteRuleIdsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class CopyRouteRuleDto {
  @ApiProperty()
  @IsUUID()
  locationId!: string;
}

export class TestRouteCoordinateDto {
  @ApiProperty({ description: 'Latitude of sample coordinate' })
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @ApiProperty({ description: 'Longitude of sample coordinate' })
  @Type(() => Number)
  @IsNumber()
  lng!: number;
}
