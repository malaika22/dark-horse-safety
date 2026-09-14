import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class LocationListQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  county?: string;

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

export class CreateLocationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Enter a location name.' })
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wellPadNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  county?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteContact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  siteContactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  geofenceRadius?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  geofenceOverride?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  gpsRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nearestHospital?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hospitalPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hospitalAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hospitalDriveTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fireEmergency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fireNonEmergency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  policeEmergency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  policeNonEmergency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ambulance?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  musterPoint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  sitePhotos?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evacuationMapUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty()
  @IsUUID('4', { message: 'Select a customer.' })
  customerId!: string;
}

export class UpdateLocationDto extends PartialType(CreateLocationDto) {}

export class BulkLocationIdsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}
