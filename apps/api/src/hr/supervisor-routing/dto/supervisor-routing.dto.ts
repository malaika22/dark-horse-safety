import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ManagerTier, SupervisorRouteStatus } from '@prisma/client';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class SupervisorRoutingQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: ManagerTier })
  @IsOptional()
  @IsEnum(ManagerTier)
  managerTier?: ManagerTier;
}

export class CreateSupervisorRouteDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  code?: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsEnum(SupervisorRouteStatus)
  status?: SupervisorRouteStatus;

  @IsOptional()
  @IsEnum(ManagerTier)
  managerTier?: ManagerTier;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  crew?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  escalatesTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  escalateDelay?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  backupName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  coverageWindow?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onCall?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  approvesTimeEdit?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  approvesTimeOff?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  memberCount?: number;

  @IsOptional()
  @IsString()
  supervisorEmployeeId?: string;
}
