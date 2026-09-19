import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  HrGpsFlagDecision,
  HrGpsNotifyVia,
  HrGpsRejectReason,
} from '@prisma/client';

export class GpsFlagDecisionDto {
  @IsEnum(HrGpsFlagDecision)
  decision!: HrGpsFlagDecision;

  @IsOptional()
  @IsEnum(HrGpsRejectReason)
  rejectReason?: HrGpsRejectReason;

  @IsOptional()
  @IsEnum(HrGpsNotifyVia)
  notifyVia?: HrGpsNotifyVia;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class GpsFlagQueryDto {
  @IsOptional()
  @IsString()
  decision?: string;
}
