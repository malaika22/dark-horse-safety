import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class TimeOffQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class TimeOffCalendarQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;
}

export class CreateTimeOffDto {
  @IsString()
  employeeId!: string;

  @IsString()
  type!: string;

  @IsString()
  startDate!: string;

  @IsString()
  endDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class DecideTimeOffDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
