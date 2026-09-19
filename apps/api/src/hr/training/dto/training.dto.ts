import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  TrainingAssignReason,
  TrainingTopicKind,
  TrainingVerification,
} from '@prisma/client';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class TrainingQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(TrainingTopicKind)
  kind?: TrainingTopicKind;
}

export class CreateTrainingRecordDto {
  @IsString()
  employeeId!: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  topic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  issuingBody?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  instructor?: string;

  @IsOptional()
  @IsString()
  completedAt?: string;

  @IsOptional()
  @IsString()
  expiryAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  score?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  cost?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  certificateName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  certificateSize?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  reminderLead?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsEnum(TrainingTopicKind)
  kind?: TrainingTopicKind;
}

export class AssignTrainingDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  courseName?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  employeeIds!: string[];

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(TrainingAssignReason)
  reason?: TrainingAssignReason;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  notify?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  linkedSource?: string;
}

export class CreateCertificateDto {
  @IsString()
  employeeId!: string;

  @IsString()
  @MaxLength(200)
  label!: string;

  @IsOptional()
  @IsString()
  expiryAt?: string;

  @IsOptional()
  @IsEnum(TrainingVerification)
  verification?: TrainingVerification;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  issuingBody?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  fileSize?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  renewalReminder?: boolean;
}

export class CreateSsePairingDto {
  @IsString()
  mentorId!: string;

  @IsString()
  menteeId!: string;
}
