import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
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
  geofenceIsOverride?: boolean;

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
  @Type(() => Number)
  @IsInt()
  @Min(0)
  clockInBeforeMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  clockInAfterMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  routeFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  originType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  originLocationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredRoute?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expectedTravelTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  travelTimeAuto?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mileageRateOverride?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mileageRateIsOverride?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gpsAccuracyMeters?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  gpsAccuracyIsOverride?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gpsUnavailableBehavior?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  routeLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

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

/** Test geofence before a rule is saved (Add form). */
export class PreviewGeofenceDto {
  @ApiProperty()
  @IsUUID()
  locationId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  geofenceRadius?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  lng!: number;
}

export class RouteRuleDefaultsQueryDto {
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
  @IsUUID()
  originLocationId?: string;
}
